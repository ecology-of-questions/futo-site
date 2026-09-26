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
 *
 * 【関連コンテンツ・前後記事の解決ヘルパーを追加(2026-09-16、
 * Decision Log 0152)】v0.1公開仕様に基づき、研究断面詳細ページに
 * 「この断面のそばにあるもの」(本棚・実験室への関連リンク)と、前後の
 * 断面への導線を追加した。関連付けは、各記事が実際に本文・参考文献で
 * 言及している本(`src/data/bookshelf.ts`)、または内容が対応する
 * 実験室のノート(`src/data/labNotebooks.ts`)のみを`relatedBookIds`/
 * `relatedNotebookSlugs`として明記する運用にした(架空の関連付けを
 * 作らない)。`getRelatedContent()`はidが実データ側に存在しない場合
 * 自動的に除外するため、bookshelf.ts/labNotebooks.ts側でデータが
 * 削除されても壊れたリンクにはならない。
 *
 * 【公開停止中のノートは関連リンクにも出さない(2026-09-26、Decision
 * Log 0187)】ノート解決には`labNotebooks`の生配列ではなく
 * `publishedLabNotebooks`(`published: false`を除いたもの)を使う。
 * 公開停止中のノートのslugを将来`relatedNotebookSlugs`に書いても、
 * 再公開するまでは自動的に除外される。
 * ------------------------------------------------------------
 */
import type {
  PlannedReviewEntry,
  PublishedReviewEntry,
} from "@/types/researchReviewListing";
import { books } from "@/data/bookshelf";
import { publishedLabNotebooks } from "@/data/labNotebooks";
import type { BookEntry } from "@/types/bookshelf";
import type { LabNotebook } from "@/types/labNotebook";

export const publishedReviews: PublishedReviewEntry[] = [
  {
    number: "01",
    title: "『ふと』という日本語",
    subtitle: "身体、知覚、記憶、思考を横断する言葉",
    description:
      "「ふと」は、もともと身体の動きを表す言葉だった。そこから、なぜ記憶や思考を表す言葉になったのか。辞書や古典、日本語研究をたどります。",
    updatedLabel: "2026.08.15 更新",
    href: "/research/reviews/01",
    // 本文末尾「参考文献・参照資料」で実際に引用している本(李澤熊
    // 『現代日本語における意図性副詞の意味研究』)。
    relatedBookIds: ["ito-sei-fukushi"],
    // 「研究断面をひらく」ノートは、書いてきた研究断面を実際の場所で
    // ひらき展示・対話する企画であり、研究断面という内容そのものを
    // 対象にしているため、全ての公開済み断面に共通して関連する。
    relatedNotebookSlugs: ["research-fragments"],
  },
  {
    number: "1.5",
    title: "なぜ私たちは、ある瞬間に「ふと」気づくのか",
    subtitle: "その手前にある経験と時間",
    description:
      "「ふと」気づく一瞬だけを見ても、その理由はわからない。その手前には、どんな経験や時間が重なっているのか。いくつかの研究を行き来しながら考えます。",
    updatedLabel: "2026.09.03 更新",
    href: "/research/reviews/1-5",
    // この記事の本文・参考文献に、bookshelf.ts側の本との一致は
    // 確認できなかったため、relatedBookIdsは設定しない。
    relatedNotebookSlugs: ["research-fragments"],
  },
];

export const plannedReviews: PlannedReviewEntry[] = [
  { number: "02", title: "認識の変化と言語の生態系", stageLabel: "構想中" },
  { number: "03", title: "世界はどのように見えてくるのか", stageLabel: "構想中" },
];

export interface ReviewNavEntry {
  number: string;
  title: string;
  href: string;
}

/** 指定した番号(例: "01"、"1.5")の前後の公開済み断面を返す。
    最初/最後の記事では該当する側がundefinedになる。 */
export function getReviewNavigation(number: string): {
  entry: PublishedReviewEntry | undefined;
  prev: ReviewNavEntry | undefined;
  next: ReviewNavEntry | undefined;
} {
  const index = publishedReviews.findIndex((review) => review.number === number);
  const entry = index >= 0 ? publishedReviews[index] : undefined;
  const prev = index > 0 ? publishedReviews[index - 1] : undefined;
  const next =
    index >= 0 && index < publishedReviews.length - 1 ? publishedReviews[index + 1] : undefined;
  return { entry, prev, next };
}

/** entryのrelatedBookIds/relatedNotebookSlugsを、bookshelf.ts/
    labNotebooks.tsの実データに解決する。参照先が存在しないidは
    黙って除外する(壊れたリンクを表示しない)。 */
export function getRelatedContent(entry: PublishedReviewEntry | undefined): {
  relatedBooks: BookEntry[];
  relatedNotebooks: LabNotebook[];
} {
  const relatedBooks = (entry?.relatedBookIds ?? [])
    .map((id) => books.find((book) => book.id === id))
    .filter((book): book is BookEntry => Boolean(book));
  const relatedNotebooks = (entry?.relatedNotebookSlugs ?? [])
    .map((slug) => publishedLabNotebooks.find((notebook) => notebook.slug === slug))
    .filter((notebook): notebook is LabNotebook => Boolean(notebook));
  return { relatedBooks, relatedNotebooks };
}
