# 0024. Desktop幅で、渦のアートワークをHero内から切り離しHome全体のposition: fixed背景にする

- 日付: 2026-08-15
- 状態: 採用中(Desktop幅のみ。Mobileの挙動はDecision Log 0023の
  ままで変更なし)。ただし`.copy`に追加した`max-width: 36rem`は
  → 0031で撤廃済み(列幅制限自体をサイト全体で廃止したため)。
  1カラム化そのものは引き続き有効。

## Decision

Desktop幅(900px以上)のHeroビジュアル(渦のアートワーク)の扱いを、
「Hero内の右カラム」から「Home(`index.astro`)全体を貫く
`position: fixed`の背景レイヤー」に変更した。

修正前は、Hero(`src/components/Hero.astro`)がグリッドで左右
分割され、右カラムに`VisualFragment`(渦のアートワーク)を直接
配置していた(Desktop 左コピー/右ビジュアル)。ビジュアルはHero
セクション内に閉じており、スクロールしてResearch Statement以降に
進むと画面から消えていた。

修正後は次の構成にした:

- **ページ側(`src/pages/index.astro` / 新設`index.module.css`)**:
  `<DefaultLayout>`の直下(`<main>`の中の最初の子要素)に
  `<div class={styles.background} aria-hidden="true">`で
  `VisualFragment`をラップして配置。`.background`は
  `position: fixed; inset: 0; z-index: -1; opacity: 0.4;
  pointer-events: none;`とし、Desktop幅(`@media (min-width: 900px)`)
  でのみ`display: block`にする(既定はMobile向けに`display: none`)。
  中の`<img>`には`object-fit: cover; object-position: center;`を
  指定し、絵柄が画面全体に大きく行き渡るようにした(Decision Log
  0023でMobileの透かしに適用したのと同じ理由・同じ手法)。
- **Hero側(`src/components/Hero.astro` / `Hero.module.css`)**:
  Hero自身が持っていた`VisualFragment`(`.visual`)はそのまま残し、
  Mobile限定の透かし(Decision Log 0023)として使い続けるが、
  Desktop幅では`display: none`にして非表示にした。あわせて、右
  カラム用だった`grid-template-columns: minmax(280px, 22rem) 1fr;`
  を削除し(2カラム目が不要になったため、base指定の`1fr`・1カラムに
  戻る)、その代わり`.copy`に`max-width: 36rem`を追加した(以前は
  グリッドの列幅が行幅の制約を兼ねていたが、1カラム化に伴いその
  制約がなくなったため、他セクション同様の読みやすい行幅
  (Design Spec 9)を明示する必要があった)。

z-indexの設計は次の通り: Header(`position: fixed; z-index: 100`)
> Hero `.copy`(`position: relative; z-index: 1`)> 通常のフロー内
コンテンツ(Research Statement等、position/z-index未指定)>
`.background`(`position: fixed; z-index: -1`)。`.background`に
負の値を使ったのは、CSSの描画順(位置指定なしのフロー内コンテンツは
既定でスタックレベル0の位置指定要素より手前に描画される)により、
`z-index: 0`ではResearch Statementのような無指定の要素の背後に
確実には回らないため。

## 採用理由

- 依頼は「HomeのHero単体のデザインではなく、Home全体の視覚表現の
  変更」と位置づけられていた。`VisualFragment`をHeroコンポーネント
  の外(`index.astro`)に出し、Home専用のページレベルCSS
  (`index.module.css`)として実装したのは、この位置づけを構造にも
  反映するため。パターンとしても、`research.astro`/`research.module.css`、
  `404.astro`/`404.module.css`と同様、ページ固有のスタイルはページ
  直下のCSS Modulesに置くという既存の慣例に沿っている。
- `.background`をDOM上`<main>`の子(`index.astro`のスロット内)に
  置きながら、視覚的にはHeaderより背面・本文より背面に置く、という
  一見矛盾した要件は、`position: fixed`と負のz-indexの組み合わせで
  解決した。`<main>`・`<body>`のどちらもposition/transform等で
  新しいスタッキングコンテキストを作っていないため、`.background`の
  z-indexはドキュメントのルートレベルで評価される。これにより、
  DOM上の挿入位置に関わらず、Header(z-index:100、独立した
  スタッキングコンテキスト)より確実に背面、かつResearch Statement
  等の無指定コンテンツより確実に背面、という要求を満たせることを
  Playwrightの`getComputedStyle`確認と実際のスクリーンショットの
  両方で検証した。
- z-indexに`0`ではなく`-1`を使った理由は上記Decision欄に記載の通り。
  実装時に一度`0`で試すことも検討したが、CSS2.1の描画順の規定
  (位置指定要素のスタックレベル0は、無指定のフロー内コンテンツより
  「後(=手前)」に描画される)を踏まえると、Research Statementの
  ような無指定要素の可読性を確実に守るには負の値が必要だった。
- Hero側の`.visual`をDOMから削除せず`display: none`で残したのは、
  Mobileでは同じ`VisualFragment`インスタンスを透かしとして
  使い続ける必要があるため。DesktopとMobileで別々の`VisualFragment`
  インスタンス(Hero内蔵 + ページ背景)を持つ構成になるが、両方とも
  同じ画像URLを参照するため、ブラウザのキャッシュにより実質的な
  二重ダウンロードは発生しない。
