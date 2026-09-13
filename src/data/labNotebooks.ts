/**
 * labNotebooks.ts
 * ------------------------------------------------------------
 * 「実験室」(/participate)が表示する3冊のノートのcanonical data
 * (2026-09-13、Decision Log 0140)。`/participate`(表紙一覧)と
 * `/participate/[slug]`(ノート詳細、共通テンプレート1ファイルが
 * 3つのslugを生成する)の両方がこの配列を参照する。二重管理はしない。
 *
 * `commonNotebookDescription`は、3冊すべてのノート詳細ページに
 * 共通で表示する説明文(2026-09-13の指示により、ノートごとの文言では
 * なく1つの共通文言として管理する)。
 *
 * 各ノートの`entries`は、現時点では空(実際の投稿・「ふ、と」自身の
 * 制作記録はまだ無いため)。訪問者からの投稿(Formspree経由)は
 * 自動反映せず、「ふ、と」が内容を確認し掲載してよいと判断した
 * ものだけを、この配列に手動で追加する運用にしている
 * (`src/types/labNotebook.ts`参照)。
 * ------------------------------------------------------------
 */
import type { LabNotebook } from "@/types/labNotebook";

export const commonNotebookDescription =
  "このノートでは、つくっている途中の考えや試したことをひらいています。読んで、ふと思い出したことがあれば書き足せます。";

export const labNotebooks: LabNotebook[] = [
  {
    slug: "oto-no-michi",
    category: "実験",
    title: "音の道",
    description:
      "誰かがどこで立ち止まり、何に気づいたのか。その人の注意の道筋を、音から辿るためのツールをつくっています。",
    tone: "warm",
    entries: [],
  },
  {
    slug: "fieldnote",
    category: "アプリ",
    title: "Fieldnote",
    description:
      "日常の小さな気づきを記録するだけでなく、そこから考えたり、別の何かと出会ったりするためのツールをつくっています。",
    tone: "moss",
    entries: [],
  },
  {
    slug: "research-fragments",
    category: "企画",
    title: "研究断面をひらく",
    description: "書いてきた「研究断面」を、実際の場所でひらき、展示したり、話したりする企画を考えています。",
    tone: "sky",
    entries: [],
  },
];
