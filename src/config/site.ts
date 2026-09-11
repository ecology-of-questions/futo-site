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
 * 【2026-09-04改訂】プロジェクトオーナーがサイト専用Gmail
 * (futoing@gmail.com)でFormspreeに登録し、実際のForm IDが発行された
 * ため、formspreeFormIdをプレースホルダーから実値に差し替えた。
 *
 * 【2026-09-11追加、同日削除(Decision Log 0130 → 0133)】本を贈る
 * 導線をAmazonほしい物リストに一本化するため、共通のwishlist URL
 * (`amazonWishlistUrl`)を一時追加していたが、HP公開を優先し本の
 * プレゼント機能自体を公開UIから外したこと(Decision Log 0133)に伴い、
 * 参照箇所が無くなったため削除した。本のプレゼント方法を再設計する
 * 際は、改めてこのファイルに追加する想定。
 * ------------------------------------------------------------
 */

/** noteのプロフィールURL。Header/Footerの外部リンク、Contactページの問い合わせ導線から参照する。 */
export const noteUrl = "https://note.com/dreamers";

/** FormspreeのForm ID。https://formspree.io/f/{formspreeFormId} がPOST先になる。 */
export const formspreeFormId = "mvkoqzov";

/** Formspreeへの実際のPOST先URL。 */
export const contactFormEndpoint = `https://formspree.io/f/${formspreeFormId}`;
