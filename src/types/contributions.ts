/**
 * contributions.ts
 * ------------------------------------------------------------
 * 「持ち寄られたもの」(/participate)が扱うデータ型(2026-09-11、
 * Decision Log 0128)。
 *
 * 「何かを持ち寄る」フォーム(Formspree)から届いた投稿のうち、
 * 投稿者が公開に同意し、かつ運営側が内容を確認して問題ないと判断した
 * ものだけを、このファイルの姉妹ファイル`src/data/contributions.ts`に
 * 手動で追加する運用にしている(Formspreeからの自動取得・自動公開は
 * 行わない、Decision Log 0128参照)。
 *
 * 個人情報を公開しない方針のため、この型には投稿者名・メール
 * アドレス等の連絡先フィールドを一切持たせていない。「誰が持ち寄った
 * か」ではなく「何が持ち寄られたか」だけを表現する構造にすることで、
 * 実装上も個人情報が公開データに混ざりようがないようにしている。
 * ------------------------------------------------------------
 */

/**
 * 持ち寄られたものの種類。分類UIは複雑にせず、一覧表示の小さな
 * ラベル(表示名はcontributionTypeLabelsで一元管理)としてのみ使う。
 */
export type ContributionType =
  | "book"
  | "article"
  | "person"
  | "place"
  | "project"
  | "event"
  | "other";

export const contributionTypeLabels: Record<ContributionType, string> = {
  book: "本",
  article: "記事",
  person: "人",
  place: "場所",
  project: "プロジェクト",
  event: "イベント",
  other: "その他",
};

export interface Contribution {
  /** 一意のID。ファイル内で採番する(例: "2026-09-c01") */
  id: string;
  title: string;
  type: ContributionType;
  /** 紹介先の外部リンク。存在する場合のみ「見る→」を表示する */
  url?: string;
  /** 短い説明・一言。任意 */
  note?: string;
  /** 掲載日(表示はしないが、将来の並び替え・記録用に保持する) */
  publishedAt: string;
  /**
   * サイト上に表示してよいか。falseの投稿は一覧に出さない
   * (このファイルに追加する時点で公開可否を確認済みのはずだが、
   * 掲載後に取り下げたい場合等にfalseへ切り替えられるようにしている)。
   */
  visible: boolean;
}
