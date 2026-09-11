# 0133. HP公開版に向けて「話す」「贈る」系の導線を保留

- 日付: 2026-09-11
- 状態: 採用

## Decision

プロジェクトオーナーから、HP公開を優先するため、まだ実際の運用
(誰が読書会をひらくか、どう発送するか等)が固まっていない機能を
公開UIから外す指示を受けた。永久廃止ではなく、公開後に改めて設計
するための保留。対象は以下の通り。

- `/participate`の「本をプレゼントする」セクション(見出し・説明文・
  「今、特に読みたい本」3冊・Amazonほしい物リストへのCTA、Decision
  Log 0129・0132)
- `/participate`の「ともに、続けていくために」セクション(「話す」
  「一緒に試す」への言及・お問い合わせCTA・タグライン)
- `/bookshelf`本体(`BookshelfFullList.astro`)の本ごとの
  「この本について話したい」展開フォーム(Decision Log 0115)
- `/bookshelf`本体の「この本をプレゼントする →」Amazonほしい物
  リストへのリンク(Decision Log 0130)

あわせて、研究断面一覧ページ(`/research`)の見出し下の説明文から
「研究の途中で考えたことを、その時点の断面として残しています。」を
「その時点で考えていることを、研究の断面として残しています。」に
変更した。「研究の途中」という言葉が、公開する内容がまだ未完成・
未検証であるかのような印象を与えかねないという指摘による、文言の
微調整(内容・語順の大きな変更ではない)。

## 対応

- `src/pages/participate.astro`: 「本をプレゼントする」「ともに、
  続けていくために」の2セクションを削除。`giftFeaturedBooks`の
  算出・`amazonWishlistUrl`のimportも不要になったため削除。ページ
  descriptionを本のプレゼントへの言及なしの文言に変更。残る構成は
  Hero → 何かを持ち寄る(フォーム) → 持ち寄られたもの(投稿一覧)の
  3段のみ。
- `src/pages/participate.module.css`: 削除したセクション専用の
  スタイル(`.giftBooksHeading`/`.giftBookList`等、`.closingTagline`)
  を削除。
- `src/components/BookshelfFullList.astro`: 本ごとのアクション表示を
  `relatedUrl`(「この本から生まれた記録 →」)のみに縮小。
  「この本について話したい」トグル・展開フォーム(Formspree送信処理
  含む)・「この本をプレゼントする」リンクを削除。
- `src/config/site.ts`: 参照箇所が無くなった`amazonWishlistUrl`を
  削除。
- `src/types/bookshelf.ts`: `giftEnabled`/`conversationEnabled`/
  `giftFeatured`フィールド自体・データの値は削除せず、コメントのみ
  「現時点で参照するUIは無い」ことが分かるように更新した。
- `src/pages/bookshelf.astro`・`src/pages/research.astro`: 上記の
  実装変更・文言変更の背景をコメントに記録。

## 採用理由

指示を字面通りに実装した。`giftEnabled`/`conversationEnabled`/
`giftFeatured`や`newBookUrl`/`usedBookUrl`といったフィールド・
データ自体を削除しなかったのは、「機能を永久に廃止する判断ではない」
という指示に沿ったもの。UIから参照されなくなるだけで、型・データは
将来の再設計にそのまま使える状態で残す。

## 他の案

フィールド自体を型・データから削除し、必要になったらgit履歴から
復元する案も検討したが、`BookEntry`型・`src/data/bookshelf.ts`は
`/bookshelf`側の他の値(title/author/status/reason等)と一体で
編集されるため、機能だけを狙って復元するより、値を保持したまま
UI側だけを保留する方が、再設計時の手戻りが少ないと判断した。

## 将来の変更可能性

「話す」「贈る」の実際の運用(読書会の主催者、発送方法、対話の場の
設計等)が固まった時点で、`giftEnabled`/`conversationEnabled`を
参照するUIを`BookshelfFullList.astro`に、あるいは`/participate`に
新しいセクションとして再導入することを想定している。その際、型・
データは変更不要で、UIの追加のみで対応できる見込み。

## Research Context

「公開する」と「機能として完成している」を切り離す判断。ふ、との
理念(「研究は公開した瞬間に完成しない」)は完成度の話だが、今回は
それとは別に、実際の運用が伴わない導線を公開UIに置いたまま開室する
リスク(問い合わせが来ても応えられない、発送の実体がない等)を避ける
ための、公開範囲の絞り込みである。型・データを残したままUIだけを
保留することで、「育てる」ための足場は壊さずに、まず開室することを
優先した。
