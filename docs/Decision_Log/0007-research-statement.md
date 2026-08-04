# 0007. Research Statement をモックアップなしで実装する

- 日付: 2026-08-04
- 状態: 一部上書き済み(→ 0012。正式なResearch Statement v0.1へ差し替え)

## Decision

`ResearchStatement.astro` を新規実装し、Homeの2番目のセクションとして
`index.astro` に組み込んだ。モックアップは存在しないため、
Design Spec 7(Research Attitude)と 8(Design Principles)の文章を
そのままコンテンツとして採用した。レイアウトは、Design Spec 6
「Research Statement＝思想」および 9(Visual Direction: 静かな雑誌の
読書体験)を根拠に、読みやすい幅(36rem)に収めた短文の縦積みリストとした。

あわせて `ResearchSection.astro`(セクション共通ラッパー)と
`SectionTitle.astro`(控えめな見出しラベル)を実装した。
Heroの `scrollTargetId="research-statement"` が指していた
アンカー先(`id="research-statement"`)は、これで初めて実体を持つ。

## 採用理由

- β公開優先の方針転換により、「Design Spec・Decision Log・既存の
  デザインシステムから実装方針を十分推測できる場合はモックアップを
  待たない」という新しいワークフローが明示された。
- Research Statementの中身(文章)については、「すでに文章が存在する」
  という指摘があった。Design Spec全体を見返すと、Section 7(Research
  Attitude)とSection 8(Design Principles)が、この研究室の思想を
  最も直接的に言葉にした部分であり、他に「思想」に該当する文章が
  Design Spec内に見当たらなかったため、この2つを採用した。
- レイアウトは、情報設計そのもの(何を載せるか)ではなく、
  既にある文章をどう見せるかという実装判断の範囲だと判断した。
  Heroと同じ「静かな雑誌」のトーンを踏襲し、新しいビジュアル言語を
  持ち込まないようにした。

## 他の案

- **Design Spec 2(Brand Statement)を使う案**: 「気づいたら、そこに
  問いはある。世界を観察するための、研究と実践。」はすでにHeroの
  コピーとして使用済みであり、Research Statementで繰り返すと
  Heroとの役割の違いが薄れると判断し見送った。
- **見出しを大きく見せる案(Heroに近い扱い)**: Design Spec 6で
  Hero(空気)とResearch Statement(思想)は役割が異なると
  明記されているため、Heroと視覚的に差をつけ、見出しは控えめな
  ラベル(SectionTitle)に留めた。

## 将来の変更可能性

- **このコンテンツ選定(Research Attitude + Design Principles)は
  推測に基づく実装であり、レビュー対象**。もし想定と異なるコピーが
  別途用意されている場合は、`index.astro` の props を差し替えるだけで
  対応できる(Decision Log 0003の方針を踏襲したため)。
- 2つのリストを分けずに1つに統合する、あるいは異なる視覚的表現
  (例: 番号を振る、間に余白以外の区切りを入れる)にする可能性がある。
  デザインレビュー後にChatGPT側から調整が入ることを想定している。

## Research Context

「Research Statement＝思想」という定義(Design Spec 6)に対し、
すでにDesign Spec自身の中にその思想を言葉にした部分(Research
Attitude / Design Principles)が存在していた。新しい文章を
作り出すのではなく、既にある言葉を「どう見せるか」という
実装の仕事に徹したことは、「世界観・コピー・情報設計は変更しない」
というキックオフ文書の原則を、モックアップが無い状況でも
守るための選択だった。
