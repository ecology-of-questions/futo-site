/**
 * store.ts
 * ------------------------------------------------------------
 * Fieldnote Readingの保存処理を抽象化するインターフェース。
 * UI(pages/fieldnote/app.ts)はこのインターフェースだけに依存する。
 * 今はIndexedDbFieldnoteStore(端末内保存)を使うが、将来Supabase等の
 * 実装に差し替える際も、このインターフェースを満たせばUI側の変更は
 * 不要(2026-09-02, Decision Log 0066)。
 *
 * 【本棚との紐づけ・過去のセッション一覧を追加(2026-09-20、Decision
 * Log 0185)】`createSession`にbookId/bookLocationを追加し、過去の
 * セッションを本で絞り込んで見られるよう`listSessions`を追加した。
 * ------------------------------------------------------------
 */
import type { FieldnoteCapture, FieldnoteSession } from "../../types/fieldnote";

export interface FieldnoteStore {
  createSession(title: string, bookId?: string, bookLocation?: string): Promise<FieldnoteSession>;
  endSession(sessionId: string): Promise<FieldnoteSession>;
  addCapture(sessionId: string, image: Blob): Promise<FieldnoteCapture>;
  listCaptures(sessionId: string): Promise<FieldnoteCapture[]>;
  /** 全セッションを新しい順で返す(進行中・終了済み問わず)。「過去の記録」一覧・本ごとの絞り込みに使う */
  listSessions(): Promise<FieldnoteSession[]>;
}
