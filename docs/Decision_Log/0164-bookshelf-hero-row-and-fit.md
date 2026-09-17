# 0164. 本棚: タイトル行の横並び化・1画面に収める密度への圧縮

- 日付: 2026-09-17
- 状態: 採用
- 関連: Decision Log 0161(/participateの1画面圧縮)・0163(/participate
  のHero行横並び化)。同じ考え方を`/bookshelf`に適用した新規PR。

## Decision

プロジェクトオーナーから、以下の指示を受けた。

- 「研究の本棚」見出しの右横に導入文を移動する。
- mobile・desktopとも、スクロールなしで「いま読んでいる」と
  「読みたい」の両方が見えるよう工夫する。

`/participate`(Decision Log 0161・0163)と同じ実装パターン(既存の
スペーシングトークンを基準にした`calc()`での圧縮、見出し+説明文の
横並び化)を`/bookshelf`にも適用した。

## 対応

### タイトル行の横並び化

`src/pages/bookshelf.astro`: 見出し`<h1>`と導入文(`.note`、2段落)を
`.heroRow`でまとめた。`src/pages/bookshelf.module.css`に
`.heroRow`(`display: flex; align-items: baseline; flex-wrap: wrap;`)
を追加し、`.heading`/`.note`をflexアイテムとして調整した
(`/participate`の`.heroRow`と同じ構造)。

### `#bookshelf-hero`のpadding-block圧縮

最初の`<ResearchSection>`に`id="bookshelf-hero"`を追加し、
`:global(#bookshelf-hero) { padding-block: calc(var(--space-1) / 2)
var(--space-3); }`で既定の96px上下を圧縮した(`:global()`が必要な
理由は`/participate`のDecision Log 0161の追記と同じ)。

### `BookshelfShelf.module.css`の余白圧縮

「いま読んでいる」Hero・「読みたい」セクションのmargin/padding
(`.hero`・`.heroShelf`・`.heroCaptionTitle`・`.section`・
`.sectionRule`・`.list`・`.row`)を、既存トークンを基準にした
`calc()`で圧縮した。`BookActions.module.css`の`.actions`の
margin-topも同様に圧縮した(Hero・行リスト両方から呼ばれるため
両方に効く)。

### タイトル行への著者名のインライン統合

「読みたい」の各行、および「いま読んでいる」の各キャプションで、
著者名(`.author`/`.heroCaptionAuthor`)がそれまでタイトルの下の
独立した`<p>`だったのを、タイトルと同じ`<p>`内のinline要素
(`・著者名`)に変更した。「持ち寄られた本」タグ(`book.contributed`)
が既に同じパターン(タイトル行に`・`区切りで追加)で実装されていた
ため、それに揃えた。

あわせて、「読みたい」のタイトルのfont-sizeを`--fs-lg`(20px)から
Heroのキャプションと同じ`--fs-base`(16px)に、reasonのfont-sizeを
`--fs-base`(16px)から`--fs-sm`(14px)に変更した(`/participate`の
description圧縮、Decision Log 0161と同じ判断)。

## 対応ファイル

- `src/pages/bookshelf.astro`: `.heroRow`でheading/noteをラップ、
  `id="bookshelf-hero"`追加。
- `src/pages/bookshelf.module.css`: `.heroRow`新設、
  `:global(#bookshelf-hero)`のpadding-block上書き、`.heading`/
  `.note`のmargin圧縮。
- `src/components/BookshelfShelf.astro`: 著者名をタイトル行への
  inline要素に変更(Hero・行リスト両方)。
- `src/components/BookshelfShelf.module.css`: Hero・セクションの
  余白圧縮、タイトル/reasonのfont-size調整、`.author`/
  `.heroCaptionAuthor`をinlineスタイルに変更。
- `src/components/BookActions.module.css`: `.actions`のmargin-top
  圧縮。

`src/data/bookshelf.ts`・`BookActions.astro`(購入リンク・
Formspree送信ロジック)・Worker/D1/APIは変更していない。

## 確認結果(実測)

