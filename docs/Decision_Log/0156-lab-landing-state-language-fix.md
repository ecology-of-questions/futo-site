# 0156. 実験室landingの見出し・CTA・説明文を実態に合わせて修正

- 日付: 2026-09-16
- 状態: 採用
- 関連: Decision Log 0155(実験室ランディングのv0.1刷新、この決定が
  採用した見出し・CTA・説明文の一部を修正する)。PR #86のmerge前
  レビューで発見された不整合の修正。

## Decision

PR #86(実験室ランディングのv0.1刷新)のmerge前レビューで、
プロジェクトオーナーから、Decision Log 0155で採用した見出し
「いま、ひらいている実験」・CTA「実験を見る」が実態と異なるという
指摘を受けた。

現時点で実在しているのは、3冊とも「notebookという書き込み機能」
自体であり、Fieldnote本体・音の道β・研究断面展示企画そのものが
公開稼働しているわけではない。「いま、ひらいている実験」という
見出しは、これらが既に実際に動いている実験であるかのような印象を
与えてしまう。

指示は以下の3点だった。

- 見出しを「いま、考えていること」に変更する。
- 3項目(音の道/Fieldnote/研究断面をひらく)のCTAを、すべて
  「実験を見る」ではなく「ノートを見る →」に変更する
  (category「実験/アプリ/企画」自体は残してよい)。
- 説明文も、完成・稼働を示唆する表現を避け、「〜について考えて
  います」「〜を試すための方法を考えています」など、現在地に合う
  表現に書き換える。
- 将来、実際に公開可能な音の道β/Miro等ができた時点で、別途
  「いま、ひらいている実験」セクションを追加できる構造にしておく。

## 対応

### 見出し・CTA・説明文の修正

- 見出し: 「いま、ひらいている実験」→「いま、考えていること」。
- CTA: 「実験を見る →」→「ノートを見る →」(3項目とも)。
- 説明文: `labNotebooks.ts`の`description`(ノート詳細ページの本文
  でも使う、より汎用的な説明文)とは別に、ランディング専用の上書き
  文言(`participate.astro`内の`landingDescriptions`)を新設した。
  「つくっています」「ツール」等、完成・稼働を示唆する語を避け、
  「〜方法を考えています」「〜企画を考えています」という表現に
  書き換えた。同じ主題・同じ実データの範囲内での言い換えであり、
  新しい題材は加えていない。

  | notebook | 修正前(labNotebooks.tsのdescription、詳細ページでは
    引き続き使用) | 修正後(ランディング専用) |
  |---|---|---|
  | 音の道 | 「…その人の注意の道筋を、音から辿るためのツールを
    つくっています。」 | 「…その人の注意の道筋を、音から辿る方法を
    考えています。」 |
  | Fieldnote | 「…そこから考えたり、別の何かと出会ったりするための
    ツールをつくっています。」 | 「…そこから考えたり、別の何かと
    出会ったりするための方法を考えています。」 |
  | 研究断面をひらく | 「…展示したり、話したりする企画を考えて
    います。」 | 変更なし(元の文言が既に指示の表現と一致していた
    ため) |

  `labNotebooks.ts`自体は変更していない。ノート詳細ページ
  (`/participate/[slug]`)の本文(`notebook.description`をそのまま
  表示する`.lead`)は、この修正の影響を受けず、これまでどおりの
  文言のまま表示される。

### 将来の「いま、ひらいている実験」セクションに備えた構造

一覧の描画ロジックを`LabNotebookList.astro`(新設)に切り出した。
`notebooks`(表示するノートの配列)・`descriptions`(ランディング専用
説明文)・`ctaLabel`(CTA文言)をpropsで受け取る、見出しに依存しない
汎用的なコンポーネントにした。

`participate.astro`側では、`liveExperimentSlugs`(現時点では空配列)に
含まれるslugを`labNotebooks`から抽出したものを`liveExperiments`、
それ以外を`consideringNotebooks`とし、それぞれ別の
`<ResearchSection>`+`<LabNotebookList>`の組で描画する。
`liveExperiments.length > 0`のときのみ「いま、ひらいている実験」
セクション(CTA「実験を見る」)を描画し、現時点では空のため描画
されない。将来、実際に公開可能な実験ができた際は、該当notebookの
slugを`liveExperimentSlugs`に加えるだけで、独立したセクションとして
自動的に現れる(コンポーネント自体の追加実装は不要)。