- opacityは、まず0.4を起点に、1440px・900px(Desktop最小幅)の
  両方でHero・Research Statement双方の背景として確認した。
  Research Statementの本文は`max-width: 36rem`で左側に収まっており、
  検証した画面幅ではアートワークの密な部分(渦・ドット)と本文が
  直接重なる箇所がほとんど無かったため、追加でopacityを下げる必要は
  ないと判断した。

## 他の案

- **`DefaultLayout.astro`に背景を置き、全ページ共通にする案**:
  「Home全体の視覚表現」という依頼の範囲を超え、Research等の
  他ページにも波及してしまうため採用しなかった。この変更は
  あくまでHome(`index.astro`)固有の表現として、Home専用ファイル
  (`index.astro`/`index.module.css`)に閉じ込めた。
- **`z-index: 0`のまま、Research Statement側(`ResearchSection`)にも
  明示的に`position: relative; z-index: 1;`を追加する案**: 対象範囲を
  「Home全体」に広げると、`ResearchSection`は`research.astro`(Research
  ページ)でも共用されているコンポーネントのため、Research Statement
  側にz-index対応を入れると、その影響がResearchページにも及ぶ
  (実害はないはずだが、意味的に不要な変更が波及する)。`.background`
  側を負のz-indexにする方が、変更をHome側だけに閉じ込められるため
  こちらを採用した。
- **`.hero`の`grid-template-columns`をそのまま残し、右カラムを空に
  する案**: グリッドの2カラム目が空のまま残ると、意図が読み取り
  にくいコードになるため、1カラムに戻して`.copy`側にmax-widthを
  明示する方が、Desktop幅でのHeroの意図(コピーの読みやすい行幅を
  確保しつつ、背景のアートワークに任せる)がコードからも伝わると
  判断した。

## 将来の変更可能性

- Research Statementの文量が増える、あるいはビューポート幅によって
  本文とアートワークの密な部分が直接重なるケースが将来出てくる
  可能性がある。その場合はDecision Log 0023と同様、opacityをさらに
  下げるか、`object-position`を調整して密な部分を本文と重ならない
  位置に逃がすなどの対応を検討すること。
- 「今、取り組んでいること」「研究断面」「研究便り」など、Design
  Spec 4のHome Structureに残っている未実装セクションが今後追加
  された場合も、それらは`index.astro`内の通常のフロー内コンテンツ
  である限り、自動的にこの背景より前面に描画される(z-indexの
  追加対応は不要)。ただし、それらのセクションが独自に
  `position` + `z-index`を明示的に指定する実装になった場合は、
  この背景(`z-index: -1`)との関係を確認すること。
- 画像自体(`03_top_page_artwork.png`)が差し替わる場合、
  Decision Log 0023と同様、Mobile・Desktop両方での見え方を
  再確認すること。

## Design Spec 4 / これまでのHero設計との関係

Design Spec 4(Home Structure)は、Homeを「Hero → Research
Statement(抜粋)→ (今後の未実装セクション) → Footer」という
縦の構成として定義している。この構成・順序そのものはこの変更で
変わっていない。`index.astro`内のセクションの並び(`<Hero />` →
`<ResearchStatement />`)もDOM上そのままで、`.background`は
あくまでその背後に敷かれる視覚レイヤーであり、新しい「セクション」
を追加したわけではない。

一方で、Hero Spec(Design Spec 5)が定めていた「Desktop: 左コピー/
右ビジュアル」という*Hero単体の*レイアウトは、この変更で実質的に
終了した。ビジュアルは「Heroというセクションの一部」から「Home
というページ全体のトーンを支える視覚的背景」へと役割が変わった。
Decision Log 0018・0020・0023までは一貫して「Heroの中でビジュアル
をどう見せるか」という問題設定だったが、0024はその前提そのものを
変更している。今後Hero Specを正式に改訂する際は、この変更を
反映すること(現時点ではDesign Spec本体は未改訂で、この
Decision Logが実装の正とする一次情報)。

## Research Context

依頼にあった通り、これはHero単体の意匠変更ではなく、Home全体の
「空気」の作り方の変更である。Design Spec 5がHeroビジュアルに
与えていた役割(「研究内容」ではなく「空気」を伝えること)を、
Hero一区画からHomeページ全体に拡張したとも言える。渦のアートワーク
が読者のスクロールに付き添い続けることで、「気づいたら、そこに
問いがある。」というHeroのコピーが indicating する体験(何かが
ふと立ち現れ、それが持続する)を、ページ全体のスクロール体験の
中でも一貫して感じられるようにする狙いがある。これは「公開研究室
という一つの場の空気を、要素ごとにではなくページ全体で作る」という
方向性であり、「コンテナとコンテンツを分離する」という本プロジェクト
のアーキテクチャ原則(CLAUDE.md)を、ビジュアル表現の面でも実践した
形と言える(ビジュアルという「コンテンツ」が、Heroという特定の
「コンテナ」に固定されなくなった)。
