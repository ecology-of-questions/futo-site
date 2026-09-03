# 0063. 夜空背景を/research・/about・/contactにも揃え、コンポーネント化する

- 日付: 2026-09-03
- 状態: 採用中

## Decision

プロジェクトオーナーの指示(「下記ページも揃えて」、/research・
/about・/contactを指定)を受け、Home限定だった「夜空」背景
(紺の背景色+ふと現れて消える光の粒。Decision Log 0059〜0062)を、
この3ページにも適用した。

- Home(`src/pages/index.astro`)の`.background`/`.lights`/`.light`
  実装(元々`index.module.css`に直書き)を、`NightBackground.astro`
  (+`NightBackground.module.css`)という独立コンポーネントとして
  切り出した。CLAUDE.mdの「container separated from content」
  「Keep components small, single-responsibility, and easy to
  replace」という方針に沿い、Home専用の実装を4ページで再利用できる
  形にした。CSSの中身(背景色・光の粒の位置・keyframes等)は変更して
  いない。
- `src/pages/research.astro`・`src/pages/about.astro`・
  `src/pages/contact.astro`に、それぞれ`<DefaultLayout theme="night">`
  と`<NightBackground />`を追加した。ページ固有のコンテンツ・文言・
  レイアウト構造は変更していない。
- `src/layouts/DefaultLayout.astro`の`theme` propのコメントを、
  「Home専用」から「Home・/research・/about・/contactで使用」に
  更新した。
- `src/styles/global.css`の`--color-ink`反転ブロック(Decision Log
  0059)は、元々`body[data-theme="night"]`という汎用セレクタで
  書いていたためコード変更は不要だったが、コメントをHome限定の
  記述から更新した。

各ページ固有のCSS(`research.module.css`の`.note`、
`about.module.css`の`.operatorPlaceholder`等)は、いずれも
`opacity`による調整のみで、色そのものを固定値にしていないことを
事前に確認した。そのため`--color-ink`の反転がそのまま適用され、
追加の色調整は不要だった。

## 採用理由

- Home実装(`.background`をpage moduleに直書き)のまま/research・
  /about・/contactに複製すると、同じCSS(背景・光の粒・keyframes)が
  4ファイルに重複し、将来の調整(色・光の数・動き)のたびに4箇所を
  同期させる必要が生じる。コンポーネント化することで、調整箇所を
  1箇所(`NightBackground.module.css`)に集約できる。
- 各ページの文字色が`--color-ink`を経由して(直接またはinheritで)
  決まっている設計(Decision Log 0059で修正済み)のおかげで、
  ページ固有のCSSを個別に書き換える必要がなく、`theme="night"`+
  `<NightBackground />`の追加だけで揃えられた。

## 他の案

- NightBackgroundをDefaultLayout内部に組み込み、`theme="night"`だけで
  自動的に背景も描画される案も検討したが、DefaultLayoutは「Header/
  Footerの配置場所」という薄い共通レイアウトの役割に留めたく、
  背景の見た目(位置・光の粒の数など)を将来ページごとに変えたく
  なった場合に備え、`<NightBackground />`をページ側で明示的に
  配置する形(現状の設計)を維持した。

## 将来の変更可能性

- 今後ページが増えた場合も、同様に`theme="night"`+
  `<NightBackground />`を追加するだけで揃えられる。
- 将来的にページごとに光の数や配置を変えたくなった場合は、
  `NightBackground`にprops(光の数など)を追加する形で対応できる。

## Research Context

「夜空」という表現をHomeだけの特別な演出に留めず、サイト全体の
主要ページ(研究断面・ふ、とについて・お問い合わせ)に揃えるという
判断は、「ふ、と」という現象がHomeという入口だけでなく、研究室の
どのページを開いても同じ質感で息づいている、という一貫性の表現でも
ある。CLAUDE.mdの「container separated from content」を保ちながら
実装したことで、この一貫性を今後も低コストで保守できる。
