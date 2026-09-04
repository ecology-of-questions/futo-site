# 0085. 「夜空」背景をMobile幅にも適用する

- 日付: 2026-09-04
- 状態: 採用中(Decision Log 0059・0063を一部上書き)

## Decision

プロジェクトオーナーからHome・/research・/about・/contactのMobile表示を
確認した際、「まだ背景がこのように白(クリーム色)」という指摘を受けた。
これはDecision Log 0059(Desktop限定で「夜空」背景を導入)・0063
(他ページへ展開)の時点で、Mobile幅(900px未満)は意図的に対象外と
していたための、仕様通りの挙動だった。経緯を説明した上で改めて意向を
確認したところ、「モバイルにも夜空背景を適用したい」との回答を得たため、
Desktop限定にしていた実装をMobileにも広げた。

- `src/components/NightBackground.module.css`の`.background`から
  `@media (min-width: 900px)`によるdisplay制御を撤去し、常時
  `display: block`にした。紺の背景色(`--color-night`)・5つの光の粒
  (`.lights`/`.light`)は、Desktop/Mobileで同じ実装のまま全幅に適用
  される。
- `src/styles/global.css`の`body[data-theme="night"] main, footer`
  に対する`--color-ink`反転ブロックからも同じく`@media (min-width:
  900px)`を撤去し、Mobileでも文字色が反転(`--color-paper`色)される
  ようにした。これがないとMobileで紺地に暗い文字が乗り、読めなくなる
  ため必須の変更。
- Home Mobile限定のHero内蔵の透かし表現(渦のアートワーク、opacity
  0.4、Decision Log 0023)はそのまま変更していない。紺の背景の上に
  重ねて表示される形になる。

## 採用理由

- Mobileが対象外だった元々の理由(Decision Log 0059本文)は「Mobileは
  Hero内蔵の透かし表現という別の設計であり、今回のスコープには含めて
  いない」という、当時のタスクの範囲を超えないための判断であって、
  「Mobileでは技術的・デザイン的に夜空背景が成立しない」という否定的な
  判断ではなかった。実際にMobile幅(390px)でスクリーンショットを確認
  したところ、Hero透かしのアートワークは紺の背景上でも違和感なく
  馴染み、見出し・本文・フォームラベル等の文字も`--color-ink`反転に
  よって問題なく読めることを確認した。
- Contactページのフォーム入力欄(`.input`/`.textarea`)は
  `background-color: var(--color-paper)`を個別に指定しており
  `--color-ink`の影響を受けないため、紺の背景の上でも入力欄自体は
  従来通りクリーム色のまま(視認性を損なわない)。ラベル文字は継承
  経由で`--color-ink`(反転後は`--color-paper`)になるため、紺地の上
  でも読める。
- `NightBackground`・文字色反転のどちらも、Desktop/Mobileで実装
  (色・光の粒の位置・keyframes)を分ける必要がなかったため、
  メディアクエリを撤去するだけで済んだ。CLAUDE.mdの「container
  separated from content」の観点からも、Desktop/Mobileで別の背景
  実装を持つより、同じ`<NightBackground />`をそのまま全幅に使う方が
  シンプル。

## 他の案

- Mobile専用に光の数や紺の色味を変える案も考えられたが、まずは
  Desktopと全く同じ実装(スクリーンショットで確認済み)で問題なく
  成立しているため、現時点では調整不要と判断した。読みにくい箇所が
  後から見つかれば、その時点で個別に調整する。

## 将来の変更可能性

- 今後Mobileでも「読みにくい」「光の数が多すぎる/少なすぎる」等の
  指摘があれば、`NightBackground`にprops(光の数・配置など、Decision
  Log 0063で拡張ポイントとして残した)を追加してMobile/Desktopで
  出し分けることもできる。
- Hero内蔵の透かし(Decision Log 0023)の`opacity: 0.4`は、紺の背景を
  前提に調整された値ではない(クリーム背景時代の値をそのまま
  流用している)。プロジェクトオーナーから見え方の指摘があれば、
  紺の背景向けに再調整する可能性がある。

## Research Context

「夜空」という表現をDesktopだけの特別な演出に留めず、実際に多くの
訪問者が使うであろうMobile幅にも広げたことで、「気づいたら、そこに
問いがある」というHeroの核心的な一文が、画面の大きさによらず同じ
質感の中で読まれることになる。プロジェクトオーナーからの「まだ背景が
白い」という一見小さな違和感の報告が、当初のスコープ限定の理由を
再確認し、意向を再度尋ねるきっかけになった過程自体も、Decision Logが
「なぜ」を積み重ねる記録であることの実践例である。
