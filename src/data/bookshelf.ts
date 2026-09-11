/**
 * bookshelf.ts (src/data)
 * ------------------------------------------------------------
 * 「研究の本棚」が表示する本の唯一のデータソース。Home「研究の本棚」
 * プレビュー(index.astro)・`/bookshelf`本体ページ・`/participate`の
 * 「本から関わる」teaserの3箇所が、この配列を共有する
 * (2026-09-11、Decision Log 0117、プロジェクトオーナーの指示により
 * 本データを1か所に集約)。
 *
 * 旧`src/data/participateBooks.ts`(Decision Log 0116)の内容を
 * そのまま引き継いでいる。`featured: true`の本がHome・`/participate`
 * の圧縮表示に出る(現時点では3冊のみのため全冊featured)。
 *
 * 著者等が現時点で不明な本は、コード上で推測して補わず、フィールド
 * 自体を省略している(例: 「調査的感性術」の著者。判明次第追加する)。
 *
 * インゴルド等の「読みたい本」は、所有状況が未確定のためこの時点では
 * 追加していない。
 *
 * 将来、外部データソースからの追加・更新に発展する可能性があるが、
 * 今回はこの配列を直接編集する運用のみ実装する(Google Sheets連携等は
 * 実装しない)。
 * ------------------------------------------------------------
 */
import type { BookEntry } from "@/types/bookshelf";

export const books: BookEntry[] = [
  {
    id: "keiken-to-kyouiku",
    title: "経験と教育",
    author: "ジョン・デューイ",
    status: "reading",
    owned: true,
    giftEnabled: false,
    conversationEnabled: true,
    featured: true,
    tone: "warm",
  },
  {
    id: "chousateki-kansei-jutsu",
    title: "調査的感性術",
    // TODO: 著者未確認。判明次第追加する。
    status: "reading",
    owned: true,
    giftEnabled: false,
    conversationEnabled: true,
    featured: true,
    tone: "moss",
  },
  {
    id: "souzou-no-kyoudoutai",
    title: "想像の共同体",
    author: "ベネディクト・アンダーソン",
    status: "reading",
    owned: true,
    giftEnabled: false,
    conversationEnabled: true,
    featured: true,
    tone: "sky",
  },
];
