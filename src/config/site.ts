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
 *
 * 【2026-09-12追加、Amazonアソシエイト対応(Decision Log 0138)】
 * `/bookshelf`に「Amazonで見る」等の購入リンクを追加するにあたり、
 * Amazonアソシエイトのトラッキングタグを扱う`amazonAssociateTag`・
 * `buildPurchaseUrl`を追加した。タグの値はこのファイルに直接
 * 書かず、環境変数`PUBLIC_AMAZON_ASSOCIATE_TAG`(`.env.example`参照)
 * から読む。現時点でアソシエイトID自体は未設定・未取得のため、
 * この環境変数は空のままで良い(推測・仮のIDを設定しない)。
 * ------------------------------------------------------------
 */
import type { BookEntry } from "@/types/bookshelf";

/** noteのプロフィールURL。Header/Footerの外部リンク、Contactページの問い合わせ導線から参照する。 */
export const noteUrl = "https://note.com/dreamers";

/** FormspreeのForm ID。https://formspree.io/f/{formspreeFormId} がPOST先になる。 */
export const formspreeFormId = "mvkoqzov";

/** Formspreeへの実際のPOST先URL。 */
export const contactFormEndpoint = `https://formspree.io/f/${formspreeFormId}`;

/**
 * Amazonアソシエイトのトラッキングタグ。環境変数
 * `PUBLIC_AMAZON_ASSOCIATE_TAG`から読む(`.env.example`参照)。未設定
 * (空文字列・undefined)の場合は`buildPurchaseUrl`がタグを付加しない
 * ため、アソシエイト未登録の状態でも安全に動作する。
 */
export const amazonAssociateTag: string | undefined = import.meta.env.PUBLIC_AMAZON_ASSOCIATE_TAG || undefined;

/**
 * 本の購入リンクを組み立てる。`book.affiliate`が true、
 * `book.purchaseProvider`が"amazon"、かつ`amazonAssociateTag`が
 * 設定されている場合のみ、Amazonアソシエイトの`tag`クエリ
 * パラメータを付加する。条件を満たさない場合は`purchaseUrl`を
 * そのまま返す(2026-09-12、Decision Log 0138)。
 */
export function buildPurchaseUrl(
  book: Pick<BookEntry, "purchaseUrl" | "purchaseProvider" | "affiliate">,
): string | undefined {
  if (!book.purchaseUrl) return undefined;
  if (book.affiliate && book.purchaseProvider === "amazon" && amazonAssociateTag) {
    try {
      const url = new URL(book.purchaseUrl);
      url.searchParams.set("tag", amazonAssociateTag);
      return url.toString();
    } catch {
      // purchaseUrlが不正な形式の場合は、タグ付与を諦めて元のURLを返す
      // (壊れたリンクを表示するよりは、タグなしでも機能するリンクを
      // 優先する)。
      return book.purchaseUrl;
    }
  }
  return book.purchaseUrl;
}

/**
 * `book.affiliate`が実際にアソシエイトタグ付きリンクとして機能して
 * いるかどうか。BookshelfFullList.astroが、Amazonアソシエイトの
 * 規約で必要な開示文言を表示するかどうかの判定に使う
 * (2026-09-12、Decision Log 0138)。
 */
export function isActiveAffiliateLink(
  book: Pick<BookEntry, "purchaseUrl" | "purchaseProvider" | "affiliate">,
): boolean {
  return Boolean(book.purchaseUrl && book.affiliate && book.purchaseProvider === "amazon" && amazonAssociateTag);
}
