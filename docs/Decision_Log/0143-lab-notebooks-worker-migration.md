# 0143. 実験室ノート永続化をCloudflare Pages FunctionsからWorker + Static Assets + D1へ変更

- 日付: 2026-09-13
- 状態: 採用
- 関連: Decision Log 0141・0142(この決定は0141・0142の実装方式を置き換える。
  データモデル・API仕様・スパム対策・非表示運用など「何を作るか」の
  決定内容自体は0141・0142のまま変わらない。変わるのは「Cloudflareの
  どの製品の上に実装するか」という実行基盤の部分のみ)。

## Decision

Decision Log 0141・0142は、本番がCloudflare Pagesであるという前提で
Cloudflare Pages Functions + D1を実装した。PR #82をWorkers Builds上で
実際にビルドしたところ、以下2つの問題が明らかになった。

1. `Missing entry-point to Worker script or to assets directory`
   (デプロイ失敗)
2. `Multiple environments are defined ... but no target environment
   was specified`(警告)

プロジェクトオーナーがCloudflareダッシュボードを確認した結果、
**本番の実態はPagesではなかった**ことが判明した。

- `futoing.com`は、Cloudflare Pagesではなく**Worker `futo-site`の
  Custom Domain**として配信されている。
- このWorkerはGitHub `ecology-of-questions/futo-site`と
  **Workers Builds**で連携しており、Build commandは`npm run build`、
  Production deployは`npx wrangler deploy`、Preview/version deployは
  `npx wrangler versions upload`。
- 別途`futo-site.pages.dev`というPagesプロジェクトも存在するが、
  Custom Domainは設定されておらず、実際には使われていない。

つまり、これまで「Cloudflare Pages」だと想定していたデプロイ基盤は
実際には**Cloudflare Worker(Workers Builds経由)**であり、PR #82で
追加した`wrangler.toml`(`pages_build_output_dir`を持つPages向けの
形式)を`wrangler deploy`が読み込もうとした結果、Worker用の
`main`(entry point)も`[assets]`もどちらも見つからず
`Missing entry-point to Worker script or to assets directory`という
デプロイ失敗になっていた。これがPR #82の最初のWorkers Buildsログで
観測された失敗の直接の原因である。

この実態に合わせて、実装をCloudflare Pages FunctionsからCloudflare
**Worker + Workers Static Assets + D1**へ変更した。

```
futoing.com
  ↓
Cloudflare Worker (futo-site)
  ├─ /api/notebooks/... → Worker (worker/index.ts) → D1
  └─ その他            → Workers Static Assets (Astroのdist/)
```

Astro本体は引き続き`output: "static"`のまま(サイト全体をSSR化しない)。
既存のWorker名`futo-site`・Custom Domain・Workers Builds連携は
そのまま使い、Pagesへの移行やWorkerの作り直しは行っていない。

## 対応

### 1. `wrangler.toml`をWorkers向け構成に書き換え

Pages向けの`pages_build_output_dir`を廃止し、Worker向けの
`main`(entry point)・`[assets]`を追加した。

```toml
name = "futo-site"
main = "worker/index.ts"
compatibility_date = "2024-09-13"

[assets]
directory = "./dist"
binding = "ASSETS"
not_found_handling = "404-page"
run_worker_first = ["/api/*"]
```

`run_worker_first`を`["/api/*"]`に限定しているため、`/api/*`以外の
リクエストはこのWorkerを経由せず、Cloudflare側のルーティングの時点で
直接Workers Static Assets(Astroの`dist/`)へ配信される(「全リクエストを
Workerに通す」`run_worker_first = true`にはしていない、という指示への
対応)。`not_found_handling = "404-page"`により、存在しない静的URLは
Astroが生成した`404.html`(既存の`src/pages/404.astro`)が返る。

`wrangler deploy --dry-run` / `wrangler versions upload --dry-run`
(ローカル、実アカウント不要)で、`Missing entry-point`エラーが解消して
いることを確認した。

### 2. Pages Functionsのコードを`worker/index.ts`へ移植

