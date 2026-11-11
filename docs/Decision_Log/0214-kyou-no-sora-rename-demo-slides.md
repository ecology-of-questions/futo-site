# 0214. 「頭上の記録」を「きょうの空」に改称し、体験デモとGoogleスライドの「制作メモ」を追加する

- 日付: 2026-11-11
- 状態: 採用

## Decision

Decision Log 0213で追加した「頭上の記録」制作ノートについて、マージ前のプロジェクトオーナーから続けて3つの指示を受けた。

1. 「マージする前に、Googleスライド埋め込みたい。それとGoogleスライドの中にアーティファクトのように触って動くデモを埋め込みたい」
2. (Googleスライドの「ウェブに公開」埋め込みは静的なスライド画像のレンダリングであり、スライド内部にアーティファクトのような本物のライブiframeを入れることはできない、という技術的な制約を説明し、代替案を提示した後)「「頭上の記録」を「きょうの空」に変更して。実験室カードからのリンク先はB(=`/zujo/`のまま)。リンク名は変更して。デモを直接埋め込みたい、その上で制作メモとしてgoogleスライドも載せる」

以下を実装した。

### 改称(「頭上の記録」→「きょうの空」)

- `src/data/labNotebooks.ts`: `slug`を`zujo-no-kiroku`→`kyou-no-sora`、`title`を「頭上の記録」→「きょうの空」、`detailHref`を`/zujo/`→`/kyou-no-sora/`に変更。
- `src/components/LabNotebookList.astro`: 装飾トレースSVGのキーを`kyou-no-sora`に合わせて変更(図形自体は変更なし)。
- `src/pages/participate.astro`: `landingDescriptions`のキーを変更。
- `src/pages/index.astro`: Homeの`featured`検索条件を`kyou-no-sora`に変更(タグライン「頭上を通る音から、暮らしの記録をたどる。」は、プロジェクト名ではなく行為の説明のため変更していない)。
- `src/pages/zujo/` → `src/pages/kyou-no-sora/`(`git mv`)。ページ内のタイトル・見出し・説明文もすべて「きょうの空」に書き換えた。
- `src/types/productionNote.ts` / `src/data/productionNotes.ts` / `src/components/ProductionNoteList.astro`: コメント中の名称・パス表記のみ更新(実装・データ構造は変更なし)。
- `CLAUDE.md` / `PROJECT.md`: Parking Lot解禁済みリストの該当項目を更新。

このノートはまだ未公開(本PRでの新規追加、過去のURL・被リンクが存在しない)ため、散歩譜の改称時(Decision Log 0182、slugは据え置き)とは異なり、今回はslug・URLも変更した。過去のDecision Log(0213)の本文は「頭上の記録」表記のまま残している(履歴改変はしない)。

### 体験デモ(`SkyLogDemo`)

- `src/data/skyLogDemo.ts`: 新設。時刻(0〜23時)ごとの空の色24色(プロジェクトオーナーが共有したClaude Artifactの試作`reference/zujo-prototype.html`、リポジトリ未コミットの参考ファイル、から採用)、`SkyLogKind`(ひこうき/ヘリコプター/わからない)・`SkyLogLoudness`(きこえた/うるさい/とてもうるさい)の型とラベル、デモ用の初期記録3件。
- `src/components/SkyLogDemo.astro` / `.module.css`: 新設。空の色帯(現在時刻のセグメントを`data-is-current`で強調)、種類/うるささを選ぶチップ、「いまの空に記録する」ボタン、記録一覧を持つ体験デモ。FieldnoteMemoDemo・WalkingScorePlayerと同じ方針(全状態をビルド時に描画、JSは表示/非表示とaria-pressedの切り替えのみ、新規記録は`<template>`のクローンで追加しCSS Modulesのハッシュ化クラス名をJSから付け外ししない、配色は空の色以外すべて`tokens.css`のトークンのみ、保存されない旨を明記、押しても何も起きないボタンは置かない)。
- `src/pages/kyou-no-sora/index.astro`に埋め込んだ。

### Googleスライド「制作メモ」

- `src/data/labNotebooks.ts`: `hasDetailPage()`の直後に`buildSlidesEmbedSrc()`を新設・export。元々`src/pages/participate/[slug].astro`内のローカル関数だったものを、きょうの空ページからも呼べるようlabNotebooks.ts側に移した(ロジックは変更していない)。
- `src/pages/kyou-no-sora/index.astro`: `notebook.slidesEmbedUrl`が設定されている場合のみ、「制作メモ」セクション(スライド埋め込み+`slidesCommentUrl`があればコメントリンク)を描画する。現時点では`kyou-no-sora`の`slidesEmbedUrl`/`slidesCommentUrl`は未設定のため、この区画はまだ表示されない。プロジェクトオーナーから実際のURLが提供され次第、`labNotebooks.ts`の該当エントリに設定する。
- `src/pages/participate/[slug].astro`: `getStaticPaths`を`labNotebooks.filter((n) => hasDetailPage(n) && !n.detailHref)`に変更。`detailHref`を持つノート(きょうの空)は、将来`slidesEmbedUrl`を設定しても`hasDetailPage()`がtrueになるだけで、このテンプレート側の`/participate/kyou-no-sora`という中身の薄い重複ページは生成されないようにした。

