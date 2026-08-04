# ふ、と

> 気づいたら、そこに問いはある。
> 世界を観察するための、研究と実践。

---

⚠️ このホームページは現在β版です。研究とともに少しずつ育っています。

---

「ふ、と」公開研究室のホームページ実装リポジトリ。

現在 Hero セクションまで実装済みです。以降の Home の各セクションは、
`Home_[Section]_v1_mockup.png` / `Home_[Section]_v1_spec.md` が
Creative Director(ChatGPT)側から共有され次第、順番に実装していきます。

## 唯一のデザインソース

`docs/Design_Spec/` (現在 v0.3) が唯一のデザインソースです。
実装者(Claude)は世界観・コピー・情報設計を変更しません。
Design Spec とモックアップに矛盾がある場合は、実装前に確認します。

## 技術スタック

| 項目 | 選定 |
|---|---|
| フレームワーク | Astro (最新安定版) |
| 言語 | TypeScript (strict) |
| スタイリング | CSS Modules |
| UIライブラリ | 導入しない |
| CSSフレームワーク | Tailwind等は導入しない |
| アニメーション | ライブラリ導入せず、必要時にCSS transitionで対応 |
| デプロイ | Cloudflare Pages を第一候補(ただし特定サービスに依存しない静的サイト構成) |

## ディレクトリ構成

```
docs/
  Design_Spec/    # 決定済みの設計(唯一のデザインソース)
  Decision_Log/    # 実装上の判断とその理由
  Research_Log/    # 思想的な背景のメモ
src/
  layouts/
    DefaultLayout.astro   # 全ページ共通レイアウト(head, Header/Footer配置)
  components/
    Header.astro           # 未実装(Header実装時に着手)
    Hero.astro              # 実装済み
    Hero.module.css
    VisualFragment.astro    # 実装済み。画像差し替え可能なスロット
    VisualFragment.module.css
    SectionTitle.astro
    ResearchSection.astro   # 各セクション共通ラッパー(Design Spec: Research Block)
    ResearchCard.astro      # 研究断面等で使う汎用カード
    ResearchNotes.astro     # 研究便り(Design Spec: Research Notes List)
    Newsletter.astro
    Footer.astro
  styles/
    tokens.css   # 色・タイポ・余白などのデザイントークン(唯一の管理場所)
    global.css   # 最小限のリセット + ベーススタイル。tokens.cssを読み込む
  pages/
    index.astro  # Home。現在Heroのみ実装
```

## 設計方針

- **保守性優先**: コンポーネントは小さく分割し、責務を1つに絞る
- **差し替えやすさ**: 特に `VisualFragment` は、Heroに配置するビジュアルを
  AIイラストから将来の手描きスケッチへ差し替えることを前提に、
  画像ソースを props で外から渡す単純な構造にしている
- **デザイントークンの一元管理**: 色・余白・タイポグラフィは
  すべて `src/styles/tokens.css` の CSS Custom Properties に集約する。
  コンポーネント側のCSS Modulesはこのトークンを参照する
- **静的サイトとしての可搬性**: Cloudflare Pages を第一候補とするが、
  Cloudflare固有の機能(アダプター等)には依存させない。
  `astro build` の `dist/` をそのまま他の静的ホスティングにもデプロイできる状態を保つ

## 現時点での注意点(未確定事項)

`tokens.css` 内の色(HEX値)とフォントファミリーは、Design Spec v0.3に
具体的な指定がないため**仮値**です。Creative Director側から正式な値が
共有され次第、更新します。実装者の裁量で「見やすさ」を理由に
変更しないでください。

## Docs

コードとは別に、以下の3つを `docs/` に記録している。
このプロジェクトでは、コードも研究成果の一部です。
実装だけでなく、設計判断や思想とのつながりも記録します。

| ディレクトリ | 内容 |
|---|---|
| [`docs/Design_Spec/`](./docs/Design_Spec/README.md) | 決定済みの設計そのもの(唯一のデザインソース) |
| [`docs/Decision_Log/`](./docs/Decision_Log/README.md) | 実装上の判断・他に検討した案・思想とのつながり |
| [`docs/Research_Log/`](./docs/Research_Log/README.md) | ChatGPTとの対話で決まっていく思想的な背景のメモ |
| [`docs/Project_Journal/`](./docs/Project_Journal/README.md) | プロジェクトの歴史。その日に何が起きたか |

コミットメッセージの書き方は [`CONTRIBUTING.md`](./CONTRIBUTING.md) を参照。

## セットアップ

```bash
npm install
npm run dev
```

## ビルド

```bash
npm run build
npm run preview
```

`dist/` に静的ファイルが出力されます。

## 体制

| 役割 | 担当 |
|---|---|
| 研究思想・コンテンツ・最終判断 | プロジェクトオーナー |
| 研究設計・情報設計・UX・全体ディレクション | ChatGPT(Creative Director) |
| 実装・アーキテクチャ・保守性・技術提案 | Claude(Frontend Engineer) |

Design Specの思想と既存デザインシステムに整合する範囲であれば、
Claudeはモックアップを待たずに実装を提案する。デザイン判断・情報設計が
必要な部分は、引き続きモックアップ/仕様書を待つ。詳細は
[`docs/Research_Log/`](./docs/Research_Log/README.md) を参照。

## 現在の方針: β公開優先

「完成させてから公開する」のではなく、β公開を優先する。
目的は完成品を見せることではなく、研究室のドアを開けること。
公開後も、研究とともに少しずつ育てていく前提(公開してからが開発のスタート)。

β公開に必要な最低限:

1. Home ← Hero実装済み。Research Statement待ち
2. Research Statement ← 次のマイルストーン(モックアップ/Spec待ち)
3. About
4. Research(プレースホルダー。"Status: Preparing" 程度のカードで十分。詳細UIは公開後)
5. β公開

Research Reviewの詳細UIやバージョン管理などは公開後に進める。
実装はこれまで通り、モックアップ・仕様書・レビューが揃ってから着手する。

各セクションは `Home_[Section]_v1_mockup.png` と
`Home_[Section]_v1_spec.md` が揃ってから実装を開始します。
