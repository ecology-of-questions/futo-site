/**
 * participate.ts
 * ------------------------------------------------------------
 * 「関わる」ページ(/participate)が扱うデータ型。
 *
 * 【2026-09-11、「研究の本棚」中心の構造に再編(Decision Log 0116)】
 * 「本を贈る」中心だった構造を、「ふ、と」が今何を読み、何をこれから
 * 読み、どこへ関心を向けているのかが見える「研究の本棚」中心の構造に
 * 変更した。旧`GiftBookEntry`を`ParticipateBookEntry`に改名した
 * (Home「研究の本棚」プレビュー/`/bookshelf`が使う
 * `src/types/bookshelf.ts`の`BookEntry`と名前が衝突するため、別名に
 * している)。
 *
 * 本の研究上の状態(status)・所有しているか(owned)・贈れるか
 * (giftEnabled)・話したいを受け付けるか(conversationEnabled)は、
 * すべて独立した項目として扱う。「読書中で所有しているが贈れない本」
 * 「読みたいがまだ所有していないが贈れる本」のように、組み合わせを
 * 自由にできる(プロジェクトオーナーの指示)。
 *
 * 実データ(src/data/participateBooks.ts)の値のうち、著者等が現時点で
 * 不明なものはコード上で推測して補わず、フィールド自体を省略している。
 * 一方、デザイン確認用の仮データ(旧「本を贈る」3冊)は、実データが
 * 揃ったため削除した。
 *
 * imageが未設定の本は、書影画像の代わりに「研究の本棚」(Home側、
 * src/types/bookshelf.ts、Decision Log 0111)と同じcolor-mixの
 * 仮カバーを表示する(ParticipateBookshelf.astroが並び順(index)から
 * 機械的にトーンを割り当てるため、この型自体に色の情報は持たせない)。
 *
 * LendCategory: 「場所・知識・技術を貸す」セクションの3項目(本棚とは
 * 無関係、変更なし)。
 * ------------------------------------------------------------
 */

/** 本の研究上の状態。表示ラベルはbookStatusLabelsで一元管理する。 */
export type BookStatus = "reading" | "queued" | "wishlist" | "gifted" | "finished";

export const bookStatusLabels: Record<BookStatus, string> = {
  reading: "読書中",
  queued: "これから読む",
  wishlist: "読みたい",
  gifted: "贈っていただきました",
  finished: "読了",
};

export interface ParticipateBookEntry {
  /** 本を一意に識別するID。将来、対話の記録等を本に紐づける際の手がかりにもなる */
  id: string;
  /** 本のタイトル */
  title: string;
  /** 著者名。現時点で不明な本は省略する(推測で補わない) */
  author?: string;
  /** 本の研究上の状態 */
  status: BookStatus;
  /** 「ふ、と」がこの本を所有しているか */
  owned: boolean;
  /** 「この本を贈る」を表示するか。ownedやstatusとは独立して判断する */
  giftEnabled: boolean;
  /** 「この本について話したい」を受け付けるか。giftEnabledとは独立して判断する */
  conversationEnabled: boolean;
  /** なぜこの本が気になっているか、一言。任意 */
  reason?: string;
  /** 書影画像のパス。未設定の場合はParticipateBookshelf.astroが仮カバーを表示する */
  image?: string;
  /** 「新品で贈る」の遷移先。giftEnabled=trueかつ未設定の場合は"#"(準備中)として扱う */
  newBookUrl?: string;
  /** 「古本で贈る」の遷移先。giftEnabled=trueかつ未設定の場合は"#"(準備中)として扱う */
  usedBookUrl?: string;
  /** この本から生まれた記録(研究断面・Fieldnote等)へのリンク。存在する場合のみ「この本から生まれた記録 →」を表示する */
  relatedUrl?: string;
}

export interface LendCategory {
  /** participate.astro内のインラインSVGアイコンと対応する識別子(本棚とは無関係) */
  icon: "place" | "info" | "skill";
  title: string;
  description: string;
  linkHref: string;
}