`functions/api/notebooks/[slug]/entries.ts`(Pages Functions形式、
`onRequestGet`/`onRequestPost`をファイルベースルーティングで export)を
削除し、`worker/index.ts`(標準の`export default { fetch(request, env)
{...} }`)へ書き直した。

```ts
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const match = url.pathname.match(/^\/api\/notebooks\/([^/]+)\/entries\/?$/);
    if (match) {
      const slug = match[1];
      if (request.method === "GET") return handleGetEntries(slug, env);
      if (request.method === "POST") return handlePostEntries(slug, request, env);
      return json({ error: "method not allowed" }, 405);
    }
    // /api/*以外がここに到達した場合の保険(通常はrun_worker_firstにより
    // ここへ到達する前にassetsへ直接ルーティングされる)。
    return env.ASSETS.fetch(request);
  },
};
```

以下は0141・0142の実装内容をそのまま移植し、変更していない。

- D1への保存(`entries`テーブル、schemaは`migrations/0001_init.sql`のまま)
- `visible`/`hidden`
- `body`/`context`/`url`
- `IP_HASH_SECRET`によるHMAC-SHA256の`ip_hash`
- `IP_HASH_SECRET`未設定時のfail closed(500)
- 60秒の連投制限・1日20件の上限
- honeypot(`_gotcha`)
- URL validation(http/https限定)
- `VALID_SLUGS`によるnotebook isolation

Pages Functions固有だった`PagesFunctionContext`型・`functions/`
ディレクトリは削除した。

### 3. D1環境分離とWorkers Buildsの実際のコマンドとの整合

Preview/Production D1を分離する方針(Decision Log 0142)は維持しつつ、
Workers Buildsの実際のデプロイコマンド(`wrangler deploy` /
`wrangler versions upload`、いずれも`--env`を指定していない)に
合わせて設計し直した。

`wrangler.toml`に`[env.preview]`・`[env.production]`を追加したが、
**named environmentが定義されているだけでは、`--env`フラグも
`CLOUDFLARE_ENV`環境変数も無い場合、Wranglerはどちらの環境を使うべきか
自動選択しない**(`wrangler`本体の警告文言、およびソース
`node_modules/wrangler/wrangler-dist/cli.js`の
`warnIfMultipleEnvsConfiguredButNoneSpecified`ロジックで確認済み)。
その場合、`wrangler deploy`/`wrangler versions upload`は
**トップレベル(環境指定なし)の設定**を使う。

このため、環境の選択はCloudflare側のビルド設定に**`CLOUDFLARE_ENV`
環境変数を追加する**方法を採用した(デプロイコマンド自体
(`npx wrangler deploy` / `npx wrangler versions upload`)は変更しない)。

- Production用ビルド設定: `CLOUDFLARE_ENV=production`
- Preview用ビルド設定: `CLOUDFLARE_ENV=preview`

`-e|--env`フラグをコマンドに追加する方法(`npx wrangler deploy --env
production`等)も同等に機能するが、今回はデプロイコマンド自体を
変更せずに済む`CLOUDFLARE_ENV`方式を採用した(コマンド変更よりも
環境変数追加の方が変更点が小さく、誤操作のリスクが低いと判断した)。

**フェイルセーフ設計**: トップレベル(環境指定なし)の`[[d1_databases]]`は、
ローカル開発専用の`database_id`(実在しないプレースホルダー)を指す
ままにしている。これにより、万一Cloudflareダッシュボード側で
`CLOUDFLARE_ENV`の設定が漏れていても、そのビルドは
**本番D1へ誤って書き込むのではなく、存在しないデータベースへのbind
エラーでデプロイ自体が失敗する**(安全側に倒れる)。「Preview Buildが
Production D1へ書き込まないことを保証する」という指示に対し、
「正しく設定されていれば分離される」ではなく「間違って設定されていても
本番へは書き込めない」という、より強い保証を優先した。

