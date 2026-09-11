/**
 * participate.ts
 * ------------------------------------------------------------
 * 「関わる」ページ(/participate)が扱うデータ型。
 *
 * 【2026-09-11、プロジェクトオーナーの指示によりデータ構造を確定】
 * GiftBookEntry(「本を贈る」候補)は、title/author/status/reason/
 * image/newBookUrl/usedBookUrlの7項目を持つ。1冊ずつ独立して差し
 * 替えられるよう、配列の要素を丸ごと置き換えるだけで対応できる形に
 * している。現時点の値(participate.astro)はすべてデザイン確認用の
 * 仮データであり、実在の書籍情報として確定していない。値そのものに
 * 「(仮データ)」と明記し、実在情報と誤認されないようにしている。
 *
 * imageが未設定の本は、書影画像の代わりに「研究の本棚」
 * (src/types/bookshelf.ts、Decision Log 0111)と同じcolor-mixの
 * 仮カバーを表示する(GiftBookList.astroが並び順(index)から機械的に
 * トーンを割り当てるため、この型自体に色の情報は持たせていない)。
 *
 * LendCategory: 「場所・知識・技術を貸す」セクションの3項目。
 * ------------------------------------------------------------
 */

export interface GiftBookEntry {
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
}

export interface LendCategory {
  /** GiftBookList.module.css内のインラインSVGアイコンと対応する識別子 */
  icon: "place" | "info" | "skill";
  title: string;
  description: string;
  linkHref: string;
}
