# 0117. 「研究の本棚」を`/bookshelf`に一本化する

- 日付: 2026-09-11
- 状態: 採用(Decision Log 0116を一部上書き)

## Decision

Decision Log 0116(「本を贈る」から「研究の本棚」中心への再編)の
実装により、「研究の本棚」が`/bookshelf`(2026-09-10新設、Decision
Log 0111)と`/participate`(フィルター・話したい・贈る機能付き、
Decision Log 0115・0116)の2箇所に分裂した。プロジェクトオーナーから、
役割を整理する指示を受けた。

方針: `/bookshelf`を「研究の本棚」の正式な本体ページとし、本の全
一覧・statusフィルター・「この本について話したい」・「この本を
贈る」・「この本から生まれた記録」をすべてそこに集約する。
`/participate`は「関わる」ための入口ページとして維持しつつ、本棚
全体は再掲せず、「本から関わる」という短いteaserセクション(featured
本2〜3冊+「研究の本棚を見る →」)のみを残す。Homeの「研究の本棚」
プレビューも含め、本データは1か所だけで管理する。

実装前に、(1)`/bookshelf`の現在の実装構造、(2)Home本棚との
データ関係、(3)`/participate`の本棚実装、(4)最小変更での一元化方針、
(5)変更対象ファイル、を報告したうえで実装した。conversation MVP
(Decision Log 0115)・gift機能は削除せず、`/bookshelf`側にそのまま
移設した。

## 対応

### 1. 型の統合(src/types/bookshelf.ts)

Home「研究の本棚」プレビュー用に作っていた簡易な`BookEntry`
(title/label/description/tone、Decision Log 0111)を、Decision Log
0116で`/participate`用に作った拡張版(`ParticipateBookEntry`:
status/owned/giftEnabled/conversationEnabled/relatedUrl等)に統合
した。`label`/`description`という独立したプロパティ名は廃止し、
`status`(enum、`bookStatusLabels`で表示ラベルを一元管理)/`reason`に
統一した。

新たに`featured: boolean`(Home・`/participate`の圧縮表示に出すか)、
`tone?`(本ごとに固定の仮カバー色。同じ本が複数の一覧に登場しても
常に同じ色になるよう、並び順ではなく本に紐づける)を追加した。

`src/types/participate.ts`からは本関連の型(`BookStatus`・
`bookStatusLabels`・`ParticipateBookEntry`)をすべて削除し、
`LendCategory`(場所・知識・技術を貸すセクション用、本棚とは無関係)
のみを残した。

### 2. データの一元化(src/data/bookshelf.ts)

`src/data/participateBooks.ts`(Decision Log 0116)を
`src/data/bookshelf.ts`に統合した。3冊(経験と教育/調査的感性術/
想像の共同体)とも`featured: true`にした(現時点では3冊のみのため、
本体一覧とfeatured表示が同じ内容になる)。`index.astro`・
`bookshelf.astro`にそれぞれ別々にハードコードされていた旧仮データ
(記録と表現/歩くこと/知覚と世界、2箇所で重複)は削除した。

### 3. コンポーネントの役割分担

- `BookshelfList.astro`(既存、3カードグリッド、アクションなし):
  Home「研究の本棚」プレビューと`/participate`「本から関わる」
  teaserの両方で共用する、圧縮表示専用のコンポーネントに位置づけを
  明確化した。新しい`BookEntry`のフィールド(`status`→
  `bookStatusLabels`でラベル変換、`reason`、`image`/`tone`)に対応
  させた。CSSクラス名(`.label`/`.description`等)は視覚的役割を表す
  名前のためそのまま維持し、データとのマッピングのみコンポーネント側で
  変更した。
