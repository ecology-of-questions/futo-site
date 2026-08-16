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
 *
 * 【2026-08-16追記】研究断面01の本文改訂(要旨・番号付き節・仮説の
 * 小見出し・古典文学の引用・定義の引用・図版を含む学術的な構成)に
 * 合わせ、QuoteBlock・SubheadingBlock・ImageBlockを追加した
 * (Decision Log 0036)。
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

/** 引用・定義文。字下げ+左罫線で本文と区別して表示する */
export interface QuoteBlock {
  type: "quote";
  text: string;
}

/** セクション見出し(h2)より一段小さい小見出し(h3)。例: 「仮説1 ...」 */
export interface SubheadingBlock {
  type: "subheading";
  text: string;
}

/**
 * 図版。altは代替テキストとして必須(装飾目的の場合も内容を説明する)。
 * float: "right"を指定すると、Desktop幅でセクション右上に回り込み
 * 配置される(Mobile幅では通常の中央配置に戻る、2026-08-16)。
 */
export interface ImageBlock {
  type: "image";
  src: string;
  alt: string;
  width: number;
  height: number;
  float?: "right";
}

export type ContentBlock =
  | ParagraphBlock
  | ListBlock
  | TableBlock
  | QuoteBlock
  | SubheadingBlock
  | ImageBlock;

export interface ReviewSection {
  heading: string;
  blocks: ContentBlock[];
}
