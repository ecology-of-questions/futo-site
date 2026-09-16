# 0155. 実験室(`/participate`)のランディングをv0.1公開仕様に刷新

- 日付: 2026-09-16
- 状態: 採用
- 関連: Decision Log 0150〜0154(v0.1公開仕様の受領・Top/About/研究断面/
  本棚の更新)。Decision Log 0139・0140・0141(実験室の直近の変遷、
  ノート表紙一覧→3冊のノート構造+Worker/D1永続化。今回はランディング
  の見せ方のみを変更し、ノート詳細・永続化の実装は変更しない)。

## Decision

プロジェクトオーナーから、v0.1公開仕様書
(`claude_code_lab_v0.1.md`)に基づき、`/participate`(表示名:実験室)を
「説明カードが並ぶページ」ではなく「いま実際に試していることに、
ふらっと触れられる場所」として見せる指示を受けた。PR #85(本棚)は
既にmerge済みだったため、最新mainから新しいブランチ
(`claude/lab-v0.1`)を作り、新規PRとして進めた。今回は「実験室の
見せ方と導線」に範囲を限定し、既存のWorker/D1/notebook APIは一切
変更していない。

### 実装前の調査結果

- **`/participate`・`/participate/[slug]`の構成**: `participate.astro`
  (ランディング、3冊のノート表紙一覧) + `participate/[slug].astro`
  (ノート詳細、`getStaticPaths`で3URLを生成する共通テンプレート)。
  詳細ページは、静的な「ふ、と」自身の記録(`labNotebooks.ts`の
  `entries`)と、訪問者がCloudflare D1に書き残した記録
  (`GET/POST /api/notebooks/:slug/entries`)を同じ時系列で表示する
  「交換ノート」として実装済み(Decision Log 0140・0141)。
- **`labNotebooks.ts`の実データ**: 3冊、すべて`entries: []`(「ふ、と」
  自身の制作記録・訪問者の書き込みともまだ0件)。
  - `oto-no-michi`(音の道、category: 実験、tone: warm)
  - `fieldnote`(Fieldnote、category: アプリ、tone: moss)
  - `research-fragments`(研究断面をひらく、category: 企画、
    tone: sky)
- **notebook UIとWorker API/D1の依存関係**: `[slug].astro`の`<script>`
  が、ページ表示時に`GET /api/notebos/:slug/entries`で訪問者の記録を
  取得し、フォーム送信時に`POST`で書き込む。バックエンドは
  `worker/index.ts`(Cloudflare Worker + D1、Decision Log 0143以降)。
  `VALID_SLUGS`は`labNotebooks.ts`の3つのslugと一致している。
- **「音の道」の既存ページ・asset**: `oto-no-michi`は他の2冊と全く
  同じ仕組みの通常のnotebook(専用ページ・専用コードは無い、共通
  テンプレート`[slug].astro`が生成する1つのURL)。専用の画像・音声
  assetは無い。
- **Miro board/embed URL/config**: repository全体(`public/`・
  `src/`・環境変数例・`astro.config.mjs`・`wrangler.toml`)を検索したが、
  Miro関連の実装・URL・設定は一切存在しない。過去のDecision Log
  0150(Top刷新)で「Miroは実装しない」と記録した以外に、Miro関連の
  痕跡は無い。

これらの調査結果に基づき、実在しないMiro URLを作らない・「音の道」を
特別扱いせず他の2冊と同じ実在するnotebookとして表示する、という方針を
決めた。

### 実装した変更

- **Hero**: 「LAB」+「実験室」+1文のリード文
  (「考えるために、つくったり、試したりする場所。」、v0.1仕様書の
  基本構造に示された文言をそのまま使用)。旧3段落の本文は削除した
  (書き足し方の説明は、各ノート詳細ページの
  `commonNotebookDescription`に既にあるため、ランディングでは
  繰り返さない判断)。
- **いま、ひらいている実験**: 旧「表紙」グリッド(色面tone+
  category/titleを表紙として見せる、みすず書房を参考にしたカード風
  レイアウト、Decision Log 0140)を、細い罫線区切りの縦リストに
  作り替えた。各項目は「category(実験/アプリ/企画) → タイトル →
  説明文 → 抽象的な痕跡(インラインSVG) → 実験を見る →」という
  構成にした。
- **ノートごとに異なる「痕跡」**: 「すべてを同じカードUIにしない」
  という指示に対応するため、3冊それぞれに異なる抽象的なSVG装飾を
  つけた。写真・生成画像・外部アセットは使わず、単色
  (`--color-ink-muted`)の細い線のみで構成した。
  - 音の道: 波打つ曲線(音の「道筋」を示唆)
  - Fieldnote: ノートのページを示唆する枠+短い横線
  - 研究断面をひらく: 重なり合う矩形(展示・複数の断面を示唆)
- **音の道**: Miro board・専用の埋め込み体験は実装しなかった(実在する
  資産が無いため)。他の2冊と全く同じ扱いの、実在する1つの
  notebook(実験)として表示している。
- **「Miro内の書き方ルール」**: Miro board自体が存在しないため、
  対応する案内文言も実装していない。

### ノート詳細ページ(`/participate/[slug]`)は変更していない

