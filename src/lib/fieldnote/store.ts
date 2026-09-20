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
 *
 * 【抜粋・コメント・まとめを追加(2026-09-20、Decision Log 0187)】
 * 写真を伴わない記録(`addTextEntry`/`addUrlEntry`)、記録の抜粋・
 * ページ・つながりの後編集(`updateCapture`)、コメントの
 * 追加/編集/削除/一覧、まとめの作成/更新/削除/一覧、
 * バックアップの書き出し/読み込みを追加した。
 * ------------------------------------------------------------
 */
import type {
  FieldnoteCapture,
  FieldnoteCollection,
  FieldnoteComment,
  FieldnoteRelatedLink,
  FieldnoteSession,
} from "../../types/fieldnote";

/** 抜粋・ページ・つながりは、記録を作った後からいつでも修正できる(後編集を前提にした設計)。 */
export interface FieldnoteCaptureUpdate {
  excerptText?: string;
  pageLabel?: string;
  relatedLinks?: FieldnoteRelatedLink[];
}

/** バックアップの中身。写真はBase64文字列にして1つのJSONにまとめる(外部ライブラリを増やさない最小構成)。 */
export interface FieldnoteExportBundle {
  exportedAt: string;
  sessions: FieldnoteSession[];
  captures: Array<Omit<FieldnoteCapture, "image"> & { imageBase64?: string; imageType?: string }>;
  comments: FieldnoteComment[];
  collections: FieldnoteCollection[];
}

export interface FieldnoteImportResult {
  importedSessions: number;
  importedCaptures: number;
  importedComments: number;
  importedCollections: number;
  skipped: number;
}

export interface FieldnoteStore {
  createSession(title: string, bookId?: string, bookLocation?: string): Promise<FieldnoteSession>;
  endSession(sessionId: string): Promise<FieldnoteSession>;
  addCapture(sessionId: string, image: Blob): Promise<FieldnoteCapture>;
  /** 写真を伴わない、手入力のテキスト記録(本に紐付かないクイックメモにも使う) */
  addTextEntry(sessionId: string, excerptText: string): Promise<FieldnoteCapture>;
  /** URLだけの記録 */
  addUrlEntry(sessionId: string, url: string, urlTitle?: string): Promise<FieldnoteCapture>;
  /** 抜粋・ページ・つながりを後から修正する */
  updateCapture(captureId: string, patch: FieldnoteCaptureUpdate): Promise<FieldnoteCapture>;
  /** IDを指定して1件だけ取得する(「まとめ」がセッションをまたいで記録を参照するために使う) */
  getCapture(captureId: string): Promise<FieldnoteCapture | undefined>;
  listCaptures(sessionId: string): Promise<FieldnoteCapture[]>;
  /** 全セッションを新しい順で返す(進行中・終了済み問わず)。「過去の記録」一覧・本ごとの絞り込みに使う */
  listSessions(): Promise<FieldnoteSession[]>;

  addComment(captureId: string, body: string): Promise<FieldnoteComment>;
  updateComment(commentId: string, body: string): Promise<FieldnoteComment>;
  deleteComment(commentId: string): Promise<void>;
  listComments(captureId: string): Promise<FieldnoteComment[]>;

  createCollection(title: string, captureIds: string[]): Promise<FieldnoteCollection>;
  updateCollection(id: string, patch: Partial<Pick<FieldnoteCollection, "title" | "captureIds">>): Promise<FieldnoteCollection>;
  deleteCollection(id: string): Promise<void>;
  listCollections(): Promise<FieldnoteCollection[]>;

  exportAll(): Promise<FieldnoteExportBundle>;
  /** 既存IDと衝突する記録は上書きせずskipする(取り込みで既存データを壊さない) */
  importAll(bundle: FieldnoteExportBundle): Promise<FieldnoteImportResult>;
}
