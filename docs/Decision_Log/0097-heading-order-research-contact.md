# 0097. Research・Contactページの見出し順序をAboutと同じ考え方で修正

- 日付: 2026-09-05
- 状態: 採用

## Decision

Decision Log 0096でAboutページの「Eyebrow(h2)の直後にh1」という
不自然な見出し順序を修正した際、同じパターンがResearch(`research.astro`、
Eyebrow「RESEARCH」)・Contact(`contact.astro`、Eyebrow「CONTACT」)にも
残っていることを確認した。プロジェクトオーナーが「トップ・Research・
Contactへ展開する」と明言していたため、Aboutと同じ修正をこの2ページにも
適用した。

- Eyebrow(「RESEARCH」「CONTACT」)を、`<SectionTitle>`(h2)ではなく
  見出し要素ではないプレーンな`<p>`に変更した。見た目は
  `SectionTitle.module.css`の`.title`と同じ(各ページのmodule.cssに
  `.eyebrow`として複製)。
- これにより、両ページとも最初の見出しがh1(「研究断面」「お問い
  合わせ」)になった。
- Aboutと異なり、この2ページにはページタイトルと同じ強さで競合する
  h2が直接隣接していない(Researchのh1直下はResearchReviewList、
  Contactのh1直下は本文とフォーム)ため、h1自体のサイズ変更は
  行っていない。見出し順序の修正のみ。
- `<SectionTitle>`コンポーネント自体は変更していない(Home等、他の
  使用箇所に影響なし)。

見た目は変更前と同一(Playwrightで比較済み)。DOM構造(見出し要素の
種類と順序)のみの変更。

## 採用理由

- 見出し階層はスクリーンリーダー利用者がページ構造を把握する手がかり
  であり、「h2の後にh1」という順序はページの主題(h1)より先に副次的な
  ラベル(h2)が来る形になり、アクセシビリティ上も望ましくない。
- Aboutページで確立した「Eyebrowは見出しではなくpにする」という
  パターンを、同じ問題を抱える他ページにも一貫して適用することで、
  サイト全体の見出し構造の一貫性を保った。

## 他の案

- Home(index.astro)の各セクション(Research Statement、いま取り組んで
  いること、OPEN PRACTICE)も`<SectionTitle>`(h2)を使っているが、
  Homeの唯一のh1はHero内にあり、これらのEyebrowの後にh1が続く構造には
  なっていない(いずれもh2見出しが後に続くのみ)ため、今回の問題には
  該当せず、修正の対象外とした。

## 将来の変更可能性

- 3ページ(About・Research・Contact)で同じ`.eyebrow`スタイル
  (`SectionTitle.module.css`の`.title`と同一の見た目)をそれぞれの
  module.cssに複製する形になっている。`<SectionTitle>`コンポーネント
  自体に`as="p"`を追加し、共通化することを今後検討してよい
  (Decision Log 0096の「将来の変更可能性」から継続する課題)。

## Research Context

「入口となる見出し構造を正しく保つ」という一見地味な修正だが、
Aboutページで見つかった問題を site 全体で確認し、同じ考え方で
展開したことは、プロジェクトオーナーの「ページごとにバラバラに
ならないように」という意図を具体的に実践した一例である。
