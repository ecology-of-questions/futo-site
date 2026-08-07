# 0016. Research Statement正式版へ差し替え、全文ページを新設する

- 日付: 2026-08-07
- 状態: 採用中(0012・0013を一部上書き)

## Decision

Research Statementを v0.1(First Draft)から正式版(「気づいたら、そこに
問いがある。」から始まる文章)へ差し替えた。Homeには冒頭から「公開研究室
「ふ、と」は、そうした探究を、立場や専門分野を越えてひらいていくための
場所です。」までの抜粋のみを掲載し、全文は新設した `/research-statement`
ページに掲載する構成に変更した。あわせて、`ResearchStatement` コンポーネント
に `heading`(文章自体の見出し)propを追加した。

## 採用理由

- 正式版は「見出し(気づいたら、そこに問いがある。)＋本文」という構造を
  持つ、Heroと並ぶ重みを持つ独立した宣言文だった。v0.1のような短い散文とは
  異なり、全文をそのままHomeに掲載すると一つのセクションとして長大になり
  すぎ、「静かな雑誌」の読書体験(Design Spec 9)を損なうと判断し、
  抜粋＋全文リンクという構成にした。
- 全文の掲載先について、Design Spec v0.4はResearch Statementを「Homeに
  属する宣言」と位置づけており、独立ページを持つとは明言していなかった。
  情報設計に関わる判断のため、実装を進める前にプロジェクトオーナーに確認
  した。新規ページ `/research-statement` を新設し、Design Spec v0.4のIA図
  が示す「Home → Research Statement → Research」の一本道導線を、
  Home(抜粋)→ Research Statement(全文)→ Research(Reviews)という
  具体的な3ステップとして完成させる方針で合意した。
- 全文ページの末尾には既存の「研究の記録を見る →」
  (`/research#research-reviews`)を引き続き配置し、一本道導線を保った。
- 見出し「気づいたら、そこに問いがある。」は、SectionTitle(セクション
  共通の控えめなラベル。Decision Log 0007の方針を踏襲し、ここでは
  "Research Statement" のまま維持した)とは性質が異なるため、`heading`
  という新しいpropを追加して区別した。`paragraphs` とは別に持たせることで、
  「器」の構造(Decision Log 0008・0013)を壊さずに、文章自体の見出しを
  表示できるようにした。

## 他の案

- **全文をそのままHomeに掲載する案**: 「抜粋を掲載する」という指示と
  矛盾し、Homeが冗長になるため見送った。
- **`/research` ページ内に全文セクションを追加する案**: Design Spec v0.4
  のIA図(Research StatementはHomeに属する宣言、Researchは
  Reviews/Fragments/Logsの置き場)との整合性を優先し、プロジェクトオーナー
  への確認を経て新規ページ案を採用した。
- **見出し文言をSectionTitleにそのまま流し込む案**: SectionTitleは他
  セクション("Research Reviews"等)と共通の、控えめな大文字ラベルとして
  設計されている(Decision Log 0007)。長い日本語の文をそのまま流し込むと
  他のラベルとの視覚的な一貫性が崩れるため見送った。

## 将来の変更可能性

- Research Statementが次に改訂される際(v0.2等)も、`index.astro` と
  `research-statement.astro` の2箇所の `paragraphs` 配列を書き換えるだけで
  反映できる。ただし抜粋の切れ目は、改訂内容によって調整が必要になる
  可能性がある。
- 将来Concept Graphなどが実装された場合、全文ページはその一部として
  再設計される可能性がある(Parking Lot)。

## Research Context

「器と中身を分ける」という一貫した思想(Decision Log 0008・0013)を、
Homeの抜粋と全文ページという2つの「器」に、同じ中身(paragraphsの一部・
全体)を流し込む形で発展させた。

また、Design Specがまだ言明していないIAの空白(全文の掲載先)を、実装を
進める中で見つけ、プロジェクトオーナーに確認しながら埋めていくという
プロセス自体が、「循環する構造」(Research Log 2026-08-04)の一例になって
いる。Design Specが先に全てを決めてから実装するのではなく、実装の途中で
見つかった空白が、次のDesign Spec改版の材料になっていく。
