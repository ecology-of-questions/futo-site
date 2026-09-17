# 0159. 実験室(/participate)のモチーフ3種を決定案に統一

- 日付: 2026-09-17
- 状態: 採用
- 関連: Decision Log 0155(実験室ランディングv0.1刷新、痕跡モチーフの
  初出)・0156(LabNotebookList.astroへの切り出し)。PR #87
  (公開前仕上げ・QA v0.1)merge後の新規PR。

## Decision

`claude_code_lab_motifs_v0.1.md`の指示に基づき、`/participate`の
3項目(音の道/Fieldnote/研究断面をひらく)の右側に置く抽象モチーフを、
プロジェクトオーナーが決定した3案に統一した。本文・CTA・余白・
notebook detail・`labNotebooks.ts`・Worker/D1/APIは一切変更していない。

## 対応

### レイアウト変更(`LabNotebookList.astro`)

モチーフの配置を、説明文の下のブロック要素から、タイトルと同じ行の
右側に変更した。`titleRow`(新設のdiv)で`<h3>`(タイトル)と
`<span class="trace">`(モチーフ)を横並びにし、`justify-content:
space-between`でタイトルを左・モチーフを右に配置する。

```text
category

タイトル                         [motif]

説明文

ノートを見る →
```

### モチーフ3種の描き直し

3つとも同じviewBox(`0 0 130 54`)・同じ線幅(`stroke-width: 1`)・
同じ点サイズ(`r="2"`)に揃えた(以前はviewBoxが120×40/60×60/60×44と
ばらばらで、全体サイズの統一が取れていなかった)。

1. **音の道**: 「立ち止まり、また歩き出す」。1本のpath要素で、
   ゆるく進み、中央付近で小さなループを1回描いてから、再び前へ進む
   形にした。始点・終点にそれぞれ`<circle r="2">`。停止記号・矢印は
   無く、以前の実装(`T`コマンドの反復による波形)はやめた。
2. **Fieldnote**: 「点の記録が、あとから線になる」。左側に7つの
   散らばった`<circle>`(y座標を大きくばらつかせる)を置き、右へ
   進むにつれて点同士のばらつきが収まり、最後の点からそのまま1本の
   path(細い線)につながって終点の点で終わる構成にした。
3. **研究断面をひらく**: 「重なっているところから、断面が見えてくる」。
   3本の有機的なpath(直線的にならないよう緩いベジェ曲線)を、中央
   付近で互いに交差するように配置した。交差する領域には、新設した
   `.overlap`クラスのpath(閉じた輪郭+`fill`、`stroke: none`、
   `opacity: 0.14`)を線の背後に1つ重ね、「重なった部分だけごく淡い
   面が生まれる」状態を表現した。本・ページ・窓のような説明的な図形
   にはしていない。

いずれも装飾要素のため`aria-hidden="true"`を付けている(既存のまま)。

### CSS(`LabNotebookList.module.css`)

- `.titleRow`(新設): `display: flex; align-items: center;
  justify-content: space-between;`。`.title`側に`flex: 1 1 auto;
  min-width: 0;`を追加し、タイトルがどれだけ長くても(実際には
  「研究断面をひらく」が最長)、モチーフの領域を侵食せず自身の列内で
  折り返すようにした。flexboxで左右の領域が分かれているため、構造的に
  タイトルとモチーフが重なることはない。
- `.trace`: 従来の`width: 100%; max-width: 7rem;
  margin-top: var(--space-2);`(説明文の下に置く前提のブロック)を、
  `flex: 0 0 auto; width: clamp(3.25rem, 20vw, 5.5rem);`に変更した。
  `clamp()`によりビューポート幅に応じて縮小するため、390px幅でも
  タイトルと衝突せず、page-level horizontal overflowも発生しない
  (Playwrightで確認、後述)。
- `.trace :global(.overlap)`(新設): 「研究断面をひらく」の重なり
  部分のみに使う塗りつぶしルール。`.trace :global(path)`の
  `fill: none`をクラスセレクタの詳細度で上書きする。

