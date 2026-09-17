# 0157. 公開前仕上げ・QA v0.1

- 日付: 2026-09-17
- 状態: 採用
- 関連: PR #83〜86(Top/About/研究断面/本棚/実験室のv0.1刷新)。今回は
  新規実装ではなく、それらを踏まえた公開前の横断チェック
  (`claude_code_prelaunch_qa_v0.1.md`)。

## Decision

PR #86(実験室v0.1、Decision Log 0155・0156を含む)がmain統合済み
であることを確認したうえで、v0.1で公開する12ページ
(`/`, `/research`, `/research/reviews/01`, `/research/reviews/1-5`,
`/bookshelf`, `/participate`, `/participate/[slug]`, `/about`,
`/research-statement`, `/privacy`, `/contact`, `/404`)を対象に、
以下13項目のQAを実施した。新機能の追加は行わず、見つかった問題の
うち影響が明確なものだけ最小限修正した。

## 1. metadata/SEO

- Topの`<title>`を`公開研究室ふ、と｜誰もが探究を続けられる場所へ`、
  `description`を`個人の探究をひらき、誰もがふらっと立ち寄り、
  ともに探究を深められる場です。`に更新した(指示の文言をそのまま
  使用)。
- 他の11ページは、既存のページ固有titleを維持しつつ、末尾を
  `｜ ふ、と` → `｜ 公開研究室ふ、と`に統一した(指示の「必要なら
  『ページ名｜公開研究室ふ、と』の形に揃えてください」に基づく)。
- `research.astro`のみ、英語表記だった`title="Research ｜ ふ、と"`を
  `研究断面 ｜ 公開研究室ふ、と`に変更した。末尾統一だけでなく
  ページ名部分も日本語化した点は、単純な接尾辞置換より一歩広い判断
  であり、ここに明記する。
- `DefaultLayout.astro`の`description`デフォルト値
  (`世界を観察するための、研究と実践。`)は、今回名指しされたのが
  Topのみだったため変更していない。このデフォルトは`research.astro`・
  `research/reviews/01.astro`・`research/reviews/1-5.astro`・
  `404.astro`が(明示的なdescriptionを渡していないため)引き続き使用
  する。

## 2. OGP/favicon

- `og:site_name`/`og:title`/`twitter:title`に使われる
  `DefaultLayout.astro`の`sharedTitle`は既に`公開研究室ふ、と`で
  正しかった。
- `public/images/ogp/default.png`(1200×630、標準的なOGP比率)を
  目視確認したところ、旧見出し「気づいたら、そこに問いがある」と
  旧説明文「世界を観察するための、研究と実践。」がそのまま画像に
  焼き込まれていることが分かった。どちらも今回のTop刷新で置き換えた
  文言であり、シェア時の見え方として実態と食い違っている。
  「新しい生成画像は作らない」という制約があるため、この画像自体は
  **今回修正していない**。プロジェクトオーナー側での画像更新
  (または明示的な許可を得たうえでの再生成)が必要な項目として、
  最終報告で明示する。
- favicon(`favicon.svg`/`favicon.ico`)は問題なし。`apple-touch-icon`
  は存在しないが、正方形の高解像度アセットが手元にないため新規作成は
  見送った(軽微な推奨事項として報告のみ)。

## 3. 研究便り

- Topの「研究便りを受け取る」導線を確認した。`index.module.css`の
  `.newsletterForm`は`max-width: 24rem`、フォント・ボタンとも
  `--fs-sm`で、依然として小さな入口のまま(Decision Log 0150の方針
  維持)。
- 送信先は`src/config/site.ts`の`contactFormEndpoint`を再利用して
  おり、新しいendpointのハードコードは無い。
- 名称は「研究便り」で統一されている。
- 入力(email必須+type="email")/送信中/成功/エラーの各状態を
  Playwrightで確認済み(詳細は7節)。

## 4. 表記統一

- サイト全体を`「ふ、と」`/`『ふ、と』`で検索し、`公開研究室「ふ、と」`
  の形で残っていた箇所を洗い出した。
- 生きたテキスト(meta description・本文の一般的な文)は
  `公開研究室ふ、と`に統一した(対応ファイルは次節「対応ファイル」
  参照)。
- 以下は意図的に**変更していない**:
  - `research-statement.astro`のResearch Statement本文6段落の一部
    (`公開研究室「ふ、と」では、人と世界のあいだで…`)。既存の
    プロジェクト方針により、Research Statement本文は形式的な統一
    目的でも変更しない。
  - コード内コメント(`about.astro`冒頭コメント、`Footer.astro`の
    過去の意思決定を引用したコメント)。表示されるテキストではない
    ため対象外。
- Header/Footerのナビゲーションラベル(研究断面/実験室/本棚/この場所
  について)は元々一致しており、追加の修正は不要だった。

## 5. 未完成表示の残存チェック

- `coming soon`/`準備中`/`構想中`/`次に考えていること`等を全文検索
  した。
