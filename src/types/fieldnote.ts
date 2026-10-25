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
 *
 * 【抜粋・コメント・まとめ・つながりを追加(2026-09-20、Decision Log
 * 0187)】指示書「Fieldnote読書記録と公開本棚の統合 v3」に基づき、
 * `FieldnoteCapture`(1件の記録)を「写真を撮った記録」専用の型から、
 * 「写真・手入力の抜粋・URLのいずれかを起点にした記録」に拡張した。
 * 既存の`captures` object store(keyPath: "id")はそのまま使い、新しい
 * フィールドは全て任意にしている(既存レコード=`kind`未設定のものは
 * 読み込み側で"photo"として扱う、下記`FieldnoteEntryKind`参照)。
 * `FieldnoteComment`/`FieldnoteCollection`は新設の型で、それぞれ
 * 新しいobject store(`comments`/`collections`)に対応する。
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

/** 記録の起点。既存データ(この値を持たない)は"photo"として扱う(下位互換)。 */
export type FieldnoteEntryKind = "photo" | "text" | "url";

/** 他の記録・外部の記録への手動のつながり。理由の入力は必須にしない。 */
export interface FieldnoteRelatedLink {
  /** 表示用ラベル(例: 「散歩譜｜雨上がりの帰り道」) */
  label: string;
  /** サイト内外どちらのURLでもよい(例: /participate/oto-no-michi) */
  href: string;
}

export interface FieldnoteCapture {
  id: string;
  sessionId: string;
  createdAt: number;
  /** 起点の種類。未設定(既存データ)は"photo"扱い */
  kind?: FieldnoteEntryKind;
  /** kind: "photo"のみ。写真そのものは常に折りたためる形で表示し、抜粋テキストを主役にする */
  image?: Blob;
  /** kind: "url"のみ、参照先 */
  url?: string;
  /** kind: "url"のみ、任意のタイトル */
  urlTitle?: string;
  /** 手入力の抜粋・自分の考え。空のまま保存できる(OCR等の自動抽出はしない、手動入力のみ) */
  excerptText?: string;
  /** ページ・位置、自由記述(例: "p.32", "第2章")。空欄のまま保存できる */
  pageLabel?: string;
  /** 他の記録・外部記録への手動のつながり */
  relatedLinks?: FieldnoteRelatedLink[];
}

export interface FieldnoteComment {
  id: string;
  captureId: string;
  body: string;
  createdAt: number;
  updatedAt?: number;
}

/** 複数の記録を手動でまとめたもの。まとめても元の記録の本文は書き換えない(参照のみ保持)。 */
export interface FieldnoteCollection {
  id: string;
  title: string;
  /** 表示順を保つ配列。参照先が削除された場合は表示時に読み飛ばす */
  captureIds: string[];
  createdAt: number;
  updatedAt?: number;
}
