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
 *
 * 【Googleスライド埋め込み(2026-09-17、Decision Log 0171)】
 * `slidesEmbedUrl`/`slidesCommentUrl`は、Google側で「ウェブに公開」の
 * 埋め込みURLと、コメント可能な共有URLを発行したノートにのみ設定する。
 * 未設定のノートにはスライド区画自体が表示されない([slug].astro
 * 参照)。
 *
 * 【「音の道」にURLを設定(2026-09-17、Decision Log 0172)】プロジェクト
 * オーナーから提供された実URLを設定した。他の2冊(Fieldnote・研究断面
 * をひらく)はまだ未設定。
 *
 * 【「音の道」→「散歩譜」に改称(2026-09-18、Decision Log 0182)】
 * プロジェクトオーナーが承認した方向に沿って、表示名・descriptionを
 * 「散歩譜」に更新した。route slug(oto-no-michi)・データID・保存キー・
 * コメントリンク・Slides URLは変更していない(指示書「散歩譜＋支援」v2
 * のURL移行方針)。過去のDecision Log(0171・0172・0173等)の本文は
 * 「音の道」表記のまま残す(履歴改変はしない)。
 *
 * 【commonNotebookDescriptionの古い文言を削除(2026-09-26、Decision Log
 * 0191)】交換ノート機能撤去(Decision Log 0178)後も残っていた「読んで、
 * ふと思い出したことがあれば書き足せます。」を削除した。書き足す機能は
 * 既に存在しないため。
 * ------------------------------------------------------------
 */
import type { LabNotebook } from "@/types/labNotebook";

export const commonNotebookDescription =
  "このノートでは、つくっている途中の考えや試したことをひらいています。";

export const labNotebooks: LabNotebook[] = [
  {
    slug: "oto-no-michi",
    category: "実験",
    title: "散歩譜",
    description: "歩く、止まる、待つ。散歩の時間を、音と動きで記す。",
    tone: "warm",
    entries: [],
    // Googleスライド「ウェブに公開」の埋め込みURL(2026-09-17設定)
    slidesEmbedUrl:
      "https://docs.google.com/presentation/d/e/2PACX-1vR3mNN6yjbJ4JhPRUGYBJU3Gk1gI3pD9P4DgFAjrEUdez91wJT8v4NM2iBz2__hvSr4j4ycT4oO5Wxp/pubembed",
    // Googleスライド本体の共有URL(コメント用リンクの遷移先。コメント権限は要確認、Decision Log 0172参照)
    slidesCommentUrl: "https://docs.google.com/presentation/d/17KEP9gTbx0sFl_UM7WGhpYP-GycxofCt6ucEDVRcveY/edit?usp=drive_link",
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
