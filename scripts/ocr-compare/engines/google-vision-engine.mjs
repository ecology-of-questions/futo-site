/**
 * google-vision-engine.mjs
 * ------------------------------------------------------------
 * OCRエンジン比較(2026-09-21〜、Decision Log 0196)のGoogle Cloud
 * Vision側。DOCUMENT_TEXT_DETECTIONを、REST API経由でAPIキー認証
 * (`GOOGLE_VISION_API_KEY`環境変数)を使って呼び出す。
 *
 * 【重要】このファイルはネットワーク送信(画像を外部へアップロード)を
 * 行う。呼び出し側(compare.mjs)は、実行前に必ず「どの画像のどの範囲を
 * 送るか」を明示し、本人の同意を得てから呼ぶこと。GOOGLE_VISION_API_KEY
 * が未設定の場合は、送信を試みず、その旨を報告するだけにする
 * (認証情報が無いことをごまかして「測定できた」ことにしない)。
 *
 * APIキーはコード・リポジトリに含めない。環境変数からのみ読む。
 * ------------------------------------------------------------
 */
import { readFile } from "fs/promises";

export class MissingCredentialsError extends Error {}

/**
 * @param {string} imagePath 比較対象の画像ファイルパス
 * @param {{ orientation: "horizontal" | "vertical" }} options
 * @returns {Promise<{ text: string, elapsedMs: number, engine: string, confidence: number | null }>}
 */
export async function recognizeWithGoogleVision(imagePath, { orientation }) {
  const apiKey = process.env.GOOGLE_VISION_API_KEY;
  if (!apiKey) {
    throw new MissingCredentialsError(
      "GOOGLE_VISION_API_KEY が設定されていません。Google Cloud Visionでの測定はスキップします。",
    );
  }

  const imageBuffer = await readFile(imagePath);
  const base64 = imageBuffer.toString("base64");

  // 縦書き・横書きいずれも日本語であることは変わらないため言語ヒントは
  // "ja" のみ渡す(Vision APIは自前でレイアウト・向きを解析する)。
  const requestBody = {
    requests: [
      {
        image: { content: base64 },
        features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
        imageContext: { languageHints: ["ja"] },
      },
    ],
  };

  const t0 = Date.now();
  const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });
  const elapsedMs = Date.now() - t0;

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Google Vision APIエラー(${response.status}): ${errorBody.slice(0, 500)}`);
  }

  const json = await response.json();
  const result = json.responses?.[0];
  if (result?.error) {
    throw new Error(`Google Vision APIエラー: ${result.error.message}`);
  }

  const text = result?.fullTextAnnotation?.text ?? "";
  // ページ単位の平均confidence(あれば)。精度の代用にはしない(参考値)。
  const pageConfidence = result?.fullTextAnnotation?.pages?.[0]?.confidence ?? null;

  return {
    text: text.trim(),
    elapsedMs,
    engine: "google-vision-document-text-detection",
    confidence: pageConfidence,
    orientationHintUsed: orientation, // Vision APIには向きを渡していない(自動解析)ことを明示する記録用
  };
}
