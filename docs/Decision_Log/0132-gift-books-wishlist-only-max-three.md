# 0132. 「本をプレゼントする」を「今、特に読みたい本」最大3冊の紹介に絞る

- 日付: 2026-09-11
- 状態: 採用

## Decision

プロジェクトオーナーから、`/participate`の「本をプレゼントする」を
整理する指示を受けた。目的は以下の通り。

- 「読書中の本」をここでは見せない
- プレゼント対象の「これから読みたい本」だけを見せる
- 本が増えても`/participate`が本一覧ページにならないようにする
- 全件はAmazonほしい物リストに任せる
- `/bookshelf`はこれまで通り研究の本棚として残す

このセクションは「研究の本棚全体のプレビュー」ではなく、「現在
プレゼントを受け付けている本の紹介」であるべき、という位置づけの
明確化。読書中・読了・所有済みの本は表示せず、読書状況全体を見せる
役割は`/bookshelf`に任せる。

### 表示する本の条件

`status === "wishlist" && giftEnabled === true && giftFeatured ===
true`の本のみを対象とし、表示側でも最大3冊に制限する。将来wishlistが
増えても、`giftFeatured: true`を付けた本(最大3冊まで意味を持つ)だけ
が`/participate`に出る。

既存の`featured`フィールド(サイト上の一般的な本棚プレビュー用)とは
役割が異なるため、新設の`giftFeatured`(「本をプレゼントする」で
特に見せたい本用)で分離した。

### 現在の3冊

現在wishlistにある以下の3冊(既存データのタイトル・著者・reasonを
そのまま使用、新しい書誌情報の推測追加はしていない)。

- 『マツタケ――不確定な時代を生きる術』(アナ・チン)
- 『生きていること――動く、知る、記述する』(ティム・インゴルド)
- 『現代日本語における意図性副詞の意味研究』(李澤熊)

### 表示デザイン

旧`BookshelfList.astro`(書影が画面の大半を占める、Mobile幅で横
スクロールするUI)は、本棚そのものを見せるこのセクションの目的に
合わなくなったため使用をやめた。小さな書影(3.5rem幅)+タイトル+著者+
読みたい理由という、`.contributionList`等と同じ「細い罫線区切りの
静かな一覧」に近い、控えめな表示に作り直した。ステータスラベル
(「読みたい」等)は表示しない(このセクションの本がすべて読みたい本
であることは、上の小見出し「今、特に読みたい本」で分かるため)。
Mobile幅は縦積み(横スクロールなし)、Desktop幅(700px以上)は3枚を
横並びにし、間を縦の罫線で区切る。

### Amazon導線

3冊の下に「Amazonのほしい物リストをすべて見る →」を置き、共通の
Amazonほしい物リスト(`amazonWishlistUrl`)へ外部リンクする。各本
カードに個別の購入・プレゼントボタンは置かず、Amazon側の商品URLは
サイト側で個別管理しない(Decision Log 0130の方針を維持)。

## 対応

- `src/types/bookshelf.ts`: `BookEntry`に`giftFeatured?: boolean`を
  追加。`featured`のコメントを、現時点で参照するUIが無いことが
  分かるように更新した(型・フィールド自体は削除していない)。
- `src/data/bookshelf.ts`: 現在wishlistの3冊に`giftFeatured: true`を
  追加。`featured`の既存値(読書中3冊・読みたい3冊すべてtrue、
  Decision Log 0129)はそのまま変更していない。
- `src/pages/participate.astro`: 「本をプレゼントする」の対象取得を
  `books.filter((b) => b.featured)`から`books.filter((b) => b.status
  === "wishlist" && b.giftEnabled && b.giftFeatured).slice(0, 3)`に
  変更。小見出し「今、特に読みたい本」(h3)を追加。表示に使っていた
  `BookshelfList`コンポーネントの利用をやめ、小さな書影+タイトル/
  著者/読みたい理由の一覧をこのファイル内に直接実装した。CTAラベルを
  「本をプレゼントする →」から「Amazonのほしい物リストをすべて見る
  →」に変更した。
- `src/pages/participate.module.css`: 新設の一覧用スタイル
  (`.giftBooksHeading`/`.giftBookList`/`.giftBookItem`/
  `.giftBookCover`/`.giftBookInfo`/`.giftBookTitle`/
  `.giftBookAuthor`/`.giftBookReason`)を追加。
- `src/components/BookshelfList.astro`・`BookshelfList.module.css`:
  `/participate`以外に利用箇所が無く、完全に未使用になったため削除
  した。
- `/bookshelf`(`bookshelf.astro`・`BookshelfFullList.astro`)・
  「この本について話したい」フォーム・Formspreeの送信処理は変更して
  いない。`/bookshelf`は引き続き読書中・これから読む・読みたい・読了
  すべてのstatusを表示する。

## 採用理由

指示を字面通りに実装した。`featured`をそのまま流用せず`giftFeatured`
を新設したのは、指示に明記された「既存のfeaturedフィールドとは役割が
異なるため、無理に流用しない」という方針に従ったもの。`featured`は
現時点でどのUIからも参照されなくなったが、指示が「将来のプレビュー
用途のため残す」ことを許容していたため、フィールド自体・既存の値は
削除しなかった。

表示側でも`.slice(0, 3)`により3冊に制限しているのは、データ側の
`giftFeatured`設定ミスで4冊以上表示されてしまう事態を防ぐための
二重の安全策で、指示にも明記されていた要件。

`BookshelfList.astro`の削除は指示に明記されていなかったが、
`/participate`側の表示方法を作り直したことで完全に未使用になった
ため、CLAUDE.mdの「不要になったコンポーネントは整理する」方針に
沿って行った必要最小限の付随的な整理。

## 他の案

`giftFeatured`を持たせず、`status === "wishlist" && giftEnabled`
だけで絞り込み、配列の先頭3件を機械的に表示する案も検討したが、
将来wishlistが増えた際に「どの3冊を見せたいか」を意図的に選べなく
なるため、指示通り`giftFeatured`による明示的な選定を採用した。

## 将来の変更可能性

wishlistの本が増え、`giftFeatured: true`が4件以上になった場合も、
表示は自動的に先頭3件に制限される。どの3冊を見せるかを変えたい場合は
`giftFeatured`の値を編集するだけで対応できる。`featured`フィールドを
将来別の用途(本棚以外の場所での紹介等)で使う可能性は残っている。

## Research Context

「本をプレゼントする」を本棚全体のプレビューから「今、特に読みたい
本」という焦点を絞った紹介に変えたことで、`/participate`・
`/bookshelf`・Amazonという3つの場所それぞれの役割(持ち寄る入口/
研究に関わる本全体/実際の購入と配送)がより明確になった。これは
Decision Log 0128が掲げた「トップページ・各ページをサイト内の全機能を
紹介する場所にしない」という方針を、`/participate`の本まわりの
セクションにも一貫して適用したものである。
