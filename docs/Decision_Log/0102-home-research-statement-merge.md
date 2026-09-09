# 0102. HeroとResearch Statementの統合、専用ページの廃止、背景グラデーション化

- 日付: 2026-09-09
- 状態: 採用

## Decision

プロジェクトオーナーから、トップページの構成整理について指示を受けた。

### 1. HeroとResearch Statementセクションの統合

トップの導入部分(Hero)と、その下のResearch Statementセクションで
見出し「気づいたら、そこに問いがある」が重複していたため、Heroを
廃止し、Research Statementセクション1つに統合した。

- Heroにあった短い本文(「日常に生まれる小さな気づきを観察し、問いが
  育つ過程をひらく研究室です。」)は削除。
- 見出しは新しい文言「気づいたら、そこに問いがある。」(句点付き)に
  差し替えた。
- Heroの見出しが担っていたページのh1の役割は、Research Statement
  セクションの`heading`が`headingLevel="h1"`で引き継ぐ。
- `Hero.astro`/`Hero.module.css`自体は削除せず残している(呼び出し元が
  なくなっただけ)。

### 2. `/research-statement`専用ページの廃止

トップページにResearch Statement全文(8段落)を掲載することにしたため、
専用ページ(`src/pages/research-statement.astro`)を削除した。

- 既存URLへのアクセスが404にならないよう、`astro.config.mjs`の
  `redirects`機能で`/research-statement` → `/#research-statement`
  へリダイレクトするようにした。`output: "static"`のため、Astroが
  静的なmeta refreshページ(`<meta http-equiv="refresh">`+
  `noindex`+canonical)を生成する。Cloudflare固有機能(`_redirects`等)
  には依存しない、ポータブルな方式を選んだ(CLAUDE.mdの「特定サービスに
  依存しない構成を維持する」方針に合わせた)。
- Header・Footerのナビゲーションには元々`/research-statement`への
  リンクがなかったため、削除対象はHome内の「Research Statement
  全文を読む」リンクのみだった。
- サイトマップ(sitemap.xml)・robots.txtはこのプロジェクトに存在しない
  ため、整理対象はなかった。

### 3. Research Statementエリアの背景グラデーション化

プロジェクトオーナー指定の3色(上部#183153/中央#355273/下部#5c708a)で、
縦方向にごく弱く斜め(170deg)のグラデーションを実装した。

- `NightBackground.astro`に任意prop`gradient`(既定false)を追加。
  他ページ(/research・/about・/contact・研究断面等)は`gradient`を
  渡していないため、従来通り単色`--color-night`のまま。
- 色は`tokens.css`に`--color-night-gradient-top/mid/bottom`として
  追加し、コンポーネントCSSに直接ハードコードしていない。
- 既存の光の粒(5つ)は残しつつ、ピーク不透明度をCSS変数化し
  (`--light-peak-opacity`)、`gradient`指定時のみ0.85→0.55に弱めた。
- Homeはページ全体で1つの共有`position: fixed`背景のため、
  `<NightBackground gradient />`は「いま、取り組んでいること」
  「一緒に試す」を含むページ全体に適用される。この2セクション自体の
  文言・構造・独自の背景(OPEN PRACTICEパネルの淡い面)は変更していない。
  セクションごとに背景を分けるには`position: fixed`の共有背景という
  既存アーキテクチャ自体を作り直す必要があり、「既存コンポーネントを
  大きく作り直さない」という指示の範囲を超えるため見送った。

### 4. スマホ表示の確認

見出し・本文幅・行間・段落間・セクション上下余白を確認したが、
2026-09-04(Decision Log 0089)で導入済みの読みやすい本文幅(52rem)・
行間(1.6)・段落間の余白(space-4)が、8段落の長文でも既に十分機能して
いたため、追加のCSS変更は行わなかった(Playwrightでスマホ幅390pxの
実機表示を確認、詳細は実装時の報告参照)。ただし、見出しのフォント
サイズ(`--fs-xl`)は、以前のHero見出し(`--fs-3xl`)より小さいままである
点は変更していない(下記「他の案」参照)。

## 採用理由

- 見出しの重複はユーザー体験上の明確な問題であり、1つに統合すること
  自体に議論の余地はなかった。
- 専用ページの削除は、全文をHomeに掲載する以上、内容が完全に重複する
  ページを残す理由がないため。404を避けるリダイレクトは、既存の
  外部リンク・ブックマーク・検索エンジンのインデックスへの配慮。
- 背景グラデーションの3色・角度・光の弱め方は、プロジェクトオーナーが
  具体的に指定した値をそのまま採用した。

## 他の案

- 見出しのフォントサイズをHero相当(`--fs-3xl`)に拡大する案も検討した。
  `.heading`は専用ページ廃止によりこの1箇所でしか使われなくなって
  おり、拡大しても他ページへの影響はない。ただし、スクリーンショットで
  確認した現状の表示(`--fs-xl`)が既に明瞭に読める状態だったこと、
  および指示が「今の世界観を壊さない範囲で」という保守的なトーンで
  あったことから、今回は変更せず現状維持とした。見出しをもっと目立た
  せたい場合は、`ResearchStatement.module.css`の`.heading`の
  `font-size`を変更するだけで対応できる。

## 将来の変更可能性

- Research Statement本文が今後も改訂される前提(Decision Log 0013)は
  変わらない。
- セクションごとに背景を分けたくなった場合は、`NightBackground`を
  ページ全体で1回だけ使う現在のアーキテクチャを見直す必要がある。

## Research Context

「Home → Research Statement全文 → Research」という一本道の導線
(Design Spec v0.4)を、専用ページを経由せずHome単体で完結させる構成に
変えたことは、公開研究室の入口をより単純にし、訪問者が最初の1ページで
研究の考え方全体に触れられるようにする試みである。研究声明が「最新版を
表示する器」であるという設計思想(Decision Log 0008・0013)は変わらず、
掲載場所が変わっても中身は今後も更新され続ける前提のままである。
