/**
 * tesseract-engine.mjs
 * ------------------------------------------------------------
 * OCRエンジン比較(2026-09-21〜、Decision Log 0196)のTesseract.js側。
 * 現行のFieldnote実装(`src/lib/fieldnote/ocr.ts`)と同じ自己ホスト済み
 * アセット(`public/vendor/tesseract/`)・同じPSM設定を、Node.js上で
 * 直接動かす。ネットワーク送信は一切行わない(完全にローカル実行)。
 * ------------------------------------------------------------
 */
import { createWorker } from "tesseract.js";
import { readFile } from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const VENDOR_DIR = join(__dirname, "..", "..", "..", "public", "vendor", "tesseract");

/**
 * @param {string} imagePath 比較対象の画像ファイルパス
 * @param {{ orientation: "horizontal" | "vertical" }} options
 * @returns {Promise<{ text: string, elapsedMs: number, engine: string, confidence: number }>}
 */
export async function recognizeWithTesseract(imagePath, { orientation }) {
  const lang = orientation === "vertical" ? "jpn_vert" : "jpn";
  const psm = orientation === "vertical" ? "5" : "6";

  const t0 = Date.now();
  const worker = await createWorker(lang, 1, {
    corePath: join(VENDOR_DIR, "tesseract-core-simd-lstm.wasm.js"),
    langPath: join(VENDOR_DIR, "lang-data"),
    gzip: true,
    // Node版tesseract.jsは既定でcwdに展開済みtraineddataをキャッシュ
    // 書き込みする(このリポジトリのルートを汚してしまう)。比較用
    // スクリプトは毎回自己ホスト済みのgzipから読めば十分軽いため、
    // キャッシュ自体を無効化する。
    cacheMethod: "none",
    logger: () => {},
  });

  try {
    await worker.setParameters({ tessedit_pageseg_mode: psm });
    const imageBuffer = await readFile(imagePath);
    const { data } = await worker.recognize(imageBuffer);
    const elapsedMs = Date.now() - t0;
    return {
      text: data.text.trim(),
      elapsedMs,
      engine: "tesseract",
      confidence: data.confidence,
    };
  } finally {
    await worker.terminate();
  }
}
