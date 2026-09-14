# 0146. Preview用に別Worker(futo-site-preview)を用意する構成へ変更

- 日付: 2026-09-14
- 状態: 採用
- 関連: Decision Log 0143〜0145(この決定は0144で採用した「同一Worker
  のVersionごとにD1 bindingだけ差し替える」方式を置き換える。D1
  schema・API仕様・スパム対策等の設計自体は変わらない)

## Decision

Decision Log 0144では、Cloudflareの named environment仕様
(`name`を明示しないと別Workerになる)を踏まえ、Production・Preview
とも**同一Worker`futo-site`**とし、`[env.preview]`のD1 bindingだけを
Preview用データベースに差し替える構成を採用していた。

Decision Log 0145で追加した診断用ヘッダー(`X-Notebook-Env`)・
エンドポイント(`/api/debug/notebook-env`)を使い、実際のPreview
Version URLで実機確認したところ、次の結果になった。

- `GET /api/debug/notebook-env` → `{"environment":"preview"}`
  (正しい。`vars`はVersionごとに正しく切り替わっている)
- そのPreview Version URLから投稿した内容 → **Production D1に保存
  され、Preview D1には保存されなかった**(Cloudflare D1 Consoleで
  確認)

これは、Cloudflare Workersの「Versions」機能において、**`vars`
(環境変数)はVersionごとに切り替わるが、D1のようなresource
bindingはWorker本体に紐づき、`versions upload`によるVersion単位では
安全に分離できない**というプラットフォーム側の制約であると判断した。
`wrangler`のローカル設定解決(`unstable_readConfig`)や`--dry-run`が
正しいbindingを示していても、それは「アップロード時にwranglerが
送信する設定」を示すだけで、Cloudflare側のVersions機能が実際に
どのbindingを有効化するかを保証するものではなかった。

この制約を回避するため、**Preview用に物理的に別のWorker
`futo-site-preview`を用意する構成に変更した**。

```
futoing.com
  ↓
Worker: futo-site (Production)
  ├─ /api/notebooks/... → D1: futo-lab-notebooks-production
  └─ その他 → Workers Static Assets (Astroのdist/)

<preview-version>-futo-site-preview.<subdomain>.workers.dev
  ↓
Worker: futo-site-preview (Preview専用、Custom Domainなし)
  ├─ /api/notebooks/... → D1: futo-lab-notebooks-preview
  └─ その他 → Workers Static Assets (同じdist/)
```

同じ`worker/index.ts`・`dist/`を共有する、別々のWorkerとしてデプロイ
する。Astro本体は引き続き`output: "static"`のまま。

## 対応

`wrangler.toml`の`[env.preview]`を以下のように変更した。

```toml
[env.preview]
name = "futo-site-preview"   # ← "futo-site"から変更。物理的に別Worker
main = "worker/index.ts"
compatibility_date = "2024-09-13"

[env.preview.vars]
NOTEBOOK_ENV = "preview"

[env.preview.assets]
directory = "./dist"
binding = "ASSETS"
not_found_handling = "404-page"
run_worker_first = ["/api/*"]

[[env.preview.d1_databases]]
binding = "DB"
database_name = "futo-lab-notebooks-preview"
database_id = "cafcd1cf-9647-4b00-a2f2-c9b13ff4e9e8"  # 変更なし
```

`unstable_readConfig`で最終確認した結果は以下のとおり。

```
env未指定    → name: futo-site,         D1: futo-lab-notebooks-production
--env production → name: futo-site,         D1: futo-lab-notebooks-production
--env preview    → name: futo-site-preview, D1: futo-lab-notebooks-preview
```

`wrangler deploy --dry-run`(トップレベル/`--env production`/
`--env preview`)・`wrangler versions upload --env preview --dry-run`
のいずれも成功し、意図したWorker名・D1バインディングになることを
確認した。

トップレベル・`[env.production]`(既存Worker`futo-site`、Production
D1)は変更していない。Productionの`npx wrangler deploy`コマンドにも
変更はない。

### Preview Workerの事前作成が必要

`wrangler`のソース(`node_modules/wrangler/wrangler-dist/cli.js`)を
確認したところ、`wrangler versions upload`は**既存のWorkerにしか
バージョンを追加できない**。

```
"You cannot upload a new version of a Worker that does not yet exist.
Please run the `deploy` command first."
```

`futo-site-preview`はまだ一度もデプロイされていないWorkerのため、
Cloudflareダッシュボードの「Non-production branch deploy command」
(`npx wrangler versions upload --env preview`)をそのまま次のPreview
Buildで実行しても、上記エラーで失敗すると予想される。そのため、
**`futo-site-preview`を作成するための初回フルデプロイ
(`wrangler deploy --env preview`)を1回だけ行う必要がある**
(手順は下記「Cloudflareダッシュボードで必要な作業」参照)。

### Preview Worker用のsecretが別途必要

