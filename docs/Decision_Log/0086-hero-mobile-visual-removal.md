# 0086. Hero内蔵のMobile透かし画像を撤去し、Desktopに揃える

- 日付: 2026-09-04
- 状態: 採用中(Decision Log 0023を一部上書き)

## Decision

Decision Log 0085でMobileにも「夜空」背景を適用したところ、
プロジェクトオーナーから「トップページの古い右側の画像はPC版同様
削除して」との指示を受けた。Desktop側は既にDecision Log 0060で
渦のアートワーク画像を背景から撤去済みだったが、Mobileには
Decision Log 0023由来のHero内蔵の透かし表現(コピーの背面に
`opacity: 0.4`で重ねる渦のアートワーク)がそのまま残っていたため、
これを撤去してDesktop・Mobile双方とも画像なし(紺の背景+光の粒の
み)の構成に揃えた。

- `src/components/Hero.astro`から`VisualFragment`のimportと
  `<div class={styles.visual}><VisualFragment ... /></div>`を削除。
  `visualSrc`/`visualAlt` propも不要になったため`Props`interfaceと
  分割代入から削除した。
- `src/components/Hero.module.css`から`.visual`関連のルール
  (基本の`aspect-ratio`指定、Desktop側の`display: none`、Mobile側の
  `position: absolute`+`opacity: 0.4`の透かし表現一式)をすべて削除。
  あわせて`.hero`の`position: relative`コメント、`.copy`の
  `position: relative; z-index: 1;`(透かしより前面に出すための指定)
  も、透かし自体がなくなったため不要になり削除した。
- `src/pages/index.astro`から`heroVisualSrc`定数と、`<Hero>`への
  `visualSrc`/`visualAlt`propの受け渡しを削除。
- `VisualFragment.astro`コンポーネント自体・`public/images/hero/
  03_top_page_artwork.png`アセットは削除していない。Heroからの
  参照がなくなり現状は未使用だが、汎用的な画像ラッパーとして残して
  おき、将来別の画像用途で再利用する可能性に備えた。

## 採用理由

- Desktop(Decision Log 0060)・Mobile(今回)の両方で渦の
  アートワーク画像を使わない構成に揃えることで、「夜空」背景
  (紺+光の粒)がHome全体で一貫した見え方になる。Mobileだけ画像入り
  だと、Decision Log 0085でMobileにも夜空背景を広げた意図(一貫性)
  と矛盾する状態になっていた。
- `.visual`関連のCSSはMobile限定の透かし表現専用だったため、
  用途がなくなった時点で丸ごと削除するのがCLAUDE.mdの「使われて
  いないものは削除する」方針に沿う。`.copy`の`position: relative;
  z-index: 1;`も、透かしとの重なりを解決するためだけの指定だった
  ため、透かしの撤去と同時に不要になった。
- `VisualFragment`コンポーネント自体とアートワークのPNGファイルは
  削除しなかった。今回の指示は「画像を消す(表示をやめる)」ことで
  あり、コンポーネント自体は他の画像用途にも使える汎用的な実装の
  ため、コード上不要と断定できるほどではないと判断した。

## 他の案

- `.visual`のCSSを`display: none`のまま残す案(コメントアウト的に
  無効化するだけ)も考えられたが、CLAUDE.mdの「未使用コードは削除
  する」方針、および実際にもう二度と参照されない前提であれば
  死んだCSSを残す理由がないため、丸ごと削除する方を選んだ。

## 将来の変更可能性

- `VisualFragment.astro`は現状どこからも呼ばれていない。今後
  ずっと使われない見込みが立てば、削除を検討してよい。
- Mobileの「夜空」背景(光の粒のみ)が「寂しい」といった声があれば、
  今回撤去した透かしとは別の形(例: 光の粒の数を増やす等)で
  賑やかしを検討する可能性はある。

## Research Context

Desktopで先に確立した「紺の夜空+ふと現れて消える光の粒」という
表現を、Mobileでも同じ姿にすることで、画面の大きさによって
「ふ、と」という研究室の質感が変わって見えることを避けた。当初
Mobile限定で残っていた渦のアートワークは、Decision Log 0024で
Desktopの背景に格上げされる前の名残であり、今回それを取り除いた
ことで、Home全体の視覚表現がDesktop/Mobileで完全に一致した。
