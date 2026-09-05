# 0100. カーソル追従の光を夜空背景の全ページに展開

- 日付: 2026-09-05
- 状態: 採用

## Decision

カーソル追従の光の演出(`CursorGlow.astro`)を、Home限定の試験導入
(Decision Log 0078)から、「夜空」背景(`NightBackground`、Decision
Log 0059〜0063・0071)を使う全ページに展開した。

- 対象: `index.astro`(Home)・`research.astro`・`about.astro`・
  `contact.astro`・`research-statement.astro`・
  `research/reviews/01.astro`・`research/reviews/1-5.astro`・
  `404.astro`の8ページ。いずれも`<NightBackground />`の直後に
  `<CursorGlow />`を追加した(Homeで既に採用していたDOM順序と同じ)。
- `/fieldnote`は夜空背景(`theme="night"`)を使っていないページのため、
  対象外とした。
- `CursorGlow.astro`コンポーネント自体(Desktop幅・マウス操作可能な
  環境限定、requestAnimationFrameでの間引き等)は変更していない。

## 採用理由

- プロジェクトオーナーから「光の追従は全ページ対応して」という指示を
  受けた。Decision Log 0078で「他ページへの展開は未定」としていた
  試験的機能を、正式に全ページへ展開する判断。
- 夜空背景を前提にした演出(紺の背景の上でカーソル位置がじんわり
  光る)のため、展開範囲は「夜空背景を使っている全ページ」とした。
  夜空背景を使っていない`/fieldnote`は演出の前提(紺の背景)がなく
  対象にならない。

## 他の案

- 特になし。指示が明確だったため、既存コンポーネントをそのまま
  各ページに追加する形で対応した。

## 将来の変更可能性

- 将来`/fieldnote`や新規ページに夜空背景を採用した場合は、同じ
  パターン(`<NightBackground />`の直後に`<CursorGlow />`)で追加
  すること。

## Research Context

一箇所で試して確かめてから全体に広げるという進め方自体が、この
プロジェクトの「完成を目指さず、育て続ける」姿勢の実践である。
Decision Log 0078で「まずHomeのみ」と明言していたことが、今回
「全ページ展開」を検討する際の起点として機能した。
