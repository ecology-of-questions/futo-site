# 0173. 「音の道」: スクロールなしでスライド全体が見えるレイアウトに変更

- 日付: 2026-09-17
- 状態: 採用
- 関連: Decision Log 0171(Googleスライド埋め込み機構の実装)。Decision
  Log 0172(「音の道」への実URL設定)。Decision Log 0161(`/participate`
  で1画面フィットを狙った際に発見した`:global()`IDセレクタ問題、本
  エントリでも同じ手法を踏襲)。

## Decision

「音の道」に実際のGoogleスライドURLを設定した直後、プロジェクトオーナー
から「音の道ページを、スクロールなしでスライド全体が見えるレイアウトに
変更してください」との指示を受けた。要件は以下の通り。

- スライドをページの主役にする。スライドより上はヘッダーとコンパクトな
  ページタイトルだけ。
- 説明文・補足はスライドの下に移動する。
- 上部の余白・タイトルの文字サイズ・各要素の間隔を抑える。
- 初期表示にスライド全体とプレイヤー操作バーを収める。縦横比は維持し、
  切り抜き・引き伸ばしはしない。
- 画面の高さから他要素の高さを引いた残りに合わせてサイズ調整する
  (横幅だけで決めない)。
- 「コメントする」リンクはスライド直下にコンパクトに。
- ページ全体のスクロールは禁止しない(説明文へはスクロールでアクセス)。
- PC・スマホ両方で確認する。

## 対応

### 適用範囲: `slidesEmbedSrc`があるノートだけ

`src/pages/participate/[slug].astro`は3ノート共通のテンプレートだが、
今回の指示は「音の道」ページが対象だったため、`notebook.slidesEmbedUrl`
が無いノート(現状Fieldnote・研究断面をひらく)の見た目は変更していない。
Hero区画を`slidesEmbedSrc`の有無で分岐させ、ある場合だけ新しい
`#notebook-hero`構成、無い場合は従来通りの`#notebook-top`構成
(縦積みのタイトル+説明文)を使う。将来他のノートにもスライドURLが
設定されれば、同じ`#notebook-hero`構成が自動的に適用される(スラグに
よる個別分岐はしていない)。

### 構造: タイトル・スライド・コメントリンクを1つの縦flexにまとめる

新設した`.heroViewport`(`display:flex; flex-direction:column;`)が、
以下の3つを縦に並べる。

1. `.heroTitle`(自然な高さ): 「← 実験室」・category(eyebrow)・
   `<h1>`(`.headingCompact`、`var(--fs-xl)`=28px。既存の`.heading`
   `var(--fs-2xl)`=40pxより抑えたサイズ)。
2. `.slideArea`(`flex: 1 1 auto; min-height: 0;`): 残りの縦幅すべてを
   確保する。中はさらに縦flex(`flex-direction: column; align-items:
   center; justify-content: flex-start;`)にして、スライド本体と
   コメントリンクを上詰めのひとまとまりとして配置する(両者の間に
   大きな余白ができないようにするための構成。詳細は下記「スライドと
   コメントリンクをまとめた理由」参照)。
3. `.slideArea`の中身:
   - `.slidesEmbed`(`aspect-ratio: 16/9; width: 100%; max-height:
     100%;`): 16:9を維持しつつ、横は親幅いっぱい、縦は`.slideArea`の
     高さを超えないという両方の制約から、ブラウザが縮小後のサイズを
     計算する(この計算はCSSの`aspect-ratio`+`max-height`の仕組みに
     任せており、JSでの高さ計測は行っていない)。
   - `.slidesComment`(`flex: 0 0 auto`): 「この断面にコメントを
     置く →」+補足文。

`#notebook-hero`自体は、通常の`ResearchSection`の`padding-block`
(既定`var(--space-6)`=96px上下)を`:global(#notebook-hero) {
padding-block: var(--space-2) var(--space-3); }`で圧縮している
(`:global()`が無いとCSS ModulesがIDセレクタもハッシュ化し、実際の
DOMのidと一致しなくなる問題への対応。Decision Log 0161と同じ手法)。

`.heroViewport`自体には、ヘッダー高さ(`--header-height`=73px)と
`#notebook-hero`のpadding-block分を差し引いた`min-height`を持たせている
(`calc(100vh/100dvh - var(--header-height) - var(--space-2) -
var(--space-3))`。`vh`を先に、`dvh`を後に書く進行的強化で、モバイル
ブラウザのアドレスバー分の表示ゆれにも対応する)。

### スライドとコメントリンクをまとめた理由

最初の実装では、`.slideArea`(残りの縦幅全部)の中でスライドを
`justify-content: center`(縦方向も中央)にしていたが、この場合スライドの
実際の高さ(特にmobileでは横幅制約により16:9で計算すると192px程度と
小さい)に対して`.slideArea`自体は縦にずっと大きいため、スライドの
上下両方に大きな空白ができ、結果としてスライド直後に来るはずの
コメントリンクが画面下の方まで離れてしまった(実測でスライド下端から
コメントリンクまで約185px)。「コメントする」リンクをスライド直下に
コンパクトに置くという指示に反するため、スライド本体とコメントリンクを
同じ内側の縦flexにまとめ、両方を`.slideArea`の上側に詰めて配置する
構成に変更した。この結果、画面の余り分は自然と`.slideArea`の下側
(コメントリンクのさらに下、初期表示の範囲内)に生じる形になり、
スライド・コメントリンクの間隔は約8pxまで縮まった。

