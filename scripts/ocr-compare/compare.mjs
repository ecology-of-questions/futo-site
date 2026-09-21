#!/usr/bin/env node
/**
 * compare.mjs
 * ------------------------------------------------------------
 * OCRエンジン比較の実行スクリプト(2026-09-21〜、Decision Log 0196)。
 * 公開サイトのビルドには一切含まれない、ローカル実行専用のツール
 * (`scripts/`配下、`src/`の外)。
 *
 * 使い方:
 *   node scripts/ocr-compare/compare.mjs \
 *     --image path/to/page.jpg \
 *     --orientation vertical \
 *     --image-id photo-01 \
 *     --crop-condition "ガイド枠相当に切り出し済み" \
 *     [--ground-truth path/to/correct-text.txt] \
 *     [--with-google]   # 明示的に付けない限りGoogle Cloud Visionへは送信しない
 *
 * 【外部送信について】--with-googleを付けた場合のみ、指定した画像を
 * Google Cloud Vision APIへ送信する(GOOGLE_VISION_API_KEY環境変数が
 * 必要)。--with-googleを付けなければ、Tesseract(完全にローカル)の
 * みで測定する。実写真を送る前に、必ず本人の同意を得ること
 * (このスクリプト自体は同意の確認をしない——呼び出す人間の責任)。
 *
 * 【正解文について】--ground-truthで指定するファイルは、実際に写真を
 * 見て人が確認した正解文であること。AI(このツール自身を含む)が
 * 生成した文字起こしを、確認なしに正解文として使わないこと。
 *
 * 【出力】認識結果の全文はデフォルトでは表示しない(--show-textで
 * 表示可能、ローカルでの目視確認用)。比較表に使う集計値
 * (所要時間・文字誤り率等)のみを標準出力に表示する。
 * ------------------------------------------------------------
 */
import { readFile } from "fs/promises";
import { recognizeWithTesseract } from "./engines/tesseract-engine.mjs";
import { recognizeWithGoogleVision, MissingCredentialsError } from "./engines/google-vision-engine.mjs";
import { characterErrorRate } from "./cer.mjs";

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      const key = argv[i].slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        args[key] = next;
        i++;
      } else {
        args[key] = true;
      }
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.image || !args.orientation || !args["image-id"]) {
    console.error(
      "使い方: node compare.mjs --image <path> --orientation <horizontal|vertical> --image-id <id> " +
        "[--crop-condition <text>] [--ground-truth <path>] [--with-google] [--show-text]",
    );
    process.exit(1);
  }

  const orientation = args.orientation;
  if (orientation !== "horizontal" && orientation !== "vertical") {
    console.error("--orientation は horizontal か vertical を指定してください");
    process.exit(1);
  }

  const groundTruth = args["ground-truth"] ? (await readFile(args["ground-truth"], "utf-8")).trim() : null;

  const rows = [];

  console.log(`--- ${args["image-id"]}: Tesseract.js(ローカル)で認識中... ---`);
  const tesseractResult = await recognizeWithTesseract(args.image, { orientation });
  rows.push({ engine: "tesseract", result: tesseractResult });
  console.log(`Tesseract: ${tesseractResult.elapsedMs}ms`);

  if (args["with-google"]) {
    console.log(`--- ${args["image-id"]}: Google Cloud Vision(外部送信)で認識中... ---`);
    try {
      const googleResult = await recognizeWithGoogleVision(args.image, { orientation });
      rows.push({ engine: "google-vision", result: googleResult });
      console.log(`Google Vision: ${googleResult.elapsedMs}ms`);
    } catch (error) {
      if (error instanceof MissingCredentialsError) {
        console.log(`Google Vision: スキップ(${error.message})`);
      } else {
        console.log(`Google Vision: エラー(${error.message})`);
      }
    }
  } else {
    console.log("--with-google が指定されていないため、Google Cloud Visionへの送信は行いません。");
  }

  console.log(`\n=== 比較結果: ${args["image-id"]} ===`);
  console.log(
    "画像ID | 方式 | 切り抜き条件 | 処理時間(ms) | 文字誤り率(空白込み) | 文字誤り率(空白除く) | ページ番号候補",
  );
  for (const { engine, result } of rows) {
    let cerRaw = "(正解文なし・未測定)";
    let cerNormalized = "(正解文なし・未測定)";
    if (groundTruth) {
      const raw = characterErrorRate(result.text, groundTruth, { normalizeWhitespace: false });
      const normalized = characterErrorRate(result.text, groundTruth, { normalizeWhitespace: true });
      cerRaw = `${(raw.cer * 100).toFixed(1)}%(距離${raw.editDistance}/${raw.groundTruthLength}字)`;
      cerNormalized = `${(normalized.cer * 100).toFixed(1)}%(距離${normalized.editDistance}/${normalized.groundTruthLength}字)`;
    }
    console.log(
      `${args["image-id"]} | ${engine} | ${args["crop-condition"] ?? "(未記録)"} | ${result.elapsedMs} | ${cerRaw} | ${cerNormalized} | (別途目視確認)`,
    );
    if (typeof result.confidence === "number") {
      console.log(`  (参考、精度の代用にはしない)engine confidence: ${result.confidence}`);
    }
  }

  if (args["show-text"]) {
    console.log("\n=== 認識結果(全文、ローカル確認用) ===");
    for (const { engine, result } of rows) {
      console.log(`\n--- ${engine} ---`);
      console.log(result.text);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