## 対応ファイル

- `src/components/LabNotebookList.astro`(新規): 一覧の描画ロジック。
- `src/components/LabNotebookList.module.css`(新規): 一覧のスタイル
  (旧`participate.module.css`の`.experimentList`以下をそのまま移設)。
- `src/pages/participate.astro`: 見出し・CTA・説明文の修正、
  `LabNotebookList`を使うよう変更、将来のセクション追加に備えた
  `liveExperimentSlugs`によるnotebookの振り分けを追加。
- `src/pages/participate.module.css`: 一覧関連のスタイルを削除し、
  ページ冒頭(Hero)・セクション見出し共通のスタイルのみを残した。

`labNotebooks.ts`・`/participate/[slug]`(`[slug].astro`・
`[slug].module.css`)・`worker/index.ts`・`wrangler.toml`・
`migrations/`は今回も一切変更していない。

## 採用理由

指示を字面通りに実装した。ランディング専用の説明文を
`labNotebooks.ts`と分離したのは、「notebook detailには触れない」と
いう制約を厳密に守るための判断で、共有データファイルを変更すると
詳細ページの表示文言まで意図せず変わってしまうリスクを避けた。

`LabNotebookList`への切り出しは、「将来…セクションを追加できる
構造にしておいてください」という指示に対する具体的な実装であり、
将来的な機能追加(音の道βの公開)がコードの追加コンポーネント無しで
1行(`liveExperimentSlugs`への追記)で反映できるようにするための
設計判断。

## 確認結果

- mobile(390px)/desktop(1440px)で`/participate`を再確認した。
  - 見出しが「いま、考えていること」になっている。
  - 3項目とも「ノートを見る →」に統一されている。
  - 説明文が「〜考えています」という現在地に合う表現になっている。
  - category(実験/アプリ/企画)・痕跡SVG・罫線区切りの見た目は
    変更していない(Decision Log 0155の視覚的な刷新自体は維持)。
  - 「いま、ひらいている実験」セクションは(`liveExperimentSlugs`が
    空のため)描画されないことを確認した。
- Playwrightで`document.body.scrollWidth`を検証し、mobile(390px)で
  横方向のoverflowが無いことを確認した(`390 === 390`)。
- `git status`で、変更ファイルが`participate.astro`・
  `participate.module.css`・新設2ファイル(`LabNotebookList.astro`/
  `.module.css`)のみであることを確認した(`labNotebooks.ts`・
  `[slug].astro`・`worker/index.ts`等は無変更)。
- `npx astro check`: 0 errors, 0 warnings, 1 hint(既存の無関係な
  hint)
- `npm run build`: 15ページ生成、エラーなし

## 将来の変更可能性

- 音の道βが実際に公開可能になった際は、`participate.astro`の
  `liveExperimentSlugs`に`"oto-no-michi"`を追加するだけで、「いま、
  ひらいている実験」セクションが独立して現れ、`consideringNotebooks`
  からは自動的に除外される。その際、当該notebookの
  `landingDescriptions`も、稼働を反映した文言に更新する想定。
- 3冊とも公開可能になった場合、「いま、考えていること」セクションが
  空になる。その場合は、Decision Log 0155と同様に
  `consideringNotebooks.length > 0`のガードを追加するか、セクション
  自体を非表示にする対応を検討する(現時点では常に3冊とも
  `consideringNotebooks`側にいるため、この対応は未実装)。

## Research Context

「notebookという機能が実在すること」と「その機能を使って作っている
ものごと自体が完成・稼働していること」を区別したこの修正は、
Decision Log 0152〜0155で繰り返してきた「実在するものだけを見せる」
という原則を、より精密な形で適用したものである。器(notebook)が
実在することと、その中身(音の道・Fieldnote・研究断面展示)が
実在することは別の主張であり、後者を誇張しないことが、CLAUDE.mdの
「研究は公開した瞬間に完成しない」という考え方、そして「公開研究室」
という位置づけ(完成の演出ではなく、いまある状態をそのまま見せる場)
に、より正確に合致する。
