/**
 * researchReviewListing.ts
 * ------------------------------------------------------------
 * /researchページの「研究断面」一覧が扱う2種類のエントリの型。
 *
 * 以前はResearch Reviews(公開済みの詳細カード)とResearch Fragments
 * (「Coming Soon」の別セクション)に分かれていたが、「研究断面」という
 * 1つのシリーズに統合した(2026-08-15、Decision Log 0033)。統合後も
 * 「公開済み」と「構想中」で見せ方が異なるため、型としては分けている。
 * ------------------------------------------------------------
 */

export interface PublishedReviewEntry {
  /** 例: "01" */
  number: string;
  /** 例: "『ふと』という日本語" */
  title: string;
  /** 例: "人と世界との関係が変化する瞬間" */
  subtitle: string;
  description: string;
  /** 例: "2026.08.15 更新" */
  updatedLabel: string;
  href: string;
}

export interface PlannedReviewEntry {
  /** 例: "02" */
  number: string;
  title: string;
  /** 例: "構想中" */
  stageLabel: string;
}
