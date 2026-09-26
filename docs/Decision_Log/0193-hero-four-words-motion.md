# 0193 — トップページHeroの見出しを「暮らす　観察　学ぶ　試す」に変更、右側の抽象アニメーションを撤去

## Decision
プロジェクトオーナーから、トップページHeroの見出しを「日々の気づきから、問いを育てる。」から「暮らす　観察　学ぶ　試す」(区切りは全角スペース1文字、句読点・矢印なし)に変更する指示を受けた。あわせて、右側にあった点と線の抽象アニメーション(`HomeMotion kind="question"`)を撤去し、4語自体が息をするように動くことで、暮らし→観察→学ぶ→試す→暮らしの往復を図解せずに感じさせる指示だった。

実装は以下のとおり。

1. `src/pages/index.astro`のHero見出しを、`暮らす`・`観察`・`学ぶ`・`試す`の4つの`<span>`と、その間に挟む全角スペース(`　`)3つに置き換えた。`<br>`・句読点・矢印は使っていない。
2. Hero右側の`<HomeMotion kind="question" />`(点と線のSVG+「もう一度再生」ボタン+IntersectionObserverスクリプト)を撤去した。`HomeMotion`コンポーネント自体、および`kind="sound"`(実験室セクション)・`kind="question"`(実験室一覧のFieldnote行のモチーフ、`LabNotebookList.astro`)としての他の利用箇所は変更していない。
3. `src/styles/tokens.css`に`--home-hero-words`(4語+全角スペース3つ、表示上12文字相当が390px幅でも1行に収まるよう計算した専用clamp())を追加した。
4. `src/pages/index.module.css`に`.heroWords`(nowrap見出し)・`.heroWord`(各語)・`@keyframes heroWordPulse`を追加し、`.intro h1`(旧2行見出し用ルール)と、HomeMotionのSVGサイズに合わせていた`.introAside`の`min-width`(`var(--home-motion-width)`)を削除した。

## モーションの仕組み
- 4語すべてに`animation: heroWordPulse 9s ease-in-out infinite backwards`を適用し、`animation-delay`だけを0s/1.8s/3.6s/5.4sとずらすことで、同じ9秒のキーフレームを1.8秒(9秒の1/5)ずつ位相をずらして再生する。9秒の内訳は「1語が明滅する1.8秒×4語+間を置く1.8秒」の5区間で、これにより「試すの後に間を置いて暮らすから再開する」ループが、特別な休止用キーフレームを書かずに自然に生まれる。
- キーフレームは`color`(`--color-ink-muted` ⇄ `--color-ink`)と`transform: translateY(0 / -1.5px)`だけを動かす。フェード(opacity)・拡大縮小・回転・バウンドは使っていない。字間(letter-spacing)ではなく上下1.5pxの移動を選んだのは、字間を広げると`white-space: nowrap`の行の実測幅が変わり、1行に収める安全マージンを削ってしまうため。
- `animation-fill-mode: backwards`を付けているのは、ページ読み込み直後、自分の順番がまだ来ていない語(delayが経過していない語)が既定色(`--color-ink`、後述)のまま濃く見えてしまい、1周目だけ2周目以降と見え方がずれるのを防ぐため。これにより初回から「暮らす→観察→学ぶ→試す」の順に濃くなる見え方になる。
- `.heroWord`の既定色(アニメーション非適用時)は`--color-ink`(通常の見出しと同じ濃さ)にしている。アニメーションが動いている間はキーフレームが常時`color`を上書きするため、この既定値は実質的に「reduced-motion環境・アニメーション非対応環境での静止表示用の色」としてのみ働く。

## 1行に収める根拠
`--home-hero-words`は`clamp(1.35rem, 0.78rem + 2.9vw, 2.5rem)`。`--home-gutter`(既存トークン、Hero両端の余白)を差し引いた実際のコンテンツ幅に対し、「4語+全角スペース3つ=12文字相当」(和文フォントでは全角スペース・かな・漢字とも概ね1em幅)が収まるよう、320px幅での最大安全フォントサイズ(実測: コンテンツ幅280px÷12文字≈23.3px)から十分に低い値を下限にして計算した。`--home-heading-tracking`(既存の見出し用letter-spacing)はこの見出しには適用していない(nowrap行の余計な広がりを避けるため)。

