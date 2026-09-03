/**
 * fieldnote.ts
 * ------------------------------------------------------------
 * Fieldnote Reading(最小プロトタイプ)が扱うデータ構造。
 * 保存先(端末内IndexedDB / 将来的なSupabase等)の実装に依存しない、
 * UIとストレージ実装の間で共有する形。
 * ------------------------------------------------------------
 */

export interface FieldnoteSession {
  id: string;
  /** 空文字も許容する(タイトル未入力での開始を妨げない)。 */
  title: string;
  startedAt: number;
  endedAt: number | null;
}

export interface FieldnoteCapture {
  id: string;
  sessionId: string;
  createdAt: number;
  image: Blob;
}
