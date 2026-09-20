/**
 * publicReadingNote.ts
 * ------------------------------------------------------------
 * 「研究の本棚」で本人が明示的に公開した読書メモの型(2026-09-20、
 * Decision Log 0186)。個人用Fieldnote Reading(`/fieldnote/`、端末内
 * IndexedDB保存)のメモとは別物で、公開してよいと判断した内容だけを
 * 手動でこの型のデータとして追加する運用にする(`src/data/labNotebooks.ts`
 * の訪問者投稿・`src/data/bookshelf.ts`の`contributed`と同じ、手動
 * キュレーション方式)。
 *
 * ビルド時にこの型のデータだけを読み込み、個人用の保存先(IndexedDB・
 * localStorage・将来のAPI等)には一切アクセスしない。
 * ------------------------------------------------------------
 */

export interface PublicReadingNote {
  /** 一意のID */
  id: string;
  /** `src/data/bookshelf.ts`の`BookEntry.id`を参照する(別の本リストを持たない) */
  bookId: string;
  /** メモの見出し */
  title: string;
  /** 本文。改行はそのまま表示に反映する */
  body: string;
  /** 公開日(表示用、YYYY-MM-DD) */
  publishedAt: string;
  /** 公開してよいと判断した画像のURLのみ(任意)。私的な写真を自動で使わない */
  image?: string;
}
