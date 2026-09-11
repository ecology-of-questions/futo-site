# 0130. 本を贈る導線をAmazonほしい物リストに一本化する

- 日付: 2026-09-11
- 状態: 採用

## Decision

プロジェクトオーナーから、本を贈る導線をAmazonほしい物リスト
(`https://www.amazon.jp/hz/wishlist/ls/25Z2CQP3JIP0J?ref_=wl_share`)
を使う形に変更する指示を受けた。

### `/participate`の「本をプレゼントする」

- 本文を「そのなかから、プレゼントしたいと思う本があれば贈ることが
  できます。」→「そのなかから、プレゼントしたい本があればAmazonから
  贈ることができます。」に変更
- CTAを「研究の本棚を見る →」(`/bookshelf`へのリンク)から「本を
  プレゼントする →」(Amazonほしい物リストへの外部リンク)に変更
- featured本のプレビュー表示(`BookshelfList`)自体は変更しない

### `/bookshelf`の「この本を贈る」導線

- 現行の「手元にある本を譲る」「問い合わせフォームから申し出る」
  「新品/古本を選ぶ」という導線は使わない
- 「この本をプレゼントする →」から、共通のAmazonほしい物リストへ
  移動するシンプルな形にする
- 本ごとの商品URLへ直接リンクする実装にはしない(ほしい物リスト上に
  その本がない可能性があるため)。共通の1つのURLへリンクする
- canonical bookshelf data(`src/data/bookshelf.ts`)は維持する
- `giftEnabled`の意味は「この本はプレゼントを受け付けている」として
  引き続き利用する
- `newBookUrl`/`usedBookUrl`等、将来用として残っているフィールドは、
  今回の変更のためだけに無理に削除しない(UIでは使用しない)

## 対応

- `src/config/site.ts`: `amazonWishlistUrl`定数を新設(`noteUrl`/
  `contactFormEndpoint`と同じ「外部リンク先を1箇所に集約する」方針を
  踏襲)。`/bookshelf`・`/participate`の両方から参照する共通URLとして
  管理し、本ごとのURLをデータに持たせる実装にはしていない。
- `src/components/BookshelfFullList.astro`: `giftEnabled`の本に表示
  していた「この本を贈る」展開トリガー(ボタン+`aria-expanded`+
  隠しパネル)を撤去し、`relatedUrl`と同じ「矢印付きテキストリンク」
  パターンの`<a>`要素(`この本をプレゼントする →`、
  `target="_blank" rel="noopener noreferrer"`で外部リンクとして開く)
  に置き換えた。展開パネル(`gift-panel-*`、見出し・説明文・
  「手元にある本を贈る」リンク)自体を削除した。これに伴い、
  パネルの遷移先を指定していた`contactHref` propも完全に未使用に
  なったため削除した。
- `src/pages/bookshelf.astro`: `<BookshelfFullList books={books} />`
  から`contactHref="/contact"`の指定を削除(propが無くなったため)。
- `src/components/BookshelfFullList.module.css`: `.giftPanel`
  (`.conversationPanel`と共有していたセレクタから分離)・
  `.giftHeading`・`.giftIntro`を削除(展開パネル自体の廃止に伴い
  完全に未使用になったため)。`.actionLink`/`.actionArrow`は
  「プレゼントする」リンクにもそのまま流用するため変更していない。
- `src/pages/participate.astro`: 「本をプレゼントする」セクションの
  本文とCTA(`ArrowLink`の`label`/`href`、`external`prop追加)を変更。
- `src/types/bookshelf.ts`: `giftEnabled`・`newBookUrl`/`usedBookUrl`
  のコメントを、Amazonほしい物リストへの一本化後の実態に合わせて
  更新した(フィールド自体・型定義は変更なし)。

## 採用理由

指示を字面通りに実装した。本ごとの商品URLへ直接リンクしない、という
制約(ほしい物リスト上にその本が実在しない可能性があるため)から、
`config/site.ts`に既にある「外部リンク先を1箇所で管理する」パターン
(`noteUrl`等)を踏襲し、本のデータ(`BookEntry`)側にAmazonURLを
持たせる設計にはしなかった。これにより、将来ほしい物リストのURLが
変わっても1箇所の修正で済む。

`giftEnabled`というフィールド名・意味(「プレゼントを受け付けている」
かどうかの判断)は指示通り維持し、UIの実装(展開パネル→単純な外部
リンク)だけを差し替えた。データ構造(`BookEntry`型・
`src/data/bookshelf.ts`)自体には変更を加えていない。

## 他の案

`newBookUrl`/`usedBookUrl`を今回の変更を機に削除する案も検討したが、
指示に「今回の変更のためだけに無理に削除する必要はない」と明記されて
いたため、フィールド自体は残し、UIで参照しない状態を維持した。

## 将来の変更可能性

Amazonほしい物リストのURLが変わった場合は、`src/config/site.ts`の
`amazonWishlistUrl`のみを更新すればよい。将来、本ごとに直接リンク
できる購入先が確定した場合は、`newBookUrl`/`usedBookUrl`を実際に
UIで参照する実装への切り替えを検討できる(その場合も、現在の
1本化されたAmazonリンクとの共存や優先順位を別途検討する必要がある)。

## Research Context

今回の変更は、Decision Log 0129で顕在化した「贈る対象の本を正しく
見せる」という改善の延長線上にある。贈るという行為の具体的な手段を
Amazonほしい物リストという実際に機能する仕組みに一本化したことで、
「持ち寄る/贈る」という行為がUIと構造から自然に(かつ実際に機能する
形で)伝わるという、Decision Log 0128の方針にも一致する。