`wrangler deploy --dry-run`(トップレベル、`--env preview`、
`--env production`)・`CLOUDFLARE_ENV=production wrangler deploy
--dry-run`・`CLOUDFLARE_ENV=preview wrangler versions upload
--dry-run`をローカルで実行し、それぞれ意図したD1
(`futo-lab-notebooks` / `futo-lab-notebooks-preview` /
`futo-lab-notebooks-production`)にbindされることを確認した。

### 4. ローカル開発コマンドの変更

`package.json`の`pages:dev`(`wrangler pages dev`)を`worker:dev`
(`wrangler dev`)に変更した。D1マイグレーション用スクリプト
(`d1:migrate:local`/`preview`/`production`)はD1データベース名を直接
指定する形のため変更していない。

## Cloudflareダッシュボードで必要な設定(私が行う項目の整理)

実装・ローカル検証まではこのPRで完了しているが、以下はCloudflare
ダッシュボード側の操作が必要で、コードからは変更できない。

1. **既存Worker `futo-site`のBuild/Deploy設定はそのまま**(Build
   command: `npm run build`、Production deploy: `npx wrangler
   deploy`、Preview/version deploy: `npx wrangler versions upload`
   のいずれも変更不要)。
2. **Production用ビルド設定に環境変数を追加**: `Settings` →
   `Build`(または`Environment variables`、Workers Buildsの該当設定
   画面)の**Production**タブに `CLOUDFLARE_ENV` = `production` を追加。
3. **Preview用ビルド設定に環境変数を追加**: 同じ画面の**Preview**
   タブに `CLOUDFLARE_ENV` = `preview` を追加。
4. **Preview用・Production用のD1データベースを別々に作成**:
   ```bash
   npx wrangler d1 create futo-lab-notebooks-preview
   npx wrangler d1 create futo-lab-notebooks-production
   ```
   発行された`database_id`を、`wrangler.toml`の
   `[[env.preview.d1_databases]]`・`[[env.production.d1_databases]]`
   のそれぞれに反映する(コード側の変更としてこのPRの範囲に含めるか、
   マージ後に別途反映するかは運用次第。**database_idが未設定
   (プレースホルダー)のままだと、そのビルドはデプロイ時にbindエラーで
   失敗する**ため、安全に倒れる)。
5. **マイグレーションを両方の環境に適用**:
   ```bash
   npm run d1:migrate:preview
   npm run d1:migrate:production
   ```
6. **`IP_HASH_SECRET`をWorkerのsecretとして、Production・Preview両方に
   別々の値で設定**(Workerの`Settings` → `Variables and Secrets`。
   Workers Builds連携のWorkerでも、secret自体はWorker本体の設定画面
   から`wrangler secret put IP_HASH_SECRET`、またはダッシュボードの
   Secret追加UIで設定する。環境ごとに異なる値を推奨)。
7. **Custom Domain(`futoing.com`)・Worker名(`futo-site`)は変更しない**
   (今回の変更で影響を受けない)。
8. **既存のPagesプロジェクト(`futo-site.pages.dev`)は今回関与しない**
   (Custom Domainが無く実際に使われていないため、削除も設定変更も
   行わない)。

## build・astro check・E2E確認結果

- `npm run build`: 0エラー、15ページ生成
- `npx astro check`: 0 errors, 0 warnings, 1 hint(既存の無関係なhint)
- `npx wrangler deploy --dry-run`(トップレベル)・`--env preview`・
  `--env production`・`CLOUDFLARE_ENV=production wrangler deploy
  --dry-run`・`CLOUDFLARE_ENV=preview wrangler versions upload
  --dry-run`のいずれも成功し、`Missing entry-point`エラーは再現しない。
  それぞれ意図したD1バインディングが選択されることを確認した。