指示の「landing側だけ新しい実験室デザインに変えても、既存notebook
detailへ遷移できる構造は残してください」に従い、`[slug].astro`・
`[slug].module.css`・`worker/index.ts`・`wrangler.toml`・
`migrations/`は一切変更していない。`participate.astro`からの
リンク先(`/participate/${notebook.slug}`)も変更していないため、
既存の書き込み・表示機能(D1永続化、即時反映)はそのまま動作する。

## 対応

- `src/pages/participate.astro`: Hero・「いま、ひらいている実験」を
  全面書き換え。ノートごとの痕跡SVGをページ内の`traces`マップとして
  定義(装飾情報のため、`labNotebooks.ts`側にはデータを追加していない)。
- `src/pages/participate.module.css`: 旧`.notebookGrid`/`.cover`以下を
  削除し、`.experimentList`以下(細罫線リスト+痕跡SVGのスタイル)を
  追加。

## 採用理由

指示を字面通りに実装した。特に「実在しないMiro URLを作らない」
「coming soon/準備中を表示しない」という制約に対し、Miro資産が
repository内に存在しないことを実際に検索して確認したうえで、
「音の道セクション自体を非表示にする」ではなく「他の2冊と同じ、
実在する通常のnotebookとして表示する」を選んだ。「音の道」という
notebook自体(ページ・データ・投稿機能)は既に実在し機能しているため、
これを非表示にすることは「実在するものを隠す」ことになり、指示の
「実在するものだけ表示」という原則にむしろ反すると判断した。非表示に
すべきなのはMiro board連携という「まだ存在しない機能」であって、
「音の道」というnotebookそのものではない。

## 他の案

- **「音の道」だけ視覚的に目立たせる(将来のMiro連携を見越した特別な
  トリートメント)**: 実在しない機能のための特別扱いは「架空要素」に
  近づくため見送った。3冊とも同じ情報構造(category/title/description/
  痕跡/リンク)で統一し、視覚的な差はノートの性質を反映した痕跡SVGの
  形のみにとどめた。
- **ノート詳細ページ(`[slug].astro`)もv0.1デザインに合わせて更新する**:
  指示が「landing側だけ」と明示していたこと、既存のD1連携UI
  (即時反映・書き足しフォーム)が複雑で、デザイン変更が機能面の
  リグレッションを招くリスクがあったことから、今回のスコープからは
  意図的に外した。
- **痕跡SVGにtone(warm/moss/sky)の色を使う**: Top・本棚では実データに
  基づく色面(tone)を使っているが、実験室の痕跡は「装飾」の性質が
  強く、「『クリエイティブ系AIサイト』っぽい装飾は避ける」という
  指示により、単色(`--color-ink-muted`)の線のみにとどめた。形状の
  違いだけで3冊を書き分けている。

## 確認結果

- mobile(390px)/desktop(1440px)で`/participate`・
  `/participate/oto-no-michi`(notebook detail 1件)をスクリーンショット
  で確認した。
  - 実験室がカード一覧に見えず、余白・文字・細い罫線+痕跡で構成
    されている。
  - 「音の道」が他の2冊と同じ形式で、実験室の中の1つの実験として
    正しく収まっている(トップ階層には出していない)。
  - 架空の本・画像・Miro埋め込み・coming soon表示は無い。
  - 人数・アバター・いいね・投稿数等のSNS的表示は無い。
  - notebook detailページ(書かれたこと・書き足しフォーム・他の
    ノートを見る)は変更前と同じ見た目・構造で表示され、壊れていない
    ことを確認した。
  - Top・About・研究断面・本棚と同じ配色・タイポグラフィ・余白。
  - Playwrightで`document.body.scrollWidth`を検証し、mobile(390px)で
    どちらのページも横方向のoverflowが無いことを確認した
    (`bodyScrollWidth === bodyClientWidth === 390`)。
- `git diff --stat`で、変更ファイルが`participate.astro`・
  `participate.module.css`の2つのみであることを確認した
  (`[slug].astro`・`worker/index.ts`・`wrangler.toml`・
  `migrations/`は無変更)。
- `npx astro check`: 0 errors, 0 warnings, 1 hint(既存の無関係なhint)
- `npm run build`: 15ページ生成、エラーなし

## 将来の変更可能性

- 実在するMiro boardが用意できた時点で、「音の道」の詳細ページ
  (`[slug].astro`、または専用ページへの分岐)に、指示書の3・4節
  (探究マップのプレビュー・Miro内の書き方ルールの案内)を実装する。
  今回はその土台(「音の道」が実験室内の1実験として正しく位置づけ
  られている状態)のみを整えた。
- 実際の「ふ、と」自身の制作記録や訪問者の書き込みが増えた際は、
  ランディング側の各項目の説明文(`description`)は変更不要で、
  詳細ページ側に自動的に反映される(データ構造は変更していない)。

## Research Context

「実在するものだけを見せる」という今回の判断は、Decision Log
0152〜0154で確立してきた「架空の関連付け・架空のコンテンツを作らない」
という原則の延長線上にある。特に「音の道」を、まだ存在しないMiro
連携のための特別な演出をせず、他の2冊と同じ「実在する通常の
notebook」として扱ったことは、CLAUDE.mdの「公開研究室」という位置
づけ(完成予告の展示ではなく、いま実際にある状態をそのままひらく場)を
体現している。研究断面=読む・本棚=本と出会う・実験室=触る・試す・
痕跡を残す、というv0.1仕様の3領域の役割分担も、今回の「痕跡」SVGに
よるノートごとの描き分けを通して、より具体的な形になった。
