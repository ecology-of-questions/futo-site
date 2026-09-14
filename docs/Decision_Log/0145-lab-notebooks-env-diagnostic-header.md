# 0145. Preview D1混入の報告を受けた調査と診断用ヘッダーの追加

- 日付: 2026-09-14
- 状態: 採用(実行基盤の結論 → Decision Log 0146で更新)
- 関連: Decision Log 0141〜0144(この決定は0144までの実装に対する
  バグ報告への対応。D1・API仕様等の設計自体は変わらない)

**2026-09-14追記(実機確認結果):** この節で追加した
`X-Notebook-Env`ヘッダー・`/api/debug/notebook-env`を使い、実際の
Preview Version URLで実機確認した結果、`GET /api/debug/notebook-env`
は正しく`{"environment":"preview"}`を返す一方、そのPreview Version
URLからの投稿は**Production D1に保存され、Preview D1には保存されな
かった**ことをCloudflare D1 Consoleで確認した。これは「同一Workerの
Versionごとに`vars`は切り替わるが、D1等のresource bindingは
Versionごとに安全に分離できない」というCloudflare Workers Versions
機能側の制約であると判断し、Decision Log 0146でPreview専用の別Worker
(`futo-site-preview`)へ切り替えた。この節の調査手順・診断コード
自体は無駄ではなく、この結論に至るための重要な材料だったため、
削除せず残す。

## Decision

Cloudflareダッシュボード側でPreview/version deployコマンドを
`npx wrangler versions upload --env preview`に変更し、Workers Build
再実行(空コミット)も成功した後、プロジェクトオーナーから重大な報告を
受けた。

> 実際のCloudflare Preview Version URLで投稿したところ、
> `futo-lab-notebooks-preview`ではなく`futo-lab-notebooks-production`
> にその投稿が保存されていた。Preview画面からのGET/POSTがProduction
> D1へ到達している。

指示に従い、以下の順で調査した。

### 1. クライアント側のAPI URLを調査(コードレベルの原因の切り分け)

`src/pages/participate/[slug].astro`のGET/POST両方が使う`apiUrl`を
確認した。

```ts
const apiUrl = `/api/notebooks/${notebookSlug}/entries`;
```

- GET: `fetch(apiUrl)`
- POST: `fetch(apiUrl, { method: "POST", ... })`

いずれも**プロトコル・ホストを含まない相対パス**であり、既にsame-origin
(ページを開いているoriginへ送られる)構成になっていた。

念のため、リポジトリ全体を対象に以下を検索したが、API呼び出しに
`futoing.com`・`Astro.site`・`PUBLIC_SITE_URL`等を使っている箇所は
無かった(`DefaultLayout.astro`の`Astro.site`利用はOGP画像・canonical
URLの生成のみで、API呼び出しとは無関係)。

```bash
grep -rn "futoing.com" src/ worker/ astro.config.mjs
grep -rn "PUBLIC_SITE_URL|siteUrl|Astro.site|new URL(.*api" src/ worker/
```

**結論: クライアントコード側に本番固定URLの原因は無い。** GET/POSTとも
既にsame-origin相対URLだった。

### 2. Cloudflare側の実際のbindingを直接検証する手段が無い

このセッションにはCloudflareの認証情報が無く(`wrangler whoami`で
未認証)、実際にデプロイされたPreview Versionが本当にどのD1を
bindingしているかを、Cloudflare API経由で直接確認することはできない。
ローカルでの`wrangler`設定解決(`unstable_readConfig`)は、
Decision Log 0144の時点で production/preview とも正しいWorker名・
D1に解決されることを確認済みだが、これは**ローカルでのシミュレーション
であり、実際にCloudflare上でアップロードされた特定のVersionが
何にbindされたかを保証するものではない**。

### 3. 診断用ヘッダーの追加

上記の限界を踏まえ、コードレベルで実機からも確認できる診断手段を
追加した。`wrangler.toml`に非secretな変数`NOTEBOOK_ENV`を
(トップレベル/`[env.production]`/`[env.preview]`それぞれに)追加し、
`worker/index.ts`が`/api/notebooks/:slug/entries`のレスポンスに
`X-Notebook-Env`ヘッダーとしてそのまま返すようにした。

```toml
[vars]
NOTEBOOK_ENV = "production"
...
[env.preview.vars]
NOTEBOOK_ENV = "preview"
```

```ts
response.headers.set("X-Notebook-Env", env.NOTEBOOK_ENV ?? "unset");
```

これにより、実際のPreview Version URLに対して

```bash
curl -sD - https://<preview-version-url>/api/notebooks/oto-no-michi/entries
```

を実行するだけで、そのリクエストが実際に`production`/`preview`の
どちらの設定で処理されたかを、Cloudflare認証情報無しに外部から
直接確認できるようになった。secretではない情報のみを返すため、
公開しても安全である。

### ローカルでの確認結果

`wrangler dev`(デフォルト=production相当)と`wrangler dev --env
preview`を別ポートで同時に起動し、以下を確認した。