- `ParticipateBookshelf.astro`(Decision Log 0116、フィルター+話したい
  +贈る+関連リンクのフル機能版)を`BookshelfFullList.astro`に改名し、
  `/participate`から`/bookshelf`専用に移設した。ロジック・
  マークアップは実質的に変更していない(型のimport元のみ
  `@/types/participate`→`@/types/bookshelf`に変更)。「この本について
  話したい」(Formspree送信・hidden book_id/book_title・フォーム項目・
  成功/失敗文言・チェックボックス既定OFF)、「この本を贈る」
  (giftEnabled条件・手元にある本を贈るの住所非公開設計)は、コード・
  挙動とも一切変更せず、そのまま移設した。

### 4. ページの変更

- `bookshelf.astro`: `BookshelfFullList`+`src/data/bookshelf.ts`の
  `books`をそのまま渡す形に変更した。既存の見出し(「研究の本棚」)・
  導入文(「読んでいる本、これから読みたい本。」)は変更していない
  (今回の指示は構造の一元化であり、新しい文言の指示はなかったため)。
- `index.astro`: ハードコードしていた3冊の配列を削除し、
  `books.filter((book) => book.featured)`に差し替えた。見出し・
  導入文・カードの見た目は変更していない。
- `participate.astro`: 「研究の本棚」セクション(フィルター+全冊+
  話したい+贈る)を削除し、「本から関わる」セクション(見出しのみ、
  本文は追加せず)+featured本(`BookshelfList`、アクションなし)+
  `ArrowLink`「研究の本棚を見る →」(`/bookshelf`)に縮小した。本文の
  説明文を追加しなかったのは、今回の指示に具体的な文言の提示が
  なかったため、これ以上コピーを創作しない方針を踏襲したもの。

## 採用理由

- 「本データは1か所だけで管理する」という指示に従い、型・データファイル
  ともに単一のソースに統合した。Home・`/bookshelf`・`/participate`の
  いずれかで本の情報を更新すれば、他の2箇所にも自動的に反映される。
- conversation MVP・gift機能の実装(Formspreeへの送信内容、hidden
  fieldの構造、成功/失敗文言、住所非公開の設計等)は、Decision Log
  0115・0116で確定させた内容をそのまま維持し、削除・再実装しない
  ことで、既に検証済みの挙動を壊すリスクを避けた。
- `/participate`のteaserに本文コピーを追加しなかったのは、Decision
  Log 0114での反省(コンテキスト要約後に本文を推測で再構成してしまった
  失敗)を踏まえ、指示にない文言を新たに作らないという、このページ
  全体で一貫している方針を優先したため。

## 他の案

- Home「研究の本棚」プレビューと`/participate`「本から関わる」で
  別々のteaser用コンポーネントを作る案も検討したが、両者は「本の
  圧縮表示+本体ページへのリンク」という同じ役割のため、既存の
  `BookshelfList.astro`を共用する方が重複が少ないと判断した。
- `BookEntry`という型名自体をさらに一般的な名前(`Book`等)に変える案も
  検討したが、影響範囲が広がるだけで実利が薄いため見送った。

## 将来の変更可能性

- 本が増えた際は`src/data/bookshelf.ts`の配列に要素を追加するだけで、
  Home・`/bookshelf`・`/participate`のすべてに反映される
  (`featured`をtrueにした本のみHome・`/participate`にも表示される)。
- `giftEnabled: true`の本、`relatedUrl`を持つ本が登場した際は、
  `/bookshelf`側にのみその機能が表示される(`/participate`のteaserは
  常にアクションなしの圧縮表示のまま)。

## Research Context

この一本化は、「同じ情報を複数箇所で個別に管理しない」という
CLAUDE.mdの一貫した設計思想(ResearchStatementの「最新版を映す器」、
Decision Log 0116の「贈ると話すを独立させる」と同じ系譜)を、
ページをまたいだデータ管理そのものに適用したものである。実装を
一度進めてから、実際に使ってみて生じた重複(`/bookshelf`と
`/participate`の役割の重なり)を、間を置かずに率直に指摘し、
Decision Logに整理の経緯を残しながら手戻りを許容する、という
このプロジェクトの進め方自体も、記録に値する実例である。
