/**
 * researchReview.ts
 * ------------------------------------------------------------
 * Research Review詳細ページ(研究断面01〜)の本文を構成する
 * コンテンツブロックの型。ResearchReviewArticleコンポーネントが
 * この型のsectionsを受け取り、元原稿の構造(見出し→本文→箇条書き→表)
 * をそのまま表示する(2026-08-15、Decision Log 0030)。
 *
 * status(ResearchStatus)と同様、コンポーネントから独立させて
 * ここに置く。02以降のReviewページも同じ型・同じコンポーネントを
 * 再利用する想定。
 * ------------------------------------------------------------
 */

export interface ParagraphBlock {
  type: "paragraph";
  text: string;
}

export interface ListBlock {
  type: "list";
  items: string[];
}

export interface TableBlock {
  type: "table";
  headers: string[];
  rows: string[][];
}

export type ContentBlock = ParagraphBlock | ListBlock | TableBlock;

export interface ReviewSection {
  heading: string;
  blocks: ContentBlock[];
}
