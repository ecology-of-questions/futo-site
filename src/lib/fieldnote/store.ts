/**
 * store.ts
 * ------------------------------------------------------------
 * Fieldnote Readingの保存処理を抽象化するインターフェース。
 * UI(pages/fieldnote/app.ts)はこのインターフェースだけに依存する。
 * 今はIndexedDbFieldnoteStore(端末内保存)を使うが、将来Supabase等の
 * 実装に差し替える際も、このインターフェースを満たせばUI側の変更は
 * 不要(2026-09-02, Decision Log 0058)。
 * ------------------------------------------------------------
 */
import type { FieldnoteCapture, FieldnoteSession } from "../../types/fieldnote";

export interface FieldnoteStore {
  createSession(title: string): Promise<FieldnoteSession>;
  endSession(sessionId: string): Promise<FieldnoteSession>;
  addCapture(sessionId: string, image: Blob): Promise<FieldnoteCapture>;
  listCaptures(sessionId: string): Promise<FieldnoteCapture[]>;
}
