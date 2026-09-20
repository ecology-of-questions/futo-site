# 0189 — 本人限定の公開API(認証・認可・楽観的ロック・本棚への即時反映)

## Decision
Decision Log 0187でStage 3(サーバー側認証付き公開API)として設計のみ記録していたものを実装した。プロジェクトオーナーから「公開プレビュー→公開→本棚への反映→更新→取り下げまでが対象。本番環境へアクセスできなくても、認証・認可・API・DB migrationのコードとローカル検証は進めてください。必要なCloudflare設定を具体的に提示し、実環境への適用は保留してください。手動でコードへ転記する運用を完成形にしないでください」という指示を受け、以下のとおり実装・ローカル検証した。**実際のCloudflare本番/PreviewへのDB migration適用・secret設定は行っていない**(このサンドボックスにはCloudflareの認証情報が無く、本人の判断・実行が必要なため)。

## 実装したこと

### 1. D1スキーマ(`migrations/0002_reading_notes.sql`)
既存の交換ノート用D1データベース(`futo-lab-notebooks-production`/`-preview`)に、新しいテーブルを追加する形にした(新しいD1データベースリソースは作らない、Cloudflare側の追加設定を最小限にするため)。
- `reading_notes`: 公開読書メモ本体。`status`(`published`/`retracted`)による論理削除、`published_at`(表示用日付)と`created_at`/`updated_at`(操作の実時刻、楽観的ロックに使用)を分けて持つ。
- `admin_login_attempts`: ログイン試行のレート制限用(entriesテーブルの`ip_hash`と同じ考え方、生IPは保存しない)。

### 2. Cloudflare Worker API(`worker/index.ts`)
- `GET /api/reading-notes?bookId=`: 認証不要、公開。`status='published'`のみ返す。
- `POST /api/admin/login`: パスワード認証。secretが揃っていなければ500(fail closed、`IP_HASH_SECRET`と同じ方針)。成功時、署名付きHttpOnly Cookie(`futo_admin_session`、`Secure`・`SameSite=Strict`)を発行する。**サーバー側にセッションテーブルを持たないステートレス設計**——CookieのペイロードにCSRFトークンと有効期限を含め、HMAC-SHA256で署名する(JWTに近いが、この用途のためだけの最小実装で外部ライブラリは使っていない)。
- `GET /api/admin/session`: 有効なセッションCookieがあれば、パスワード再入力なしにCSRFトークンを復元する(ページ再読み込み後の体験のため)。
- `POST /api/admin/logout`: Cookieを失効させる。
- `POST /api/reading-notes` / `PUT /api/reading-notes/:id` / `DELETE /api/reading-notes/:id`(取り下げ、論理削除): 認証(セッションCookie)+CSRFトークン(`X-CSRF-Token`ヘッダとCookie内の値を照合)の両方を要求する。PUT/DELETEは`expectedUpdatedAt`による楽観的ロック——現在のDB上の`updated_at`と一致しない場合は409を返す(複数タブ・複数端末での同時編集事故を防ぐ)。
- パスワード自体は保存せず、`SHA-256(password:pepper)`のハッシュ(`ADMIN_PASSWORD_HASH`)とpepper(`ADMIN_PASSWORD_PEPPER`)を別々のsecretとして保存する。`scripts/hash-admin-password.mjs`(`npm run admin:hash-password`)で対話的に計算する。

### 3. クライアント側(`src/lib/fieldnote/publishApi.ts`・`src/lib/fieldnote/app.ts`)
`/fieldnote/`の公開プレビュー画面(`view-publish`)に、本人限定のログイン・公開・更新・取り下げのUIを追加した。
- 未ログイン時: パスワード入力+ログインボタン。
- ログイン時: 「この内容を公開する」(新規公開)、その本の既存の公開メモ一覧(それぞれに「この内容で更新する」「取り下げる」)、ログアウト。
- **サーバー側が未配線(secret未設定・APIに到達できない)の場合はエラーメッセージを表示し、既存の「この内容をコピーする」(手動反映)へ誘導する**。これはフォールバックであり、最終形ではない——正常に配線されていれば、コピー&ペーストを一切経由せずに公開・更新・取り下げが完結する。