## 採用理由

- Googleスライドの「ウェブに公開」埋め込みはスライドの静的なレンダリングであり、スライド描画領域の内部に本物のライブ・インタラクティブなiframeを挿入することはできない(Google側の仕様上の制約)。そのため「スライドの中にアーティファクトを埋め込む」という当初の依頼はそのままの形では実現できないと説明し、「デモはページに直接埋め込み、スライドは別区画の『制作メモ』として載せる」という、実現可能な形に落とし込んだ。
- 実験室カードの遷移先を`/kyou-no-sora/`のまま(B案)にしたのは、`/participate/[slug]`がGoogleスライド埋め込みを前提にした1区画構成のテンプレートであり、デモ+スライド+制作ノート一覧という3つの要素を無理なく並べるには、専用ページ(`/kyou-no-sora/`)の方が適しているため。
- slug・URLも改称したのは、このページがまだmainにマージされておらず(本PR内で新規追加)、外部からの被リンクや検索エンジンのインデックスが存在しないため。散歩譜のとき(Decision Log 0182)にslugを据え置いた理由(既存URLの保全)がここには当てはまらない。
- 体験デモを「触れる・動く」ものとして実装するのは、Decision Log 0188(散歩譜・Fieldnoteの操作可能デモを撤去した判断)と一見矛盾するが、0188の懸念は「架空データのデモが、実際より完成している印象を与える」ことであり、その精神は今回も守っている(保存されない旨の明記、押しても何も起きないボタンを作らない)。0188の判断自体は覆していない(あちらの2つは撤去したまま)。今回はプロジェクトオーナー自身が「きょうの空」について明示的にデモの追加を指示しており、両者は別の意思決定として扱う。
- `buildSlidesEmbedSrc`を`labNotebooks.ts`に移したのは、呼び出し元が2箇所(散歩譜用の`[slug].astro`、きょうの空用の`/kyou-no-sora/`)になったため。データ(`slidesEmbedUrl`)を管理するファイルに、その値を安全なiframe srcへ変換するロジックを置くのは自然な置き場所と判断した。

## 他の案

- スライド埋め込みを諦めて体験デモのみにする案もあったが、プロジェクトオーナーは「制作メモとしてGoogleスライドも載せる」と明示的に指示しており、技術的に可能な範囲(別区画としての常時埋め込み)では実現できるため採用しなかった。
- `/participate/kyou-no-sora`(Googleスライド前提のテンプレート)にスライドだけを置き、デモは別途`/kyou-no-sora/`に残す案(2ページに分割)も検討したが、見る側にとって同じノートの情報が2箇所に分散し、「実験室カードからのリンク先はB」という指示(1つの遷移先に集約する)にも合わないため採用しなかった。

## 将来の変更可能性

- プロジェクトオーナーから実際のGoogleスライドの「ウェブに公開」埋め込みURLとコメント可能な共有URLが提供されたら、`src/data/labNotebooks.ts`の`kyou-no-sora`エントリに`slidesEmbedUrl`/`slidesCommentUrl`を設定するだけで「制作メモ」区画が表示される(コード変更は不要)。
- 体験デモの語彙(種類・うるささの区分)は、実際のアプリの仕様が固まった際に`src/data/skyLogDemo.ts`側だけを更新すればよい。

## Research Context

「きょうの空」は、公開アプリとして育てる前段階として、まず「ふ、と」というこの研究室の中で作っていく過程そのものを公開する実践である。触れるデモを直接埋め込んだことは、文章だけでなく「体験」そのものを公開研究室の記録として提示する試みであり、架空データであること・保存されないことを明記することで、「完成品ではなく、つくっている途中であることを正直に示す」という研究室の姿勢を保っている。

## 検証・未検証事項

- `npx astro check` / `npm run build`: エラーなし(既存の`SectionTitle.astro`のProps未使用警告のみ、本変更とは無関係)。ビルド出力は`/participate/oto-no-michi`のみが`/participate/[slug]`から生成され、`/participate/kyou-no-sora`という重複ページは生成されないことを確認した。
- Playwright(Chromium)でHome(1440px/390px)・実験室(1440px)・`/kyou-no-sora/`(1440px/390px)のスクリーンショットを確認し、コンソールエラー・ページエラーが無いこと、Homeの注目セクション・実験室一覧・制作ノートページの見出しがすべて「きょうの空」になっていること、体験デモの空の色帯・チップ・記録一覧が意図通り表示されることを確認した。
- 体験デモの操作(種類・うるささの選択→「いまの空に記録する」クリック)をPlaywrightで実行し、新しい記録が選択した内容(ヘリコプター/とてもうるさい)で一覧の先頭に追加されること、JSエラーが発生しないことを確認した。
- Googleスライドの「制作メモ」区画は、`slidesEmbedUrl`が未設定の現時点では意図通り非表示。実URL設定後の見た目は未検証(散歩譜の既存実装と同じコンポーネント構造を再利用しているため、大きな差異は見込んでいない)。
