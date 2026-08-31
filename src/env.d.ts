/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  /** note(外部ブログ)のURL。未設定可(src/config/site.ts参照)。 */
  readonly PUBLIC_NOTE_URL?: string;
  /** お問い合わせ先メールアドレス。未設定可(src/config/site.ts参照)。 */
  readonly PUBLIC_CONTACT_EMAIL?: string;
  /** お問い合わせ先フォームURL。未設定可(src/config/site.ts参照)。 */
  readonly PUBLIC_CONTACT_FORM_URL?: string;
}
