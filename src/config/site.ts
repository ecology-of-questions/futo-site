/**
 * site.ts
 * ------------------------------------------------------------
 * サイト内で複数箇所から参照する、外部リンク先の設定。
 *
 * 【2026-08-17改訂(Decision Log 0058)】noteのプロフィールURLが
 * 確定したため、環境変数経由の未設定/プレースホルダー運用
 * (Decision Log 0057)をやめ、確定した値をこのファイルに直接記載する
 * 形にした。お問い合わせ先(メール/フォーム)は、Contactページを
 * note経由の問い合わせに一本化したことに伴い削除した
 * (Decision Log 0058)。
 *
 * 【2026-09-03改訂(Decision Log 0076)】Contactページを、note経由の
 * 問い合わせから、フォーム入力→Formspree経由でメールに転送される
 * 仕組みに変更した。Cloudflare Pages Functions等のデプロイ先固有の
 * 機能は使わず(CLAUDE.md「ポータブルな静的サイトを保つ」方針)、
 * 外部フォームバックエンドサービス(Formspree)へ<form>を直接POSTする
 * 形にしている。
 *
 * formspreeFormIdはプレースホルダー。プロジェクトオーナーが
 * サイト専用のGmailアドレスでFormspreeに登録し、フォームを作成した
 * 後に、実際のForm IDに差し替える必要がある(Decision Log 0076参照)。
 * ------------------------------------------------------------
 */

/** noteのプロフィールURL。Header/Footerの外部リンク、Contactページの問い合わせ導線から参照する。 */
export const noteUrl = "https://note.com/dreamers";

/**
 * FormspreeのForm ID。https://formspree.io/f/{formspreeFormId} がPOST先になる。
 * TODO: プロジェクトオーナーがFormspreeでフォームを作成した後、実際のIDに差し替える。
 */
export const formspreeFormId = "YOUR_FORM_ID";

/** Formspreeへの実際のPOST先URL。 */
export const contactFormEndpoint = `https://formspree.io/f/${formspreeFormId}`;
