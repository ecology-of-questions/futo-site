/**
 * ocr.ts
 * ------------------------------------------------------------
 * 写真から文字を読み取る(OCR)機能(2026-09-20、Decision Log 0188)。
 *
 * 【実測に基づく前提】Decision Log 0187で実測したとおり、傾き・ノイズ・
 * JPEG圧縮を加えただけの合成画像でも文字精度が約32%まで低下した。実際に
 * 撮影される本のページ(湾曲・遠近歪み・影・多様な書体)はさらに悪条件に
 * なりうる。したがってこの機能は「自動で正確に文字起こしする」ものでは
 * なく、**抜粋欄への下書き(プリフィル)を提案するだけ**の補助機能として
 * 設計している。認識結果は候補として保持するだけで、`excerptText`欄に
 * 反映するかどうかは必ず本人の操作を要する(呼び出し側、`ocrQueue.ts`
 * 参照)。
 *
 * 【外部送信をしない】Tesseract.js(WebAssembly版Tesseract OCR)を使い、
 * 処理は端末内のWeb Workerで完結する。画像・認識結果・エラー詳細を
 * 含め、このモジュールからは一切のネットワーク送信を行わない。
 *
 * 【CDNに依存しない】`public/vendor/tesseract/`に、Tesseract.js本体
 * (workerスクリプト)・WebAssemblyコア・日本語学習データを自己ホストして
 * いる(詳細は`public/vendor/tesseract/README.md`)。外部CDN
 * (cdn.jsdelivr.net等)へのアクセスは発生しない。
 *
 * 【縦書き/横書きを利用者が選ぶ】自動判定は行わない(誤判定時に体験が
 * かえって悪化するため)。呼び出し側が明示的に指定する。
 *
 * 【実機での失敗を「ブラウザ非対応」と一括表示しない(2026-09-20、
 * Decision Log 0192)】実機(iPhone)でOCRが失敗する事象が報告された。
 * 原因を「WebAssembly SIMD非対応」と決めつけず、以下の対策を行った。
 * - `wasm-feature-detect`でSIMD対応を実際に判定し、非対応ならSIMD版
 *   ではなく非SIMD版のコア(`tesseract-core-lstm.wasm.js`)を使う
 *   (判定失敗時はSIMD版を既定にする)。
 * - tesseract.jsの`logger`が返す進行状況(`status`文字列)を追跡し、
 *   例外発生時に「どの段階(コア読み込み/言語データ読み込み/初期化/
 *   認識実行)で失敗したか」を`OcrError.stage`として保持する。
 * - 元のエラーの`name`/`message`をそのままUIに渡す(要約・一般化
 *   しない)。開発者コンソールにも出す。エラー内容はローカル表示のみで、
 *   外部には一切送信しない。
 *
 * 【原本画像を上書きしない(2026-09-21、Decision Log 0194)】
 * 「撮影した元の写真ファイルを取り出せない」という指摘を受け、撮影が
 * 保存する原本画像(`FieldnoteCamera.capture()`が返す、利用者が後で
 * 「元の写真を見る」・共有/ダウンロードで取り出せるBlob)と、OCRに
 * 渡す画像を分離した。このモジュールは呼び出し側から渡された原本
 * Blobを直接Tesseractに渡すのではなく、`resizeForOcr()`で都度、
 * OCR専用の縮小コピーを作ってから渡す。このコピーは保存されず、
 * 呼び出しの度に使い捨てる。原本のBlob自体・IndexedDB上の記録は
 * 一切書き換えない。
 * ------------------------------------------------------------
 */
import { simd } from "wasm-feature-detect";

export type OcrOrientation = "horizontal" | "vertical";

export type OcrStage = "core" | "langdata" | "init" | "recognize" | "unknown";

export interface OcrProgress {
  status: string;
  progress: number;
}

export interface OcrResult {
  /** 認識された全文(改行はTesseractの行区切りをそのまま反映) */
  text: string;
  /** 末尾または先頭に単独の数字列があった場合の、ページ番号の候補(任意) */
  pageCandidate?: string;
  /** Tesseractが返す0-100の信頼度(全体平均) */
  confidence: number;
}

/** どの段階で失敗したかを保持するエラー。UI側はstageとmessageの両方を表示する。 */
export class OcrError extends Error {
  readonly stage: OcrStage;
  constructor(message: string, stage: OcrStage) {
    super(message);
    this.name = "OcrError";
    this.stage = stage;
  }
}

const VENDOR_BASE = "/vendor/tesseract";
const WORKER_PATH = `${VENDOR_BASE}/worker.min.js`;
const CORE_PATH_SIMD = `${VENDOR_BASE}/tesseract-core-simd-lstm.wasm.js`;
const CORE_PATH_NO_SIMD = `${VENDOR_BASE}/tesseract-core-lstm.wasm.js`;
const LANG_PATH = `${VENDOR_BASE}/lang-data`;

/**
 * OCRに渡す画像の長辺の上限(px)。原本(`FieldnoteCamera`が保存する、
 * 利用者が取り出せる画像)とは別の、OCR専用・使い捨ての値
 * (2026-09-21、Decision Log 0194)。Decision Log 0193の実測で
 * 2600px相当を根拠に選んだ値をそのまま踏襲している。原本の解像度が
 * これを下回る場合は縮小しない(原本より大きくは作らない)。
 */
const OCR_INPUT_MAX_DIMENSION = 2600;
const OCR_INPUT_JPEG_QUALITY = 0.9;

/**
 * 原本のBlobを一切変更せず、OCR専用の縮小コピーを都度作る。
 * 原本の長辺がOCR_INPUT_MAX_DIMENSION以下の場合はそのまま返す
 * (無駄な再エンコードをしない)。
 */
