# 0222. 「そらのようす」にGoogleスライドの共有URL(slidesCommentUrl)を設定する

- 日付: 2026-11-14
- 状態: 採用(部分設定。slidesEmbedUrlは未設定のまま)

## Decision

プロジェクトオーナーから、「そらのようす」の「制作メモ」用にGoogleスライドのリンク(`https://docs.google.com/presentation/d/1aFMRBlVGdvghk1YO3VQRkQGjQk-8Zp35hepFBmGTvHk/edit?usp=drivesdk`)の提供があった。

このリンクは`/edit?usp=drivesdk`という、通常の編集・共有用リンクの形式だった。既存の散歩譜(`oto-no-michi`)の実装では、`slidesEmbedUrl`(「制作メモ」区画にiframeで埋め込むための、Google側の「ファイル→ウェブに公開→埋め込み」で発行する`/d/e/2PACX-.../pubembed`形式の専用URL)と`slidesCommentUrl`(コメント用リンクの遷移先として使う、通常の共有URL)が意図的に別フィールドとして分けられている(`src/types/labNotebook.ts`、Decision Log 0171)。編集リンクをそのままiframeに埋め込むと、Googleスライド側が`/edit`をiframe内で正しく表示しない(ログイン要求やブロックの可能性が高い)ため、区画が壊れて見える・意図せず編集画面が公開される懸念がある。

この区別をプロジェクトオーナーに確認したところ、「ウェブに公開」のURLを別途取得してから「制作メモ」区画を進める、との回答だった。そのため、今回いただいたリンクは`slidesCommentUrl`としてのみ設定した。`slidesEmbedUrl`は未設定のままのため、`index.astro`の`slidesEmbedSrc && (...)`による条件分岐により、「制作メモ」区画自体(コメントリンクを含む)はまだ画面に表示されない(ビルド後の`dist/sora-no-yousu/index.html`に「制作メモ」の文字列が出力されないことを確認済み)。

## 採用理由

- 散歩譜で既に確立されている「埋め込み用URLと共有用URLを分けて設定する」設計(Decision Log 0171)にそのまま従うのが、`LabNotebook`型・既存コンポーネントとの一貫性の観点で最も妥当。
- 架空・未確認のURLをslidesEmbedUrlに設定して壊れたiframeを表示する、または実際には未公開の編集画面を誤って公開する、という事態を避けるため、技術的に正しい形式のURLが揃うまで区画自体を非表示のままにした(CLAUDE.mdの「架空のURLを入れない、壊れたiframeを表示しない方針」を踏襲)。

## 他の案

- いただいたURLをそのままslidesEmbedUrlに設定する案も検討したが、プロジェクトオーナーに確認した結果、別途「ウェブに公開」のURLを取得してから進める方針に決まったため採らなかった。

## 将来の変更可能性

- プロジェクトオーナーから「ウェブに公開→埋め込み」形式のURLが届いた時点で、`src/data/labNotebooks.ts`の`sora-no-yousu`エントリに`slidesEmbedUrl`を追加する(今回と同様、実装のみで完了する小さな変更)。

## Research Context

「制作の途中を見せる」という実験室の設計意図を損なわないよう、見た目だけ整えた未完成の埋め込みを先に出すのではなく、実際に機能する・意図した権限で公開されるURLが揃うまで待つという判断は、「公開研究室」が実際の状態を偽らずに示すという方針に沿っている。
