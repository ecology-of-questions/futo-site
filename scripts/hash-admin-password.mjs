#!/usr/bin/env node
/**
 * hash-admin-password.mjs
 * ------------------------------------------------------------
 * 本人限定の公開API(Decision Log 0189)のログインパスワードを、
 * Cloudflare Workerのsecretとして設定するための値に変換するツール。
 *
 * パスワードそのものではなく、pepper(別のsecret)と組み合わせた
 * SHA-256ハッシュ(16進数)をADMIN_PASSWORD_HASHとして保存する。
 * 万一ADMIN_PASSWORD_HASHが漏れても、pepperを知らなければ元の
 * パスワードは復元できない(pepperはWorker側にのみ保存し、この
 * スクリプトの出力にもコード上にも残さない)。
 *
 * 使い方: npm run admin:hash-password
 * 対話式でパスワードとpepperを尋ね、ADMIN_PASSWORD_HASHに設定する
 * 値を標準出力に表示する(ターミナルの履歴に残さないよう、コピー後は
 * 画面をクリアすることを推奨)。
 * ------------------------------------------------------------
 */
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { createHash, randomBytes } from "node:crypto";

const rl = createInterface({ input: stdin, output: stdout });

console.log("本人限定の公開API用パスワードのハッシュを計算します。");
console.log("(入力はそのまま画面に表示されます。他人に見られない環境で実行してください)\n");

const password = await rl.question("ログインパスワード(新規に決めるもの、これは記憶する): ");
let pepper = await rl.question(
  "pepper(空欄でランダム生成。ADMIN_PASSWORD_PEPPERとして別途secret保存が必要): ",
);
if (!pepper.trim()) {
  pepper = randomBytes(32).toString("hex");
  console.log(`\npepperを新規生成しました: ${pepper}`);
}

const hash = createHash("sha256").update(`${password}:${pepper}`).digest("hex");

console.log("\n以下をCloudflare Workerのsecretとして設定してください:\n");
console.log(`  wrangler secret put ADMIN_PASSWORD_HASH`);
console.log(`    → 値: ${hash}`);
console.log(`  wrangler secret put ADMIN_PASSWORD_PEPPER`);
console.log(`    → 値: ${pepper}`);
console.log(
  "\n(このスクリプトはCloudflareへ何も送信しません。表示された値を、手動でwrangler secret putに貼り付けてください)",
);

rl.close();
