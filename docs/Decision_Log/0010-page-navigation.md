# 0010. ページ間の回遊導線を実装し、ArrowLinkを共通コンポーネント化する

- 日付: 2026-08-04
- 状態: 一部上書き済み(→ 0011。Research→Research Statementの導線を削除し一本道に整理)

## Decision

以下の3つの導線を実装した。

1. **Home → Research**: Home の Research Statement セクション末尾に
   「研究の記録を見る →」リンクを追加し、`/research#research-reviews`
   へ遷移する。
2. **Research → Research Statement**: `/research` ページの
   Research Statement グループから `/#research-statement` へリンクする
   (Decision Log 0009で実装済みだったものを引き続き利用)。
3. **Research Statement → Research Review**: 上記1のリンクを
   `/research` の Research Reviews セクション(`id="research-reviews"`)
   へ直接ジャンプするよう調整した。

あわせて、Heroで使っていた「矢印付きテキストリンク」のスタイルを
`ArrowLink.astro` として共通コンポーネント化し、Hero・
ResearchStatementの両方から使う形にリファクタリングした。

## 採用理由

- 同じ見た目のリンク(下線+矢印+ホバーで矢印が動く)を、
  Heroの中だけにハードコードしたままResearchStatementでも
  複製すると、将来ホバーアニメーションや余白を調整する際に
  2箇所を直す必要が出る。「保守性優先」の方針(キックオフ文書)に
  従い、先に共通化した。
- 「Research StatementからResearch Reviewへ」という要望を、
  単に`/research`へのリンクではなく、該当セクションへ直接
  ジャンプするアンカー付きリンクにすることで、より具体的に
  満たせると判断した。

## 他の案

- **各コンポーネントにリンクスタイルを個別に持たせる案**: 実装は
  最速だが、スタイルの二重管理になるため見送った。
- **回遊導線をHeaderのグローバルナビだけで済ませる案**: Headerは
  「ナビゲーション実装時に反映」として保留中であり(Design Spec)、
  今回のようにセクションを跨いだ文脈的な導線(思想を読んだ直後に
  記録を見せる、等)はグローバルナビだけでは表現できないため、
  ページ内の文脈に応じたリンクとして別途実装した。

## 将来の変更可能性

- Headerが実装された段階で、グローバルナビとページ内リンクの
  役割分担(重複が気にならないか)を見直す可能性がある。
- `research-reviews` というid名は仮。Research Reviewsセクションの
  実装が進んだ際に変更する可能性がある。

## Research Context

「何度も立ち戻れる場所にする」(Design Spec 8: Design Principles)
という思想は、単体のページの作り込みだけでなく、ページ同士が
自然に手繰り寄せられる構造があって初めて成立する。Research
Statementを読んだ人が、そのまま「では今何を研究しているのか」を
たどれるようにしたのは、この思想をページ間の体験として
実装したものである。