`futo-site-preview`はProductionの`futo-site`とは物理的に別の
Workerであり、Cloudflare上のsecretはWorkerごとに個別に管理される
(Workerを跨いで共有されない)。そのため、**`IP_HASH_SECRET`を
`futo-site-preview`にも個別に設定する必要がある**。設定しないまま
Preview環境で投稿すると、fail closed設計(Decision Log 0141・0142)
により500エラーになる(想定どおりの安全側の失敗であり、データ破損は
起きない)。

## Cloudflareダッシュボードで必要な作業

1. **`futo-site-preview`を初回だけフルデプロイで作成する。**
   最も簡単な方法は、Cloudflareダッシュボードの「Non-production
   branch deploy command」を一時的に
   ```
   npx wrangler deploy --env preview
   ```
   に変更してビルドを1回走らせ(このPRブランチへの新しいpushや、
   Preview Buildの再実行で発火する)、`futo-site-preview`が作成
   されたことを確認したら、コマンドを元の
   ```
   npx wrangler versions upload --env preview
   ```
   に戻す(以降のPreview Buildはこのコマンドのままでよい。既に
   Workerが存在するため、`versions upload`で正常にVersionを追加
   できる)。
   - ローカルに`wrangler login`済みの環境がある場合は、そちらから
     直接`npx wrangler deploy --env preview`を1回実行しても同じ
     結果になる(ダッシュボードのコマンド変更は不要)。
2. **`futo-site-preview`にCustom Domainを設定しない。** workers.dev
   のみで運用する(Cloudflareダッシュボードで新規Workerを作る際、
   Custom Domainを追加しなければ自動的にこの状態になる)。
3. **`futo-site-preview`にPreview用のD1バインディングが正しく反映
   されているか確認する。** `wrangler.toml`の`[env.preview.
   d1_databases]`により`futo-lab-notebooks-preview`がbindされる
   はずだが、初回デプロイ後にCloudflareダッシュボードの
   `futo-site-preview` → Settings → Bindings で、D1が
   `futo-lab-notebooks-preview`になっていることを目視確認する。
4. **`futo-site-preview`に`IP_HASH_SECRET`をsecretとして設定する。**
   `futo-site`(Production)のsecretとは別に、`futo-site-preview`
   専用の値を設定する必要がある(Productionと同じ値でも異なる値でも
   よいが、必ず設定すること。未設定のままだとfail closedで500になる)。
5. **Productionの`futo-site`側は一切変更不要。** Custom Domain
   (`futoing.com`)・Build/Deploy command・D1・secretのいずれも
   このDecisionによる影響を受けない。

## 診断コードの扱い

`GET /api/debug/notebook-env`は、Preview分離の実機確認が完了する
まで残す(プロジェクトオーナーの指示どおり)。今回、`futo-site`と
`futo-site-preview`が完全に別Workerになったため、以前のような
「同じWorkerの別Versionで何が起きているか分からない」という
状況そのものが原理的に解消される。実機で最終確認が取れ次第、この
エンドポイントは削除する(別のDecision Logまたはこの節への追記で
記録する)。

## 採用理由

Cloudflare Workers Versionsの「vars はVersionごとに切り替わるが
resource bindingは切り替わらない(または保証されない)」という
実機で確認された制約により、同一Worker上でPreview/Productionの
D1を安全に分離することはできないと判断した。物理的に別のWorkerに
することで、bindingの曖昧さが原理的に発生しない(それぞれのWorkerが
それぞれ1つのD1にしかbindされていない)構成にした。

## 他の案

- **同一Workerのまま、Cloudflareサポートに問い合わせて原因究明を
  待つ**: 実データを扱う機能であり、原因がプラットフォーム側の
  既知の制約である可能性が高い以上、サポート回答を待つ間もリスクを
  抱え続けることになる。確実に動作することが実証されている「別
  Worker」構成を優先した。
- **Preview機能自体を廃止し、Productionへの直接デプロイのみにする**:
  変更を本番に反映する前に動作確認する手段が失われ、「育てながら
  公開する」プロセス上のリスクが増すため見送った。

## 将来の変更可能性

- 将来、Cloudflare Workers Versionsのresource binding分離が
  仕様として保証されるようになった場合は、Decision Log 0144の方式
  (同一Worker)への回帰を検討してもよい。ただし現時点ではそれを
  裏付ける公式な保証がないため、別Worker方式を標準とする。
- Preview Worker(`futo-site-preview`)のD1にテストデータが蓄積
  されすぎた場合は、Preview D1のみを定期的にリセットする運用を
  検討する。

## Research Context

「ローカルでの設定解決が正しく見えても、実機で確認するまでは
分からない」という今回の一連の調査は、Decision Log 0143・0144で
繰り返し述べてきた「一次情報を確認してから直す」という姿勢を、
プラットフォームの暗黙の制約という、こちらのコードでは制御できない
領域にまで適用した結果である。訪問者の実データを扱う交換ノート
機能である以上、「動くはず」という推測ではなく「動くことを実機で
確認できた」構成だけを採用するという判断基準を、今回も一貫して
守った。