Playwrightで320/375/390/430/768/1440px幅を検証し、以下を確認済み(検証・未検証事項参照)。

## 採用理由 (Rationale)
- 「循環を図解・説明しすぎない」という指示に対し、色と1〜2pxの移動だけで表現することで、矢印・円環図・ラベルを一切使わずに「順番に息をする」感覚だけを伝えられる。
- 色の変化に`opacity`ではなく`--color-ink-muted`/`--color-ink`という既存トークンを使ったのは、この2色がすでにサイト全体で「本文/副次テキスト」の区別に使われている、コントラストの検証された組み合わせだからで、新しい任意の薄さを作らずに済む。
- `prefers-reduced-motion: no-preference`でのみ`animation`を適用するCSSのみの実装にしたことで、JavaScriptを一切使わずに、reduced-motion環境・JS無効環境・古いブラウザのいずれでも同じ静止表示にフォールバックできる。
- `HomeMotion`の「もう一度再生」ボタンは再現しなかった。今回のアニメーションは常時ゆるやかに繰り返すループであり、単発再生という概念自体が無いため、装飾目的の操作を新設する理由が無いと判断した(指示書の「実装上不要になるなら、装飾目的の操作は残さなくてよい」に従う)。

## 他の案 (Alternatives)
- 字間(`letter-spacing`)を広げて「アクティブな語」を示す案も指示書に選択肢として挙がっていたが、`white-space: nowrap`の1行の実測幅に影響するため、狭い画面での折り返しリスクを避けられる`transform: translateY()`のみを採用した。
- アイドル時の既定色を`--color-ink-muted`にする案(色の変化をアニメーション開始前から見せる)も検討したが、reduced-motion・no-JS環境で見出し全体が常に薄い色になってしまうため、静止表示時は`--color-ink`(通常の見出しと同じ濃さ)を既定にした。

## 将来の変更可能性 (Future changes)
- 4語・区切り文字・アニメーションの周期(9秒)や区間の取り方は、`src/pages/index.astro`の`<span>`の並びと`index.module.css`の`animation-delay`・`@keyframes heroWordPulse`のパーセンテージだけで調整できる。
- Hero以外(研究断面・本棚・実験室・研究便り、他ページ)は今回変更していない。

## Research Context
「ふ、と」は循環図で説明する場所ではなく、実際にその循環(暮らす・観察する・学ぶ・試す)を生きている場所である。Heroを図解ではなく、4つの言葉そのものが呼吸するリズムに置き換えたことは、CLAUDE.mdの「説明しすぎない」「余白を保つ」という一貫した方針に沿う。

## 検証・未検証事項
- `npx astro check` / `npm run build`: エラーなし。
- Playwright(Chromium)で320/375/390/430/768/1440px幅を検証:
  - 見出しの`scrollWidth`と実測幅が一致(折り返し・省略が発生していない)、`document.documentElement`に横方向のoverflowが無いことを確認。
  - `main`ブランチ(変更前)と比較し、`#research-title`の開始位置(offsetTop)がいずれの幅でも変更前以下(320px: 197px対300px、1440px: 229px対284px等、すべて変更後のほうが早く始まる)であることを確認。
- `prefers-reduced-motion: reduce`(Playwrightの`reducedMotion: "reduce"`コンテキスト)で、4語とも`animation-name: none`・`--color-ink`の静止表示になり、4語とも表示されていることを確認。
- JavaScript無効(`javaScriptEnabled: false`)でも、見出しの4語+全角スペースがそのまま表示されることを確認(モーションはCSSのみで実装、JS不使用)。
- `prefers-reduced-motion: no-preference`で、0.2秒刻みにcolorをサンプリングし、「暮らす→観察→学ぶ→試す」の順に1語だけ`--color-ink`になり、試すの後(約6.2〜9秒)は4語とも`--color-ink-muted`に戻る(間を置く区間)ことを確認。
- 実機(iOS Safari等)・実際のブラウザでの目視確認、Cloudflare Preview環境での確認はPRコメントに記録する。