### 説明文の移動

`notebook.description`(lead)・`commonNotebookDescription`
(commonNote)は、Hero区画から独立した新しい`ResearchSection
id="notebook-about"`に移した。「書かれたこと」の前、スライド区画の
直後に置き、通常のResearchSectionのpadding-block(96px上下)のままに
している(この区画自体は初期表示に収める対象ではないため、既存の
余白ルールをそのまま使うのが妥当と判断した)。区画内で`.lead`が最初の
要素になるため、`:global(#notebook-about) .lead { margin-top: 0; }`で、
本来h1の直後に来る前提の`margin-top: var(--space-3)`を打ち消している。

## 対応ファイル

- `src/pages/participate/[slug].astro`
- `src/pages/participate/[slug].module.css`

`src/data/labNotebooks.ts`・`src/types/labNotebook.ts`・Worker/D1/API・
他ページは変更していない。

## 確認結果

- `npx astro check`: 0 errors, 0 warnings, 1 hint(既存の無関係な
  hint)。
- `npm run build`: 15ページ生成、エラーなし。
- ビルド後のHTMLで、`#notebook-hero`・`.heroViewport`相当のクラスが
  「音の道」ページにのみ存在し、Fieldnote・研究断面をひらくには
  一切含まれないことを確認した(対象範囲が正しく限定されていること)。
- Playwrightでmobile(390×844)/desktop(1440×900)を確認した。
  - どちらも`document.documentElement.scrollWidth === clientWidth`
    (横方向のoverflow無し)。
  - iframe(スライド本体)の実測サイズが、mobile 342×192px、desktop
    1072×603pxと、どちらも正確に16:9であること。
  - iframeの下端・「この断面にコメントを置く」リンクの下端が、どちらも
    初期表示のビューポート内(スクロール不要な範囲)に収まっている
    ことを座標で確認した。
  - スライド下端からコメントリンクまでの間隔が、mobile・desktopとも
    約8pxまで縮まっている(まとめる前は約185pxあった)ことを確認した。
  - desktopでは横幅ではなく高さが制約になっており(1072px幅は利用可能
    幅より狭い)、「横幅だけでサイズを決めない」という指示通りに
    高さ基準で縮小されていることを確認した。
  - スクロール後、説明文(`#notebook-about`)・「書かれたこと」・
    「ふと思い出したことを書き残す」・「他のノートを見る」が、従来
    通り正しく表示されることを確認した。
  - 「＋ どんなときに思い出した？」の展開トグルが引き続き正常動作
    することを確認した(スクリプト自体は変更していないため、既存の
    振る舞いに影響が無いことの確認)。
  - Fieldnote・研究断面をひらくのページが、今回の変更前と同じ見た目
    (縦積みのHero)のままであることをスクリーンショットで確認した。

## 採用理由

CSSの`aspect-ratio`+`max-height: 100%`+flexboxの組み合わせだけで、
JSによる高さ計測を行わずに「縦横比を維持したまま、画面の残り高さに
収める」という要件を満たせた。スライドとコメントリンクを同じ内側の
flexコンテナにまとめることで、「主役の要素の直後に付随リンクを置く」
という一般的なレイアウト意図を、複雑な高さの手計算(タイトルや
コメントリンクの高さを個別にpx単位で見積もる等)を行わずに実現できた。

## 他の案

タイトル・コメントリンクの高さをJSで計測し、CSS変数に代入して
`calc()`に渡す案も検討したが、今回のタイトル文言(「音の道」等)は
短く折り返しの心配が少ないこと、flexboxとaspect-ratioの組み合わせだけで
実測上正しく収まることを確認できたため、JSを追加しない、より単純な
実装を採用した。

## 将来の変更可能性

- 将来、他のノート(Fieldnote・研究断面をひらく)にもスライドURLが
  設定されれば、この`#notebook-hero`構成が自動的に適用される。ノート
  タイトルが長くなり折り返す場合は、`.heroTitle`の高さが今回の実測より
  増え、スライドの取り分がわずかに減る形で自動的に調整される
  (flexboxの性質上、レイアウトが壊れることはない)。
- 「スライド+コメントリンク」をまとめたことで生じる下部の空白
  (特にmobileで顕著)が視覚的に気になる場合は、その空白に「↓
  続きを見る」等の控えめなスクロール誘導を追加する余地がある(今回は
  指示に無いため実装していない)。

## Research Context

「初期表示の画面に収める」という要件を満たすために、要素の高さを
逐一JSで測るのではなく、CSSのレイアウトアルゴリズム(flexboxの
残り空間分配、aspect-ratioとmax-height制約の相互作用)に計算を
委ねる設計にした。これは、このプロジェクトがこれまで繰り返し
採用してきた「シンプルな実装を優先する」(CLAUDE.md)という方針の
実践であり、JSに頼らずCSSだけで解決できる範囲を見極めることが、
将来のメンテナンス性(他のノートへの展開のしやすさ)にも直結している。
