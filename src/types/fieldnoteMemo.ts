/**
 * fieldnoteMemo.ts
 * ------------------------------------------------------------
 * 「Fieldnote」ノート詳細ページに埋め込む体験デモ
 * (`FieldnoteMemoDemo.astro`)のデータ型(2026-09-19、Decision Log
 * 0184)。プロジェクトオーナーが用意したアプリ構想のモックアップ
 * (Claude「Design」キャンバスで作成)を、サイト内で完結する静的な
 * デモとして移植するために新設した。
 *
 * 元のモックアップは1つのセッション("デューイ読書")のみ内容が
 * 詳しく、他5セッションは記録(entries)はあるが概要・まとめ・
 * 「育つ」は空だった。この型もその非対称のまま表現する
 * (架空の内容を補って埋めない)。
 *
 * 【記録の詳細を「抜粋・コメント・つながり」に刷新(2026-09-20、
 * Decision Log 0190、0184を一部supersede)】指示書「Fieldnote読書
 * 記録と公開本棚の統合 v3」の参考画像・再指示に基づき、記録詳細
 * (旧「AIが読んだこと」+「私のメモ」)を、実際に出荷した
 * `/fieldnote/`本体アプリの語彙(抜粋・コメント・つながり、Decision
 * Log 0187)に合わせた。AIによる自動読み取り("AIが読んだこと")は、
 * 実アプリに存在しない機能であり、デモでも扱わないことにした
 * (`reading`/`readingMeta`/`note`を廃止)。公開プレビューを見る
 * 体験(`publishQuote`/`publishReflection`)も追加した。
 * ------------------------------------------------------------
 */

export type FieldnoteEntryType = "photo" | "hand" | "audio" | "url" | "text";

/** アイコンは元モックアップのSVGパスをそのまま6種に限定して使う */
export type FieldnoteSessionIcon = "book" | "frame" | "smile" | "leaf" | "chat" | "pin";

export interface FieldnoteEntryComment {
  body: string;
  time: string;
}

export interface FieldnoteEntryConnection {
  label: string;
  /** `#entry:<id>`ならこのデモ内の別の記録を開く。それ以外はサイト内の実在パス。 */
  href: string;
}

export interface FieldnoteEntry {
  /** 一意のID */
  id: string;
  type: FieldnoteEntryType;
  /** 一覧の日付見出し(例: "今日・9月19日") */
  day: string;
  /** 表示用の時刻(例: "9:31") */
  time: string;
  /** photo/handの短い一言メモ */
  memo?: string;
  /** photoのみ: 枚数(2枚以上でバッジ表示) */
  count?: number;
  /** audioのみ: 長さ(例: "0:48") */
  duration?: string;
  /** audio/textの本文、urlのタイトル */
  text?: string;
  /** urlのタイトル */
  title?: string;
  /** urlのドメイン表示 */
  domain?: string;
  /** photo/handのみ: 抜粋(手入力の想定、空なら「まだ書いていません」を表示) */
  excerpt?: string;
  /** photo/handのみ: 抜粋に対するコメント(複数、自分だけが書く想定) */
  comments?: FieldnoteEntryComment[];
  /** photo/handのみ: 他の記録・サイト内の記録へのつながり */
  connections?: FieldnoteEntryConnection[];
}

export interface FieldnoteGrowingQuestion {
  text: string;
  /** true: 「育っている」、false: 「しばらく動いていない」 */
  growing: boolean;
  since: string;
  fromSessionsLabel: string;
}

export interface FieldnoteConnectedRecord {
  tags: string[];
  text: string;
}

export interface FieldnoteCrossSessionInsight {
  sessionsLabel: string;
  text: string;
}

export interface FieldnoteSession {
  id: string;
  title: string;
  icon: FieldnoteSessionIcon;
  updatedLabel: string;
  /** 公開プレビューの引用の出典表示に使う(例: "ジョン・デューイ『経験と教育』")。
   * 実在する本棚データ(`src/data/bookshelf.ts`)と一致させる。無ければ出典を出さない。 */
  bookCitation?: string;
  /** 空文字列なら「目的や範囲を短く書けます（任意）。」を表示する */
  overview: string;
  /** 空配列なら「ここに、自分の言葉でまとめを書けます。」を表示する */
  notes: string[];
  notesUpdatedLabel: string;
  growingQuestions: FieldnoteGrowingQuestion[];
  connectedRecord?: FieldnoteConnectedRecord;
  crossSessionInsight?: FieldnoteCrossSessionInsight;
  growUpdatedLabel: string;
  entries: FieldnoteEntry[];
}