- 「次に考えていること」(構想中の02・03)は、`research.astro`が
  `planned={[]}`を渡すことで既に非表示(Decision Log 0153、今回より
  前の対応)であることを再確認した。
- 残る一致はすべてコード内コメント、または未使用の型定義
  (`ResearchStatus`の`"preparing"`、`ResearchCard`は既に廃止済み)
  であり、実際の画面には表示されない。
- 追加の修正は不要と判断した。

## 6. リンク・ナビゲーションQA

- Header/Footer/Research Statementへの導線/研究断面の前後nav/
  「この断面のそばにあるもの」/本棚の関連リンク/notebookリンクを
  確認した。前後nav・関連リンクは`researchReviews.ts`・
  `labNotebooks.ts`という単一のデータソースから機械的に生成されて
  おり、ページ生成(`getStaticPaths`)と同じデータを参照するため、
  リンク切れの構造的リスクは低い。
- `target="_blank"`を使う外部リンク(notebook投稿のURL表示、書籍の
  購入・アフィリエイトリンク)はすべて`rel="noopener noreferrer"`
  (投稿URLはさらに`ugc nofollow`、アフィリエイトは`sponsored`)を
  備えていることを確認した。
- 404リンクは見つからなかった。

## 7. responsive QA(390px/1440px)

- Playwright(`reducedMotion: 'reduce'`)でビルド済みの12ページ全てを
  390×844(mobile)・1440×900(desktop)でスクリーンショットし、
  `document.documentElement`/`body`の`scrollWidth`と`clientWidth`を
  比較した。**全24パターンでページレベルの横方向overflowは無し**
  (`scrollW === clientW`)。
- 目視でも、見出しサイズ・本文幅・Header/Footerの崩れ・本棚の横
  スクロール(ページ全体でなく内部のみに収まっている)・notebook UI・
  Topのfirst view(主要導線が最初の画面内に収まっている)・
  モーション終了後の静的状態、いずれも問題なし。

## 8. motion/accessibility

- `prefers-reduced-motion: reduce`は`global.css`の包括的なルール
  (全要素のanimation/transitionを実質無効化)に加え、Topの
  Heroアニメーションは`index.module.css`側で明示的に最終状態
  (開いた状態)を直接描画するよう個別対応済み(既存実装、今回の
  スクリーンショットで静的状態を確認)。
- 見出し階層: 全12ページでh1は1つのみ(`research-statement.astro`は
  `ResearchStatement`コンポーネントに`headingLevel="h1"`を渡す形で
  動的に描画されることを確認)。
- フォーカス: `outline: none`等でブラウザ標準のフォーカス表示を
  消している箇所はサイト全体で0件。主要な操作要素
  (Header/Footer/ArrowLink/各フォーム等)は`:focus-visible`の個別
  スタイルも用意されている。
- フォームラベル: 動的id(`` `read-together-email-${book.id}` ``等)を
  含め、`label for`と`input id`の対応を確認。
- aria属性: 装飾要素への`aria-hidden`、開閉ボタンの
  `aria-expanded`/`aria-controls`、新規タブで開く外部リンクへの
  補足`aria-label`など、不自然な使用は見つからなかった。
- 画像alt: `<img>`は全てalt(書籍タイトル等)を持つ。インラインSVG
  図版も`role="img"` + `aria-label`で代替テキストを提供している。
- 大規模な改修は行わず、明確な問題も見つからなかったため、この節の
  コード変更は無し。

## 9. フォーム動作確認

Formspree/Worker本番データを汚さないよう、実際の送信は行わず、
Playwrightで以下をUIレベルのみ確認した。

- 本棚「本を持ち寄る」: トグルの開閉、`aria-expanded`の同期、
  タイトル未入力時にHTML5バリデーションが送信をブロックすることを
  確認。
- 「一緒に読みたい」(`BookActions.astro`): トグルの開閉を確認。
- お問い合わせ: メール未入力時にバリデーションが送信をブロックする
  ことを確認。
- 研究便り: メール未入力、および不正な形式のメールでバリデーションが
  ブロックすることを確認。
- notebook投稿(「書き残す」): 本文未入力時にバリデーションが送信を
  ブロックすることを確認。「＋どんなときに思い出した？」
  「＋URLを添える」は`aria-controls`/`id`が対応した`hidden`属性の
  開閉トグルで、他のフォームと同じ実装パターンであることをコードで
  確認した。
- 上記いずれも、Worker APIやFormspreeへの実際のPOSTは発生していない
  (バリデーションでブロックされた時点で確認を終了したため)。

## 10. 404/privacyページ確認

- `/404`・`/privacy`とも、既存のダークテーマ・`ResearchSection`
  レイアウトと一致しており、大規模な再設計は不要と判断した。