- `wrangler dev` + ローカルD1エミュレーションで以下を確認済み:
  1. `/`がAstroの静的サイトとして表示される
  2. `/participate`が表示される
  3. `/participate/oto-no-michi`が表示される
  4. `GET /api/notebooks/oto-no-michi/entries`が動く
  5. `POST`で書き込める
  6. 投稿直後にDOMへ反映される(Playwrightで確認)
  7. reload後も残る(Playwrightで確認)
  8. notebook isolation(音の道の投稿がFieldnoteに現れない)
  9. `status='hidden'`にしたエントリが次のGETから消える
  10. `IP_HASH_SECRET`無しでPOSTすると500(fail closed)
  11. 存在しない静的URL(`/this-page-does-not-exist`)は404
  12. `images/logo/logo.svg`等の静的assetsが200で配信される
  - モバイル390px幅での書き込み〜表示〜reload確認(Playwrightスクリーン
    ショットで見た目も確認)。
- テストデータはローカルD1(`.wrangler/`、コミット対象外)から削除済みで、
  本番データへの影響はない。

## PR #82の状態

マージしていない(指示どおり)。ブランチ`claude/lab-notebooks-
persistence`に今回の変更を追加コミットし、push済み。

## 採用理由

「実際のCloudflareダッシュボードの状態」という一次情報が「以前の
調査結果(Pages想定)」と食い違った以上、実装は実際の本番構成に
合わせる必要がある。Workers Static Assetsは、Workerの`fetch`
ハンドラと静的ファイル配信を1つのWorker上で共存させるCloudflareの
公式な現行機能であり、`run_worker_first`でAPIパスだけをWorkerに
限定できるため、「サイト全体をSSR化しない」「`/api/*`だけAPIとして
処理する」という要求を、既存Worker `futo-site`をそのまま使いながら
満たせる。

`CLOUDFLARE_ENV`による環境選択は、Workers Buildsの既存デプロイ
コマンド(`wrangler deploy`/`wrangler versions upload`)を変更せずに
すむ最小の変更であり、「Build/Deploy commandを勝手に変更できない」
という制約とも整合する。トップレベル設定をローカル専用のプレース
ホルダーのままにする設計は、設定漏れが起きても本番データへの誤書き込み
という最悪のシナリオを構造的に防げるため採用した。

## 他の案

- **Pages移行(`futo-site.pages.dev`にCustom Domainを設定し直す)**:
  プロジェクトオーナーから明確に「今回は行わない」と指示されており、
  かつ既存Worker・Custom Domainを壊すリスクがあるため見送った。
- **`wrangler deploy --env production`のようにデプロイコマンド自体を
  変更する**: `CLOUDFLARE_ENV`環境変数の追加と同等の効果があるが、
  Workers Builds側の「Build command」「Deploy command」設定を直接
  書き換える必要があり、環境変数の追加より変更点が大きいと判断し、
  今回は`CLOUDFLARE_ENV`方式を優先案として提示した(どちらを採用するかは
  プロジェクトオーナーの判断に委ねる)。
- **`run_worker_first = true`(全リクエストをWorker経由にする)**:
  指示により明確に避けるべきとされたことに加え、`/api/*`以外は
  静的ファイルで完結するため、全リクエストをWorkerに通す必要がなく、
  そのようにするとWorkerの実行回数・レイテンシが不必要に増えるため
  採用しなかった。

## 将来の変更可能性

- Preview用D1にテストデータが蓄積されすぎた場合は、Preview用D1のみを
  定期的にリセットする運用を検討する。
- Workers Builds側で`CLOUDFLARE_ENV`の設定が難しい・非対応と判明した
  場合は、デプロイコマンド自体に`--env`を追加する方式へ切り替える
  (上記「他の案」参照)。
- 将来的にPages側への統合を検討する場合は、Decision Log 0141・0142の
  Pages Functions実装を参考に再度移行できる(コードの構造(D1
  schema・スパム対策・API仕様)はPages/Worker間で共通のため、
  移植コストは低い)。

## Research Context

「実際に動いているものを確認してから直す」という今回の一連の
やり取りは、CLAUDE.mdの「常に成長を最適化する」という姿勢の一部
そのものだった。仮説(Pagesだと思っていた)を一次情報(ダッシュボードの
実態)で検証し、間違っていたと分かった時点で速やかに設計を作り直す
ことは、公開後も研究として育て続けるという「ふ、と」の哲学と、
実装判断のレベルでも一致している。
