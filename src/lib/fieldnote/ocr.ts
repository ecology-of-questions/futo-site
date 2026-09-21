/**
 * ocr.ts
 * ------------------------------------------------------------
 * 写真から文字を読み取る(OCR)機能。Google Cloud Vision
 * (DOCUMENT_TEXT_DETECTION)を、Cloudflare Worker経由で呼び出す
 * (2026-09-21、Decision Log 0198)。
 *
 * 【経緯】当初(Decision Log 0188)はブラウザ内Tesseract.jsで完結させて
 * いたが、実写真での比較検証(Decision Log 0196・0197)でGoogle Cloud
 * Visionの方が実用的な精度だったため切り替えた。旧実装は
 * `ocrTesseractLocal.ts`にそのまま残している(実機確認が済むまで
 * 戻せる形を残すため。どこからもimportしていない)。
 *
 * 【ブラウザから直接Googleへ送らない】このモジュールはブラウザから
 * Google Cloud Visionへ直接接続しない。`/api/ocr/recognize`
 * (このリポジトリの`worker/index.ts`)へ送るだけで、Google側の
 * APIキーはCloudflare secretとしてWorker側にのみ存在する。
 *
 * 【本人限定】`/api/ocr/recognize`は、公開読書メモAPI
 * (Decision Log 0189)と同じ管理者セッション(Cookie)+CSRFトークンで
 * 保護されている。ログインしていない状態では呼び出し側
 * (`ocrQueue.ts`)がそもそもこの関数を呼ばない(ボタン自体を無効化する、
 * `app.ts`参照)。
 *
 * 【原本を上書きしない・必要範囲だけ送る】呼び出し側から渡される
 * `image`(原本Blob)は一切変更しない。`cropForOcr()`でガイド枠
 * (または手動調整した範囲)だけを切り出し、`resizeForOcr()`で
 * アップロード用に縮小したコピーだけをWorkerへ送る(Decision Log
 * 0194・0195で確立した設計をそのまま踏襲)。
 * ------------------------------------------------------------
 */

export type OcrOrientation = "horizontal" | "vertical";

/** 失敗の大まかな分類。UI側はstageに応じたラベル+元のエラー文言の両方を表示する。 */
export type OcrStage = "auth" | "network" | "rate_limit" | "quota" | "server" | "unknown";

export interface OcrProgress {
  status: string;
  progress: number;
}

export interface OcrResult {
  /** 認識された全文 */
  text: string;
  /** 末尾または先頭に単独の数字列があった場合の、ページ番号の候補(任意) */
  pageCandidate?: string;
  /** Google Cloud Visionが返すページ単位の信頼度(0〜1)。無ければ0。精度の代用にはしない(参考値)。 */
  confidence: number;
}

/**
 * OCRに渡す範囲。原本画像の幅・高さに対する割合(0〜1)で表す
 * (原本の実際のピクセルサイズに依存しない)。`rotationDeg`は、この
 * 範囲を切り出す前に原本画像自体を中心周りに回転させる角度(度、
 * 時計回りが正)。省略時は0(回転なし)。
 */
