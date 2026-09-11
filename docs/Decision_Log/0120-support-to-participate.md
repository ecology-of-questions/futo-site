# 0120. 「研究を支える」導線を「関わる」に整理し、/support を廃止する

- 日付: 2026-09-11
- 状態: 採用

## Decision

「関わる」ページ(`/participate`)・「研究の本棚」(`/bookshelf`)の
MVPが固まったことを受け、プロジェクトオーナーから、既存の
「研究を支える」導線(Home・Footer)を現在の方針に合わせて「関わる」に
整理する指示を受けた。`/support`(2026-09-10新設、Decision Log 0111)
は、決済の受け皿が未定のまま`/contact`への導線にとどめていた暫定
ページで、今回「独立した支援ページとして育てない」方針が明示された。

実装前に、(1)Home「研究を支える」の実装箇所、(2)Footerのリンク
実装箇所、(3)`/support`の現在の構造、(4)リダイレクトの最小実装方法、
(5)変更対象ファイル、を報告したうえで実装した。本棚のHome表示が
本番で古く見える件は、`main`のコード・build結果が正しいことを前回
確認済みのため、デプロイ/キャッシュ側の別問題として今回は扱わず、
コード修正は行っていない。`/participate`の本文・機能、`/bookshelf`、
conversation MVP、gift MVP、Research Statement、本データ、Homeの
「研究の本棚」プレビュー、デザイン全体は変更していない。

## 対応

### 1. Home(src/pages/index.astro)

「研究便り・研究を支える」の背景面パネル(`id="newsletter-support"`)
のうち、2つ目の`panelSection`(「研究を支える」)を「関わる」に
差し替えた。見出し「関わる」、本文(改行位置はプロジェクトオーナー
指定のまま`<br />`で保持)、リンク「関わる →」→`/participate`。
「研究便り」パネルは変更していない。`ResearchSection`の`id`は
`newsletter-support`→`newsletter-participate`に、`ariaLabel`は
「研究便り・研究を支える」→「研究便り・関わる」に変更した(他ファイル
からの参照がないことを確認済み)。

### 2. Footer(src/components/Footer.astro)

`<a href="/support">研究を支える</a>`を`<a href="/participate">関わる</a>`
に変更した。「ページ最後のクロージングのCTA」という役割自体
(Decision Log 0111)は変更していない。

### 3. `/support`のリダイレクト(astro.config.mjs)

`redirects: { "/support": "/participate" }`を追加した。過去に
`/research-statement`→`/#research-statement`で使った方式
(Decision Log 0102)と同じで、`output: "static"`のためAstroが
`<meta http-equiv="refresh" content="0;url=/participate">`+
`<link rel="canonical">`+フォールバックリンクを含む静的HTMLページを
生成する。Cloudflare固有の`_redirects`には依存しない、ポータブルな
方式(CLAUDE.mdの「特定サービスに依存しない構成を維持する」方針に
沿う)。

**技術的な留意点**: HTTPレスポンス自体のステータスコードは200
(静的ホスティングのため)で、厳密な意味でのサーバーサイド301では
ない。ブラウザでは`delay=0`のmeta refreshにより即座に(体感上は
瞬時に)`/participate`へ遷移し、`<link rel="canonical">`と
`<meta name="robots" content="noindex">`により検索エンジンには
「このURLは実質的に統合先を指す」ことが伝わる設計になっている。
実機のPlaywrightブラウザテストで、`/support/`にアクセスすると実際に
`/participate`へ遷移することを確認した。

`redirects`設定と実ページファイルは同じパスに共存できない
(ビルド時のルート競合になる)ため、`src/pages/support.astro`・
`src/pages/support.module.css`を削除した(git履歴には残る)。

## 採用理由

- `/support`は「決済の受け皿が決まるまでの暫定ページ」として設計
  されていた(Decision Log 0111)。受け皿の選定自体に進展がなく、
  「関わる」という、より広い切り口のページが既に存在することから、
  独立ページとして維持する理由が薄れたと判断した。
- リダイレクト方式は、CLAUDE.mdの「デプロイ先固有の機能を使わない、
  ポータブルな静的サイトを維持する」方針と、このプロジェクトの既存
  実装パターン(Decision Log 0102の`/research-statement`リダイレクト)
  の両方に整合する選択をそのまま踏襲した。

## 他の案

- Cloudflare Pages純正の`_redirects`ファイル(真の301が得られる)を
  使う案も検討したが、CLAUDE.mdの「Cloudflare固有のアダプター/機能は
  導入しない」という明示的な方針に反するため見送った。
- `/support`ページ自体を残しつつ本文だけ「`/participate`へどうぞ」と
  書き換える案も検討したが、URLが2つに分かれたまま残ることになり、
  「本データは1か所で管理する」等、この一連の作業で徹底してきた
  「単一の入口に統合する」考え方と矛盾するため、リダイレクトによる
  一本化を選んだ。

## 将来の変更可能性

- 支援の受け皿(決済手段)が将来決まった場合、`/participate`内に
  支援導線を追加するか、`/support`を新しい内容で復活させるかは、
  その時点で改めて判断する。今回のリダイレクトはURLの現時点での
  一本化であり、`/support`という経路自体を永久に閉じる決定ではない。
- Home本棚プレビューが本番で古く見える件(デプロイ/キャッシュ疑い)は、
  未解決のまま次の課題として残っている。

## Research Context

このDecision Logは、Decision Log 0113〜0119で積み上げてきた「関わる・
本棚」まわりの一連の整理の延長線上にある。「支援」という個別の窓口を
持たせるのではなく、「関わる」という1つの入口に収斂させることで、
訪問者が取れる行動の選択肢を必要以上に増やさない、という一貫した
姿勢の表れである。CLAUDE.mdの「完成度よりも育てられることを優先する」
という原則のもと、受け皿が定まっていない機能を無理に独立ページとして
存続させるより、今実際に機能している「関わる」への導線に一本化する
ことを選んだ。
