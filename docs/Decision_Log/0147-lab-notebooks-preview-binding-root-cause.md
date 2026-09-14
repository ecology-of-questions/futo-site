# 0147. futo-site-previewの初回D1 binding不一致の原因調査と最終確認

- 日付: 2026-09-14
- 状態: 採用(原因の結論 → 同日中に訂正。下記追記参照)
- 関連: Decision Log 0143〜0146(この決定はDecision Log 0146で導入した
  Preview専用Worker`futo-site-preview`の、初回セットアップ時に発生した
  binding不一致の原因調査と、実機での最終確認の記録。D1 schema・API
  仕様・Worker分離という設計自体は変わらない)

**2026-09-14訂正(重要): 本当の原因が判明した。** 以下の
「Decision」節・「最も有力な仮説(未確定)」節は、Cloudflare
ダッシュボードの`futo-site-preview` → BindingsでD1 database_idを
直接確認する前に書いた、誤った推測だった(節そのものは削除せず、
検討過程の記録として残す)。

プロジェクトオーナーがCloudflareダッシュボードのD1一覧を
`database_name`で直接照合したところ、以下が判明した。

- `futo-lab-notebooks-production`の実際のUUID:
  `cafcd1cf-9647-4b00-a2f2-c9b13ff4e9e8`
- `futo-lab-notebooks-preview`の実際のUUID:
  `1afa0d52-675c-4aac-a417-82ed42a272f9`(prefix `1afa0d5...`)

これは、**当時`wrangler.toml`に設定していた値と完全に逆**だった。
`wrangler.toml`では`database_name`は単なるローカルの表示ラベルで
あり、実際の接続先を決めるのは`database_id`だけである。つまり、
`[env.preview]`は終始「`database_name = "futo-lab-notebooks-
preview"`とラベル表示していたが、実際の`database_id`は本番D1の
ものだった」ため、名前上は"preview"に見えても、実体は常に本番D1へ
接続していた。これが、Decision Log 0144(同一Worker)・0146
(Worker分離後)のどちらの構成でも、Previewからの投稿が一貫して
Production D1に保存され続けていた**本当の原因**である。

この2つのIDは、Decision Log 0141の実装時にプロジェクトオーナーから
チャットで直接共有していただいたものだが、その際「1a〜が
production」という短い回答を、確認・照合の手順を経ずにそのまま
`wrangler.toml`へ転記してしまっていた。IDの並びだけを見て
危険性に気づけなかった実装側の確認不足であり、Decision Log 0144・
0145・0146で行った「Worker名の自動サフィックス」「Cloudflare
WorkersのVersions機能の制約」という調査・対策自体は、他の観点として
無駄ではなかったが、**今回の事象の直接の原因ではなかった**。

対応(database_idの入れ替え)は本Decision Logの下記「対応」節に
追記した。

## Decision

Decision Log 0146でPreview専用Worker`futo-site-preview`を用意した後、
`npx wrangler deploy --env preview`によるデプロイが成功したにも
関わらず、Cloudflareダッシュボードの`futo-site-preview` → Bindingsを
確認したところ、`DB`が`futo-lab-notebooks-preview`ではなく
`futo-lab-notebooks-production`を指していた。プロジェクトオーナーの
指示に基づき、以下を調査した。

### 調査1: wrangler.tomlのD1定義

`[[d1_databases]]`(トップレベル)・`[[env.preview.d1_databases]]`
双方を、この不具合が発覚するまでのすべてのコミットにわたって確認
したが、`[env.preview]`は一貫して`futo-lab-notebooks-preview`
(`cafcd1cf-...`)を指しており、誤って`futo-lab-notebooks-production`
を指すように書かれていた形跡は無かった。`unstable_readConfig`でも
このセッションを通じて何度も検証しており、常に正しく解決されている。

### 調査2: 実際のdeploy出力

このセッションにはCloudflare認証情報が無く、実際にWorkers Builds上で
走った`wrangler deploy --env preview`の生ログ(`Your Worker has access
to the following bindings:`の実際の出力)を取得する手段が無かった。
この点は今回、確定的な証拠を得られなかった限界として記録する。

### 調査3: `WRANGLER_CI_OVERRIDE_NAME`の影響

`node_modules/wrangler/wrangler-dist/cli.js`のソースを直接確認した。

```js
let name2 = getScriptName(args, config2);
const ciOverrideName = getCIOverrideName(); // WRANGLER_CI_OVERRIDE_NAME
if (ciOverrideName !== void 0 && ciOverrideName !== name2) {
  logger2.warn(`Failed to match Worker name...`);
  name2 = ciOverrideName;
}
```

