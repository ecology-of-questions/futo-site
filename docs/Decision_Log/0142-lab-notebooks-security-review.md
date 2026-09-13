# 0142. 実験室ノート永続化のセキュリティレビュー反映(IPハッシュのHMAC化・Preview/Production D1分離)

- 日付: 2026-09-13
- 状態: 採用
- 関連: Decision Log 0141(この決定はDecision Log 0141の実装内容の一部を更新する)

## Decision

Decision Log 0141で実装したCloudflare Pages Functions + D1による
実験室ノートの永続化について、プロジェクトオーナーから本番設定に進む
前のレビューとして、以下2点の指摘を受けた。

1. `ip_hash`が単純なSHA-256ハッシュだった。IPv4アドレス空間は
   約43億通りしかなく、鍵の無いハッシュは総当たりで元のIPへ復元
   されうる。連投判定専用のサーバー側secretを加えたHMAC等に変更し、
   secretはCloudflare PagesのSecretとして設定し、クライアントには
   一切露出させないこと。
2. Cloudflare PagesのPreview環境とProduction環境でD1を分離できる
   構成にすること。PR PreviewからProductionの交換ノートDBへ
   書き込まれないようにする。

両方とも実装した。

## 対応

### 1. `ip_hash`をHMAC-SHA256化

`functions/api/notebooks/[slug]/entries.ts`の`hashIp()`を、鍵無しの
`crypto.subtle.digest("SHA-256", ...)`から、`IP_HASH_SECRET`という
Cloudflare Pages Secretを鍵にした`crypto.subtle.sign("HMAC", key, ...)`
(HMAC-SHA256)に変更した。

```ts
async function hashIp(ip: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(ip));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
```

`IP_HASH_SECRET`が未設定の場合、弱いハッシュへフォールバックせず
`500 { error: "server misconfigured" }`を返す(fail closed)。生の
IPアドレスはこれまでどおりDBに保存しない(`ip_hash`列のみ保存)。

ローカル開発では、`wrangler pages dev`が自動的に読み込む`.dev.vars`
(コミット対象外、`.gitignore`に追加)にローカル専用の値を置く。
ひな形として`.dev.vars.example`をコミットした。

### 2. Preview/Production D1の分離

`wrangler.toml`に`[env.preview.d1_databases]`・
`[env.production.d1_databases]`をそれぞれ追加し、Preview用
(`futo-lab-notebooks-preview`)とProduction用
(`futo-lab-notebooks-production`)の**別々のD1データベース**を
指定する構成にした。トップレベルの`[[d1_databases]]`
(`futo-lab-notebooks`)はローカル開発専用で、Cloudflare本番の
Preview/Productionには影響しない。いずれもbinding名は`DB`で統一して
いるため、`functions/api/notebooks/[slug]/entries.ts`側のコード変更は
不要(`context.env.DB`のまま)。

`package.json`のマイグレーションスクリプトも分離した。

```json
"d1:migrate:local": "wrangler d1 execute futo-lab-notebooks --local --file=./migrations/0001_init.sql",
"d1:migrate:preview": "wrangler d1 execute futo-lab-notebooks-preview --remote --file=./migrations/0001_init.sql",
"d1:migrate:production": "wrangler d1 execute futo-lab-notebooks-production --remote --file=./migrations/0001_init.sql"
```

## Cloudflare本番側で必要な手動設定(更新版)

Decision Log 0141に記載した手順を、Preview/Production分離と
IP_HASH_SECRETを反映して更新する。

1. **D1データベースを2つ作成する**(Preview用・Production用を別々に)。
   ```bash
   npx wrangler d1 create futo-lab-notebooks-preview
   npx wrangler d1 create futo-lab-notebooks-production
   ```
   それぞれ発行された`database_id`を控える。
2. **`wrangler.toml`の該当`database_id`を実際の値に置き換える**
   (`[env.preview.d1_databases]`・`[env.production.d1_databases]`の
   それぞれ)。
3. **マイグレーションを両方の環境に適用する**:
   ```bash
   npm run d1:migrate:preview
   npm run d1:migrate:production
   ```
