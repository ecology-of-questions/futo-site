# The Ecology of Questions

A Public Research Studio.

This repository contains both
research
and
software.

Neither is secondary.

Research shapes software.
Software shapes research.
Neither comes first.

---

## このプロジェクトとは何か

「ふ、と」は公開研究室である。

世界を観察するための、研究と実践。気づいたら、そこに問いはある。

一般的なポートフォリオでもサービスサイトでもない。目的は研究内容を
説明することではなく、「この研究室には、ゆっくり考えてもいい空気が
流れている」と感じてもらうことにある。

### 公開研究室とは

完成した知識を展示する場所ではない。訪れた人が、現在進行形の
研究に触れられる場所。研究者(プロジェクトオーナー)が、暮らしを
観察し、本を読み、手を動かし、人と対話しながら考えを書き換え
続けていく過程そのものを、そのまま公開する試み。

### 問いの生態系とは

「問いは立てるものなのか、それとも世界との関わりの中で立ち上がる
ものなのか。」この研究室は、その仮説を確かめるためにある
(Research Statement v0.1 より)。個々の問いは孤立して存在するのでは
なく、観察・対話・実践の中で互いに影響し合いながら生まれ、育ち、
時に姿を変えていく。その全体を「生態系」として捉えている。

## このリポジトリについて

このリポジトリは GitHub Repository である以前に、
**Research Repository** である。

主役はコードではない。研究・思想・実装、そのすべてが主役であり、
同じ重みを持つ。だからREADME・PROJECT.md・CLAUDE.md・Design Spec・
Decision Log・Research Log・Project Journalは、どれも「サポート
ドキュメント」ではなく、一次資料(first-class artifact)として
扱われる。

```
PROJECT.md   → ビジョン・ロードマップ・現在地(人間向け)
CLAUDE.md    → AIの役割・行動規範・開発ルール(AI向け)
Design Spec  → プロダクトの仕様(UI・UX・思想)
Decision Log → 設計判断とその進化の履歴
Research Log → 研究・思考の履歴
Project Journal → 出来事の履歴
```

## 今どこに向かっているのか

今週のゴールは「公開研究室、開室。」。完成を目指すのではなく、
β版として公開し、公開してからも研究とともに育て続ける。

## ロードマップ

**Beta(今週)**

- Home(Hero / Research Statement)の仕上げ
- About(運営者について。公開直前に情報設計) → 2026-08-17実装済み
  (ヘッダー/フッターナビゲーション刷新、Contactページ新設、Home
  「いま、取り組んでいること」セクション追加とあわせて正式公開に
  向けて実装。詳細はDecision Log 0057、Project Journal参照)
- モバイル確認・OGP・favicon・404ページ等の公開前確認
- 公開研究室、開室

**Beta後**

- Research Statementの改訂(v0.2, v0.3, ... 継続的に育つ前提)
- Research Review 01の執筆・公開 → 2026-08-15公開済み(研究断面01
  「『ふと』という日本語について」。予定より前倒し。詳細はDecision
  Log 0030、Research Log参照)
- Research Review 02以降 / Research Fragments / Research Logs の
  詳細実装

**将来像(Design Spec 14: Future)**

- Practice ZINE / 布という実践の道具 / Habitat / 展示 / 文化芸術生活史
- Version UI・変更履歴の表示・Concept Graph等、研究の「育ち方」
  そのものを見せる仕組み

## 今週やること

1. Home polish
2. About(保留中。公開直前に情報設計を詰める) → 実装済み(Decision Log 0057)
3. モバイル確認
4. OGP / favicon / 404ページ
5. β公開

## Parking Lot(β公開までは着手しない)

- Concept Graph
- Version UI
- Research Timeline
- Research Logsページ
- Research Reviewの詳細UI — 一部解禁済み: 01(研究断面01、
  `/research/reviews/01`)は実装済み。02以降は同じ
  `ResearchReviewArticle`コンポーネント・構造を再利用する。
  詳細はDecision Log 0030参照。
- Research Reviewのバージョン履歴表示(こちらは引き続き保留。
  まだ改訂履歴を持つReviewがないため)

新機能を思いついたら、ここに置く。実装せず、記録するだけでよい。

## 将来像

Research Statementが育つように、Research Reviewも、Conceptも、
Decision Logも育つ。器は変わらず、中身が育つ。

コードを直したら、関連するDecision Log・Research Log・Project
Journalが自然に更新される。研究の方向を直したら、数日のうちに
公開研究室の見た目に反映される。ソフトウェアが研究を支え、研究が
ソフトウェアを形作る、というサイクルが、できるだけ小さな摩擦で
回り続けること。それがこのリポジトリの目指す将来像である。
