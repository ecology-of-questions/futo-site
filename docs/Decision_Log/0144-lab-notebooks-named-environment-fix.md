# 0144. named environmentのWorker名自動サフィックスに対する修正(CLOUDFLARE_ENV設計の再修正)

- 日付: 2026-09-13
- 状態: 採用
- 関連: Decision Log 0143(この決定はDecision Log 0143の`wrangler.toml`
  環境分離設計の欠陥を修正する。Worker + Workers Static Assets + D1
  という実行基盤そのものの決定は変わらない)。

## Decision

Decision Log 0143で`wrangler.toml`に`[env.preview]`・
`[env.production]`を追加し、Cloudflareダッシュボード側で
`CLOUDFLARE_ENV=production` / `CLOUDFLARE_ENV=preview`を設定する
設計にした。マージ前レビューで、プロジェクトオーナーから次の懸念が
示された。

> Cloudflareの仕様では通常、`name = "futo-site"` に対して
> `[env.production]`・`[env.preview]`を定義すると、
> `futo-site-production` / `futo-site-preview` という**別のWorker**に
> なる。現在`futoing.com`のCustom Domainが付いているのは`futo-site`
> なので、Production設定が誤って`futo-site-production`という別の
> (存在しない)Workerを対象にしてしまわないか確認してほしい。

**この懸念は正しかった。** 実際に`wrangler`パッケージの設定解決関数
(`unstable_readConfig`)をローカルで直接呼び出して検証した。

```js
const wrangler = require("wrangler");
wrangler.unstable_readConfig({ env: "production" }).name;
// => "futo-site-production"  (Decision Log 0143時点のwrangler.tomlで検証)
```

Cloudflare Workersの`wrangler.toml`における named environment
(`[env.X]`)は、Pagesの「1つのプロジェクトの中のProduction/Preview」
とは仕組みが異なり、**`name`を明示的に指定しない限り、
トップレベルの`name`に`-X`を自動的に付加した、別のWorkerリソースを
対象にする**(「legacy environments」と呼ばれる、Wranglerの古くからの
挙動)。Decision Log 0143の`wrangler.toml`は`[env.production]`・
`[env.preview]`内で`main`・`compatibility_date`・`assets`は明示して
いたが、`name`を明示していなかったため、この自動サフィックスが
そのまま働いてしまっていた。

もしDecision Log 0143の設定のままCloudflareダッシュボードに
`CLOUDFLARE_ENV=production`を設定していたら、Production deployは
Custom Domainの付いていない別Worker`futo-site-production`を対象に
してしまい、**`futoing.com`は一切更新されなくなっていた**(サイレント
な事故になり得た)。今回、実際にCloudflareダッシュボードの設定を
変更する前にこの検証を行えたため、事故を未然に防げた。

## 対応

`wrangler.toml`の`[env.production]`・`[env.preview]`それぞれに
`name = "futo-site"`を明示し、トップレベルと同じWorkerを対象にする
ようにした。加えて、環境設計そのものも以下のように再構成した。

- **トップレベル(env未指定) = Production**。既存Worker`futo-site`と
  完全に一致させ、D1も`futo-lab-notebooks-production`を直接指定する。
  Workers BuildsのProduction deploy(`npx wrangler deploy`)は
  `--env`もCLOUDFLARE_ENVも指定しないため、この設定がそのまま使われる。
  **Production側のCloudflareダッシュボード設定は変更不要**になった
  (Decision Log 0143では「Production用ビルド設定に`CLOUDFLARE_ENV=
  production`を追加」としていたが、この指示は撤回する。追加しても
  `[env.production]`をトップレベルと同一内容にしたため実害は無いが、
  そもそも不要)。
- **`[env.production]`**: トップレベルと同一内容(`name`・D1とも)を
  明示的に複製した。仮に上記の撤回に気づかずCLOUDFLARE_ENV=
  productionを設定してしまっても、トップレベルと同じWorker・同じD1に
  解決されるための保険。
- **`[env.preview]`**: `name = "futo-site"`(同じWorker)、D1のみ
  `futo-lab-notebooks-preview`に差し替える。

```js
// 実際に検証した最終結果(すべて/home/user/futo-site/wrangler.tomlに対して)
wrangler.unstable_readConfig({ env: undefined }).name    // "futo-site"
wrangler.unstable_readConfig({ env: "production" }).name // "futo-site"
wrangler.unstable_readConfig({ env: "preview" }).name    // "futo-site"
// D1はそれぞれ futo-lab-notebooks-production / futo-lab-notebooks-production / futo-lab-notebooks-preview
```

`npx wrangler deploy --dry-run`・`--env production`・
`npx wrangler versions upload --env preview --dry-run`をローカルで
再実行し、いずれも意図したD1バインディングになることを確認した
(`--dry-run`のCLI出力にはWorker名が表示されないため、上記の
`unstable_readConfig`による直接検証を主たる確認手段にした)。

`wrangler dev`でのローカルE2E確認(GET/POST・即時反映・
notebook isolation・スパム対策等)も再実行し、引き続き問題ないことを
確認した。

