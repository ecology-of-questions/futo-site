# 0051. 研究断面詳細ページの本文行間を、サイト全体の--lh-bodyに揃える

- 日付: 2026-08-17
- 状態: 採用中(Decision Log 0035・0050の続き)

## Decision

`ResearchReviewArticle.module.css`の`.paragraph`・`.list`・`.quote`
の`line-height`を、`var(--lh-heading)`(1.5)から`var(--lh-body)`
(1.6、Decision Log 0050で1.9から変更済み)に変更した。
プロジェクトオーナーの「Research Reviewの本文も同様の行間にして」
という指示への対応。

## 採用理由

Decision Log 0035では、当時`--lh-body`が1.9(サイト全体の
「ゆったりした」行間)だったため、Research Review本文には
より詰まった`--lh-heading`(1.5)を流用していた。Decision Log
0050で`--lh-body`自体が1.6まで詰められたことで、両者の差が
小さくなり、「Research Reviewの本文もサイト全体の本文と同じ
行間にしたい」という今回の指示に沿って、意味的にも正しい
トークン(見出し用ではなく本文用の`--lh-body`)を使うように
戻した。

## 他の案

(既存トークンを使い分ける調整のため、特になし)

## 将来の変更可能性

- 今後`--lh-body`が調整された場合、Research Reviewの本文にも
  自動的に反映される(意味的に正しいトークンを参照しているため)。

## Research Context

Decision Log 0035の「lh-bodyはサイト全体で使うゆったりした
行間のトークンのため、ここでは詰まったlh-headingを流用する」
という判断は、`--lh-body`の値そのものが変わったことで前提が
崩れた。今回の変更は、その前提の変化を追認し、Research Review
の本文を「見出し用の詰まった行間」ではなく「本文用の行間」に
正しく戻すもの。
