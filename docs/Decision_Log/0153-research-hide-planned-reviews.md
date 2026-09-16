# 0153. `/research`から「次に考えていること」(構想中02・03)を非表示に

- 日付: 2026-09-16
- 状態: 採用
- 関連: Decision Log 0152(研究断面のv0.1更新)。PR #84のmerge前レビューで
  発見されたv0.1仕様との不整合を修正する追加コミット。

## Decision

PR #84(研究断面のv0.1更新)のmerge前レビューで、プロジェクトオーナー
から、`/research`に表示されている「次に考えていること」(02・03の
「構想中」項目)がv0.1仕様と不整合であるという指摘を受けた。v0.1公開
仕様書は「現在実際に公開されている研究断面だけを見せる」「構想中/
coming soon/準備中を出さない」ことを明示しており、Decision Log 0152の
時点ではこの一覧セクション自体を見落としていた。

指示は以下の3点だった。

- `plannedReviews`のデータ自体は削除しなくてよい。
- `/research`上ではセクションごと非表示にする。
- #01/#1.5の公開済み2件のみ表示する。
- coming soon/構想中/準備中の代替表示は追加しない(セクションを
  空メッセージ等に置き換えない)。

## 対応

`src/pages/research.astro`が`ResearchReviewList`に渡す`planned`propを、
`plannedReviews`(実データ)から空配列`[]`に変更した。
`ResearchReviewList.astro`側は既に`planned.length > 0 && (...)`という
条件分岐を持っていた(Decision Log 0054)ため、コンポーネント自体は
変更せず、空配列を渡すだけでセクションごと非表示になった。

`src/data/researchReviews.ts`の`plannedReviews`エクスポート自体は変更
していない。指示どおりデータは残っており、02・03が実際に公開される
際は、`research.astro`で再び`plannedReviews`(または実データを追加した
`publishedReviews`)を渡せば一覧に反映される。

## 確認

- `npx astro check`: 0 errors, 0 warnings, 1 hint(既存の無関係なhint)
- `npm run build`: 15ページ生成、エラーなし
- Playwrightで390px/1440pxの`/research`を再確認し、「次に考えている
  こと」セクションが完全に消え、#01・#1.5の2件のみが表示され、代替の
  coming soon的な表示が追加されていないことを確認した。

## 採用理由

指示を字面通りに実装した。`ResearchReviewList.astro`が既に
「plannedが空なら何も描画しない」という設計だったため、コンポーネント
に手を加えず、呼び出し側(`research.astro`)が渡すデータを絞るだけで
要件を満たせた。「不要な複雑さを増やさない」というCLAUDE.mdの方針にも
沿っている。

## 将来の変更可能性

研究断面02・03が実際に公開された時点で、`research.astro`の
`planned={[]}`をもとの`planned={plannedReviews}`(またはその時点の
構想中エントリ)に戻す、あるいは02・03自体を`publishedReviews`に
追加する。

## Research Context

「現在実際に公開されている研究断面だけを見せる」という方針は、
Decision Log 0152で確立した「架空の関連付けを作らない」という原則と
同じ態度の延長線上にある。構想中の項目を一覧に残すことは、「まだ
存在しないもの」を「これから来る」という期待として見せる演出であり、
v0.1公開仕様が繰り返し禁じている「架空のコンテンツ・coming soon的な
演出」に該当する。実在するものだけを見せる、という一貫した基準を、
記事本文だけでなく一覧の構成にも適用した。
