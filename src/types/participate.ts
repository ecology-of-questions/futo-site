/**
 * participate.ts
 * ------------------------------------------------------------
 * 「関わる」ページ(/participate)が扱うデータ型のうち、本棚とは
 * 無関係なもの。
 *
 * 【2026-09-11、本関連の型を削除(Decision Log 0117)】このファイルに
 * あった本関連の型(旧GiftBookEntry→ParticipateBookEntry、
 * BookStatus、bookStatusLabels)は、`/bookshelf`・Home・`/participate`
 * の3箇所で本のデータを共有する方針転換に伴い、`src/types/bookshelf.ts`
 * の`BookEntry`に統合した。`/participate`側で本の型が必要な場合は
 * `@/types/bookshelf`から直接importする。
 * ------------------------------------------------------------
 */

export interface LendCategory {
  /** participate.astro内のインラインSVGアイコンと対応する識別子(本棚とは無関係) */
  icon: "place" | "info" | "skill";
  title: string;
  description: string;
  linkHref: string;
}
