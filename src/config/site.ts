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
 * 【2026-09-11改訂(Decision Log 0130)】本を贈る導線をAmazonほしい物
 * リストに一本化するため、共通のwishlist URLを追加した。個別の本の
 * 商品URLへは直接リンクしない(ほしい物リスト上に該当の本がない
 * 場合があるため)方針のため、本ごとのURLではなく、この1つのURLを
 * `/bookshelf`・`/participate`の「本をプレゼントする」導線が共通で
 * 参照する。
 * ------------------------------------------------------------
 */

/** noteのプロフィールURL。Header/Footerの外部リンク、Contactページの問い合わせ導線から参照する。 */
export const noteUrl = "https://note.com/dreamers";

/** FormspreeのForm ID。https://formspree.io/f/{formspreeFormId} がPOST先になる。 */
export const formspreeFormId = "mvkoqzov";

/** Formspreeへの実際のPOST先URL。 */
export const contactFormEndpoint = `https://formspree.io/f/${formspreeFormId}`;

/**
 * 「ふ、と」のAmazonほしい物リスト。本を贈る導線(`/bookshelf`の
 * 「この本をプレゼントする」・`/participate`の「本をプレゼントする」)
 * が共通で参照する。本ごとの商品URLへは直接リンクしない。
 */
export const amazonWishlistUrl = "https://www.amazon.jp/hz/wishlist/ls/25Z2CQP3JIP0J?ref_=wl_share";