Playwrightで、「読みたい」の3冊目(最後の行)の下端がビューポート内に
収まるかを実測した。

- **desktop(1440×900)**: 下端y=841px。**スクロールなしで「いま読んで
  いる」「読みたい」両方が収まることを確認した**。
- **mobile(390×844)**: 下端y=1045px。約201px、画面外にはみ出す
  (「読みたい」3冊目のreason文の途中から下)。

mobileで完全な収まりに至らなかった理由: 「読みたい」の各行は
書影+タイトル+著者+reason(実際に書かれた文章)+アクションを持ち、
`/participate`の3行(短い1文の説明のみ)より情報量が多い。フォント
サイズ・余白を`/participate`と同水準まで圧縮し、著者名をタイトル行に
統合しても、reason文を隠さずに表示する限り、mobile幅(390px)で3冊分の
「読みたい」行を1画面(844px)に収めるには、追加でおよそ200px分の
圧縮が必要だった。書影サイズを7rem→6remに縮小する案も試したが、
「想像の共同体・ベネディクト・アンダーソン」のような長い著者名が
かえって3行に折り返され、高さの節約にならなかったため見送った
(7remに戻した)。

それでも、mobile側も実装前(このセッション開始時点)と比べて
「読みたい」3冊目の下端が大きく縮んでいる(セクションの主要な余白を
すべて圧縮し、著者名統合・font-size調整を経た最終値)。desktopは
完全にスクロールなしの目標を達成した。

- mobile/desktopとも`document.documentElement.scrollWidth ===
  clientWidth`を確認し、横方向のoverflowが無いことを確認した。
- 「本棚に本を持ち寄る」トグルが引き続き正しく開閉することを確認
  した。
- `npx astro check`: 0 errors, 0 warnings, 1 hint(既存の無関係な
  hint)。
- `npm run build`: 15ページ生成、エラーなし。

## 採用理由

`/participate`で確立したパターン(セクション統合・calc()による段階的
圧縮・情報を隠さない)をそのまま踏襲した。書影を大きく縮小する、
reason文を省略記号で隠す、といった内容の見え方を損なう手段は、
`/participate`のDecision Log 0161で見送った判断(「情報を隠すのでは
なく器を削る」)と同じ理由で採用しなかった。

## 他の案

「読みたい」をHeroと同じ横並びシェルフ形式に変えれば、3行の縦積みを
1行分の高さに圧縮できるのではと検討したが、reason文(実際の文章)を
狭い横並びアイテム内で表示しようとすると、逆に折り返し行数が増えて
1アイテムあたりの高さが今より高くなる(横スクロールで3冊分の高さの
合計を1冊分に圧縮できても、1冊自体の高さがreason文の分だけ伸びる
ため、正味の削減効果が薄い)。reason文を折りたたむ・省略する対応も
検討対象だが、内容を隠すことになるため、今回は見送り、次の選択肢
として将来の変更可能性に記載する。

## 将来の変更可能性

- mobileで完全にスクロールなしにしたい場合、次の選択肢がある。
  (a) reason文を`-webkit-line-clamp`で1〜2行に切り詰め、省略記号で
  隠す(内容の一部が見えなくなる)。(b) 「読みたい」をHero同様の
  横並びシェルフに変え、reason文をこの一覧からは外し、書影+タイトル+
  著者のみのコンパクトな表示にする(reason文自体は今回削除しない
  という方針を維持する場合、掲載場所の再設計が必要)。(c) 現状を
  受け入れ、mobileでは「読みたい」の一部が最初の画面の外に出る前提
  とする。いずれもプロジェクトオーナーの判断が必要なため、今回は
  実装していない。

## Research Context

`/participate`の3行(短い要約のみ)と異なり、`/bookshelf`の「読みたい」
は実際に書かれた「なぜこの本を読みたいか」という思考の記録
(reason)を持つ。この文章を隠さずに保つことを優先した結果、
mobileでの完全な1画面収まりには届かなかったが、これは「完成の演出を
しない」「実在する内容をそのまま見せる」というCLAUDE.mdの方針と
一貫した判断である。
