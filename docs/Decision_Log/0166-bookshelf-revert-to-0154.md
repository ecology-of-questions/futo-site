# 0166. 本棚: 「見にくくなった」との指摘によりDecision Log 0154時点の表示に差し戻し

- 日付: 2026-09-17
- 状態: 採用
- 関連: Decision Log 0154(この差し戻し先)。Decision Log 0164
  (タイトル行横並び化・1画面圧縮)・0165(1冊ずつ表示+前へ/次へ)、
  いずれも本エントリで差し戻した対象。

## Decision

PR #92(Decision Log 0164・0165、`/bookshelf`のタイトル行横並び化+
1冊ずつ表示化)のmerge直後、プロジェクトオーナーから「なんか見にくく
なった・・・一個前に戻して」との指摘を受けた。具体的にどの変更が
見にくさの原因かの切り分けは行わず、指摘の通りPR #92全体
(Decision Log 0164・0165の両方)を差し戻し、Decision Log 0154時点の
表示方式に戻すことにした。

## 対応

`src/pages/bookshelf.astro`・`src/pages/bookshelf.module.css`・
`src/components/BookshelfShelf.astro`・
`src/components/BookshelfShelf.module.css`・
`src/components/BookActions.module.css`の5ファイルを、PR #92の
base commit(`ce2472e`、PR #91 merge直後のmain)時点の内容に復元した。
結果として、以下がDecision Log 0154の状態に戻っている。

- 見出し「研究の本棚」と導入文(`.note`)は、横並び(`.heroRow`)では
  なく、縦に並ぶ元の構成に戻った。
- 「いま読んでいる」Hero棚は、1冊ずつ表示+前へ/次へボタンではなく、
  複数冊を横並びで見せ、mobileでは素の横スクロール(overflow-x)で
  はみ出し分を見る元の方式に戻った。
- 「読みたい」は、1冊ずつ表示ではなく、3冊とも縦に並ぶ全件リストに
  戻った。
- タイトルのfont-size(fs-base→fs-lgに戻す)、著者名の表示位置
  (タイトル行へのinline統合→独立した行に戻す)、reasonのfont-size
  (fs-sm→fs-baseに戻す)、`.row`の`:first-child`/`:last-child`罫線
  調整も、すべてDecision Log 0154時点の値に戻った。

**`docs/Decision_Log/0164-*.md`・`0165-*.md`は削除していない。**
Decision Logは過去のエントリを削除・上書きしない方針(CLAUDE.md)の
ため、両エントリはそのまま残し、状態欄に「superseded (→0166)」と
追記した(このエントリ参照)。`0154-*.md`の状態欄にも、今回の
一連の経緯(0154→0165の一時的な上書き→0166での差し戻し)を追記した。

## 対応ファイル

- `src/pages/bookshelf.astro`
- `src/pages/bookshelf.module.css`
- `src/components/BookshelfShelf.astro`
- `src/components/BookshelfShelf.module.css`
- `src/components/BookActions.module.css`
- `docs/Decision_Log/0154-bookshelf-v0.1-redesign.md`(状態欄のみ
  追記)
- `docs/Decision_Log/0164-bookshelf-hero-row-and-fit.md`(状態欄のみ
  追記)
- `docs/Decision_Log/0165-bookshelf-carousel-nav.md`(状態欄のみ
  追記)

`src/data/bookshelf.ts`・Worker/D1/APIは今回も変更していない。

## 確認結果

- `git show ce2472e:<path>`で復元した5ファイルが、PR #92の変更を
  正確に打ち消していることを`git diff --stat`で確認した(diffが
  PR #92のdiffとほぼ対称になっている)。
- mobile(390px)/desktop(1440px)でスクリーンショットを確認し、
  タイトル・導入文の縦積み、Hero棚の横並び複数冊、「読みたい」の
  全件縦積みリストが、PR #92より前の見た目と一致していることを確認
  した。
- mobile/desktopとも`document.documentElement.scrollWidth ===
  clientWidth`を確認し、横方向のoverflowが無いことを確認した(この
  差し戻しにより、mobileで再びスクロールが必要な状態に戻っている。
  これは意図した差し戻しの結果であり、1画面フィットという目標
  自体は今回いったん取り下げとなる)。
- `npx astro check`: 0 errors, 0 warnings, 1 hint(既存の無関係な
  hint)。
- `npm run build`: 15ページ生成、エラーなし。

## 採用理由

「見にくくなった」という短い指摘に対し、どの変更が原因かを推測して
部分的に直すより、まず直前の安定した状態(PR #92より前)に確実に
戻すことを優先した。原因の切り分けや、別のアプローチでの再挑戦は、
プロジェクトオーナーから具体的なフィードバック(どこが見にくいか)
を得たうえで、別途相談する。

## 他の案

PR #92の一部(例: タイトル行横並び化のみ残し、1冊ずつ表示だけ戻す)
を検討する案もあったが、指摘の時点でどちらが原因かの手がかりが
無く、中途半端に戻すとかえって状態が分かりにくくなるため、全体を
一度Decision Log 0154時点に戻すことを選んだ。

## 将来の変更可能性

- 1画面にスクロールなしで収める、という目標自体は取り下げていない。
  「何が見にくかったか」をプロジェクトオーナーから具体的に聞いた
  うえで、Decision Log 0164・0165とは異なるアプローチ(例:
  タイトル行の横並びだけを再度試す、1冊ずつ表示のビジュアルを
  作り直す等)を検討する余地がある。

## Research Context

この差し戻しは「新しい実装が間違っていた」という結論ではなく、
「実際に見て、使いにくいと感じた」という一次情報を優先する判断で
ある。Decision Log 0164・0165を削除せず残したのは、同じ工夫を
将来再度検討する際に、何を試して何が合わなかったのかを追える
状態にしておくためであり、CLAUDE.mdの「研究は公開した瞬間に完成
しない」という考え方 — 一度の実装が最終形ではなく、試行錯誤の記録
自体に価値がある — と一貫している。
