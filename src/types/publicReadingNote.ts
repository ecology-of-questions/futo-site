/**
 * publicReadingNote.ts
 * ------------------------------------------------------------
 * 「研究の本棚」で本人が明示的に公開した読書メモの型。個人用
 * Fieldnote Reading(`/fieldnote/`、端末内IndexedDB保存)のメモとは
 * 別物で、公開してよいと判断した内容だけを手動でこの型のデータとして
 * 追加する運用にする(`src/data/labNotebooks.ts`の訪問者投稿・
 * `src/data/bookshelf.ts`の`contributed`と同じ、手動キュレーション方式)。
 *
 * ビルド時にこの型のデータだけを読み込み、個人用の保存先(IndexedDB・
 * localStorage・将来のAPI等)には一切アクセスしない。
 *
 * 【形をFieldnoteの公開プレビューに合わせて変更(2026-09-20、Decision
 * Log 0187)】Fieldnote Reading(`src/lib/fieldnote/app.ts`の
 * `updatePublishOutput`)が実際に生成するデータ契約と一致させた。
 * `title`/`body`/`image`(Decision Log 0186時点の仮の形)を廃止し、
 * 「自分の考え」を主役に、任意で「本文の引用」と「関連記録」を添える
 * 形にした。写真そのもの・OCRの生データ・非公開のコメントはこの型に
 * 含まれない(公開プレビューUIが選んだ内容だけをこの形に変換する)。
 * ------------------------------------------------------------
 */

/** 関連記録へのリンク。サイト内の記録のみを想定する(公開プレビューUIが外部リンクを除外する)。 */
export interface PublicReadingNoteRelatedRecord {
  label: string;
  href: string;
}

export interface PublicReadingNote {
  /** 一意のID */
  id: string;
  /** `src/data/bookshelf.ts`の`BookEntry.id`を参照する(別の本リストを持たない) */
  bookId: string;
  /** 本人の考え・気づき(公開の主役)。改行はそのまま表示に反映する */
  authorReflection: string;
  /** 公開日(表示用、YYYY-MM-DD) */
  publishedAt: string;
  /** 本文からの引用(任意)。本人が明示的に含めると選んだ場合のみ */
  quote?: string;
  /** 引用の位置(ページ・章など、任意) */
  quoteLocation?: string;
  /** 関連記録(任意)。サイト内の記録へのリンクのみ */
  relatedRecords?: PublicReadingNoteRelatedRecord[];
}
