/**
 * productionNote.ts
 * ------------------------------------------------------------
 * 「きょうの空 制作ノート」(/kyou-no-sora/、旧名「頭上の記録」)の型。研究断面
 * (src/types/researchReview.ts)のブロック型をそのまま再利用し、
 * 本文を「見出し→本文→箇条書き→図版」のブロックで表現する
 * (車輪の再発明をしない)。
 *
 * 制作ノートの各回は、必ず次の4つの見出しのsectionsで構成する約束
 * (CLAUDE.mdの指示書参照): 問い/やったこと/気づいたこと/次にやること。
 * ただし型としては研究断面と同じ汎用的なReviewSection[]のままにして
 * あり、見出しの固定はデータを書く側の運用で守る(型レベルで4つに
 * 固定すると、将来見出しを増減したくなった際に型変更が必要になる
 * ため)。
 * ------------------------------------------------------------
 */
import type { ReviewSection } from "./researchReview";

export interface ProductionNoteEntry {
  /** 例: "01" */
  number: string;
  /** 例: "きょうの空をつくり始めた" */
  title: string;
  /** 一覧に表示する一行の要約 */
  summary: string;
  /** 例: "2026.11.11" */
  publishedLabel: string;
  /** /kyou-no-sora/01 等 */
  href: string;
  /** 本文 */
  sections: ReviewSection[];
  /** 関連リンク(連載の回、公開アプリ等)。まだ無ければ省略する */
  relatedLinks?: { label: string; href: string }[];
}
