/**
 * bookshelf.ts
 * ------------------------------------------------------------
 * 「研究の本棚」セクション(2026-09-10のトップページ再設計で新設)が
 * 扱う項目の型。実在の書影画像はまだ用意していないため、`coverTone`
 * (tokens.cssの色から抽象的な仮カバーをcolor-mixで生成するための
 * 手がかり)で代用する(BookshelfList.astro参照)。将来、実際の書影
 * 画像を用意する場合は`coverImage`のようなprops追加で対応できる。
 * ------------------------------------------------------------
 */

export interface BookEntry {
  /** 本のタイトル */
  title: string;
  /** 読書状態を表す短いラベル。例: "読んでいる" / "積読" / "気になる" */
  label: string;
  /** 一言説明 */
  description: string;
  /** 仮カバーの色味の手がかり(BookshelfList.module.cssの.cover[data-tone]と対応) */
  tone: "warm" | "moss" | "sky";
}
