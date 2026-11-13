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
 *
 * 【中身が無いノートには詳細ページを持たせない(2026-09-26、Decision Log
 * 0192)】Fieldnote・研究断面をひらくは、entriesが空でGoogleスライドも
 * 無く、詳細ページ(`/participate/[slug]`)を開いても実質的な中身が
 * 無いままだった。`hasDetailPage()`は、実際の中身(現状はGoogleスライド
 * =`slidesEmbedUrl`)を持つノートだけを判定する。`/participate`一覧
 * (`LabNotebookList.astro`)はこの判定結果に応じてリンクの有無を
 * 切り替え、`[slug].astro`の`getStaticPaths`もこれでフィルタする
 * (中身の無いノートのページ自体を生成しない)。
 *
 * 【「頭上の記録」を追加、トップページの注目ノートに(2026-11-11)】
 * プロジェクトオーナーの指示により、4冊目のノート「頭上の記録」
 * (slug: zujo-no-kiroku)を追加した。自宅上空を飛ぶ飛行機・ヘリの音を
 * 暮らしの観察として記録する道具の制作記録で、その制作過程を綴る
 * 「制作ノート」連載を`/zujo/`に置く(まだ未実装、別タスクで追加)。
 * 他の3冊と異なりGoogleスライドを使わないため、`slidesEmbedUrl`は
 * 設定せず、代わりに`detailHref: "/zujo/"`で遷移先を明示している。
 * Homeの注目セクション(`src/pages/index.astro`の`featured`)も、
 * これまでの散歩譜(oto-no-michi)からこのノートに差し替えた。散歩譜
 * 自体はこの一覧に残り、`/participate/oto-no-michi`からも引き続き
 * 見られる(Homeで取り上げる1冊を変えただけで、削除ではない)。
 *
 * 【「頭上の記録」→「きょうの空」に改称、URLも変更(2026-11-11、
 * まだmainにマージ前のため同日2件目)】プロジェクトオーナーの指示に
 * より、表示名を「きょうの空」に変更した。このノートはまだ未公開
 * (本PRでの新規追加、過去のURL・被リンクが存在しない)ため、散歩譜の
 * 改称時(Decision Log 0182、slugは据え置き)とは異なり、今回は
 * slug・URLも`zujo-no-kiroku`/`/zujo/`から`kyou-no-sora`/
 * `/kyou-no-sora/`に合わせて変更した。制作ノート一覧も
 * `src/pages/zujo/`から`src/pages/kyou-no-sora/`に移動している。
 *
 * 【「きょうの空」→「そらのようす」に改称、本番公開(2026-11-13)】
 * プロジェクトオーナーが別途ドラフトした利用規約・プライバシーポリシー
 * (そのものはfuto-siteの外、別プロジェクトの文書)がこのアプリを
 * 「そらのようす」と呼んでいたため、futo-site側の表記をそちらに
 * 合わせて統一した。あわせて、体験デモ(架空データ・保存されない)から
 * 本番(Cloudflare Worker + D1に実際の記録を保存・公開)に切り替えた。
 * slug・URLは今回もまだ未公開のため`kyou-no-sora`/`/kyou-no-sora/`から
 * `sora-no-yousu`/`/sora-no-yousu/`に変更した。詳細はDecision Log 0216
 * 参照。
 * ------------------------------------------------------------
 */
import type { LabNotebook } from "@/types/labNotebook";

export const commonNotebookDescription =
  "このノートでは、つくっている途中の考えや試したことをひらいています。";

export const labNotebooks: LabNotebook[] = [
  {
    slug: "sora-no-yousu",
    category: "アプリ",
    title: "そらのようす",
    description: "頭上を飛ぶ飛行機やヘリの音を、暮らしの観察として記録する道具です。",
    tone: "sky",
    entries: [],
    detailHref: "/sora-no-yousu/",
  },
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

/**
 * このノートに個別の詳細ページ(/participate/[slug])を持たせてよいか。
 * entriesは現状すべて空で中身にならないため、実際の中身として扱うのは
 * Googleスライド(`slidesEmbedUrl`)のみ(2026-09-26、Decision Log
 * 0192)。中身が無いノートは`/participate`一覧にタイトル・説明のみ
 * 表示し、リンクにしない。
 */
export function hasDetailPage(notebook: LabNotebook): boolean {
  return Boolean(notebook.slidesEmbedUrl);
}

/**
 * Googleスライドの埋め込み用URL(「ウェブに公開」で取得したもの)に、
 * 自動再生・ループを明示的に無効化するクエリを付加する。URLとして
 * 解釈できない値は、壊れたiframeを作らないようnullを返す(呼び出し側で
 * 区画自体を表示しない)。[slug].astro(散歩譜)・そらのようすのページ
 * (/sora-no-yousu/)の両方から参照するため、ここに置いている
 * (2026-09-17導入、2026-11-11に2箇所目の呼び出し元ができたため
 * labNotebooks.tsに切り出した)。
 */
export function buildSlidesEmbedSrc(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    url.searchParams.set("start", "false");
    url.searchParams.set("loop", "false");
    return url.toString();
  } catch {
    return null;
  }
}