- `/privacy`の記述と実装の突き合わせで、以下2点の**内容の食い違い**
  を発見した。プロジェクトオーナーの指示(法務文言は勝手に変更しない)
  に従い、**修正はせず、ここに報告する**。
  1. `/privacy`は「持ち寄る」フォームという呼び方をしているが、
     このフォームは`実験室`(旧「関わる」→「持ち寄る」)への改称を
     経て現在は「本棚に本を持ち寄る」のみを指す狭い意味になっている。
     一方、本棚には別に「一緒に読みたい」という独立したフォーム
     (`BookActions.astro`、email/name/noteをFormspree経由で送信)が
     あり、`/privacy`はこれを明示的に言及していない
     (「持ち寄る」に暗黙的に含まれる想定なのか、記載漏れなのか
     不明瞭)。
  2. より重要な点として、`/privacy`の「04 外部サービスの利用」は
     お問い合わせ・持ち寄る・研究便りが全てFormspree経由であると
     説明しているが、`/participate/[slug]`の「ふと思い出したことを
     書き残す」(notebook投稿)は実際にはFormspreeではなく、
     Cloudflare Worker + D1(`/api/notebooks/:slug/entries`)に送信
     されている。この投稿フォーム自体は氏名・メールアドレスを収集
     しない(本文・任意のcontext/URLのみ)ものの、`/privacy`のどこにも
     このWorker/D1という別の外部処理経路への言及が無い。フォーム側
     (`[slug].astro`)は「送信いただいた情報は、個人情報の取り扱いに
     基づいて管理します」と`/privacy`へリンクしているため、
     読み手からすると`/privacy`が全ての送信経路をカバーしている
     という期待を裏切る形になっている。

## 11. build/check

- `npx astro check`: 0 errors, 0 warnings, 1 hint(既存の無関係な
  hint、`SectionTitle.astro`の未使用`Props`)。
- `npm run build`: 15ページ生成、エラーなし(12ページ+
  `/fieldnote`+3つの`/participate/[slug]`静的パス。`/support`は
  Decision Log 0120からの既存リダイレクトで新規ページではない)。
- ローカルpreviewサーバー(`npm run preview`)+Playwright
  (Chromium、`executablePath`は環境内の`/opt/pw-browsers`)で
  12ページ×2ビューポートのスクリーンショットとoverflow計測、および
  5フォームのUI動作確認を実施(7節・9節)。実際のCloudflare Workers
  Builds上のブランチプレビューはこのセッションからは参照できないため、
  未確認(最終報告で明記)。

## 対応ファイル

- `src/pages/index.astro`: Topのtitle/description更新。
- `src/pages/{404,about,bookshelf,contact,participate,
  participate/[slug],privacy,research,research-statement,
  research/reviews/01,research/reviews/1-5}.astro`: title末尾の
  `公開研究室ふ、と`統一。
- `src/pages/{about,bookshelf,contact,privacy,research-statement}.astro`:
  description等の`公開研究室「ふ、と」` → `公開研究室ふ、と`の
  かぎ括弧除去。
- `src/components/Header.astro`: ロゴalt文字列の余分な半角スペースを
  修正(`公開研究室 ふ、と` → `公開研究室ふ、と`)。

`worker/index.ts`・`wrangler.toml`・`migrations/`・Research Statement
本文・`/privacy`の法務文言・`labNotebooks.ts`・`bookshelf.ts`は今回も
一切変更していない。

## 採用理由

指示書の各項目を、判断が必要な箇所は「安全側に倒す」方針で処理した。
具体的には、(1) 表示テキストの表記ゆれは修正し、(2) 保護対象と
明示されているResearch Statement本文・privacy法務文言は形式的な
統一目的でも変更せず、(3) 実装とprivacyの内容が食い違う箇所は
修正せず報告に留めた。(3)は特に、法務文言の実質的な変更は
プロジェクトオーナーの判断領域であり、Claudeが「矛盾を解消する」
という名目で内容を書き換えることのリスクの方が大きいと判断した
ため。

## 他の案

OGP画像については、`?v=3`のようなキャッシュバスティングのみ行い、
画像自体は据え置くという中間案も検討したが、画像の中身(古い見出し・
説明文)自体が実態と異なっているため、キャッシュを更新しても
問題は解決しない。「新しい生成画像を作らない」という制約下では
待つ以外の適切な対応が無いと判断した。

## 将来の変更可能性

- OGP画像が更新された際は、`DefaultLayout.astro`の
  `?v=2`を`?v=3`以降にインクリメントする。
- `/privacy`の「持ち寄る」表記・Worker/D1の開示については、
  プロジェクトオーナーの判断で文言を追加・修正する場合、既存の
  8ブロック構成にならい、必要なら新しい番号のブロックとして追加する
  ことを想定する。

## Research Context

「公開研究室」という位置づけは、完成した状態を演出することではなく、
いまある状態を正確に見せることを前提にしている。今回のQAで見つけた
2つの主な論点――OGP画像に残る旧文言、`/privacy`とnotebook投稿の
実装の食い違い――は、どちらも「サイトが実際にやっていることと、
外部に見えている説明が一致していない」という同じ種類の問題であり、
本文の表記統一以上に、この研究室の信頼性に関わる。だからこそ、
どちらも独断で書き換えず、プロジェクトオーナーの判断に委ねる形で
明示的に報告することを選んだ。
