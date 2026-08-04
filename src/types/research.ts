/**
 * research.ts
 * ------------------------------------------------------------
 * 「研究状態」を表す共有の型。
 *
 * ResearchCard は「出版状態(公開されているかどうか)」ではなく、
 * 「研究状態(今どの段階にあるか)」を表すことにした
 * (2026-08-04 フィードバックより。Decision Log 0005参照)。
 *
 * Research Review に限らず、Research Fragment など将来増える
 * 研究成果全般で共通して使うことを想定し、コンポーネントから
 * 独立した型としてここに置く。
 *
 * 現時点で実際に使うのは "preparing" のみ。他のステータスは
 * 将来の拡張を見込んで型・ラベルだけ先に用意しておく。
 * ------------------------------------------------------------
 */

export type ResearchStatus =
  | "preparing" // 準備中。まだ何も定まっていない段階
  | "reading" // 観察・収集の段階
  | "writing" // 言語化を進めている段階
  | "reviewing" // 見直し・推敲の段階
  | "published" // 公開済み
  | "archived"; // 過去のものとして残す段階

export const researchStatusLabel: Record<ResearchStatus, string> = {
  preparing: "Preparing",
  reading: "Reading",
  writing: "Writing",
  reviewing: "Reviewing",
  published: "Published",
  archived: "Archived",
};