### 4. 本棚への即時反映(`src/lib/bookshelf/publicNotesClient.ts`・`BookshelfShelf.astro`)
`/bookshelf`はビルド時に`src/data/publicReadingNotes.ts`(静的・手動キュレーション)を描画する既存の仕組みに加え、実行時に`GET /api/reading-notes?bookId=`を呼ぶクライアントスクリプトを追加した。Fieldnoteで「公開する」を押した内容は、**再ビルド・再デプロイなしで**`/bookshelf`に反映される。APIに到達できない場合は何もしない(静的キュレーション分だけがそのまま表示され続ける、エラー文言は出さない)。

## ローカル検証(実施済み)
このサンドボックスから本番Cloudflareへはアクセスできないが、`wrangler dev --local`(Cloudflareアカウント不要、ローカルのMiniflare実行環境+ローカルD1)で実際に動かして検証した。

- `npx wrangler d1 execute futo-lab-notebooks-production --local --file=./migrations/0002_reading_notes.sql`: migration成功。
- `.dev.vars`にローカル専用の秘密値を設定し、`wrangler dev --local`を起動。
- curlで一連のAPIを直接検証: ログイン成功/失敗、CSRFトークン欠如時の403、公開(201)、公開直後のGETへの反映、楽観的ロック(古い`expectedUpdatedAt`での409、正しい値での200)、取り下げ後のGETからの消失、未認証での書き込み試行の401、ログイン試行のレート制限(5回で429)、**secret未設定時のログインの500(fail closed)を実際に確認**(`ADMIN_SESSION_SECRET`を意図的に外して再起動し、500が返ることを確認、その後secretを戻した)。
- Playwrightで、実際の`/fieldnote/`画面(ログイン→公開→更新→取り下げ→ログアウト)と`/bookshelf/`画面を、`wrangler dev --local`が配信する実物のAPI+静的アセットに対して操作し、17項目すべてPASS。特に「Fieldnoteで公開した内容が、再ビルドなしで`/bookshelf`に実際に表示される」ことを確認した(スクリーンショット参照)。
- セッション復元(ページ再読み込み後、パスワード再入力なしでCSRFトークンが復元されること)を別途3項目で確認、全件PASS。
- `npx astro check` / `npx tsc --noEmit`(`worker/index.ts`は独自に`--lib dom`指定で構文検証、既存の`tsconfig.json`のexclude対象は変更していない) / `npm run build`: エラーなし。

## 必要なCloudflare側の設定(未実施・本人の実行が必要)

実環境への適用はしていない。以下を、プロジェクトオーナーご自身の権限で実行する必要がある。

### 1. D1 migrationの適用
```
npm run d1:migrate:reading-notes:preview
npm run d1:migrate:reading-notes:production
```
(既存の`d1:migrate:preview`/`d1:migrate:production`と同じ、対象データベースは`wrangler.toml`の既存bindingをそのまま使う。新しいD1データベースの作成は不要)

### 2. パスワードハッシュの生成
```
npm run admin:hash-password
```
対話式でログインパスワードを決め、表示された`ADMIN_PASSWORD_HASH`・`ADMIN_PASSWORD_PEPPER`の値を控える。

### 3. secretの設定(Production・Preview両方、別Workerのため個別に必要)
```
# Production(トップレベル、futo-site)
npx wrangler secret put ADMIN_PASSWORD_HASH
npx wrangler secret put ADMIN_PASSWORD_PEPPER
npx wrangler secret put ADMIN_SESSION_SECRET   # openssl rand -hex 32 等でランダムに生成

# Preview(futo-site-preview、--env preview)
npx wrangler secret put ADMIN_PASSWORD_HASH --env preview
npx wrangler secret put ADMIN_PASSWORD_PEPPER --env preview
npx wrangler secret put ADMIN_SESSION_SECRET --env preview
```
（`IP_HASH_SECRET`は既存の交換ノート機能で両環境に設定済みのはずだが、未設定の場合はログインAPIも500になる。念のため両環境で設定済みか確認すること。）

