# 0147. futo-site-previewの初回D1 binding不一致の原因調査と最終確認

- 日付: 2026-09-14
- 状態: 採用
- 関連: Decision Log 0143〜0146(この決定はDecision Log 0146で導入した
  Preview専用Worker`futo-site-preview`の、初回セットアップ時に発生した
  binding不一致の原因調査と、実機での最終確認の記録。D1 schema・API
  仕様・Worker分離という設計自体は変わらない)

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

### 最も有力な仮説(未確定)

コード側(wrangler.toml・wrangler CLIのロジック)に原因を特定する
証拠は見つからなかった。最も可能性が高いと考えているのは、
Cloudflareダッシュボードの「Connect to Git」で`futo-site-preview`を
新規作成した際、Cloudflare側がwrangler.tomlを静的に解析して
(`--env`を評価せず、`d1_databases`の先頭またはトップレベルの
エントリを機械的に採用して)Bindingsを自動設定した、というもので
ある。その後の`wrangler deploy --env preview`が、既にbind済みの
`DB`という名前のresourceを、config上の値へ強制的に上書き・
是正しなかった(または、その是正が何らかの理由で行われなかった)
ため、誤ったbindingがそのまま残ったと推測している。この仮説は、
Cloudflare側のプロジェクト作成・binding管理の内部動作に関する
ものであり、外部からwrangler CLIのソースコードだけで完全に
実証することはできなかった。

### 実機での最終確認(解決)

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

1. **wrangler.tomlは変更していない**(既に正しく`[env.preview]`が
   `futo-lab-notebooks-preview`を指しており、修正すべきコード上の
   誤りが見つからなかったため)。
2. **診断用エンドポイント`GET /api/debug/notebook-env`を削除した**
   (`worker/index.ts`)。実機でのPreview/Production分離が確認できた
   ため、指示どおり削除する。`X-Notebook-Env`レスポンスヘッダー
   (Decision Log 0145)は、secretを含まない軽量な確認手段として
   引き続き残す。
3. **この修正コミットをpushし、`futo-site-preview`向けのPreview
   Buildを1回実行して`success`になることを確認した**(下記
   「build・astro check結果」参照)。これは、Bindingsが手動修正
   後の状態のまま`wrangler deploy --env preview`を再実行しても
   崩れない(＝正しいbinding設定が上書きされて元に戻らない)ことを
   確認する、最も直接的なテストを兼ねている。

## Cloudflareダッシュボードで最終確認いただきたい項目

1. 今回のPush後のWorkers Build(`futo-site-preview`)が`success`に
   なること。
2. Build完了後、`futo-site-preview` → Settings → Bindings を
   再度開き、`DB`が**`futo-lab-notebooks-preview`のまま**である
   こと(＝手動修正がこのデプロイで元に戻っていないこと)。これが
   崩れていた場合は、Cloudflare側で毎回binding が上書きされる
   根深い問題があることになるため、Cloudflareサポートへの確認を
   推奨する。
3. `futo-site-preview`のCustom Domainが引き続き未設定(workers.dev
   のみ)であること。
4. Production側(`futo-site`)のBindingsが`futo-lab-notebooks-
   production`のままで、今回の一連の作業による影響を受けていない
   こと。

## build・astro check結果

- `npx astro check`: 0 errors, 0 warnings, 1 hint(既存の無関係な
  hint)
- `npm run build`: 0エラー、15ページ生成

## 採用理由

コード側に具体的な誤りが見つからない以上、無根拠な「それらしい」
修正を加えるのではなく、事実として確認できたこと(wrangler.tomlは
一貫して正しい、CLIのCI関連変数はbindingに影響しない)と、確認
できなかったこと(実際のCI実行ログ、Cloudflare内部のbinding管理
挙動)を明確に分けて記録することを優先した。実機確認によって
「Worker分離という設計自体は機能する」ことが証明された以上、
今回の実害は「一度きりの初期設定ミス」であり、それを手動で正し、
再デプロイでも崩れないことを確認するというプロセスが、最も確実な
解決だと判断した。

## 他の案

- **binding名を環境ごとに変える(例: 本番`DB`、preview`DB_PREVIEW`)**:
  Cloudflare側の「既存bindingの上書き判定」がbinding名をキーにして
  いる可能性を考慮した代替案として検討したが、`worker/index.ts`の
  コードが環境を意識せず`env.DB`で統一できているという設計上の
  利点(Decision Log 0141以来の方針)を壊すため、まずは binding名を
  変えずに実機再現確認を優先し、それでも再発する場合の次善策として
  保留した。
- **Cloudflareサポートへ即座に問い合わせる**: 実機確認で「Worker
  分離後は正しく動く」ことが先に確認できたため、まずは再デプロイでの
  再現確認を優先し、問題が再発した場合にのみサポート問い合わせに
  進む方針とした。

## 将来の変更可能性

もし今回のpush後のデプロイでbindingが再びproduction D1に戻る
ことが確認された場合は、binding名を環境ごとに分ける案、または
Cloudflareサポートへの問い合わせを行う。再発しない場合は、この
節をもって本件は解決したものとして扱う。

## Research Context

「原因が完全には特定できなくても、実機で機能することを確認できた
構成を採用し、その構成が壊れていないことを継続的に検証できる状態を
保つ」という今回の締め方は、Decision Log 0143〜0146を通じて繰り返し
述べてきた「一次情報を確認してから直す」姿勢の到達点である。すべての
原因を完全に解明できないことも、実務上はあり得る。そのときに
「わからないことをわからないと明記した上で、再現性のある確認手段
(手動修正→再デプロイ→再確認)を残す」ことが、訪問者の実データを
扱う機能の信頼性を保つ上で重要だと考える。