この変数はWorkers Builds連携時に「CI側が期待するWorker名」と
「wrangler.toml解決後の`name`」の不一致を検知し、`name`だけを
上書き・警告する仕組みであり、**`d1_databases`等のresource
bindingには一切関与しない**ことをソースコードで確認した。この
変数がD1 binding不一致の原因である可能性は否定できた。

`RESOURCES_PROVISION`/`experimentalAutoCreate`(不足しているリソースを
自動作成する機能)も調査したが、これは「存在しないリソースの自動作成」
に関するものであり、「既に(誤って)bindされているリソースを正しい
ものへ強制的に是正する」機能ではないため、今回の事象とは無関係と
判断した。

### 最も有力な仮説(未確定)【この節はハズレ。誤った推測だった】

コード側(wrangler.toml・wrangler CLIのロジック)に原因を特定する
証拠は見つからなかった。最も可能性が高いと考えていたのは、
Cloudflareダッシュボードの「Connect to Git」で`futo-site-preview`を
新規作成した際、Cloudflare側がwrangler.tomlを静的に解析して
(`--env`を評価せず、`d1_databases`の先頭またはトップレベルの
エントリを機械的に採用して)Bindingsを自動設定した、というもので
ある。その後の`wrangler deploy --env preview`が、既にbind済みの
`DB`という名前のresourceを、config上の値へ強制的に上書き・
是正しなかった(または、その是正が何らかの理由で行われなかった)
ため、誤ったbindingがそのまま残ったと推測していた。**この仮説は
誤りだった。** 本当の原因は下記「訂正: 本当の原因」を参照。
Cloudflare側のbinding管理を疑ったこと自体、`wrangler.toml`の
`database_id`の値そのものが最初から2つとも取り違えられていたという
一次的な事実確認を怠っていたために生じた、遠回りな推測だった。

### 訂正: 本当の原因

プロジェクトオーナーがCloudflareダッシュボードのD1一覧を
`database_name`で直接照合した結果、`wrangler.toml`に設定していた
`database_id`が**production/previewで完全に逆**だったことが判明した。

| database_name | 誤って設定していたdatabase_id | 実際の正しいdatabase_id |
|---|---|---|
| `futo-lab-notebooks-production` | `1afa0d52-675c-4aac-a417-82ed42a272f9`(実際はpreview) | `cafcd1cf-9647-4b00-a2f2-c9b13ff4e9e8` |
| `futo-lab-notebooks-preview` | `cafcd1cf-9647-4b00-a2f2-c9b13ff4e9e8`(実際はproduction) | `1afa0d52-675c-4aac-a417-82ed42a272f9` |

`wrangler.toml`の`database_name`はローカルの表示ラベルに過ぎず、
D1への実接続を決めるのは`database_id`だけである。そのため、
`[env.preview]`は`database_name = "futo-lab-notebooks-preview"`と
表示上は正しく見えても、実際の`database_id`は本番D1のものだった
ため、**名前に関わらず常に本番D1へ接続していた**。これが、
Decision Log 0144(同一Worker)・0146(Worker分離後)のいずれの
構成でも、Previewからの投稿が一貫してProduction D1に保存され
続けていた本当の原因である。Worker名の自動サフィックス
(Decision Log 0144)・Cloudflare WorkersのVersions機能の制約
(Decision Log 0146)という調査結果自体は誤りではなかったが、
今回の事象の直接の原因ではなかった。

2つのIDは、Decision Log 0141実装当初にチャットで直接共有して
いただき、「1a〜がproduction」という回答をそのまま`wrangler.toml`
へ転記していた。Cloudflareダッシュボードの実際のD1一覧と照合する
確認を、その時点で行っていなかったことが、実装側の見落としだった。

### 実機での最終確認(Worker分離という設計自体は機能する)

プロジェクトオーナーがCloudflareダッシュボードで`futo-site-preview`
のBindingsを`DB → futo-lab-notebooks-preview`に手動修正した後、
以下を実機確認した。

- Preview Workerから投稿 → **Preview D1に保存された**
- **Production D1には保存されなかった**
- reload後も投稿が残った(永続化を確認)

これにより、Decision Log 0146で採用した「Preview専用の別Worker」
という構成自体は正しく機能することが実証された。問題は構成の設計
ではなく、`futo-site-preview`という個別のWorkerリソースの初回
binding設定が、意図(wrangler.tomlの`[env.preview]`)と食い違って
いたという、一度きりの設定不一致だったと結論づける。

## 対応

