# Decision Log

「ふ、と」実装における設計判断の記録。

`README.md` が「今どうなっているか」を説明するのに対し、
ここでは「なぜそうしたか」「他に何を検討したか」「将来どう変わりうるか」、
そして「その判断がこの研究室の思想とどうつながっているか」を残す。

`docs/Design_Spec/` がデザインの唯一のソースであるのに対し、
Decision Log は **実装上の判断とその背景** の記録であり、性質が異なる。
Design Spec の内容そのものを繰り返し書き写すことはしない。

このプロジェクトでは、コードも研究成果の一部です。
実装だけでなく、設計判断や思想とのつながりも記録します。

## Decision Log Rule

Decision Logは「正しい判断の記録」ではなく、
**設計がどう進化したかの記録**である。

過去の判断が変更された場合も、削除・上書きはしない。
新しいDecision Logを追加し、以下を記録する。

- なぜ変更したのか
- 何を学んだのか
- どのDecisionを置き換えたのか

置き換えられた側のDecisionは、状態欄に
「一部上書き済み(→ NNNN)」のように、置き換えた側の番号を明記した上で残す。

## ルール

- 1判断 = 1ファイル。連番 + 短い名前(例: `0001-design-tokens.md`)
- 実装中に「複数の選択肢から1つを選んだ」判断があれば都度追加する
- 各ファイルは以下の4項目を簡潔に書く

  1. **採用理由**: なぜその設計を採用したのか
  2. **他の案**: 他に検討した案
  3. **将来の変更可能性**: 将来変更する可能性
  4. **Research Context**: この判断が「ふ、と」の思想(観察・過程・余白・
     暮らしと研究の一体性など)とどうつながっているか。
     技術的な理由だけでは説明しきれない「なぜこのコードが存在するのか」
     を残す項目。

- 後から判断を覆した場合、元のファイルは残したまま新しい番号で
  「上書き」であることを明記する(Design Specの変更履歴と同様、消さずに積み重ねる)

## テンプレート

```markdown
# NNNN. タイトル

- 日付: YYYY-MM-DD
- 状態: 採用中 / 上書き済み(→ NNNN)

## Decision
(何を決めたか、一文で)

## 採用理由
(なぜその設計を採用したのか)

## 他の案
(検討したが採用しなかった案)

## 将来の変更可能性
(将来どう変わりうるか)

## Research Context
(この判断が「ふ、と」の思想とどうつながっているか)
```

## 一覧

| # | タイトル |
|---|---|
| [0001](./0001-design-tokens.md) | 色・タイポ・余白を tokens.css に一元化する |
| [0002](./0002-visual-fragment.md) | VisualFragment を独立コンポーネントとして分離する |
| [0003](./0003-hero-props.md) | Hero のコピー・CTA・画像を props で受け取る |
| [0004](./0004-research-card-preparing.md) | ResearchCard を Preparing 状態に対応させる |
| [0005](./0005-research-status.md) | ResearchStatus を「出版状態」ではなく「研究状態」として再定義する |
| [0006](./0006-research-state-model.md) | ResearchStatus を状態遷移込みの Research State Model として設計する |
| [0007](./0007-research-statement.md) | Research Statement をモックアップなしで実装する |
| [0008](./0008-research-statement-container.md) | ResearchStatement を「文章を受け取る器」として位置づけ直す |
| [0009](./0009-research-placeholder-page.md) | Research ページ(プレースホルダー)を About より先に実装する |
| [0010](./0010-page-navigation.md) | ページ間の回遊導線を実装し、ArrowLinkを共通コンポーネント化する |
| [0011](./0011-fix-circular-navigation.md) | Research Statement と Research の循環導線を解消する |
| [0012](./0012-research-statement-v0-1.md) | Research Statement v0.1 へ差し替え、propsを段落構造に再設計する |
| [0013](./0013-latest-version-container.md) | ResearchStatement を「最新版を表示するための器」として位置づける |
| [0014](./0014-claude-md-charter.md) | CLAUDE.md を「開発ルール集」から「プロジェクト憲章」へ再構成する |
| [0015](./0015-project-md.md) | PROJECT.md を新設し、CLAUDE.md と役割を分離する |
| [0016](./0016-research-statement-final.md) | Research Statement正式版へ差し替え、全文ページを新設する |
| [0017](./0017-hero-heading-wording.md) | Heroの見出し文言を更新し、Design Spec Brand Statementとの表記差分を記録する |
| [0018](./0018-hero-visual-fit.md) | Heroのビジュアルを画像の縦横比に合わせ、見出しの改行を固定する |
| [0019](./0019-404-page.md) | 404ページを、静かなトーンの独立レイアウトとして実装する |
| [0020](./0020-hero-mobile-order-fix.md) | Heroのモバイル表示順バグを修正する(ビジュアルがコピーより先に出ていた) |
| [0021](./0021-header-logo.md) | ロゴ一式の到着を受けてHeaderを実装する |
| [0022](./0022-header-fixed-position.md) | Headerをposition: fixedにし、スマホ幅での表示崩れがないか確認する |
| [0023](./0023-hero-mobile-visual-watermark.md) | Mobile幅のHeroビジュアルを、縦積みから背景の「透かし」表現に変更する |
| [0024](./0024-hero-visual-fixed-background.md) | Desktop幅で、渦のアートワークをHero内から切り離しHome全体のposition: fixed背景にする |
| [0025](./0025-hero-heading-remove-period.md) | Hero・Research Statement見出し末尾の句点「。」を削除し、両者の表記を揃える |
