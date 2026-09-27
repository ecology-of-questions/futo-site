# 0204 — PC版で「この場所について」を人物イラストの行の右に配置

## Decision
プロジェクトオーナーから「PC版のTOPページ『この場所について』のクリックする場所、モーションの右にして。遠くてわかりづらい」という指摘を受けた。以前は`.intro`が見出し側(`.heroStage`)と「この場所について」(`.introAside`)を横並びの二カラムflexにしており、リンクは常に見出し「暮らしのなかで、」の右側、ページ最上部に固定されていた。人物イラスト(観察する/学ぶ/試す、実際に動くモーション)はその下にあるため、PC幅では視線を引く動きのある場所とクリックできる場所が離れてしまい、見つけにくくなっていた。

`src/pages/index.astro`のマークアップを変更し、`.introAside`を`.heroStage`の外(見出しと同じ行)から、`.heroScene`(人物イラストの行)のすぐ隣に移した。新設した`.heroSceneWithAside`が両者を包む。

```
.heroStage
  h1(見出し)
  .heroSceneWithAside
    .heroScene(人物イラストの行)
    .introAside(この場所について)
```

`src/pages/index.module.css`は以下のとおり変更した。
- `.intro`から二カラムflexの指定(`display:flex; align-items:start; justify-content:space-between; gap`)を削除した。`.intro`の子は`.heroStage`だけになったため、二カラム化は不要になった。
- `.heroScene`が持っていた`margin-top: var(--space-3)`を、新設した`.heroSceneWithAside`に移した(人物イラストとリンクをflexの兄弟として並べたとき、`.heroScene`側だけに上マージンがあると`align-items: center`での縦位置が揃わなくなるため、コンテナ側に持たせた)。
- `.heroSceneWithAside`は、761px以上でのみ`display:flex; align-items:center; justify-content:space-between; gap: var(--space-4);`にして、人物イラストの行とリンクを横並びにする。760px以下ではflex化せず、通常のブロックとして人物イラストの行→リンクの順に縦に積む(モバイルは変更前と同じ見え方)。

モバイル幅の`.introAside`に関する既存のmargin-top調整(複数の`@media (max-width: 760px)`ブロックに分散している)は、いずれも`.introAside`というクラスセレクタのみで、親要素の入れ子構造を前提にしていないため、`.introAside`の位置をHTML上で移動しても引き続きそのまま適用される。そのため、モバイル側のCSSは一切変更していない。

## 採用理由 (Rationale)
- 「遠くてわかりづらい」という指摘は、PC幅でリンクが見出しの高さに固定され、実際に動く人物イラストから離れていたことが原因と判断した。リンクを人物イラストの行と同じ高さ・すぐ右に移すことで、視線が集まる場所のすぐそばにクリックできる場所を置いた。
- HTML構造を変更した(`.introAside`を`.heroStage`の中、`.heroScene`の隣に移動)のは、CSSだけで「見出しの右」から「人物イラストの行の右」に見た目上動かそうとすると、見出しの高さに依存した`position:absolute`の固定値や、隙間だらけのgrid行指定が必要になり、見出しのフォントサイズや行数が変わるたびに壊れやすくなるため。構造そのものを「見出し」→「人物イラストの行+リンク」という自然な縦の並びに変え、flexは人物イラストとリンクの横並びだけに使う方が、壊れにくく理解しやすい。
- モバイル幅のCSS(既存の`.introAside`のmargin-top調整群)を変更しなかったのは、それらがクラスセレクタのみで書かれており、要素の入れ子構造に依存していないため、そのままで意図通りに動作すると判断したため。実際にPlaywrightで760px以下の見た目が変更前と同一であることを確認している。

## 他の案 (Alternatives)
- `.introAside`をHTML上は動かさず、`position: absolute`でPC幅だけ人物イラストの行の高さに合わせて再配置する案も検討したが、見出しの高さ(フォントサイズ・行数)が変わった際に位置がずれるリスクがあり、今後の見出しサイズ調整(Decision Log 0199・0201のような変更)のたびに座標を再計算する必要が生じるため見送った。
- `.intro`全体をCSS Gridの2行×2列にし、1行目に見出し、2行目に人物イラストの行とリンクを配置する案も検討したが、結局`.heroStage`の中身を分割する必要があり、実装の複雑さは今回採用した構造化と大差なかったため、よりシンプルな入れ子構造を採用した。

## 将来の変更可能性 (Future changes)
- 人物イラストの行とリンクの間隔は`.heroSceneWithAside`の`gap`で調整できる。
- リンクを人物イラストのすぐ右に隣接させたい場合(現状は行の両端に離れて配置)は、`justify-content: space-between`を`flex-start`に変え、`gap`の値を調整すればよい。

## Research Context
「この場所について」は、暮らしの中で観察し、学び、試すという探究の営みそのものを説明するページへの入り口である。その入り口を、実際に探究を営む人物イラスト(モーション)のすぐそばに置いたことで、「この場所が何をしている場所か」を知りたくなった瞬間に、視線の先にそのままクリックできる場所がある、という導線になった。

## 検証・未検証事項
- `npx astro check` / `npm run build`: エラーなし。
- Playwright(Chromium)で761px・1024px・1440px幅を確認し、「この場所について」が人物イラストの行(観察する/学ぶ/試す)と同じ高さで、行の右側に表示されることを確認。
- 390px・760px幅で、変更前と同じ「人物イラストの行の下にリンクが積まれる」見た目のまま変わっていないことをスクリーンショットで確認。
- リンクの`href`が`/about`のままであること、ページのコンソールエラーが無いことを確認。
- 通常のフェードインモーション(`heroFigureCellObserve`等)が変更後も正しく動作すること、`prefers-reduced-motion: reduce`で3つの`.heroFigureCell`に一切アニメーションが適用されないこと(`getAnimations().length === 0`)を確認。
- 本entryはmain へ直接反映した変更のため、Cloudflare Production(`futoing.com`)への反映確認はデプロイ後にユーザー報告で行う。