## Cloudflareダッシュボードで必要な設定(Decision Log 0143からの変更点)

- **Production用ビルド設定に`CLOUDFLARE_ENV`を追加する必要は無くなった**
  (Decision Log 0143の指示を撤回。Production Deploy command
  (`npx wrangler deploy`)・Build commandとも変更不要)。
- **Preview用ビルド設定には、引き続き明示的な環境選択が必要**。
  以下のいずれかを行う(どちらも同じ`[env.preview]`に解決される)。
  - Preview用ビルド設定に環境変数 `CLOUDFLARE_ENV` = `preview` を追加、
    または
  - Preview/version deployコマンドを`npx wrangler versions upload
    --env preview`に変更する(コマンド自体に明示するため、環境変数の
    設定漏れより発見しやすいという利点がある)。
  どちらかを必ず行うこと。**これを行わない限り、Preview buildは
  トップレベル(= Production D1)を使ってしまう**(Decision Log 0143の
  「フェイルセーフ」設計は、トップレベルをローカル専用の無効な
  プレースホルダーにすることで実現していたが、今回トップレベルを
  Productionと一致させたため、その設計は使えなくなった。この
  トレードオフについては「他の案」を参照)。
- D1データベース作成・マイグレーション適用・`IP_HASH_SECRET`の設定
  手順自体はDecision Log 0143から変更無い(データベース名
  `futo-lab-notebooks-production` / `futo-lab-notebooks-preview`も
  変更していない)。

## 採用理由

プロジェクトオーナーの指摘どおり、Cloudflare Workersの
named environmentは「同じWorkerの中の複数設定」ではなく「デフォルトでは
別のWorkerになる」という仕様であり、これを見落としたままダッシュボード
設定を進めていたら、既存の本番Worker(Custom Domain付き)が
更新されなくなるという重大な事故につながっていた。`name`を明示的に
再宣言してトップレベルと同じWorkerに固定する対応は、Cloudflareの
公式な回避策(`wrangler.toml`のドキュメントが明示的に案内している
「envごとに`name`を明示すれば同じWorkerを維持できる」という方法)に
沿っている。

トップレベル=Productionという構成は、既存Worker`futo-site`が
これまで一度もnamed environmentを使わずに(トップレベル設定のみで)
運用されてきたという実績と完全に一致し、Production側のダッシュボード
設定を一切変更せずに済む(変更点を最小化し、事故のリスクをさらに
下げる)という点で、プロジェクトオーナーが提示した選択肢Aに合致する。

## 他の案

- **選択肢B: Preview用Workerを明示的に分ける
  (例: `futo-site-preview`という別Worker)**: 物理的に完全に別の
  Workerになるため、Preview buildが本番D1を使ってしまう可能性を
  構造的にゼロにできる。しかし、Workers Builds側の実際の
  Preview deployコマンドが`npx wrangler versions upload`である
  ことは、Cloudflareの「Versions」機能(同じWorkerの新しいバージョンを
  作り、プレビューURLで確認する仕組み)を前提にしていることを示唆
  しており、別Workerに分けると、この「同じWorkerのバージョン
  プレビュー」という体験と噛み合わなくなる(新しいWorkerには
  Versions履歴が無く、プレビュー用URLの仕組みも異なる)。加えて、
  別Workerの新規作成はCloudflareダッシュボード側の追加作業も増える。
  「既存Workerをそのまま使う」という指示にも合致しないため、今回は
  選択肢Aを採用した。
- **トップレベルを「ローカル専用の無効なプレースホルダー」のままにし、
  Production/Previewの両方をnamed environmentにする
  (Decision Log 0143の設計)**: `name`を明示すれば動作はするが、
  「トップレベル(env未指定)で操作した場合に何も壊れない」という
  フェイルセーフ性と、「トップレベル=既存Workerとの一致」という
  シンプルさを両立できない。プロジェクトオーナーが明確に「最も単純で
  公式仕様に沿う構成」を求めたため、シンプルさを優先し、
  トップレベル=Productionとした。

## 将来の変更可能性

トップレベル=Productionとしたことで、「Preview側の環境変数
設定漏れがあると、そのビルドは本番D1を使ってしまう」というリスクが
構造的に残る(このDecision内で明記した)。将来、誤操作が実際に
発生した場合、または投稿量が増えて誤りの影響が無視できなくなった
場合は、選択肢B(Preview専用の別Worker)への切り替えを再検討する。

## Research Context

一次情報(プロジェクトオーナーによる「Cloudflareの仕様上、別Workerに
なるのでは」という指摘)を鵜呑みにせず、`wrangler`パッケージの実際の
設定解決コードを直接呼び出して検証したことで、推測ではなく実証に
基づいて設計を修正できた。これは、CLAUDE.mdの「常に成長を最適化する」
姿勢と、Decision Log 0143で書いた「一次情報を確認してから直す」という
教訓を、今回さらに一段階徹底させたものである。ダッシュボードを
実際に変更する前に机上と実測の両方で確認する、という慎重さは、
「訪問者の実データを預かる」という交換ノート機能の性質上、
特に重要だと考える。
