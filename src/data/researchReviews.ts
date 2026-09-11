/**
 * researchReviews.ts
 * ------------------------------------------------------------
 * 「研究断面」(Research Review)の公開済み・構想中エントリのcanonical
 * data。以前は`src/pages/research.astro`にのみ直接ハードコードして
 * いたが、トップページ「いま考えていること」セクションが最新の1件を
 * 表示する必要が生じたため、この1ファイルに切り出して
 * `/research`(一覧)とHome(最新1件のプレビュー)の両方から共有する
 * (2026-09-11、Decision Log 0125)。
 *
 * publishedReviewsは公開順(古い→新しい)で並べること。Homeの
 * 「いま考えていること」はこの配列の末尾(最新)を表示するため、
 * 順序が崩れると表示される記事も変わる。
 * ------------------------------------------------------------
 */
import type {
  PlannedReviewEntry,
  PublishedReviewEntry,
} from "@/types/researchReviewListing";

export const publishedReviews: PublishedReviewEntry[] = [
  {
    number: "01",
    title: "『ふと』という日本語",
    subtitle: "身体、知覚、記憶、思考を横断する言葉",
    description:
      "「ふと」は、もともと身体の動きを表す言葉だった。そこから、なぜ記憶や思考を表す言葉になったのか。辞書や古典、日本語研究をたどります。",
    updatedLabel: "2026.08.15 更新",
    href: "/research/reviews/01",
  },
  {
    number: "1.5",
    title: "なぜ私たちは、ある瞬間に「ふと」気づくのか",
    subtitle: "その手前にある経験と時間",
    description:
      "「ふと」気づく一瞬だけを見ても、その理由はわからない。その手前には、どんな経験や時間が重なっているのか。いくつかの研究を行き来しながら考えます。",
    updatedLabel: "2026.09.03 更新",
    href: "/research/reviews/1-5",
  },
];

export const plannedReviews: PlannedReviewEntry[] = [
  { number: "02", title: "認識の変化と言語の生態系", stageLabel: "構想中" },
  { number: "03", title: "世界はどのように見えてくるのか", stageLabel: "構想中" },
];
