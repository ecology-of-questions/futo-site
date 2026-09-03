# 0065. Hero CTAの文言を「研究について知る」から「Research Statementを読む」に変更する

- 日付: 2026-09-03
- 状態: 採用中

## Decision

Homeの最初のビューポートで、右上のHeaderナビ「研究断面」(→
`/research`)と、左下のHero CTA「研究について知る →」(→ 同ページ内
のResearch Statement抜粋へスクロール)が、どちらも「研究」という
言葉を含みながら別の行き先を指しており、紛らわしいという指摘を
受けた。

Hero CTAの文言を「Research Statementを読む」に変更した
(`src/pages/index.astro`の`ctaLabel`)。リンク先(`#research-statement`、
Research Statement抜粋セクションへのページ内スクロール)自体は
変更していない。

## 採用理由

- 複数の選択肢(1. 「Research Statementを読む」に変更、2. 「ふ、と
  という問いについて」のような独自の言い回しに変更、3. Header側の
  「研究断面」を変更、4. 現状維持)をプロジェクトオーナーに提示し、
  「Research Statementを読む」への変更を選んでいただいた。
- この文言は、同じHomeページ内の「いま、取り組んでいること」
  セクション(`CurrentWorkList`)で既に「Research Statementを読む」
  という表現が使われており(ただしリンク先は`/research-statement`
  という独立ページで、こちらは`/research-statement`への遷移。
  Hero CTAは同一ページ内スクロール)、サイト内で「Research
  Statement」という固有名詞の呼び方を統一する効果もある。
- 「研究断面」(Header)と「Research Statement」(Hero CTA)は
  そもそも別の概念(前者は個別の調査記録のシリーズ、後者はこの
  研究室の問いそのものについての宣言文)であるため、文言を明確に
  分けることで、読者が両者を混同せずに済むようになる。

## 他の案

- Header側の「研究断面」を変更する案は、Headerのナビゲーションが
  サイト全体の主要ページ名として複数箇所(Footerとも共通)から
  参照されているため、影響範囲が広く見送った。
- 独自の言い回し(例:「ふ、とという問いについて」)も検討したが、
  「Research Statement」という用語自体がすでにサイト内(Footer、
  CurrentWorkList、Research Statementページ自身の見出し)で
  定着しているため、新しい呼び方を追加するより既存の呼び方に
  揃える方が一貫性が保てると判断した。

## 将来の変更可能性

- Research Statementという用語自体の呼び方を見直す場合は、この
  Hero CTAも含めて他の参照箇所(Footer、CurrentWorkList、
  research-statement.astro)とあわせて変更する。

## Research Context

サイト内で同じ概念に複数の呼び方が存在すると、読者は「この2つは
同じものなのか、違うものなのか」を都度判断する負荷を強いられる。
「観察」を軸にした研究室が、自らのサイト内の言葉遣いにおいても
読者の負荷を減らす方向に調整するのは、この研究室が大切にしている
「余白」や「読みやすさ」という思想と地続きの判断である。
