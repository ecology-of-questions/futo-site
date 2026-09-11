/**
 * bookshelf.ts
 * ------------------------------------------------------------
 * 「研究の本棚」が扱う唯一の本の型。`/bookshelf`(本体ページ、
 * BookshelfFullList.astro)が、この型と`src/data/bookshelf.ts`の
 * 1つの配列を参照する。`/participate`側の「本をプレゼントする」
 * (旧「本から関わる」、2026-09-11にDecision Log 0128で改称)は、
 * Decision Log 0133でHP公開版から削除したため、現在この型を参照
 * するのは`/bookshelf`のみ。
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
 * 【`/participate`の選定基準を`giftFeatured`に変更(2026-09-11、
 * Decision Log 0132)】`featured`は元々Home・`/participate`の圧縮
 * 表示(BookshelfList.astro)に出す本を選ぶためのフラグだったが、
 * Home側のプレビューはDecision Log 0125で廃止済み、`/participate`側も
 * 「読書中の本ではなく、プレゼント対象のwishlist本だけを見せる」
 * 方針に変わったため、`/participate`は`status`/`giftEnabled`/
 * 新設の`giftFeatured`で選定するようにした。`BookshelfList.astro`は
 * 用途がなくなったため削除した(Decision Log 0132)。`featured`は
 * 将来のプレビュー用途のためフィールド自体は残している。
 *
 * `/bookshelf`本体(BookshelfFullList.astro)は`featured`/
 * `giftFeatured`の値に関わらず全冊を表示する。
 *
 * 実在の書影画像はまだ用意していない本が多いため、`image`未設定時は
 * `tone`(color-mixで仮カバーを生成する手がかり)で代用する
 * (BookshelfFullList.astro参照)。
 *
 * 【HP公開版に向けて関連UIを保留(2026-09-11、Decision Log 0133)】
 * `giftEnabled`(プレゼント導線)・`conversationEnabled`(「この本に
 * ついて話したい」)・`giftFeatured`(「本をプレゼントする」の選定)
 * は、対応するUI(BookshelfFullList.astroの展開パネル・`/participate`
 * の「本をプレゼントする」セクション)をHP公開版から削除したことに
 * 伴い、現時点でどのコンポーネントからも参照されなくなった。機能自体
 * を永久に廃止する判断ではなく、公開後に改めて設計するための保留の
 * ため、フィールド自体・データの値は削除していない。
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
   * 「この本はプレゼントを受け付けている」ことを示すフラグ。owned や
   * status とは独立して判断する。以前は`/bookshelf`本体の該当行に
   * Amazonほしい物リストへの「この本をプレゼントする→」リンクを
   * 表示するために使っていたが(Decision Log 0130)、HP公開版では
   * この導線自体を保留したため(Decision Log 0133)、現時点でこの
   * フラグを参照するUIは無い。
   */
  giftEnabled: boolean;
  /**
   * 「この本について話したい」を受け付けるか。giftEnabledとは独立して
   * 判断する。以前は`/bookshelf`本体に展開式の対話フォームを表示する
   * ために使っていたが(Decision Log 0115)、HP公開版ではこの導線自体
   * を保留したため(Decision Log 0133)、現時点でこのフラグを参照する
   * UIは無い。
   */
  conversationEnabled: boolean;
  /** なぜこの本が気になっているか、一言。任意 */
  reason?: string;
  /**
   * サイト上の一般的な本棚プレビュー用フラグ(現時点でこのフラグを
   * 参照するUIは無い。以前はHome・`/participate`の圧縮表示
   * (BookshelfList.astro)に出す本の選定に使っていたが、Home側の
   * プレビューはDecision Log 0125で廃止、`/participate`側も
   * Decision Log 0132で`giftFeatured`による選定に切り替えたため、
   * 現在は将来のプレビュー用途に備えて残しているだけの値である)。
   * `giftFeatured`(「本をプレゼントする」用)とは役割が異なるため
   * 混同しないこと。
   */
  featured: boolean;
  /**
   * 以前は`/participate`の「本をプレゼントする」→「今、特に読みたい
   * 本」に表示する本を選ぶためのフラグだった(2026-09-11、Decision
   * Log 0132)。このセクション自体をHP公開版から削除したため
   * (Decision Log 0133)、現時点でこのフラグを参照するUIは無い。
   * `featured`とは役割が異なる、独立したフラグ。
   */
  giftFeatured?: boolean;
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
   * 現時点のUI(BookshelfFullList.astro)では参照していない
   * (2026-09-11、Decision Log 0119)。贈る導線自体をAmazonほしい物
   * リストに一本化した後(Decision Log 0130)も、このフィールドは
   * 無理に削除せず将来用として残している。
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
