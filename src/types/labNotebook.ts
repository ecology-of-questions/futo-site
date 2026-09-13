/**
 * labNotebook.ts
 * ------------------------------------------------------------
 * 「実験室」(/participate)が扱うノートの型(2026-09-13、Decision Log
 * 0140)。旧「持ち寄られたもの」(`src/types/contributions.ts`、
 * Decision Log 0128)は、実験室を「3冊のノート」という構造に作り替えた
 * ことに伴い、各ノートの`entries`に役割を統合したため廃止した。
 *
 * 【ノートの考え方】各ノートは、見出し(category/title)と「いま
 * つくっているもの」の説明を持ち、そこに「ふ、と」自身の制作記録
 * (kind: "studio")と、訪問者が書き残した記録(kind: "visitor")が、
 * 同じ時系列(`entries`)に積み重なっていく。交換ノートのように、
 * どちらのentryも同じ見た目・同じ並びで表示し、セクションを分けない
 * (2026-09-13の指示)。
 *
 * 訪問者からの投稿(Formspree経由)は自動反映しない。「ふ、と」が
 * 内容を確認し、掲載してよいと判断したものだけを、この配列に手動で
 * 追加する(既存の`src/data/contributions.ts`と同じ手動運用、
 * Decision Log 0128を踏襲)。個人情報(投稿者名・メールアドレス等)は
 * 収集していないため、`NotebookEntry`にも該当フィールドを持たせて
 * いない。
 * ------------------------------------------------------------
 */

/** ノートの表紙のトーン。BookshelfFullList.module.cssと同じ3色を再利用する。 */
export type NotebookTone = "warm" | "moss" | "sky";

export interface NotebookEntry {
  /** 一意のID。ファイル内で採番する(例: "2026-09-e01") */
  id: string;
  /** 誰の記録か。表示上は同じ見た目で扱うが、将来の運用・並び替えのために区別しておく */
  kind: "studio" | "visitor";
  /** 本文 */
  body: string;
  /** どんなときに思い出したか。任意(主にvisitor向け) */
  context?: string;
  /** 添えられたURL。存在する場合のみ静かなリンクとして表示する */
  url?: string;
  /** 記録日(表示はしないが、並び替え・記録用に保持する。contributions.tsのpublishedAtと同じ考え方) */
  publishedAt: string;
  /**
   * サイト上に表示してよいか。falseのentryは一覧に出さない
   * (studioの記録は基本true、visitorからの投稿は確認後にtrueへ切り替える)。
   */
  visible: boolean;
}

export interface LabNotebook {
  /** URLの一部になる識別子(例: "oto-no-michi"、/participate/oto-no-michi) */
  slug: string;
  /** 実験の種別を示す短いラベル(例: "実験"/"アプリ"/"企画") */
  category: string;
  /** ノート名 */
  title: string;
  /** 現在つくっているもの・考えていること */
  description: string;
  /** 表紙のトーン */
  tone: NotebookTone;
  /** このノートの時系列記録。studio/visitorを問わず同じ配列・同じ並びで管理する */
  entries: NotebookEntry[];
}
