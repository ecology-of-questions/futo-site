# 0138. `/bookshelf`に購入導線・Amazonアソシエイト対応・「一緒に読みたい」を追加

- 日付: 2026-09-12
- 状態: 採用

## Decision

プロジェクトオーナーから、「研究の本棚」を「本を知る→必要なら購入する
→『一緒に読みたい』と表明できる」という流れにする指示を受けた。
読書会そのものの仕組み(日程調整・マッチング・チャット等)は今回
実装しない。

### データ拡張

`BookEntry`に以下を追加した。既存6冊のデータ(`src/data/
bookshelf.ts`)は変更していない(二重管理を避けるため、canonical
dataは1つのまま)。

- `isbn13?: string` — 判明している本のみ設定する識別子。現時点で
  UIから参照するコンポーネントはない。
- `externalCoverUrl?: string` — 正規に取得した外部の書影URL。
- `purchaseUrl?: string` / `purchaseProvider?: "amazon" | "other"` —
  購入先とその提供元。
- `affiliate?: boolean` — `purchaseUrl`にアソシエイトタグを付加して
  よいかを示す、`purchaseUrl`とは独立したフラグ。
- `contributed?: boolean` — Decision Log 0137で既に追加済み(今回の
  指示にも同じ項目が含まれていたため、変更なしのまま維持)。

### 画像

優先順位を「1. image(自分で撮影) → 2. externalCoverUrl(正規取得) →
3. 仮カバー(tone、color-mix)」の順に実装した。Amazonの商品画像を
スクリーンショット・ダウンロードして自サイトに再アップロードする
実装は行っていない。`externalCoverUrl`は外部URLをそのまま
`<img src>`で参照するだけで、画像取得のAPI連携自体(Amazon Product
Advertising API等)は実装していない(API credentialsが無いため、
データ構造のみ用意した)。

### 購入への導線

`purchaseUrl`がある本にのみ、`purchaseProvider`に応じて「Amazonで
見る →」/「購入する →」という控えめな外部リンクを表示する。
ECカードのような強い見た目にはせず、既存の`.actionLink`(矢印付き
テキストリンク)をそのまま使った。`purchaseUrl`が無い本には何も
表示しない。

### Amazonアソシエイト対応

- アソシエイトタグは環境変数`PUBLIC_AMAZON_ASSOCIATE_TAG`
  (`.env.example`に追加)から読む。`src/config/site.ts`の
  `amazonAssociateTag`・`buildPurchaseUrl`・`isActiveAffiliateLink`
  参照。タグの値はコード上にハードコード・推測していない(現時点で
  未設定のため空のまま)。
- `buildPurchaseUrl`は、`book.affiliate && book.purchaseProvider
  === "amazon" && amazonAssociateTag`が揃った場合のみ`tag`クエリ
  パラメータを付加する。1つでも欠けていれば`purchaseUrl`をそのまま
  返す(タグなしの通常リンクとして機能する)。
- 実際にアソシエイトタグ付きリンクを1件でも表示する場合のみ
  (`isActiveAffiliateLink`で判定)、一覧の末尾にAmazonアソシエイト
  規約が求める開示文言(「Amazonのアソシエイトとして、『ふ、と』は
  適格販売により収入を得ています。」)を表示する。現時点では
  アソシエイトID未設定のため、この文言は表示されない。

### 「一緒に読みたい」

全ての本に、常時「一緒に読みたい →」という控えめなトグルボタンを
表示する(購入導線の有無とは無関係)。クリックすると、指定された
文言・フィールド(メールアドレス必須・お名前任意・この本で気になって
いること任意)のシンプルな展開フォームが開く。「読書会への参加申込
ではありません」ことを明記し、購入有無・所有有無は尋ねていない。
既存の`contactFormEndpoint`(Formspree)をそのまま再利用し、新しい
バックエンドは追加していない。

### 購入と参加を分離

「Amazonで見る」と「一緒に読みたい」は、`.actions`内の独立した要素
として実装した。両者を結びつける条件分岐(購入したら一緒に読みたい
が使える、等)は一切実装していない。購入者の個人特定・購入情報から
自動的に読書会へ登録する仕組みも実装していない(Amazon側の購入者
情報自体、このサイトは一切取得しない)。

