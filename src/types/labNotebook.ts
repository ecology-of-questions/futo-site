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
 *
 * 【Googleスライド埋め込み(2026-09-17、Decision Log 0171)】各ノートに
 * 任意でGoogleスライドを埋め込めるよう、`slidesEmbedUrl`・
 * `slidesCommentUrl`を追加した(旧Miro埋め込み構想の置き換え。当時
 * Miroの実装自体は無く、コメントのみだった)。2つのURLは意図的に
 * 別フィールドにしている(「ウェブに公開」の埋め込み専用URLと、
 * コメント可能な共有URLは、Google側でも別の設定・別のURLのため)。
 * どちらも未設定の場合、[slug].astroはスライド区画自体を描画しない
 * (架空のURLを入れない、壊れたiframeを表示しない方針)。
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
  /**
   * Googleスライドの「ファイル→共有→ウェブに公開」で取得する埋め込み用
   * URL(iframeのsrcにそのまま使う)。`slidesCommentUrl`が無くても単独で
   * 設定できる。未設定の場合、このノートにはスライド区画自体を表示
   * しない。自動再生・ループは[slug].astro側で明示的に無効化する
   * (この値にstart/loopのクエリが含まれていても上書きする)。
   */
  slidesEmbedUrl?: string;
  /**
   * Googleスライド本体の共有URL(コメント可能な権限にしたもの)。
   * 「この断面にコメントを置く→」リンクの遷移先として、別タブで開く。
   * `slidesEmbedUrl`とは独立して設定する(埋め込み用の「ウェブに公開」
   * URLでは、コメント可能な共有URLを兼ねられないため)。
   */
  slidesCommentUrl?: string;
  /**
   * 公開サイトに出すかどうか(2026-09-26、Decision Log 0187)。省略時は
   * true扱い。falseのノートは、`/participate`一覧・トップページ・他の
   * ノート詳細ページの「他のノートを見る」・研究断面の関連リンクの
   * どこにも現れず、`/participate/[slug]`の静的ページ自体も生成
   * されない(未生成のURLはCloudflare Workers Static Assetsの
   * `not_found_handling = "404-page"`によりそのまま404になる)。
   * データ(entries・slidesEmbedUrl等)は削除せず、この値をtrueに
   * 戻すだけで再公開できる。`labNotebooks.ts`の`publishedLabNotebooks`
   * を参照する側だけがこのフラグを見ればよく、各ページ側で
   * slugを個別に判定する必要はない。
   */
  published?: boolean;
}