### 4. デプロイ
コードの反映自体は既存のWorkers Builds Git連携がこのPRのマージ後に自動的に行う(追加のデプロイ操作は不要)。secretの設定だけは上記のとおり`wrangler secret put`で個別に行う必要がある(git連携では配布されない)。

## 採用理由 (Rationale)
- 既存のD1データベース・`IP_HASH_SECRET`によるIPハッシュ化・fail closedパターンをそのまま踏襲し、新しいCloudflareリソースを増やさなかった(CLAUDE.mdの「Cloudflare依存の拡張は最小限に」という精神を尊重)。
- セッションをステートレス(署名付きCookieのみ、サーバー側にセッションテーブルを持たない)にしたのは、余分なD1テーブル・クリーンアップ処理を増やさずに済むため。CSRFトークンをCookieのペイロードに含めることで、追加のストレージなしに整合性を保てる。
- 楽観的ロックを`updated_at`文字列比較で実装したのは、D1(SQLite)に特別な機能(行バージョン番号等)を追加せずに実現できる、もっとも単純な方式のため。

## 他の案 (Alternatives)
- セッションをD1に保存する(ステートフル)案も検討したが、ステートレスな署名Cookieで要件(有効期限・CSRF)を満たせたため、余分なテーブルを増やさない方を選んだ。
- OAuth等の本格的な認証基盤も検討したが、運営者本人1人だけが使う機能に対して過剰と判断し、既存の`IP_HASH_SECRET`と同じ「Cloudflare Workerのsecret」による認証で十分とした。

## 将来の変更可能性 (Future changes)
- 実際に運用を開始したら、ログイン試行のレート制限(現在15分5回)や、セッション有効期限(現在8時間)は、実際の使い方を見て調整してよい。
- 将来、投稿フォーム等で一般訪問者からの下書き投稿を受け付ける場合は、このAPIとは別の権限モデル(訪問者=下書きのみ作成可、本人承認=公開)が必要になる。今回のAPIは「本人のみが読み書きできる」設計であり、訪問者投稿は想定していない(指示書の明示的な対象外事項と一致)。

## Research Context
「手動でコードへ転記する運用を完成形にしない」という要求は、このスタジオが繰り返し大事にしてきた「未完成な状態を、完成したふりで終わらせない」という姿勢の裏返しでもある——今回は逆に、「本来ならもっと簡単にできるはずの運用を、技術的な理由で妥協したままにしない」という意味で、同じ誠実さの実践だと理解している。ローカルで実際に動かして確認できることは全て確認し、実環境への適用という「本人にしかできない・アクセス権限が要る作業」だけを明確に切り分けて依頼する、という報告の仕方も、CLAUDE.mdの「設定待ちの項目を動作確認済みと報告しない」という原則に沿っている。

## 検証・未検証事項
- ローカル検証(`wrangler dev --local`): 上記のとおり実施済み、全件確認。
- **未検証**: 実際のCloudflare Production/Preview環境でのmigration適用・secret設定後の動作(本人による実行が必要)。
- **未検証**: 実機(iOS Safari等)からのCookie/CSRF動作(`SameSite=Strict`・`Secure`属性がモバイルブラウザで期待どおり機能するかは、実際のHTTPS環境でのみ確認できる。ローカルの`wrangler dev`はHTTPで動くため、`Secure`属性付きCookieが実際にHTTPS環境でも問題なく送信されることは、本番相当のHTTPS環境で別途確認が必要)。
- **未検証**: 複数の運営者アカウントが必要になった場合の設計(今回は「本人1人」を前提にしている)。
