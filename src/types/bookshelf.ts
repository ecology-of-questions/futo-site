/**
 * bookshelf.ts
 * ------------------------------------------------------------
 * 「研究の本棚」が扱う唯一の本の型。Home「研究の本棚」プレビュー
 * (index.astro)・`/bookshelf`(本体ページ)・`/participate`の
 * 「本をプレゼントする」teaser(旧「本から関わる」、2026-09-11に
 * Decision Log 0128で改称)の3箇所が、この型と`src/data/bookshelf.ts`
 * の1つの配列を共有する。
 *
 * 【2026-09-11、「本を贈る」中心の`/participate`実装で拡張した型を統合
 * (Decision Log 0117)】もともとこのファイルは、2026-09-10のトップ
 * ページ再設計(Decision Log 0111)で「研究の本棚」プレビュー用に
 * 作った簡易な型(title/label/description/tone)だった。同じ日
 * (2026-09-11)に`/participate`側で作った、より拡張された
 * `ParticipateBookEntry`(status/owned/giftEnabled/
 * conversationEnabled/relatedUrl等、Decision Log 0115・0116)と役割が
 * 重複していたため、`/bookshelf`を「研究の本棚」の正式な本体ページと
 * 位置づける方針転換(プロジェクトオーナーの指示)に合わせて、拡張版を
 * この`BookEntry`に統合した。`label`/`description`は`status`
 * (enum、表示ラベルは`bookStatusLabels`で一元管理)/`reason`に統一し、
 * 旧`label`/`description`というプロパティ名は廃止した。
 *
 * `featured`は、Home・`/participate`の圧縮表示(BookshelfList.astro)に
 * 出す本を選ぶためのフラグ。`/bookshelf`本体(BookshelfFullList.astro)
 * は`featured`の値に関わらず全冊を表示する。
 *
 * 実在の書影画像はまだ用意していない本が多いため、`image`未設定時は
 * `tone`(color-mixで仮カバーを生成する手がかり)で代用する
 * (BookshelfList.astro/BookshelfFullList.astro参照)。
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

export interface BookEntry {
  /** 本を一意に識別するID。フォーム送信や将来のrelatedUrl接続の手がかりにもなる */
  id: string;
  /** 本のタイトル */
  title: string;
  /** 著者名。現時点で不明な本は省略する(推測で補わない) */
  author?: string;
  /** 本の研究上の状態 */
  status: BookStatus;
  /** 「ふ、と」がこの本を所有しているか */
  owned: boolean;
  /**
   * 「この本を贈る」導線を表示してよいか。ownedやstatusとは独立して
   * 判断する。現時点のMVP(Decision Log 0119)では、実際の贈り方は
   * 「手元にある本を贈る」(/contactへの導線)のみ。
   */
  giftEnabled: boolean;
  /** 「この本について話したい」を受け付けるか。giftEnabledとは独立して判断する */
  conversationEnabled: boolean;
  /** なぜこの本が気になっているか、一言。任意 */
  reason?: string;
  /** Home・/participateの圧縮表示(BookshelfList.astro)に出すか */
  featured: boolean;
  /** 書影画像のパス。未設定の場合は仮カバー(tone、color-mix)を表示する */
  image?: string;
  /**
   * 仮カバーの色味の手がかり(image未設定時のみ使用)。同じ本が
   * Home/`/participate`の圧縮表示と`/bookshelf`本体の両方に登場しても
   * 常に同じ色になるよう、並び順ではなく本ごとに固定で指定する
   * (省略時はコンポーネント側が並び順から機械的に割り当てる)。
   */
  tone?: "warm" | "moss" | "sky";
  /**
   * 「新品で贈る」の遷移先。将来用のフィールドとして残しているが、
   * 匿名配送・送付方法が未確定のため、現時点のUI(BookshelfFullList.astro)
   * では参照していない(2026-09-11、Decision Log 0119)。
   */
  newBookUrl?: string;
  /**
   * 「古本で贈る」の遷移先。将来用のフィールドとして残しているが、
   * newBookUrlと同じ理由で現時点のUIでは参照していない。
   */
  usedBookUrl?: string;
  /** この本から生まれた記録(研究断面・Fieldnote等)へのリンク。存在する場合のみ「この本から生まれた記録 →」を表示する */
  relatedUrl?: string;
}