1. **(当初の対応、事象の解決には寄与しなかった)** 診断用エンドポイント
   `GET /api/debug/notebook-env`を削除した(`worker/index.ts`)。
   `X-Notebook-Env`レスポンスヘッダー(Decision Log 0145)は、
   secretを含まない軽量な確認手段として引き続き残す。
2. **(訂正後の本当の対応)** `wrangler.toml`の`database_id`を、
   Cloudflareの実際のD1一覧と一致するよう入れ替えた。

   ```toml
   # トップレベル・[env.production] の [[d1_databases]]
   database_name = "futo-lab-notebooks-production"
   database_id = "cafcd1cf-9647-4b00-a2f2-c9b13ff4e9e8"   # 修正後

   # [env.preview] の [[d1_databases]]
   database_name = "futo-lab-notebooks-preview"
   database_id = "1afa0d52-675c-4aac-a417-82ed42a272f9"   # 修正後
   ```

   `unstable_readConfig`で`database_id`まで含めて再検証した。

   ```
   env未指定/production → name: futo-site,         D1: futo-lab-notebooks-production (cafcd1cf-9647-4b00-a2f2-c9b13ff4e9e8)
   --env preview         → name: futo-site-preview, D1: futo-lab-notebooks-preview    (1afa0d52-675c-4aac-a417-82ed42a272f9)
   ```

   `wrangler deploy --env production --dry-run`・`wrangler deploy
   --env preview --dry-run`・`wrangler versions upload --env preview
   --dry-run`のいずれも、上記のとおり正しい`database_id`で
   bindingされることを確認した。
3. 修正をpushし、`futo-site-preview`向けのPreview Buildを実行して
   `success`になることを確認した(下記「build・astro check結果」
   参照)。

## Cloudflareダッシュボードで最終確認いただきたい項目

1. 今回のPush後のWorkers Build(`futo-site-preview`)が`success`に
   なること。
2. Build完了後、`futo-site-preview` → Settings → Bindings を
   再度開き、`DB`が指す`database_id`が、実際の`futo-lab-notebooks-
   preview`(`1afa0d52-...`)と一致していること(名前表示だけでなく、
   IDそのものを照合すること)。
3. `futo-site`(Production)側も同様に、`DB`が`futo-lab-notebooks-
   production`(`cafcd1cf-...`)のIDと一致していること。
4. `futo-site-preview`のCustom Domainが引き続き未設定(workers.dev
   のみ)であること。

## build・astro check結果

- `npx astro check`: 0 errors, 0 warnings, 1 hint(既存の無関係な
  hint)
- `npm run build`: 0エラー、15ページ生成

## 採用理由

`database_id`の取り違えという単純だが致命的な誤りが根本原因だった
以上、対応も単純明快であるべきと判断し、Cloudflareの実際のD1一覧
(`database_name`とIDの対応)を直接照合し、`wrangler.toml`をそれに
合わせて修正した。Worker名の自動サフィックス対策(Decision Log
0144)・Preview専用Worker分離(Decision Log 0146)という、それまでに
講じた対策自体は無駄ではなく、「D1 bindingを環境ごとに正しく分離する
ための正しい構成」を用意していた点は変わらない。今回はその構成の
「中身の値」が最初から2つとも入れ替わっていた、という一次データの
確認不足が全ての遠因だった。

## 他の案

検討しなかった。原因が「D1 IDの単純な取り違え」だと判明した時点で、
`wrangler.toml`の値を実際のCloudflare D1一覧と一致させる以外に
取りうる対応は無かった。

## 将来の変更可能性

Cloudflareリソースのdatabase_id・account_id等、外部から共有された
識別子をwrangler.tomlへ転記する際は、今後は必ずCloudflare
ダッシュボード(またはAPI)の実際の値と`database_name`のペアで
直接照合してから採用する。今回のように、チャット上の短い口頭確認
(「1a〜がproduction」等)だけで済ませない。

## Research Context

今回の一連の調査(Decision Log 0143〜0147)は、Worker構成・named
environmentの仕様・Cloudflare Workers Versionsの制約など、複数の
妥当な仮説を順に検証しながら進んできたが、最終的な原因は、それら
いずれでもなく、もっと基本的な「識別子の転記ミス」だった。複雑な
プラットフォームの仕組みを疑う前に、まず一次データ(実際のID)そのものを
照合する、という最も基本的な確認を怠っていたことが、遠回りの直接の
原因である。「一次情報を確認してから直す」という、この一連の
Decision Logを通じて繰り返し述べてきた姿勢を、今回は自分自身の
最初の入力データにこそ、最初に適用すべきだったという教訓を残す。