- production origin → `X-Notebook-Env: production`、
  `futo-lab-notebooks-production`に保存される
- preview origin → `X-Notebook-Env: preview`、
  `futo-lab-notebooks-preview`に保存される
- production originへのGET結果にpreview originの投稿は含まれない
  (逆も同様、notebook isolationとは別軸でのenv isolationも確認)

ローカルでは、production/preview向けのGET・POSTともsame-origin
相対URLのまま正しく分離されており、コード上の不具合は再現しなかった。
このため、**次にプロジェクトオーナーには、実際のPreview Version URLに
対して`X-Notebook-Env`ヘッダーを直接確認していただく**ことを依頼する
(下記「次の確認手順」参照)。

### 副次的に発見した不具合の修正

調査中、`package.json`の`d1:migrate:preview`スクリプトに`--env
preview`が付いておらず、`wrangler d1 execute futo-lab-notebooks-preview
--remote`だけでは`wrangler.toml`のトップレベルにこのD1が定義されて
いないため実行できない(`Couldn't find a D1 DB with the name or
binding`エラーになる)ことが判明したため、あわせて修正した。

```json
"d1:migrate:preview": "wrangler d1 execute futo-lab-notebooks-preview --env preview --remote --file=./migrations/0001_init.sql"
```

(今回のmigration自体はCloudflare D1 Consoleから手動で適用済みのため、
本番運用への影響は無い。将来このコマンドを使う場合のための修正。)

## 次の確認手順(プロジェクトオーナー向け)

1. 実際のCloudflare Preview Version URL(`futoing.com`ではなく、
   `<version>-futo-site.<subdomain>.workers.dev`形式のURL)に対して、
   ブラウザの開発者ツールのNetworkタブ、または以下のコマンドで
   `X-Notebook-Env`ヘッダーを確認する。
   ```bash
   curl -sD - "https://<preview-version-url>/api/notebooks/oto-no-michi/entries" -o /dev/null
   ```
2. **`X-Notebook-Env: preview`と表示された場合**: Worker側の環境選択は
   正しくpreviewに解決されている。それでもProduction D1に保存される
   ようであれば、Cloudflare Workers本体の「Versions」機能とD1
   bindingの組み合わせにおける、コード側では制御できないプラット
   フォーム側の挙動を疑う必要がある。この場合はCloudflareサポートへの
   問い合わせ、またはD1データベースの物理的な入れ替え(database_idの
   再確認)を検討する。
3. **`X-Notebook-Env: production`(または`unset`)と表示された場合**:
   テストに使ったPreview Version URLが、`--env preview`への変更前に
   ビルドされた古いバージョンだった可能性が高い。Cloudflare
   ダッシュボードのWorker「futo-site」→Versionsタブで、直近の
   Workers Build(今回の修正コミット)に対応する最新のVersionの
   Preview URLを再取得し、そちらで再テストする。

## 採用理由

Cloudflareの認証情報がこのセッションに無く、実際にデプロイされた
Versionのbindingを直接検査する手段がない以上、コード側の原因(すでに
same-origin相対URLであることを確認済み)を再度作り込むのではなく、
**実機で直接確認できる非secretな診断情報を追加する**ことが、次の
一手として最も生産的だと判断した。この診断ヘッダーは恒久的に残しても
安全(secretではない、機微情報を含まない)であり、将来同種の環境混同が
起きた際にも役立つため、一時的な調査コードとしてではなく通常の実装の
一部として追加した。

## 他の案

- **診断ヘッダーを追加せず、プロジェクトオーナーに`wrangler versions
  list`等のCLIコマンドを直接実行してもらう**: 有効な方法だが、
  Cloudflare CLIへのログインや`--remote`権限が必要になり、
  ブラウザから1回アクセスするだけで確認できる診断ヘッダーの方が
  低コストで即座に確認できるため、まずこちらを採用した。両方を
  組み合わせて使うことも可能。
- **D1クエリ結果自体にどのDBかを含める**: D1データベース自体は
  自身の名前・IDをクエリ結果に含める標準的な方法を持たないため、
  代わりにwrangler.toml側の`vars`(環境ごとに異なる値)を使う今回の
  方法を採用した。

## 将来の変更可能性

`X-Notebook-Env`ヘッダーで実機確認した結果、それでもPreview D1への
書き込みが本番へ混入する場合は、Cloudflare側のプラットフォーム挙動の
問題である可能性が高く、その場合はCloudflareサポートへの確認、または
Decision Log 0144で見送った「選択肢B(Preview専用の別Worker)」への
切り替えを再検討する。

## Research Context

「まずコードを疑い、コードで説明できないなら、実機で確認できる手段を
増やす」という今回の対応順序は、推測で修正を重ねるのではなく、
一次情報(実際にCloudflare上で何が起きているか)を確認できる状態を
先に作るという、Decision Log 0144までの姿勢をそのまま引き継いでいる。
交換ノートが訪問者の実データを扱う以上、「正しく分離されているはず」
ではなく「正しく分離されていることを確認できる」状態を保つことが、
この機能の信頼性にとって重要だと考える。
