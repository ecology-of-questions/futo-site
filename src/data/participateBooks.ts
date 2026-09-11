/**
 * participateBooks.ts
 * ------------------------------------------------------------
 * 「関わる」ページ(/participate)の「研究の本棚」が表示する本の一覧。
 * プロジェクトオーナーの指示により、本データをページ内に散らさず
 * この1ファイルに集約している(Decision Log 0116)。将来、外部データ
 * ソースからの追加・更新やrelatedUrlによる研究断面との接続に発展
 * する可能性があるが、今回はこの配列を直接編集する運用のみ実装する
 * (Google Sheets連携等は実装しない)。
 *
 * 著者等が現時点で不明な本は、コード上で推測して補わず、フィールド
 * 自体を省略している(例: 「調査的感性術」の著者。判明次第追加する)。
 *
 * インゴルド等の「読みたい本」は、所有状況が未確定のためこの時点では
 * 追加していない。
 * ------------------------------------------------------------
 */
import type { ParticipateBookEntry } from "@/types/participate";

export const participateBooks: ParticipateBookEntry[] = [
  {
    id: "keiken-to-kyouiku",
    title: "経験と教育",
    author: "ジョン・デューイ",
    status: "reading",
    owned: true,
    giftEnabled: false,
    conversationEnabled: true,
  },
  {
    id: "chousateki-kansei-jutsu",
    title: "調査的感性術",
    // TODO: 著者未確認。判明次第追加する。
    status: "reading",
    owned: true,
    giftEnabled: false,
    conversationEnabled: true,
  },
  {
    id: "souzou-no-kyoudoutai",
    title: "想像の共同体",
    author: "ベネディクト・アンダーソン",
    status: "reading",
    owned: true,
    giftEnabled: false,
    conversationEnabled: true,
  },
];