4. **Cloudflareダッシュボードで、Pagesプロジェクトの環境ごとの
   バインディング・secretを確認・設定する**(Workers & Pages →
   対象プロジェクト → Settings → Functions)。
   - `wrangler.toml`の`env.preview`/`env.production`セクションに
     よるD1バインディングの反映は、Cloudflareのgit連携ビルド時に
     自動的に読み込まれることを想定しているが、**初回デプロイ後に
     必ずダッシュボードのD1 database bindings欄で、Production・
     Previewそれぞれに正しいD1(上記で作成した別々のデータベース)が
     割り当てられていることを目視確認すること**。反映されていない
     場合は、ダッシュボード側で直接バインディングを設定する
     (Production用の設定画面とPreview用の設定画面は別タブに分かれて
     いる)。
   - **`IP_HASH_SECRET`をSecretとして、Production・Preview両方に
     別々に設定する**(Settings → Environment variables →
     該当環境のタブ → Add variable → 種別を"Secret"にする)。
     Production用とPreview用で異なる値にすることを推奨する
     (Preview側の値が漏れても本番の連投判定ロジックへ影響しないため)。
     クライアントコードにこの値を埋め込むことは絶対にしない。
   - secretはダッシュボードでの設定を基本とする。`wrangler pages
     secret put`コマンドも存在するが、Preview/Productionを分けて
     設定できるかはコマンド単体の挙動として確認できていないため、
     今回はダッシュボードでの設定を確実な方法として案内する。
5. ローカル開発時は、`.dev.vars.example`を`.dev.vars`としてコピーし、
   任意のローカル専用値を設定する(`.dev.vars`はコミットしない)。

## 採用理由

HMAC化は、指摘のとおりIPv4アドレス空間の小ささ(約43億通り)により
鍵無しハッシュが実質的に可逆(総当たりで復元可能)であるという、
妥当なセキュリティ上の懸念に対応するもの。secretをCloudflare Pagesの
Secretとして管理し、コードに埋め込まない・クライアントに露出させない
という制約は、このプロジェクトの「管理用secretをクライアントコードへ
埋め込むことは禁止」という既存方針(Decision Log 0141)とも一貫する。

Preview/Production D1分離は、CI/PRプレビューが本番データを汚染しない
ようにするという一般的なベストプラクティスであり、「実験室ノート」が
訪問者の実データを保持する以上、PRごとに作られるPreviewデプロイが
誤って本番の交換ノートへ書き込む・本番データをPreview上で誰でも見れて
しまう、という事故を避ける必要がある。binding名を"DB"に統一する
ことで、Functionsのコードは環境を意識せず、Cloudflare側の設定だけで
向き先を切り替えられるようにした。

## 他の案

- **secretをwrangler.tomlに直接書く**: `wrangler.toml`はリポジトリに
  コミットされるため、secretを平文で書くことはできない。Cloudflare
  Pages Secret機能(ダッシュボードまたは`wrangler pages secret put`)
  で環境ごとに管理する方式を採用した。
- **Preview/Productionで同じD1を共有し、`notebook_slug`に環境接尾辞を
  付けて論理的に分離する**: 同じデータベースを共有する以上、
  Preview環境のコードに何らかの不具合があった場合に本番データへ
  誤って影響する可能性が残るため見送った。物理的に別のD1データベースに
  分離する方が確実であり、追加コストもD1データベースをもう1つ作成
  するだけで小さい。

## 将来の変更可能性

- Cloudflareダッシュボードの仕様変更等で、Pages Secretの環境別設定
  方法が変わった場合は、この手順を更新する。
- IP_HASH_SECRETをローテーションする場合、過去に保存済みの`ip_hash`は
  新しいsecretでは再現できなくなる(連投判定の対象外になるだけで、
  既存の`entries`データ自体には影響しない)。ローテーションは
  「連投判定の履歴が一度リセットされる」程度の影響と理解した上で
  行う。

## Research Context

「交換ノート」という体験を安全に運用し続けるためには、投稿者を
特定できる情報を残さないことと、荒らし・スパムへの最低限の耐性を
両立させる必要がある。今回のHMAC化は、後者(スパム耐性)のために
保存する`ip_hash`が、前者(個人の特定不可能性)を弱めてしまわないよう
にする調整であり、「最小限の情報から、必要な機能だけを組み立てる」
というプロジェクトの姿勢に沿っている。Preview/Production分離も同様に、
「育てながら公開する」プロセス(PRでの確認作業)が、公開中の研究室の
実データに影響を与えないようにするための境界線引きである。
