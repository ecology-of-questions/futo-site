/**
 * participate.ts
 * ------------------------------------------------------------
 * 「関わる」ページ(/participate)が扱うデータ型。
 *
 * GiftBookEntry: 「本を贈る」セクションで並べる、研究室が読みたい本の
 * 候補。実在の書影画像はまだ用意していないため、「研究の本棚」
 * (src/types/bookshelf.ts)と同じ`tone`(color-mixで仮カバーを生成する
 * 手がかり)の考え方を踏襲している。
 *
 * GiftMethod: 選んだ本の贈り方の選択肢。受け皿(Amazonほしいものリスト
 * のURL等)が未確定のものはhrefを"#"のままにし、確定した導線
 * (お問い合わせ)と混在させている。研究を支えるページ(Decision Log
 * 0111)と同じ「受け皿が決まるまではお問い合わせに委ねる」考え方。
 *
 * LendCategory: 「場所・知識・技術を貸す」セクションの3項目。
 * ------------------------------------------------------------
 */

export interface GiftBookEntry {
  /** 本のタイトル */
  title: string;
  /** なぜこの本が読みたいか、一言(実在の著者名は確定情報がないため扱わない。src/types/bookshelf.tsと同じ方針) */
  reason: string;
  /** 仮カバーの色味の手がかり(GiftBookList.module.cssの.cover[data-tone]と対応) */
  tone: "warm" | "moss" | "sky";
}

export interface GiftMethod {
  /** 贈り方のラベル */
  label: string;
  /** 一言説明 */
  description: string;
  /** 遷移先。受け皿未定の場合は"#"のまま(GiftBookList.astro参照) */
  href: string;
}

export interface LendCategory {
  /** GiftBookList.module.css内のインラインSVGアイコンと対応する識別子 */
  icon: "place" | "knowledge" | "skill";
  title: string;
  description: string;
  linkHref: string;
}
