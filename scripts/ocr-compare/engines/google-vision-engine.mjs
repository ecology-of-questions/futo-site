/**
 * google-vision-engine.mjs
 * ------------------------------------------------------------
 * OCRエンジン比較(2026-09-21〜、Decision Log 0196・0197)のGoogle
 * Cloud Vision側。DOCUMENT_TEXT_DETECTIONを、Application Default
 * Credentials(ADC、`gcloud auth application-default login`で本人が
 * 自分のPC上でGoogleにログインして発行する認証情報)を使って呼び出す。
 *
 * 【APIキー方式は使わない】当初APIキー方式で実装していたが、認証情報を
 * 発行・保管する主体を「このツール」ではなく「本人のPC上のgcloud CLI」
 * に一本化したいという要望を受け、ADC方式に切り替えた。認証情報は
 * `gcloud`がOS標準の場所(例: `~/.config/gcloud/`)に保存し、この
 * リポジトリ・ブラウザには一切触れない。このスクリプトは
 * `gcloud auth application-default print-access-token`を子プロセスで
 * 呼び、その場限りのアクセストークンを取得するだけで、トークン自体も
 * 保存・ログ出力しない。
 *
 * 【重要】このファイルはネットワーク送信(画像を外部へアップロード)を
 * 行う。呼び出し側(compare.mjs)は、実行前に必ず「どの画像のどの範囲を
 * 送るか」を明示し、本人の同意を得てから呼ぶこと。gcloudの認証が
 * 済んでいない場合は、送信を試みず、その旨を報告するだけにする
 * (認証情報が無いことをごまかして「測定できた」ことにしない)。
 * ------------------------------------------------------------
 */
import { readFile } from "fs/promises";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export class MissingCredentialsError extends Error {}

/** `gcloud auth application-default print-access-token`でその場限りのアクセストークンを取得する。 */
async function getAccessToken() {
  try {
    const { stdout } = await execFileAsync("gcloud", ["auth", "application-default", "print-access-token"]);
    const token = stdout.trim();
    if (!token) throw new Error("トークンが空でした");
    return token;
  } catch (error) {
    throw new MissingCredentialsError(
      "gcloudのApplication Default Credentialsが見つかりません。" +
        "本人のPC上で `gcloud auth application-default login` を実行してください。" +
        `(詳細: ${error.message})`,
    );
  }
}

/** 課金対象のGCPプロジェクトIDを取得する(環境変数優先、無ければgcloudの既定プロジェクト)。 */
async function getProjectId() {
  if (process.env.GOOGLE_CLOUD_PROJECT) return process.env.GOOGLE_CLOUD_PROJECT;
  try {
    const { stdout } = await execFileAsync("gcloud", ["config", "get-value", "project"]);
    const projectId = stdout.trim();
    if (!projectId || projectId === "(unset)") throw new Error("プロジェクトが設定されていません");
    return projectId;
  } catch (error) {
    throw new MissingCredentialsError(
      "課金対象のGCPプロジェクトIDが分かりません。" +
        "`gcloud config set project <プロジェクトID>` を実行するか、" +
        "GOOGLE_CLOUD_PROJECT環境変数を設定してください。" +
        `(詳細: ${error.message})`,
    );
  }
}

/**
 * @param {string} imagePath 比較対象の画像ファイルパス
 * @param {{ orientation: "horizontal" | "vertical" }} options
 * @returns {Promise<{ text: string, elapsedMs: number, engine: string, confidence: number | null }>}
 */
export async function recognizeWithGoogleVision(imagePath, { orientation }) {
  const accessToken = await getAccessToken();
  const projectId = await getProjectId();

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
  const response = await fetch("https://vision.googleapis.com/v1/images:annotate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      // ユーザー認証情報(サービスアカウントではない)でVision APIを
      // 呼ぶ場合、課金・割り当ての対象プロジェクトをこのヘッダーで
      // 明示する必要がある。
      "X-Goog-User-Project": projectId,
    },
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
