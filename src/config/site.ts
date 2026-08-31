/**
 * site.ts
 * ------------------------------------------------------------
 * 実在の値がまだ確定していない外部リンク・連絡先を、環境変数
 * (import.meta.env)経由で読み込むための設定モジュール。
 *
 * このサイトは静的サイト(astro.config.mjs: output: "static")の
 * ため、ここで参照する値はビルド時にHTMLへ埋め込まれる。
 * ローカル開発では `.env`(.gitignore対象、`.env.example`参照)、
 * 本番ビルドではCloudflare Pages等のビルド環境変数で設定する。
 *
 * 値が未設定の場合はnullを返す。呼び出し側(Header/Footer/
 * ContactPage等)は、nullのときにリンクを描画せず「準備中」の
 * ような表示に切り替える。実在しないURL・メールアドレス・氏名を
 * ここで補完・生成しないこと(2026-08-17、プロジェクトオーナーの
 * 指示より、Decision Log 0057)。
 * ------------------------------------------------------------
 */

function readEnv(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/** note(外部ブログ)のURL。未設定ならnull。 */
export const noteUrl: string | null = readEnv(import.meta.env.PUBLIC_NOTE_URL);

/** お問い合わせ先メールアドレス。未設定ならnull。 */
export const contactEmail: string | null = readEnv(import.meta.env.PUBLIC_CONTACT_EMAIL);

/** お問い合わせ先フォームURL。未設定ならnull。emailが設定されていればemailを優先する。 */
export const contactFormUrl: string | null = readEnv(import.meta.env.PUBLIC_CONTACT_FORM_URL);
