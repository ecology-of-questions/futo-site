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
 * の圧縮表示に出る。
 *
 * 著者等が現時点で不明な本は、コード上で推測して補わず、フィールド
 * 自体を省略している(例: 「調査的感性術」の著者。判明次第追加する)。
 *
 * 【2026-09-11、「読みたい・未所蔵」の本を3冊追加(Decision Log 0118)】
 * インゴルド等の「読みたい本」(このコメントは当初「未確定のため
 * 追加していない」としていたが、プロジェクトオーナーから所有状況の
 * 確定した3冊の提示を受け、実データとして追加した)。この3冊は
 * `owned: false` / `giftEnabled: true`で、実際に「この本を贈る」
 * 導線が表示される最初の本になる。`featured`は指示により`false`の
 * まま(勝手に変更しない)。`newBookUrl`/`usedBookUrl`は購入先が
 * 未確定のため設定していない(BookshelfFullList.astro側で、
 * 未設定の贈り方は選択肢自体を出さない実装にしている。ダミーの
 * "#"は使わない)。
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
  {
    id: "matsutake",
    title: "マツタケ――不確定な時代を生きる術",
    author: "アナ・チン",
    status: "wishlist",
    owned: false,
    giftEnabled: true,
    conversationEnabled: true,
    reason: "人間だけではないものとの関係から、世界に気づく方法を考えてみたい。",
    featured: false,
    tone: "warm",
  },
  {
    id: "ikiteiru-koto",
    title: "生きていること――動く、知る、記述する",
    author: "ティム・インゴルド",
    status: "wishlist",
    owned: false,
    giftEnabled: true,
    conversationEnabled: true,
    reason: "観察することと、生きることはどうつながっているのか。",
    featured: false,
    tone: "moss",
  },
  {
    id: "ito-sei-fukushi",
    title: "現代日本語における意図性副詞の意味研究",
    author: "李澤熊",
    status: "wishlist",
    owned: false,
    giftEnabled: true,
    conversationEnabled: true,
    reason: "「ふと」ということばそのものを、もう少し深くたどってみたい。",
    featured: false,
    tone: "sky",
  },
];
