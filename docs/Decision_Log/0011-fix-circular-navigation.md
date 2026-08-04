# 0011. Research Statement と Research の循環導線を解消する

- 日付: 2026-08-04
- 状態: 採用中(0009・0010を一部上書き)

## Decision

`/research` ページから `/#research-statement`(Home)へ戻るリンクを削除する。

情報設計として、Research Statementは Research の一部ではなく、
Home に属する「宣言」であると整理された。

```
Home
│
├ Research Statement
│
└ Research
     ├ Reviews
     ├ Fragments
     └ Logs
```

導線は Home → Research Statement → Research の一本道とし、
Researchページ内では Reviews / Fragments / Logs の行き来のみを扱う。
Logsは未実装のまま(β公開まで新機能は増やさない方針のためParking Lot)。

## 採用理由

- フィードバックにより、Home ↔ Research の間に循環(Research
  Statement → Research → Research Statement)ができてしまっていることが
  指摘された。「何度も立ち戻れる場所にする」(Design Spec 8)は
  ループさせることではなく、迷わない一本道を用意することだと
  理解し直した。
- Research StatementはHomeの「宣言」であり、Researchという
  「実績の置き場」とは性質が異なる、という整理は情報設計
  そのものであり、Claudeが独自に判断すべきではない。今回は
  ChatGPT/プロジェクトオーナー側から明確に指示されたため、
  その通りに実装した。

## 他の案

- 検討せず。指摘された構造をそのまま採用した。

## 将来の変更可能性

- Research Logs(未実装)が追加される際、Reviews / Fragmentsと
  同様のプレースホルダーパターン(ResearchCard等)を使うか、
  別の見せ方にするかは、その時点でのIAに合わせて判断する。
- Headerのグローバルナビが実装された際、Research Statementへの
  導線をナビ側に持たせるかどうかは別途検討する。

## Research Context

「β公開まで新機能は増やさない」という新しい原則(Parking Lot)と
今回の修正は地続きにある。新しいものを作るフェーズから、
すでにあるものが「公開研究室全体として自然か」を整える
フェーズへ移った、という位置づけの変化が、この一本道への
整理にも表れている。