export interface OcrCropRect {
  x: number;
  y: number;
  width: number;
  height: number;
  rotationDeg?: number;
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

const STAGE_LABELS: Record<OcrStage, string> = {
  auth: "ログインが必要です(管理者ログインしてからお試しください)",
  network: "通信に失敗しました",
  rate_limit: "短時間に実行しすぎました。少し待ってからお試しください",
  quota: "今月の読み取り回数の上限に達しました",
  server: "サーバー側でエラーが発生しました",
  unknown: "読み取りに失敗しました",
};

function stageForStatus(status: number): OcrStage {
  if (status === 401 || status === 403) return "auth";
  if (status === 429) return "rate_limit";
  if (status >= 500) return "server";
  return "unknown";
}

function describeFailure(stage: OcrStage, detail: string): string {
  const label = STAGE_LABELS[stage];
  return `${label}\n詳細: ${detail.slice(0, 300)}`;
}

const OCR_INPUT_MAX_DIMENSION = 2600;
const OCR_INPUT_JPEG_QUALITY = 0.9;
const CROP_OUTPUT_JPEG_QUALITY = 0.92;

/**
 * 原本のBlobを一切変更せず、指定範囲(`OcrCropRect`)だけを切り出した
 * コピーを都度作る。`cropRect`が無い場合は原本をそのまま返す(下位
 * 互換。この機能より前に撮影された記録には範囲の情報が無い)。
 * 回転は、切り出す前に原本画像自体を中心周りに回転させることで行う
 * (原本と同じ大きさのキャンバスに描くため、回転で四隅がはみ出た部分は
 * 切り捨てられる。切り出す範囲は通常その内側に収まる前提)。
 */
async function cropForOcr(image: Blob, cropRect: OcrCropRect | undefined): Promise<Blob> {
  if (!cropRect) return image;

  const bitmap = await createImageBitmap(image);
  try {
    const srcWidth = bitmap.width;
    const srcHeight = bitmap.height;
    const rotationDeg = cropRect.rotationDeg ?? 0;

    let rotatedSource: CanvasImageSource = bitmap;
    if (rotationDeg !== 0) {
      const rotatedCanvas = document.createElement("canvas");
      rotatedCanvas.width = srcWidth;
      rotatedCanvas.height = srcHeight;
      const rotatedCtx = rotatedCanvas.getContext("2d");
      if (rotatedCtx) {
        rotatedCtx.translate(srcWidth / 2, srcHeight / 2);
        rotatedCtx.rotate((rotationDeg * Math.PI) / 180);
        rotatedCtx.drawImage(bitmap, -srcWidth / 2, -srcHeight / 2);
        rotatedSource = rotatedCanvas;
      }
    }

    const cropX = Math.round(cropRect.x * srcWidth);
    const cropY = Math.round(cropRect.y * srcHeight);
    const cropWidth = Math.max(1, Math.round(cropRect.width * srcWidth));
    const cropHeight = Math.max(1, Math.round(cropRect.height * srcHeight));

    const outCanvas = document.createElement("canvas");
    outCanvas.width = cropWidth;
    outCanvas.height = cropHeight;
    const outCtx = outCanvas.getContext("2d");
    if (!outCtx) return image;
    outCtx.drawImage(rotatedSource, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

    return await new Promise<Blob>((resolve) => {
      outCanvas.toBlob((blob) => resolve(blob ?? image), "image/jpeg", CROP_OUTPUT_JPEG_QUALITY);
    });
  } finally {
    bitmap.close();
  }
}

/**
 * アップロード用に、長辺がOCR_INPUT_MAX_DIMENSIONを超える場合だけ縮小
 * する(無駄な再エンコードをしない)。切り出し後の画像に対して行う
 * ため、通常はこの範囲に収まっており、実際に縮小されることは少ない。
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
      canvas.toBlob((blob) => resolve(blob ?? image), "image/jpeg", OCR_INPUT_JPEG_QUALITY);
    });
  } finally {
    bitmap.close();
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // "data:image/jpeg;base64,xxxx" の先頭部分を取り除く。
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("failed to read blob"));
    reader.readAsDataURL(blob);
  });
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
 * 与えられた画像から文字を読み取る。`cropRect`が指定された場合、原本の
 * その範囲だけを切り出してから、Worker経由でGoogle Cloud Visionへ送る
 * (未指定の場合は原本全体を送る。この機能より前に撮影された記録との
 * 下位互換)。`csrfToken`は管理者ログイン済みセッションのCSRFトークン
 * (`app.ts`の`adminSession`)。
 *
 * 失敗時は`OcrError`(大まかな分類+元のエラー内容)を投げる。呼び出し
 * 側はこれを捕捉して、元のエラー文言を要約せずそのまま表示すること
 * (Decision Log 0192から続く方針)。
 */
export async function recognizeExcerpt(
  image: Blob,
  orientation: OcrOrientation,
  cropRect: OcrCropRect | undefined,
  csrfToken: string,
  onProgress?: (progress: OcrProgress) => void,
): Promise<OcrResult> {
  let uploadImage: Blob;
  try {
    const cropped = await cropForOcr(image, cropRect);
    uploadImage = await resizeForOcr(cropped);
  } catch (error) {
    const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    throw new OcrError(describeFailure("unknown", detail), "unknown");
  }

  onProgress?.({ status: "uploading", progress: 0 });

  let response: Response;
  try {
    const imageBase64 = await blobToBase64(uploadImage);
    response = await fetch("/api/ocr/recognize", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
      body: JSON.stringify({ imageBase64, orientation }),
    });
  } catch (error) {
    const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    throw new OcrError(describeFailure("network", detail), "network");
  }

  onProgress?.({ status: "processing", progress: 50 });

  if (!response.ok) {
    const stage = stageForStatus(response.status);
    let detail = `HTTP ${response.status}`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body?.error) detail = body.error;
    } catch {
      // 本文がJSONでない場合はステータスコードのみ表示する。
    }
    throw new OcrError(describeFailure(stage, detail), stage);
  }

  onProgress?.({ status: "done", progress: 100 });

  const data = (await response.json()) as { text?: string; confidence?: number | null };
  const text = (data.text ?? "").trim();
  return {
    text,
    pageCandidate: extractPageCandidate(text),
    confidence: data.confidence ?? 0,
  };
}