### 「持ち寄られた本」

Decision Log 0137の実装を維持。「研究の本棚」という名称は変更して
いない。

## 対応

- `src/types/bookshelf.ts`: `isbn13`/`externalCoverUrl`/
  `purchaseUrl`/`purchaseProvider`/`affiliate`を追加。
- `src/env.d.ts`: `PUBLIC_AMAZON_ASSOCIATE_TAG`の型を追加。
- `.env.example`(新規): 環境変数のサンプルを追加。
- `src/config/site.ts`: `amazonAssociateTag`・`buildPurchaseUrl`・
  `isActiveAffiliateLink`を追加。
- `src/components/BookshelfFullList.astro`: 画像優先順位の実装、
  購入リンク・「一緒に読みたい」トグル+展開フォーム・Amazon
  アソシエイト開示文言の表示ロジックを追加。
- `src/components/BookshelfFullList.module.css`: `.readTogether*`
  (旧`.conversationPanel`等と同じ構造で作り直したスタイル)・
  `.affiliateDisclosure`・`.readTogetherPrivacyNote`/`.privacyLink`を
  追加。

## Privacyページへの追記について

確認した結果、今回のコミット時点では追記していない。理由は以下の
2点。

1. Amazonアソシエイトのタグは未設定(`PUBLIC_AMAZON_ASSOCIATE_TAG`が
   空)のため、実際にはアフィリエイトリンクとして機能していない。
   `isActiveAffiliateLink`がfalseを返す間、開示文言自体も表示
   されない。
2. 「一緒に読みたい」フォームが収集する情報(メールアドレス・
   お名前・この本で気になっていること)は、既存の3フォーム
   (お問い合わせ・持ち寄る・研究便り登録)と同じFormspreeを経由する
   同種のデータであり、Privacyページの「外部サービスの利用」
   セクションが既に説明している内容の範囲内である。

**ただし、将来アソシエイトIDを設定し実際にアフィリエイトリンクを
表示する場合は、Privacyページに「購入リンクの一部はAmazon
アソシエイトプログラムを利用しており、クリック後の遷移先で
Amazon側の情報取得が発生する場合がある」旨の追記を検討すべきである
(このコミットでは未実施)。**

## 採用理由

指示にある「読書会システムやマッチングは実装しない」「購入と参加を
結びつけない」という制約を、コードレベルで実現するために、購入
リンクと「一緒に読みたい」を完全に独立したUI要素・データフローに
した(共有する状態や条件分岐を作らない)。アソシエイトタグを
環境変数から読む設計にしたのは、指示の「IDを推測・ハードコードしない」
「将来設定できるようにenv等で扱える設計にする」に対応するため。

## 他の案

「一緒に読みたい」を`conversationEnabled`(Decision Log 0115で追加、
0133で保留)で条件分岐させる案も検討したが、`conversationEnabled`は
「この本について話したい」という別の目的・文言の機能のために設けた
フラグであり、意味を混同すると将来両方を復活させたいときに衝突する
おそれがあるため、新しいフィールドは追加せず、全ての本に無条件で
表示する実装を選んだ。

## 将来の変更可能性

Amazonアソシエイト提携が成立し、Product Advertising API等の
credentialsが得られた場合は、`externalCoverUrl`の自動取得・
`purchaseUrl`の自動生成へと発展させる余地を残している(今回はデータ
構造のみ)。ISBN-13(`isbn13`)は、将来この種の外部連携のキーとして
使うことを想定している。

## Research Context

「本を知る」ことと「本を読む」ことの間にある「入手する」という
実務的な段階に、静かな導線を用意した。ただし本棚の主目的は販売では
なく研究や出会いであるため、購入導線は主張しすぎない一本のリンクに
留め、「一緒に読みたい」という関係性への入口を、購入の有無から
切り離して独立に用意した。これは、CLAUDE.mdの「研究は公開した瞬間に
完成しない」という考え方と同様、「本を読む方法は一つではない
(購入・図書館・すでに所有)」という多様性を尊重する設計判断である。
