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
 *
 * 【2026-08-16追記2】図版・表をfloatで回り込ませる方式(Decision Log
 * 0038〜0040)を経て、最終的にRowBlockで図版・表を横並びに配置する
 * 方式に落ち着いた(Decision Log 0041)。floatは使っていない。
 *
 * 【2026-09-03追記(Decision Log 0073)】ImageBlockに`inlineSvg`を
 * 追加した。SVG図版を<img src>での外部参照ではなくDOMにインライン
 * 展開することで、SVG側の色をcurrentColorにでき、ページの文字色
 * (--color-ink、夜空テーマでは--color-paperに反転)へ自動的に
 * 追従できるようにした。詳細はDecision Log 0073参照。
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

/** 図版。altは代替テキストとして必須(装飾目的の場合も内容を説明する) */
export interface ImageBlock {
  type: "image";
  src: string;
  alt: string;
  width: number;
  height: number;
  /**
   * trueの場合、srcのSVGファイルをDOMにインライン展開する
   * (2026-09-03、Decision Log 0073)。SVG側の色をcurrentColorに
   * しておくことで、ページの文字色(夜空テーマでの反転を含む)に
   * 自動的に追従できる。<img src>での外部参照はホストページの
   * CSS変数・currentColorを継承しないため、これが必要な図版
   * (線・文字に単色を使うシンプルな図)にのみ使う。
   */
  inlineSvg?: boolean;
}

/**
 * 図版・表などを横に並べて配置する行(2026-08-16、Decision Log 0041)。
 * 1列目(items[0])が可変幅、2列目(items[1])が図版の実サイズに応じた
 * 固定幅になる。Mobile幅では縦に積み重ねる。
 */
export interface RowBlock {
  type: "row";
  items: [TableBlock | ImageBlock, TableBlock | ImageBlock];
}

export type ContentBlock =
  | ParagraphBlock
  | ListBlock
  | TableBlock
  | QuoteBlock
  | SubheadingBlock
  | ImageBlock
  | RowBlock;

export interface ReviewSection {
  heading: string;
  blocks: ContentBlock[];
}
