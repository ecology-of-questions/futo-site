/**
 * fieldnote.ts
 * ------------------------------------------------------------
 * Fieldnote Reading(最小プロトタイプ)が扱うデータ構造。
 * 保存先(端末内IndexedDB / 将来的なSupabase等)の実装に依存しない、
 * UIとストレージ実装の間で共有する形。
 *
 * 【本棚との紐づけを追加(2026-09-20、Decision Log 0185)】
 * `bookId`/`bookLocation`はどちらも任意。既存セッション(この2つの
 * フィールドを持たない)もそのまま読み込める前提で、必ず`undefined`を
 * 許容する形にしている(IndexedDBのスキーマ自体は変更していない。
 * 単に新しいセッションからこのフィールドを書き込むだけ)。
 * ------------------------------------------------------------
 */

export interface FieldnoteSession {
  id: string;
  /** 空文字も許容する(タイトル未入力での開始を妨げない)。 */
  title: string;
  startedAt: number;
  endedAt: number | null;
  /** 紐づけた本のID(`src/data/bookshelf.ts`の`BookEntry.id`)。本を選ばずに始めたセッションはundefined */
  bookId?: string;
  /** 本の中のどのあたりか、自由記述(例: "p.32-34"、"第2章")。bookIdが無い場合は意味を持たない */
  bookLocation?: string;
}

export interface FieldnoteCapture {
  id: string;
  sessionId: string;
  createdAt: number;
  image: Blob;
}