async function resizeForOcr(image: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(image);
  try {
    const longSide = Math.max(bitmap.width, bitmap.height);
    if (longSide <= OCR_INPUT_MAX_DIMENSION) {
      return image;
    }
    const scale = OCR_INPUT_MAX_DIMENSION / longSide;
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return image;
    ctx.drawImage(bitmap, 0, 0, width, height);

    return await new Promise<Blob>((resolve) => {
      canvas.toBlob(
        (blob) => resolve(blob ?? image),
        "image/jpeg",
        OCR_INPUT_JPEG_QUALITY,
      );
    });
  } finally {
    bitmap.close();
  }
}

// tesseract.jsのloggerが返すstatus文字列 → どの段階かの対応表
// (tesseract.js-core/tesseract.js本体のソース中の文言と一致させる)。
const STATUS_TO_STAGE: Record<string, OcrStage> = {
  "loading tesseract core": "core",
  "initializing tesseract": "init",
  "loading language traineddata": "langdata",
  "initializing api": "init",
  "recognizing text": "recognize",
};

const STAGE_LABELS: Record<OcrStage, string> = {
  core: "処理エンジン(WebAssembly)の読み込みに失敗しました",
  langdata: "日本語データの読み込みに失敗しました",
  init: "初期化に失敗しました",
  recognize: "文字認識の実行に失敗しました",
  unknown: "読み取りを開始できませんでした",
};

function langForOrientation(orientation: OcrOrientation): string {
  return orientation === "vertical" ? "jpn_vert" : "jpn";
}

/** 実行環境がWebAssembly SIMDに対応しているか判定し、対応するコアのパスを返す。判定自体が失敗した場合はSIMD版を既定にする。 */
async function resolveCorePath(): Promise<string> {
  try {
    return (await simd()) ? CORE_PATH_SIMD : CORE_PATH_NO_SIMD;
  } catch {
    return CORE_PATH_SIMD;
  }
}

function describeFailure(stage: OcrStage, error: unknown): string {
  const label = STAGE_LABELS[stage];
  const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  return `${label}\n詳細: ${detail.slice(0, 300)}`;
}

/** 認識結果の末尾/先頭にある、独立した数字列(3桁以下)をページ番号候補として拾う簡易ヒューリスティック。 */
function extractPageCandidate(text: string): string | undefined {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length === 0) return undefined;
  const first = lines[0];
  const last = lines[lines.length - 1];
  const digitsOnly = /^[0-9０-９]{1,3}$/;
  if (last.length <= 3 && digitsOnly.test(last)) return last;
  if (first.length <= 3 && digitsOnly.test(first)) return first;
  return undefined;
}

/**
 * 与えられた画像から文字を読み取る。ワーカーの生成・学習データのダウンロード
 * (初回のみ、ブラウザキャッシュ後は不要)を含むため、数秒〜十数秒かかりうる。
 * 呼び出し側は必ず`onProgress`で進捗を示し、「一瞬で終わる」ことを前提にした
 * UIにしないこと(Decision Log 0187の実測結果を参照)。
 *
 * 失敗時は`OcrError`(どの段階で失敗したか+元のエラー内容)を投げる。
 * 呼び出し側はこれを捕捉して、段階ごとの具体的なメッセージを表示すること
 * (「ブラウザ非対応」への一括集約は禁止、Decision Log 0192)。
 */
export async function recognizeExcerpt(
  image: Blob,
  orientation: OcrOrientation,
  onProgress?: (progress: OcrProgress) => void,
): Promise<OcrResult> {
  const { createWorker } = await import("tesseract.js");
  const lang = langForOrientation(orientation);
  const corePath = await resolveCorePath();

  let lastStage: OcrStage = "unknown";

  // 原本(呼び出し側から渡されたimage)は変更しない。OCRには専用の
  // 縮小コピーを渡す(Decision Log 0194)。
  let ocrInput: Blob;
  try {
    ocrInput = await resizeForOcr(image);
  } catch (error) {
    throw new OcrError(describeFailure(lastStage, error), lastStage);
  }

  const logger = (message: { status?: string; progress?: number }) => {
    if (message?.status && STATUS_TO_STAGE[message.status]) {
      lastStage = STATUS_TO_STAGE[message.status];
    }
    if (typeof message?.progress === "number") {
      onProgress?.({ status: message.status ?? "", progress: message.progress });
    }
  };

  let worker: Awaited<ReturnType<typeof createWorker>>;
  try {
    worker = await createWorker(lang, 1, {
      workerPath: WORKER_PATH,
      corePath,
      langPath: LANG_PATH,
      gzip: true,
      logger,
    });
  } catch (error) {
    throw new OcrError(describeFailure(lastStage, error), lastStage);
  }

  try {
    // Page Segmentation Mode: 横書きは「均一な1ブロックのテキスト」
    // (PSM 6)、縦書きは「均一な1ブロックの縦書きテキスト」(PSM 5)。
    // 縦書きでPSM 6のままだと文字の並び自体を誤認識し、実測で精度が
    // 0%近くまで落ちることを確認した(Decision Log 0188)。PSM 5に
    // 変更後も実測の精度は横書きに比べて低く、縦書きは実用段階に
    // 達していない(下記コメント・Decision Log 0188参照)。
    const psm = orientation === "vertical" ? "5" : "6";
    await worker.setParameters({ tessedit_pageseg_mode: psm as never });
    lastStage = "recognize";
    const { data } = await worker.recognize(ocrInput);
    const text = data.text.trim();
    return {
      text,
      pageCandidate: extractPageCandidate(text),
      confidence: data.confidence,
    };
  } catch (error) {
    throw new OcrError(describeFailure(lastStage, error), lastStage);
  } finally {
    await worker.terminate().catch(() => {});
  }
}
