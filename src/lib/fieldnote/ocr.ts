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
 * 設計している。認識結果は必ず`FieldnoteCapture.excerptText`欄に人が
 * 目視確認・修正してから保存される(既存のblurで保存する仕組みをそのまま
 * 使う。このモジュール自体は保存処理を行わない)。
 *
 * 【外部送信をしない】Tesseract.js(WebAssembly版Tesseract OCR)を使い、
 * 処理は端末内のWeb Workerで完結する。画像・認識結果を含め、このモジュール
 * からは一切のネットワーク送信を行わない(公開本棚APIとも無関係)。
 *
 * 【CDNに依存しない】`public/vendor/tesseract/`に、Tesseract.js本体
 * (workerスクリプト)・WebAssemblyコア・日本語学習データを自己ホストして
 * いる(詳細は`public/vendor/tesseract/README.md`)。外部CDN
 * (cdn.jsdelivr.net等)へのアクセスは発生しない。
 *
 * 【縦書き/横書きを利用者が選ぶ】自動判定は行わない(誤判定時に体験が
 * かえって悪化するため)。呼び出し側が明示的に指定する。
 * ------------------------------------------------------------
 */

export type OcrOrientation = "horizontal" | "vertical";

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

const VENDOR_BASE = "/vendor/tesseract";
const WORKER_PATH = `${VENDOR_BASE}/worker.min.js`;
const CORE_PATH = `${VENDOR_BASE}/tesseract-core-simd-lstm.wasm.js`;
const LANG_PATH = `${VENDOR_BASE}/lang-data`;

function langForOrientation(orientation: OcrOrientation): string {
  return orientation === "vertical" ? "jpn_vert" : "jpn";
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
 */
export async function recognizeExcerpt(
  image: Blob,
  orientation: OcrOrientation,
  onProgress?: (progress: OcrProgress) => void,
): Promise<OcrResult> {
  const { createWorker } = await import("tesseract.js");
  const lang = langForOrientation(orientation);

  const worker = await createWorker(lang, 1, {
    workerPath: WORKER_PATH,
    corePath: CORE_PATH,
    langPath: LANG_PATH,
    gzip: true,
    logger: (message) => {
      if (typeof message?.progress === "number") {
        onProgress?.({ status: message.status ?? "", progress: message.progress });
      }
    },
  });

  try {
    // Page Segmentation Mode: 横書きは「均一な1ブロックのテキスト」
    // (PSM 6)、縦書きは「均一な1ブロックの縦書きテキスト」(PSM 5)。
    // 縦書きでPSM 6のままだと文字の並び自体を誤認識し、実測で精度が
    // 0%近くまで落ちることを確認した(Decision Log 0188)。PSM 5に
    // 変更後も実測の精度は横書きに比べて低く、縦書きは実用段階に
    // 達していない(下記コメント・Decision Log 0188参照)。
    const psm = orientation === "vertical" ? "5" : "6";
    await worker.setParameters({ tessedit_pageseg_mode: psm as never });
    const { data } = await worker.recognize(image);
    const text = data.text.trim();
    return {
      text,
      pageCandidate: extractPageCandidate(text),
      confidence: data.confidence,
    };
  } finally {
    await worker.terminate();
  }
}