## 対応ファイル

- `src/components/LabNotebookList.astro`: 3モチーフのSVGを描き直し、
  タイトル行(`titleRow`)を新設。
- `src/components/LabNotebookList.module.css`: `titleRow`・`trace`の
  レイアウトをタイトル行の右側配置に変更、`.overlap`ルールを追加。

`src/pages/participate.astro`(文言・CTA・余白)・
`src/data/labNotebooks.ts`・`src/pages/participate/[slug].astro`・
`worker/index.ts`・`wrangler.toml`・`migrations/`は今回も一切
変更していない。

## 確認結果

- mobile(390px)/desktop(1440px)で`/participate`をPlaywright
  (`reducedMotion: 'reduce'`)でスクリーンショットし、以下を確認した。
  - 3つのモチーフが同じ線幅・点サイズ・全体サイズで統一されて見える。
  - 音の道: 線が小さくループしたのち前へ進む様子が読める。
  - Fieldnote: 左側の散らばった点が、右へ進むにつれ1本の線に
    まとまっていく様子が読める。
  - 研究断面をひらく: 3本の線が中央で交差し、交差部分だけに淡い面
    (`.overlap`)が生まれている(高解像度の個別スクリーンショットで
    確認)。線は交差後もそれぞれ続いている。
  - タイトル(特に最長の「研究断面をひらく」)とモチーフが重なって
    いない。
  - `document.documentElement.scrollWidth ===
    document.documentElement.clientWidth`をmobile(390px)・
    desktop(1440px)双方で確認し、page-level horizontal overflowが
    無いことを確認した。
- notebook detail(`/participate/oto-no-michi`)を390pxで確認し、
  overflowが無いこと・`LabNotebookList`を使っていないため見た目に
  変化が無いことを確認した。
- `git diff --stat`で、変更が`LabNotebookList.astro`・
  `LabNotebookList.module.css`の2ファイルのみであることを確認した。
- `npx astro check`: 0 errors, 0 warnings, 1 hint(既存の無関係な
  hint)。
- `npm run build`: 15ページ生成、エラーなし。

## 採用理由

指示書のレイアウト例(タイトル行の右にモチーフ)を、`titleRow`という
最小限の構造追加で実現した。flexboxの左右分割は、絶対配置や
JavaScriptによる幅計算を使わずに「タイトルと重ならない」という要件を
構造的に満たせるため、追加のJS処理や複雑なメディアクエリを増やさずに
済む。`clamp()`によるモチーフの自動縮小も同様に、ブレークポイントを
複数用意せず1つのCSSプロパティで「レスポンシブに縮小可能」という
要件を満たしている。

## 他の案

「研究断面をひらく」の重なり部分を、単純な円(`<ellipse>`)で表現する
案も検討したが、他の2つのモチーフが有機的な曲線であるのに対し
`ellipse`は幾何学的に整いすぎて見えるため、閉じたベジェ曲線
(`.overlap`のpath)による不定形の輪郭を採用した。

## 将来の変更可能性

- 将来、「いま、ひらいている実験」セクション(Decision Log 0156の
  `liveExperimentSlugs`)が有効化された際も、同じ`LabNotebookList`を
  再利用するため、モチーフ・レイアウトは自動的に引き継がれる。
- 4件目以降のnotebookが追加された場合、モチーフはslug単位で
  `traces`に追加する必要がある(この構造自体は0156から変更なし)。

## Research Context

「タイトルより目立たせない」「アイコンやロゴのように強く見せない」と
いう指示は、CLAUDE.mdの「完成の演出をしない」という方針と重なる。
モチーフは各ノートの内容そのものを説明する図解ではなく、あくまで
思考の性質(立ち止まって進む/点から線になる/重なりから断面が生まれる)
を静かに示す装飾であり、今回の統一もこの位置づけを崩さない範囲での
調整に留めた。
