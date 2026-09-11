/**
 * participate.ts
 * ------------------------------------------------------------
 * 「関わる」ページ(/participate)が扱うデータ型。
 *
 * 【2026-09-11、プロジェクトオーナーの指示によりデータ構造を確定】
 * GiftBookEntry(「本を贈る」候補)は、id/title/author/status/reason/
 * image/newBookUrl/usedBookUrl/conversationEnabledの項目を持つ。
 * 1冊ずつ独立して差し替えられるよう、配列の要素を丸ごと置き換える
 * だけで対応できる形にしている。現時点の値(participate.astro)は
 * すべてデザイン確認用の仮データであり、実在の書籍情報として確定
 * していない。値そのものに「(仮データ)」と明記し、実在情報と誤認
 * されないようにしている(idはただの技術的な識別子のため対象外)。
 *
 * imageが未設定の本は、書影画像の代わりに「研究の本棚」
 * (src/types/bookshelf.ts、Decision Log 0111)と同じcolor-mixの
 * 仮カバーを表示する(GiftBookList.astroが並び順(index)から機械的に
 * トーンを割り当てるため、この型自体に色の情報は持たせていない)。
 *
 * 【2026-09-11、「この本について話したい」MVP追加(Decision Log 0115)】
 * conversationEnabledを追加した。本を贈る条件(newBookUrl/
 * usedBookUrl/status等)とは独立した項目で、「贈れるかどうか」と
 * 「話したいを受け付けるかどうか」を意図的に結びつけていない。
 * 未設定時はtrue扱い(GiftBookList.astro参照)。
 * ------------------------------------------------------------
 */

export interface GiftBookEntry {
  /** 本を一意に識別するID。将来、対話の記録等を本に紐づける際の手がかりにもなる */
  id: string;
  /** 本のタイトル。現時点は仮データ(participate.astro参照) */
  title: string;
  /** 著者名。現時点は仮データ */
  author: string;
  /** 読みたい度合い等を示す短いラベル(例: "気になっている")。現時点は仮データ */
  status: string;
  /** なぜこの本を読みたいか、一言。現時点は仮データ */
  reason: string;
  /** 書影画像のパス。未設定の場合はGiftBookList.astroが仮カバーを表示する */
  image?: string;
  /** 「新品で贈る」の遷移先。未設定の場合は"#"(準備中)として扱う */
  newBookUrl?: string;
  /** 「古本で贈る」の遷移先。未設定の場合は"#"(準備中)として扱う */
  usedBookUrl?: string;
  /**
   * 「この本について話したい」を受け付けるか。未設定時はtrue扱い。
   * 「贈る」の可否(newBookUrl等)とは独立しており、贈れない/所有して
   * いない本でもtrueにできる(この逆も可)。
   */
  conversationEnabled?: boolean;
}

export interface LendCategory {
  /** GiftBookList.module.css内のインラインSVGアイコンと対応する識別子 */
  icon: "place" | "info" | "skill";
  title: string;
  description: string;
  linkHref: string;
}
