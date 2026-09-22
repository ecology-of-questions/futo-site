# 0198 — FieldnoteのOCRをGoogle Cloud Vision本番統合に切り替え

## Decision

実写真での比較検証(Decision Log 0196・0197)の結果、Google Cloud
Vision(`DOCUMENT_TEXT_DETECTION`)がTesseract.jsより実用的な精度
だったため、プロジェクトオーナーの明示的な指示に基づき、Fieldnoteの
通常のOCR経路をGoogle Cloud Vision(Cloudflare Worker経由)へ切り替えた。

**この変更は個人の読書記録機能の範囲内であり、公開機能(Decision Log
0189の読書メモ公開API)とは分離している。** `/api/ocr/recognize`は
公開エンドポイントではなく、管理者セッション限定のAPIである。

**Tesseract.jsは削除していない。** 旧実装は`ocrTesseractLocal.ts`
(`git mv`で`ocr.ts`から改名)にそのまま残し、どこからもimportしない
状態で保持している。実機確認が済み、戻す必要がないと判断できた時点で、
別PRで`ocrTesseractLocal.ts`・`public/vendor/tesseract/`・
`tesseract.js`依存を掃除する。比較ツール(`scripts/ocr-compare/`)は
ローカル検証用としてそのまま残す。

## 実装内容

### 画面上の変更

- 撮影(`capturePage()`)はOCRを自動起動しなくなった。撮影は従来通り
  即座に完了し、次の撮影にすぐ進める(連続撮影は維持)。撮影時に記録
  されるのは、向き(`ocrOrientation`)と読み取り範囲の既定値
  (`ocrCropRect`、ガイド枠から算出)だけで、`ocrStatus`は立てない。
- 記録一覧で本人が「文字を読み取る」を押した記録だけが、その場で
  Google Cloud Visionへ送信される。ガイド枠・「読み取り範囲を確認・
  調整」UI(Decision Log 0195)は構造をそのまま維持した。
- 「文字を読み取る」ボタンの直前に、送信内容を小さく明示する文
  (「この範囲の画像をGoogle Cloud Visionに送信します。」)を追加した。
- 管理者ログインをしていない状態では、OCR起動ボタンの代わりに
  「OCRを使うには管理者ログインが必要です(手入力は常にできます)。」
  という案内を表示する。抜粋・ページの手入力は、ログイン有無に関係
  なく常にできる(既存候補を「使う」操作もOCR自体を呼ばないため、
  未ログインでも支障ない)。
- カメラ画面の「読み取り待ち◯枚」表示(自動キュー時代の名残)は、
  手動トリガーに変わったことで意味を持たなくなったため削除した。
- **OCR専用の「本人用ログイン」導線を、セットアップ画面(Fieldnoteの
  最初の画面)に追加した(実機確認前、プロジェクトオーナーの指摘を
  受けて修正)。** 当初は公開プレビュー画面(本棚反映用、Decision Log
  0189)の既存ログインUIをOCRの認証にもそのまま流用する設計だったが、
  ログインするためだけに「撮影→公開プレビューへ移動→ログイン→
  戻る→過去の記録を開き直す」という遠回りな導線を要求してしまう
  ことが判明し、実機確認前に撤回した。新しい導線は:
  - 公開・本棚反映とは無関係(`#account-login-section`、控えめな
    `<details>`)。新規撮影の有無・既存記録の有無を問わず使える。
  - ログイン済みなら「ログイン済みです(OCRが使えます)」+
    「ログアウト」に表示が変わる(ログインフォーム自体を消す)。
  - ログイン/ログアウトの直後、`renderAdminAuthState()`が
    `currentListRefresh()`(直近に表示した記録一覧を同じ内容で
    組み立て直すクロージャ)を呼び、**表示中の記録一覧のOCRボタンを
    その場で更新する(画面の再訪・再読込を要求しない)**。これは
    ページ読み込み時の`recoverAdminSession()`(Cookieによる自動
    復元、非同期)が記録一覧の表示後に解決した場合にも効く——修正前は、
    既にログイン済みの利用者がセッションCookie復元より先に記録
    一覧を開いてしまうと、実際にはログイン済みなのにOCRボタンが
    「ログインが必要」のまま固まって見える、という別の不具合が
    起こり得た。
  - 公開プレビュー画面側の既存ログインUIは、公開機能のために
    そのまま残している(同じ`adminSession`を共有するため、
    どちらでログインしてもOCR・公開の両方が使えるようになる)。

### Worker APIの経路と認証方法

- 新エンドポイント`POST /api/ocr/recognize`(`worker/index.ts`)。
- 認証は、公開読書メモAPI(Decision Log 0189)と**全く同じ仕組みを
  再利用**する: `requireSession()`(HttpOnly署名済みセッションCookie
  `futo_admin_session`)+`requireCsrf()`(`X-CSRF-Token`ヘッダー)。
  新しい認証機構は作らず、未ログイン時は401を返す(fail-closed)。
- ブラウザは、クロップ・縮小済みの画像(Base64)をこのエンドポイント
  へJSONで送るだけで、Google Cloud Visionへは一切直接接続しない。
  Google側のAPIキーはWorker内にのみ存在し、ブラウザ・ログには出ない。
- Workerは、リクエストを受けるたびに(a) 画像サイズの上限
  (Base64で8,000,000文字)、(b) 直近1分間の呼び出し回数(D1
  `ocr_recent_calls`、10回/分)、(c) 当月の呼び出し回数
  (D1 `ocr_usage_monthly`、`OCR_MONTHLY_LIMIT`)の3段階を順に確認し、
  いずれかを超えていれば429を返してGoogle Vision自体を呼ばない。
  月次カウンタは、Googleへの呼び出しが実際に成功した場合だけ加算する
  (失敗・拒否した呼び出しは課金されないため数えない)。
- 写真原本やOCRの入出力(画像・認識結果)は、D1にもWorkerのログにも
  一切保存しない。`ocr_recent_calls`/`ocr_usage_monthly`に残るのは
  「いつ・何回呼ばれたか」という件数だけ(`migrations/0003_ocr_usage.sql`)。

### Google Cloud側でプロジェクトオーナーが設定する項目

**この節の手順は、すべてプロジェクトオーナー自身がGoogle Cloud
Console/Cloudflare Dashboard上で行う。Claudeはこの手順を代行しない
(APIキーの値をチャット等でClaudeへ渡す・Claudeが`wrangler secret
put`を代わりに実行する、という案はプロジェクトオーナーの指示により
撤回した。secretの設定は本人がCloudflare Dashboardから直接行う)。**

1. Google Cloudプロジェクトで **Cloud Vision API** を有効化する
   (Google Cloud Console > 「APIとサービス」> 「ライブラリ」>
   「Cloud Vision API」> 有効にする)。
2. 課金アカウントを紐づける(無料枠を超えた分の請求先。プロジェクトに
   未設定の場合、APIの有効化自体がブロックされる)。
3. APIキーを発行し、**「Cloud Vision APIのみ」に制限する**
   (Google Cloud Console > 「APIとサービス」> 「認証情報」>
   「認証情報を作成」> 「APIキー」)。発行後、そのキーの詳細画面で:
   - 「APIの制限」を**「キーを制限」**に変更し、対象を
     **「Cloud Vision API」だけ**にチェックして保存する。
   - **「アプリケーションの制限」は「なし」のままにする。** Cloudflare
     WorkerからGoogleへの通信(サーバー間通信)は、Cloudflareの
     グローバルネットワーク上の任意のノードから送信され、送信元IPが
     固定されない。そのためIPアドレス制限は前提にできず(設定すると
     実際の呼び出しがブロックされる可能性がある)、「APIキー自体を
     Cloud Vision APIだけに絞る」ことで制限をかける設計にしている。
     HTTPリファラー制限も同様の理由(ブラウザからの直接呼び出しを
     前提にした制限のため)で使わない。
4. 発行したキーの値は、次節のとおりCloudflare Dashboardから直接
   `GOOGLE_VISION_API_KEY`として設定する(このAPIキーの値自体は
   チャット・コミット・ログのいずれにも一切含めない)。

### Cloudflareに設定するsecret名

- `GOOGLE_VISION_API_KEY` — Preview/Productionで**同じ変数名**、
  値だけを環境ごとに個別設定する(プロジェクトオーナーの指示により、
  環境名をキー名に含めない設計にした。コードは環境名を意識しない)。
  Cloudflare Dashboard(Workers & Pages > 対象Worker >
  Settings > Variables and Secrets)から、プロジェクトオーナー本人が
  直接設定する。CLIの`wrangler secret put GOOGLE_VISION_API_KEY`
  (Production)/`wrangler secret put GOOGLE_VISION_API_KEY --env
  preview`(`futo-site-preview`)でも同じことができるが、いずれの
  方法でも**値をClaude(このセッション)へ渡す必要は無い**——ローカル
  で`wrangler secret put`を実行する場合も、プロンプトへの入力は
  本人の端末で完結し、Claudeには見えない。
- 既存の`IP_HASH_SECRET`等と同様、`wrangler.toml`には値を書かず、
  secretとしてのみ存在する。

### 月額費用の上限設計

Google Cloud Visionの無料枠(1,000ユニット/月)は、**同じGoogle Cloud
プロジェクトで動かす場合はPreview/Productionで合算される**という
プロジェクトオーナーの指摘を踏まえ、Worker側でも環境ごとに個別の
月次上限を設けた(`wrangler.toml`の`OCR_MONTHLY_LIMIT`、vars):

| 環境 | `OCR_MONTHLY_LIMIT` | 備考 |
|---|---|---|
| Preview (`futo-site-preview`) | 50 | 検証・実機確認用 |
| Production (`futo-site`) | 900 | 無料枠1,000のうち、Preview分の余地を残す |

これに加えて、環境に依存しない共通の防御を2段設けている:

- 画像サイズ上限(Base64で8,000,000文字、おおよそ元画像6MB程度)。
- レート制限(直近1分間に10回まで。件数の水増しや誤操作の連打を
  防ぐためのもので、コスト自体は月次上限が主に抑える)。

Preview/Production合わせて最大950回/月。1回あたりのVision料金
($1.50/1,000ユニット、無料枠超過分)を踏まえても、無料枠を明確に
下回る設計。将来これらの上限を引き上げる必要が生じた場合は、
Google Cloudプロジェクト自体をPreview/Productionで分離することを
検討する(プロジェクトオーナーの提案どおり)。

### セットアップ手順(プロジェクトオーナーが行う。Preview設定 → 実機確認 → Production設定の3段階)

この機能は、本人限定ログイン(Decision Log 0189、PR #116由来)の上に
成り立っている。ログインの前提(secret・migration)が未設定のままだと、
OCR自体ではなくログインの時点でfail closedにより500になる。**すでに
PR #116をデプロイ・secret設定済みであれば、以下の「ログインの前提」
の項目は確認だけでよい(再設定不要)。**

#### 段階1: Preview設定

1. **ログインの前提(#116由来、Previewに未設定なら)**:
   - `npm run d1:migrate:reading-notes:preview`
     (`admin_login_attempts`・`reading_notes`テーブルを作成する。
     実行済みなら再実行しても`CREATE TABLE IF NOT EXISTS`のため無害)。
   - Cloudflare Dashboardで`futo-site-preview`(Preview用の別Worker、
     Decision Log 0146)に`ADMIN_PASSWORD_HASH`・
     `ADMIN_PASSWORD_PEPPER`・`ADMIN_SESSION_SECRET`・
     `IP_HASH_SECRET`が設定済みか確認する(未設定ならDecision Log
     0189の手順で設定する。`ADMIN_PASSWORD_HASH`/`_PEPPER`は
     `npm run admin:hash-password`で生成する)。
2. **この機能由来の新規設定(Preview)**:
   - `npm run d1:migrate:ocr-usage:preview`
     (`ocr_usage_monthly`・`ocr_recent_calls`テーブルを作成する)。
   - Cloudflare Dashboardの`futo-site-preview`に、前節のGoogle Cloud
     APIキーを`GOOGLE_VISION_API_KEY`として設定する。
   - `OCR_MONTHLY_LIMIT`(Preview=50)は`wrangler.toml`にvarsとして
     既にコミット済みで、このPRのマージ後に反映される。追加作業は不要。
3. このPRをマージすると、Workers Builds Git連携によりPreview
   ビルドが自動的に更新される(コード面はこれで反映される。secretは
   上記のとおりCLI/Dashboardで別途必要)。

#### 段階2: 実機確認

PreviewのURLで、実機(iPhone)から:

1. Fieldnoteを開く → セットアップ画面の「本人用ログイン」でログイン。
2. 写真を撮る → 記録一覧で「文字を読み取る」→ 送信前の明示文・候補・
   信頼度が表示されることを確認。
3. 候補を確認 → 「この内容を抜粋に使う」で抜粋に反映されることを確認。

上記に加えて、Google Cloud Console(該当プロジェクトの「APIとサービス」
>「割り当てとシステム上限」等)で、Vision APIの呼び出しが実際に1回
だけ計上されていることを確認するとよい(想定外の多重呼び出しが無いか
の実地確認)。

未ログイン状態でOCRボタンの代わりにログイン案内が出ること、Google
設定を外した状態(または月次上限に達した状態)でエラーが分かりやすく
表示されることも、余裕があれば合わせて確認するとよい(Worker側の
挙動はこのPRの自動テスト、`worker/ocr-recognize.test.ts`で個別に
確認済み)。

#### 段階3: Production設定

実機確認後、問題が無ければ:

1. `npm run d1:migrate:ocr-usage:production`
2. Cloudflare Dashboardの`futo-site`(Production)に
   `GOOGLE_VISION_API_KEY`を設定する(Previewと同じ値でも、
   別に発行した値でも構わない。無料枠はGoogle Cloudプロジェクト単位で
   合算されるため、同じプロジェクト内であればキーを分けても分けなくても
   月次上限の合計は変わらない)。
3. PR #120をマージする(Workers Builds Git連携により、Production
   (`futo-site`)へ自動的に反映される)。
4. マージ後、Production側でも同様に軽く動作確認する(段階2と同じ
   3ステップ)。

### 既存PR #114〜#119との依存関係・ブランチ

- ブランチ`claude/fieldnote-ocr-google-vision`を、Decision Log
  0192〜0195の連続撮影・クロップガイド実装がまとまっている
  `claude/fieldnote-ocr-continuous-v3`(PR #119)から分岐して作業した。
  この変更はその上に積む形なので、PR #119の内容に依存する。
- PR #114〜#118(認証・公開API等)は`main`に既にマージ済みの前提の
  上に成り立っている(`requireSession`/`requireCsrf`を新規実装せず
  再利用しているため)。

## 変更したファイル(実装)

- `vitest.config.ts`(新規)・`package.json`の`test`スクリプト、
  `worker/test-helpers.ts`(新規、テスト用フェイクD1・Env組み立ての
  共有部分)・`worker/ocr-recognize.test.ts`・`worker/admin-login.test.ts`
  (新規)・`src/lib/fieldnote/ocrQueue.test.ts`・
  `src/lib/fieldnote/ocr.test.ts`: 「検証」の節参照。devDependencyとして
  `vitest`のみ追加(Cloudflare実行環境のツールは不要だったため追加
  していない、詳細は「他の案」参照)。
- `src/lib/fieldnote/publishApi.ts`: `PublishApiError`に`missing?:
  string[]`を追加(fail closed応答の「未設定のsecret名」をそのまま
  運ぶ)。「Preview実機確認で発生した『本番未配線』表示の調査・修正」
  参照。
- `migrations/0003_ocr_usage.sql`(新規): `ocr_usage_monthly`/
  `ocr_recent_calls`テーブル。
- `wrangler.toml`: `OCR_MONTHLY_LIMIT`をトップレベル・
  `[env.production]`・`[env.preview]`それぞれのvarsに追加。
- `package.json`: `d1:migrate:ocr-usage:{local,preview,production}`
  スクリプトを追加。
- `worker/index.ts`: `Env`に`GOOGLE_VISION_API_KEY`/
  `OCR_MONTHLY_LIMIT`を追加。`handleOcrRecognize()`と
  `POST /api/ocr/recognize`のルーティングを追加。
- `src/lib/fieldnote/ocr.ts`: Google Cloud Vision(Worker経由)を
  呼ぶ実装に全面差し替え。クロップ・縮小(`cropForOcr`/`resizeForOcr`、
  Decision Log 0194・0195で確立)はそのまま踏襲し、Base64化して
  `/api/ocr/recognize`へPOSTする関数を追加した。CSRFトークンを
  引数に取るようになった(`csrfToken`必須)。**(2026-09-22追記)**
  `loadImageSource()`を新設し、`createImageBitmap`が失敗する
  iOS Safari環境向けに`<img>`ベースのフォールバックを追加した
  (「iOS SafariでcreateImageBitmapが失敗する事象への対応」参照)。
- `src/lib/fieldnote/ocrTesseractLocal.ts`(旧`ocr.ts`を`git mv`):
  Tesseract.js実装をそのまま保持。どこからもimportしない。
- `src/lib/fieldnote/ocrQueue.ts`: `getCsrfToken`コールバックを
  受け取るよう変更。ログイン済みでなければGoogleを呼ばずに
  `failed`扱いにする。`resumeUnfinished()`は削除した(手動トリガー
  化に伴い、中断された処理の自動再開という前提が無くなったため)。
- `src/lib/fieldnote/store.ts` / `indexedDbStore.ts`:
  `FieldnoteOcrStateUpdate.ocrStatus`を省略可能にし、撮影時に
  状態を立てずに向き・範囲の既定値だけを記録できるようにした。
  `listUnfinishedOcrCaptures`(インターフェース・実装とも)を削除した。
- `src/lib/fieldnote/app.ts`: 自動起動ロジック
  (`pendingOcrIdsThisSession`/`updateOcrPendingIndicator()`/
  起動時の`resumeUnfinished()`呼び出し)を削除。OCR起動系のボタンは
  `adminSession`の有無で表示を出し分けるヘルパー
  (`appendOcrTrigger`)に統一し、送信前の明示文を追加した。
  セットアップ画面用の「本人用ログイン」ハンドラ
  (`handleAccountLoginClick`/`handleAccountLogoutClick`)、ログイン
  状態が変わるたびに表示中の記録一覧を組み立て直す`currentListRefresh`
  ・`renderAdminAuthState()`の拡張を追加した。
- `src/pages/fieldnote/index.astro` / `index.module.css`:
  「読み取り待ち◯枚」表示(`#ocr-pending-count`)のマークアップ・
  スタイルを削除。送信前明示文・ログイン案内文のスタイルを追加。
  セットアップ画面に「本人用ログイン」ブロック
  (`#account-login-section`)を追加。

## 検証

### コンパイル・ビルド確認

- `npx tsc --noEmit` / `npx astro check` / `npm run build`: エラー・
  警告なし(既存の1件の無関係な警告を除く)。
- `worker/index.ts`単独の構文検証(`--lib dom`指定、Decision Log 0189
  と同じ方法。`tsconfig.json`の`include`はsrc配下のみのため通常の
  `tsc --noEmit`はこのファイルを対象にしない): エラーなし。

**これだけでは「動くこと」の確認にならない**というプロジェクトオーナー
の指摘を受け、以下の実際の挙動テストを追加した(`vitest`、
`npm run test`)。`worker/index.ts`は`@cloudflare/workers-types`を
増やさず、D1等を自前の最小限の型で書いている設計(このファイル冒頭の
コメント参照)のおかげで、Cloudflareの実行環境(Miniflareや
`@cloudflare/vitest-pool-workers`)を持ち込まなくても、D1をこのテスト
専用のフェイク実装に差し替えるだけでプレーンなNode上で直接テストできる。

### `worker/ocr-recognize.test.ts`(13件、`/api/ocr/recognize`の実際の挙動)

`worker/index.ts`の`fetch`ハンドラへ実際にRequestを投げ、`admin/login`
を経由して取得した本物のセッションCookie・CSRFトークンを使う(検証用の
パスワード・ハッシュはテスト内で都度生成する使い捨ての値で、実際の
運用secretとは無関係)。Google Cloud Visionへの通信は`vi.stubGlobal`
でグローバルの`fetch`を差し替えて検証する(D1は`admin_login_attempts`
/`ocr_recent_calls`/`ocr_usage_monthly`だけを解釈する最小限のフェイク)。

検証項目(プロジェクトオーナーの指示どおり):
- 未ログイン(セッションCookie無し)だと401になり、Google Visionへの
  通信(`fetch`)自体が発生しない。
- セッションはあるがCSRFトークンが無い/一致しないと403になる。
- 画像サイズが上限(Base64で8,000,000文字)を超えると413になる。
- 直近1分間に10回呼び出し済みだと429になる(レート制限)。
- Preview相当(月次上限50)・Production相当(月次上限900)、それぞれの
  上限ちょうどで429になり、Googleを呼ばずに止まることを別々に確認。
  上限の1回手前(count=49/limit=50)では通り、成功後にカウンタが
  ちょうど50になることも確認(境界値のオフバイワン誤りが無いことの
  確認)。
- Google Visionへの通信そのものが失敗(`fetch`が例外を投げる)しても、
  レスポンス本文にAPIキー・画像データ・元の例外メッセージが一切
  含まれず、定型のエラーメッセージだけが返ること。`console.log/warn
  /error`が一切呼ばれないこと(ログにも出ないこと)。
- Google Visionが400/500等のエラーステータスを返した場合も、その
  本文(APIキーを含みうる文字列を模したダミーデータで検証)をそのまま
  転送せず、`Google Cloud Vision error (<status>)`という定型文だけを
  返すこと。
- Googleが200を返しつつ`responses[0].error`にエラーメッセージが
  入っている場合も、そのメッセージ本文を転送しないこと(**この検証を
  書く過程で、旧実装が`result.error.message`をそのままクライアントへ
  返していた箇所を発見し、定型文に変更する修正を行った**。詳細は
  「他の案」ではなく実装そのものの修正のため、`worker/index.ts`の
  該当コミットに含む)。
- 成功時は`{text, confidence, orientation}`だけを返し、月次カウンタが
  1増えること。
- `GOOGLE_VISION_API_KEY`未設定の環境では、Googleを呼ばずに500で
  拒否すること(fail closed)。

### `src/lib/fieldnote/ocrQueue.test.ts`(3件、候補の扱いと未ログイン時の停止)

`./ocr`モジュール(`recognizeExcerpt`)をモックし、フェイクの
`FieldnoteStore`(`updateCapture`が呼ばれたら例外を投げる、という
形で「本体の抜粋・ページを直接書き換えるメソッドが絶対に呼ばれない
こと」を保証する)を使って検証:
- csrfTokenが無い(未ログイン)場合、`recognizeExcerpt`を一切呼ばない
  (＝ブラウザからGoogle Visionへは、Workerへの通信すら発生しない)。
- csrfTokenがある場合は`recognizeExcerpt`を呼び、結果は
  `ocrCandidateText`/`ocrCandidatePage`にのみ反映され、既存の
  `excerptText`/`pageLabel`は変化しない(「使う」を押すまで上書き
  しないという設計を、実際にモジュールを動かして確認)。
- `recognizeExcerpt`が失敗した場合も同様に、既存の抜粋・ページは
  変化しない。

### `src/lib/fieldnote/ocr.test.ts`(7件、送信先の確認+iOS Safariフォールバック。件数は「iOS SafariでcreateImageBitmapが失敗する事象への対応」の追記時点)

`createImageBitmap`/`FileReader`(Node に無いブラウザAPI)だけを
最小限のフェイクに差し替え、`recognizeExcerpt`が実際に`fetch`する
先を検証:
- 送信先は常に同一オリジンの相対パス`/api/ocr/recognize`であり、
  `vision.googleapis.com`等のGoogleのドメインを一切含まない
  (＝ブラウザからGoogleへ直接送信しないことの直接的な確認)。
- 送信する本文は、画像原本ではなくJSON(`imageBase64`/`orientation`)
  であり、CSRFトークンがヘッダに含まれること。

**(2026-09-22追記)** 2件追加し、`createImageBitmap`が
`InvalidStateError`を投げる状況を再現。読み取り範囲を指定しない
場合・読み取り範囲と回転(縦書き)を指定した場合の両方で、`<img>`
ベースのフォールバックへ自動的に切り替わり、最終的な送信まで完了する
こと、回転・切り抜きのCanvas操作が実際に呼ばれることを検証した
(「iOS SafariでcreateImageBitmapが失敗する事象への対応」参照)。

### Tesseractの読み込みが無くなったことの確認(ビルド出力・実際のNetwork)

- `npm run build`後の`dist/_astro/*.js`(Fieldnoteページのバンドル)を
  文字列検索し、`"tesseract"`という文字列が一切含まれないことを確認
  した(読み込みコード自体が無い。到達不能というだけでなく、そもそも
  呼び出しが存在しない)。
- Playwrightで実際に`/fieldnote/`をブラウザ(Chromium)で開き、発生
  した全リクエストのURLを記録して確認したところ、`tesseract`・
  `googleapis`を含むリクエストは0件だった。
- 一方、`public/vendor/tesseract/`(Tesseractの自己ホスト済み
  WASMコア、`ocrTesseractLocal.ts`用に温存しているファイル)は
  Astroの仕様上`dist/vendor/tesseract/`へそのままコピーされる
  ため、**そのURLを直接知っていれば静的ファイルとして取得は可能**
  (Astroの`public/`はビルド時に無条件でコピーされる)。ただし上記の
  とおり、どの画面のどの操作からもこのファイルを指すコードが無い
  ため、通常の利用でこのファイルがブラウザから読み込まれることは
  無い。完全に配信自体を止めたい場合は、`ocrTesseractLocal.ts`と
  合わせて`public/vendor/tesseract/`を削除する必要があるが、それは
  「将来の変更可能性」に記載のとおり、実機確認後の別PRで判断する。

## Preview実機確認で発生した「本番未配線」表示の調査・修正

プロジェクトオーナーがPreview側のsecret(`GOOGLE_VISION_API_KEY`・
`ADMIN_PASSWORD_HASH`・`ADMIN_PASSWORD_PEPPER`・`ADMIN_SESSION_SECRET`)
・D1マイグレーションを設定済みの状態で実機確認したところ、「本人用
ログイン」欄に「サーバー側の設定が未完了です(本番未配線)。」と表示
された。追加のsecret変更をさせる前に、という指示のもとコードのみを
調査・修正した(Cloudflare・Google CloudのsecretはWorker側からは
一切変更していない)。

### 1. この文言を表示する条件と根拠

`worker/index.ts`の`handleAdminLogin()`(`/api/admin/login`)は、
```ts
if (!env.ADMIN_PASSWORD_HASH || !env.ADMIN_PASSWORD_PEPPER || !env.ADMIN_SESSION_SECRET || !env.IP_HASH_SECRET) {
  return json({ error: "server misconfigured", missing: missingSecrets }, 500);
}
```
の**4つすべて**が揃っていないとHTTP 500を返す(fail closed、
Decision Log 0189で確立した設計をそのまま踏襲)。ブラウザ側
(`app.ts`)は、このHTTP 500を`PublishApiError`として捕捉し、
「サーバー側の設定が未完了です」という案内文に変換して表示している
だけで、これは「本番かPreviewか」を判定しているわけではない
(`NOTEBOOK_ENV`等の環境名は一切参照していない)。

**プロジェクトオーナーの報告に、この4つのうち`IP_HASH_SECRET`が
含まれていなかった。** `IP_HASH_SECRET`は交換ノート機能
(Decision Log 0141)由来の別のsecretで、ログインのIPレート制限にも
再利用している(Decision Log 0189)。`futo-site-preview`は
Productionとは物理的に別のWorkerのため、secretも共有されない
(wrangler.toml・Decision Log 0146参照)。Decision Log 0189の
セットアップ手順でも「`IP_HASH_SECRET`は...未設定の場合はログイン
APIも500になる。念のため両環境で設定済みか確認すること」と明記して
いたが、見落としやすい箇所だったと考えられる。**ただし、これは
コードを読んだ上での最有力の仮説であり、Previewの実際のsecret
設定を確認した結果ではない**(このセッションから`*.workers.dev`
ドメインへの通信ができないため、後述の理由で断定はしていない)。

### 2. `/api/admin/session`が返す実際のHTTP status/JSON

**確認できていない。** このセッションのネットワークegressは
`*.workers.dev`を含む任意の外部ドメインへの直接アクセスを許可して
おらず(`api.github.com`等の許可リストに限定)、Preview Workerへ
直接リクエストを送って確認することができなかった。推測や仮定の値を
「確認結果」として報告しない(指示書全体で一貫して守ってきた方針)
ため、実際のレスポンスはプロジェクトオーナーの環境での確認に委ねる。

なお`/api/admin/session`(セッション復元用のGET)自体は
`missingAdminLoginSecrets()`を使っておらず、`requireSession()`が
`ADMIN_SESSION_SECRET`未設定なら常に401を返すだけの経路のため、
今回の"missing"診断とは別物である。今回の事象を直接再現するのは
`POST /api/admin/login`(ログインボタンを押した時に呼ばれるAPI)の方。

### 3. Workers Buildsのデプロイ先とDashboardのRuntime Secretの整合性

`wrangler.toml`の記述(Decision Log 0143・0146で実機検証済み)により、
Previewは`npx wrangler versions upload --env preview`で、
`[env.preview] name = "futo-site-preview"`という**Productionとは
物理的に別のWorkerリソース**へデプロイされる。Cloudflare Dashboardで
`futo-site-preview`というWorkerを開いてSecretを設定していれば、
デプロイ先と一致する(同じWorker名を対象にしている限り、Versionごとに
secretが分かれることはない——Decision Log 0146で「D1などのresource
bindingはWorker本体に紐づき、Versionごとには安全に分離できない」と
確認済みで、secretも同じ「Worker本体に紐づく」区分に属する)。

加えて、プロジェクトオーナーが実際に「サーバー側の設定が未完了です」
という、このコードだけが返す文言を目にしているという事実そのものが、
**Workers Buildsのデプロイが正しい`futo-site-preview`に届いており、
最新のコードが動いている**ことの直接的な証拠になっている(ルーティング
やデプロイ先そのものが誤っているなら、この特定の文言は出ようがない)。
問題はデプロイ先ではなく、その`futo-site-preview`という1つのWorkerが
実際に読んでいる`env`の中身(secretの過不足)にある可能性が高い。

### 4. Previewで必要なsecret名とコードが参照する名前の完全一致

| コードが参照する名前(`env.`の後に続く名前、大文字小文字・スペルとも完全一致が必要) | 用途 | プロジェクトオーナーの報告 |
|---|---|---|
| `ADMIN_PASSWORD_HASH` | ログインのパスワード照合 | 設定済み |
| `ADMIN_PASSWORD_PEPPER` | 同上 | 設定済み |
| `ADMIN_SESSION_SECRET` | セッションCookieの署名 | 設定済み |
| `IP_HASH_SECRET` | ログイン試行のIPレート制限 | **報告に無し** |
| `GOOGLE_VISION_API_KEY` | OCR(ログイン後に別途必要) | 設定済み |

`IP_HASH_SECRET`は交換ノート機能(Decision Log 0141)から使われている
名前で、Fieldnote OCR専用に新設したものではない。名前の綴り自体は
コード上1箇所(`interface Env`)で定義され、`handleAdminLogin`・
`handlePostEntries`など複数箇所から同じ`env.IP_HASH_SECRET`として
参照されており、コード側の表記ゆれは無い。

### 5. 今回の修正内容

コード側の判定ロジック自体に誤り(本番かPreviewかを誤判定する分岐等)
は見つからなかった。代わりに、**「4つのうちどれが欠けているか」が
エラーメッセージから分からず、原因の特定に手間がかかる**という
診断性の問題だったと判断し、以下を修正した:

- `worker/index.ts`: `missingAdminLoginSecrets(env)`を追加し、
  `handleAdminLogin`のfail closed応答に`missing`(未設定のsecret名
  だけの配列、値は一切含まない)を含めるようにした。`handleOcrRecognize`
  の`GOOGLE_VISION_API_KEY`未設定時の応答にも同様に`missing`を追加し、
  形式を揃えた。
- `src/lib/fieldnote/publishApi.ts`: `PublishApiError`に`missing?:
  string[]`を追加し、応答本文の`missing`をそのまま運ぶようにした。
- `src/lib/fieldnote/app.ts`: 新設の`describeMissingSecrets()`が
  `missing`があればそのまま列挙した案内文
  (例:「サーバー側の設定が未完了です(未設定: IP_HASH_SECRET)。」)
  を組み立てる。セットアップ画面の「本人用ログイン」・公開プレビュー
  画面の両方のログインUIで、この関数を共通で使う。
- `worker/test-helpers.ts`(新規): これまで`ocr-recognize.test.ts`
  に直書きしていたフェイクD1・テスト用Envの組み立てを切り出し、
  `worker/admin-login.test.ts`(新規)と共有できるようにした。
- `worker/admin-login.test.ts`(新規、6件): 4つすべて未設定・
  `IP_HASH_SECRET`だけ未設定(今回の事象の再現)・
  `ADMIN_PASSWORD_PEPPER`だけ未設定、それぞれで`missing`が正しい
  内容になること、`missing`にsecretの値自体が含まれないこと、
  4つとも揃っていれば200でセッションCookie・csrfTokenが発行される
  こと、パスワードが違う場合は401になり`missing`は含まれないこと、
  を検証する。

**要件5(修正後、Previewでは有効・本番ではsecret未設定のまま無効)
について:** これはコード変更を必要としない、fail closed設計そのものの
帰結として既に成り立っている。Production側の4つのsecret(特に
`IP_HASH_SECRET`はProduction用に既に設定済みのはずだが、
`ADMIN_PASSWORD_HASH`等・`GOOGLE_VISION_API_KEY`は本PRのセットアップ
手順の「段階3」まで未設定の想定)が揃うまで、Production側は自動的に
「サーバー側の設定が未完了です」のまま無効であり続ける。これは
Preview/Productionを判定する分岐が無いこと自体の帰結でもある
(判定していないからこそ、secretの有無だけで両者が独立して
正しく振る舞う)。

### 追記: `missing`を追加しても詳細が表示されなかった件の調査

上記の修正(`missing`フィールドの追加)をPreviewへデプロイし、
プロジェクトオーナーが再度「本人用ログイン」を試したところ、文言は
更新されていた(「(本番未配線)」という固定文言が消え、クライアント側
の新しいフォールバック文言になっていた——これ自体、更新後のJSが実際に
動いていることの証拠になる)が、「(未設定: ...)」の詳細は表示されず、
`missing`が空のまま扱われる状態が再現した。

**推論:** `handleAdminLogin`のsecretチェック(`missingAdminLoginSecrets`)
を通過した後、ログイン試行回数のレート制限のために
`env.DB.prepare(...).bind(...).first()`(`admin_login_attempts`
テーブルへの問い合わせ)を呼んでいるが、この呼び出しに対する
try/catchが無かった。secretが4つとも実際に揃っているなら
(プロジェクトオーナーの報告どおりだとすれば)このチェックは通過する
はずで、その先で何らかの例外——最有力なのは、D1データベースの
バインディング自体の設定ミス、または`admin_login_attempts`テーブルが
実際には存在しない(migrations/0002_reading_notes.sqlがPreviewの
D1へ未適用、または適用先のデータベースを取り違えている)——が起きて
いた場合、Cloudflare Workersのランタイムは未捕捉の例外をこの
`json()`ヘルパーを経由しない、独自の(JSONとは限らない)エラー応答に
変換してしまう。クライアント側は「JSON本文に`missing`があれば表示する」
という前提で書かれているため、`missing`どころか`error`フィールドすら
無い応答が返ってくれば、`describeMissingSecrets()`は空の`missing`
として扱い、汎用の文言だけを表示する——これが観測された症状と一致する。

**修正(値を一切出さない範囲で、断定ではなく反証可能な形にした。
ただし2.の`GET /api/admin/diagnostics`は、この直後の「追記2」で
撤回している——先に結論だけ知りたい場合はそちらを参照):**

1. `worker/index.ts`の`fetch`ハンドラ全体を`routeRequest()`に切り出し、
   `export default { fetch }`側でtry/catchするようにした。ハンドラの
   どこで例外が起きても、Cloudflareの既定のエラーページではなく、
   必ず`{ error: "internal error", detail: "<例外メッセージ>" }`
   というJSONの500を返す(スタックトレースは含めない。各ハンドラは
   secretの値・パスワード本体・画像データを例外メッセージに含めない
   前提のため、`detail`をそのまま返しても安全)。
2. `GET /api/admin/diagnostics`(新規、認証不要)を追加した。
   `NOTEBOOK_ENV`のような既存の非secret診断値と同じ扱いで、
   - `secretsPresent`: 5つのsecret名それぞれの真偽値(値は含まない)。
   - `db`: `SELECT name FROM sqlite_master WHERE type = 'table'`を
     実行し、`ok`(接続・クエリ成功したか)・`error`(失敗時のSQL
     エラーメッセージのみ、値は含まれない)・`tables`(実在する
     テーブル名の一覧)を返す。`admin_login_attempts`等の想定テーブルが
     `tables`に無ければ、migration未適用が一目で分かる。
   を返す。**これは「Secretを再入力・追加する前に、Preview上で安全に
   再現・切り分けできる方法を示してほしい」というプロジェクトオーナー
   の要求への直接の回答であり、ログインボタンを一度も押さずに
   この1つのGETリクエストだけで、secretの過不足とD1のmigration適用
   状況の両方を確認できる。**
3. `worker/admin-login.test.ts`に5件追加(計11件): D1クエリが
   例外を投げても`POST /api/admin/login`がクラッシュせずJSONの500
   ・`detail`を返すこと(secretは4つとも揃っている状態で再現)、
   `GET /api/admin/diagnostics`がsecretの真偽値・D1接続可否・
   テーブル一覧を正しく返すこと、テーブルが欠けている状態
   (migration未適用の再現)を検出できること、D1バインディング自体が
   壊れていてもクラッシュせず`db.ok: false`で返すこと。

**このセッションから`*.workers.dev`への直接アクセスができないため、
上記は「コードレビューと自動テストで再現・検証した仮説」であり、
実際のPreview環境で`GET /api/admin/diagnostics`を開いた結果そのもの
ではない。** プロジェクトオーナーがこのエンドポイントを開いて結果を
共有してくれれば、原因をその場で確定できる。それまでは「ログイン
成功まで確認した」とは報告しない。

### 追記2: `/api/admin/diagnostics`を撤回し、migrationファイルの対応を確認

**上記2.で追加した`GET /api/admin/diagnostics`(未認証の公開GET、
secretの真偽値・D1テーブル名一覧を返す)は、プロジェクトオーナーから
明確な却下を受け、撤回・削除した。** 「未認証の公開エンドポイントとして
secretの有無・D1テーブル名を外部へ返す設計は採用しない」という判断
で、値を含まない設計であっても不採用とする、という方針として記録する
(将来、似た「値は含まないから安全」という理由で診断用エンドポイントを
足したくなった場合も、まずこの判断を踏まえること)。

**あわせて、`fetch()`の catch-all(追記1で追加)の応答も見直した。**
D1クエリの例外メッセージ(SQLエラー文言、値は含まないがスキーマ情報
ではある)を応答本文の`detail`に含めていたが、`/api/admin/login`は
未認証から呼べるエンドポイントのため、この`detail`も同じ理由で
不適切だった。例外の詳細は`console.error`でCloudflare側のログ
(Dashboard の Workers Logs)にだけ出し、応答本文は
`{ error: "internal error" }`という定型文のみに変更した。

**原因の切り分けは、プロジェクトオーナーの指定した2つの安全な方法の
うち、後者(ローカルterminalでのD1確認コマンド)で行う。**

`npm run d1:migrate:preview`は**`package.json`上、
`migrations/0001_init.sql`だけを`futo-lab-notebooks-preview`
(`--env preview --remote`)に適用するスクリプト**であることを確認した:
```json
"d1:migrate:preview": "wrangler d1 execute futo-lab-notebooks-preview --env preview --remote --file=./migrations/0001_init.sql",
```
`admin_login_attempts`テーブルは`migrations/0002_reading_notes.sql`
が作る(`reading_notes`テーブルと同じファイル)。Previewに対して
このファイルを適用するスクリプトは別名の
`d1:migrate:reading-notes:preview`であり、プロジェクトオーナーの
報告には登場していない。**したがって、実際に実行されたコマンド名から
推測できる最有力の候補は「`admin_login_attempts`テーブルが
`futo-lab-notebooks-preview`にまだ存在しない」であり、これは
コードだけからの憶測ではなく、`package.json`のスクリプト定義と
報告されたコマンド名の突き合わせから導いている。**

これを断定ではなく本人の手元で確認できるよう、secretの値を一切
出さない読み取り専用のD1コマンドを示す(`wrangler`は既にログイン
済みのはずなので、追加のCloudflare認証は不要):

```
npx wrangler d1 execute futo-lab-notebooks-preview --env preview --remote --command "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
```

出力に`admin_login_attempts`(および`reading_notes`)が無ければ、
`npm run d1:migrate:reading-notes:preview`をこの後で実行すれば
解消するはずである(`ocr_usage_monthly`/`ocr_recent_calls`が無い
場合は`npm run d1:migrate:ocr-usage:preview`)。secretの再設定は
一切不要と見込まれる。

**もう一つの方法(Cloudflare Workers Logsでの例外確認)** も、
今回のcatch-all修正(`console.error`)により有効になった:
Cloudflare Dashboard > Workers & Pages > `futo-site-preview` >
「Logs」(リアルタイムログ、通称tail)を開いた状態でログインを試すと、
`unhandled exception in routeRequest: ...`という行に、上記のD1
エラーの実際のメッセージがそのまま出るはずである。

**この節も、コードとpackage.jsonの対応関係からの推論であり、
実際にPreviewの`futo-lab-notebooks-preview`に対してこのコマンドを
実行した結果そのものではない。** 結果を共有してもらい次第、この
Decision Logにも反映する。

## iOS SafariでcreateImageBitmapが失敗する事象への対応(2026-09-22)

実機のiPhone Safariで、OCRの「文字を読み取る」を押した際に、
Google Vision・Cloudflare Workerのどちらにも到達する前に

```
InvalidStateError: An error occurred reading the Blob argument to createImageBitmap
```

というクライアント側の例外で失敗する事象が報告された。原因は、
`src/lib/fieldnote/ocr.ts`の`cropForOcr()`/`resizeForOcr()`が、
撮影した写真の切り抜き・縮小の前処理として`createImageBitmap
(photoBlob)`を呼んでいた箇所。iOS Safariは、写真(特にHEIC由来や
特定のメタデータを持つJPEG)によっては、この呼び出しで例外を投げる
ことがある(ブラウザ側の既知の制限で、このリポジトリのコードの
バグではない)。

### 対応

`createImageBitmap`を前処理の唯一の手段にせず、失敗時に自動で
切り替わるフォールバックを追加した:

- `loadImageSource(blob)`という共通の読み込み関数を新設。
  `createImageBitmap`が使える(かつ例外を投げない)場合はそれを使う
  (`ImageBitmap`は`close()`で即座にメモリを解放できるため優先する)。
  使えない・例外を投げた場合は、自動的に
  `Blob → URL.createObjectURL → <img>の load 完了 → (呼び出し側で)
  CanvasへdrawImage`という、Safari互換の経路にフォールバックする。
- `cropForOcr()`/`resizeForOcr()`側は、`ImageBitmap`か`<img>`かを
  意識しない共通の形(幅・高さ・`CanvasImageSource`)だけを受け取る
  ように書き換えた。読み取り範囲(crop)・回転・長辺での縮小といった
  既存のロジック自体は変更していない。
- 縦書き選択・原本写真の保持(呼び出し側から渡される`image`自体は
  一切書き換えない)といった既存仕様も変更していない。
- `document.createElement("canvas")`を使う既存のcrop/resizeロジック
  自体は変更していないため、Canvas 2D APIが使えない環境(そもそも
  無いに等しい)への対応は今回のスコープ外のまま。

### 検証

- `src/lib/fieldnote/ocr.test.ts`に2件追加: `createImageBitmap`が
  `InvalidStateError`を投げる状況を再現し、(1)
  読み取り範囲を指定しない場合(`resizeForOcr`だけが画像を読み込む
  経路)、(2) 読み取り範囲・回転(縦書き)を指定した場合(`cropForOcr`
  も画像を読み込む経路)の両方で、`<img>`ベースのフォールバックへ
  自動的に切り替わり、最終的に`/api/ocr/recognize`への送信まで
  完了することを確認した。回転・切り抜きのCanvas操作
  (`translate`/`rotate`/`drawImage`)が実際に呼ばれていることも
  あわせて確認し、「読み取り範囲・回転の仕様は変えない」ことを
  自動テストで担保した。
- **実機のiOS Safariでは確認できていない**(このセッションに実機が
  無いため)。フォールバック経路自体が動くことは上記のユニットテストで
  検証したが、実際のiPhone Safari・実際の写真での再現・解消の確認は、
  プロジェクトオーナーの実機確認に委ねる。

### 追記: object URLベースのフォールバックも実機で失敗、Data URL経由へ作り直し

上記の`URL.createObjectURL`+`<img>`フォールバックをPreviewへデプロイし、
実機のiPhone Safariで再度OCRを試したところ、今度は
`Error: failed to load image via <img> fallback`(=object URLを
`<img src>`に渡す経路自体の失敗)で止まることが報告された。
`createImageBitmap`・object URL経由の`<img>`のどちらも同じ端末・
同じ写真で失敗しており、Google Vision・Workerのどちらにも未到達
のまま。

**対応(3段構成への作り直し):**

1. `loadImageSource()`を、指示どおり2段構成(`createImageBitmap`→
   失敗時はData URL経由の`<img>`)に作り直した。object URL経由の
   `<img>`は削除した(実機で機能しないことが確認されたため、「補助
   経路として残す」ではなく削除を選んだ)。
2. 新しい経路: `Blob`→`FileReader.readAsDataURL()`→`data:`URL文字列を
   `src`に持つ`<img>`の`load`完了→(呼び出し側で)Canvasへ
   `drawImage`。`FileReader`の`onload`/`onerror`/`onabort`をすべて
   明示的にハンドリングする(`readBlobAsDataUrl()`)。`img`側も
   `onload`/`onerror`を`src`設定前に必ず登録する。
3. **撮影直後のBlob検証を追加**(`validateImageBlob()`)。OCR実行の
   最初に、渡された画像が`image/jpeg`かつ`size > 0`であることを
   確認し、そうでなければGoogle Visionへ送らず、その場で
   `OcrError`(`stage: "image_read"`)を投げる。原本は削除しない
   (検証するだけで書き換え・削除は一切しない)。
4. **利用者向けメッセージから実装詳細を除いた。** `OcrStage`に
   `"image_read"`を追加し、この段階の失敗だけは
   `describeFailure()`(元のエラー文言をそのまま付け足す、Decision
   Log 0192からの既存方針)を使わず、`describeImageReadFailure()`が
   固定文言
   「写真を読み込めませんでした。もう一度試すか、撮り直してください。」
   だけを返すようにした。`createImageBitmap`・`<img>`・
   `InvalidStateError`といった実装詳細は、`console.error`
   (開発用ログ)にだけ出す。この方針転換は、Google Vision側の失敗
   (network/auth/quota/server等)には適用していない——それらは
   引き続き元のエラー文言をそのまま表示する、既存方針のまま。

**検証:** `ocr.test.ts`にさらに3件追加(このファイル全体で7件)。
(1)(2)は前回の2件をData URL経由に書き換えたもの(読み取り範囲の
有無それぞれでフォールバックが機能し送信まで完了すること)、
(3)は`createImageBitmap`・`<img>`(Data URL)の両方が失敗した場合に
利用者向けメッセージに実装詳細(`createImageBitmap`/`<img>`/
`InvalidStateError`)が一切含まれないこと、(4)(5)は撮影直後のBlobが
`image/jpeg`でない・空である場合に、画像読み込み処理を一切試みずに
Google Visionへも送らないこと、をそれぞれ検証した。

**この修正も、実機のiOS Safariでは確認できていない。** 同じ端末・
同じ写真でこの3段構成(特にData URL経由の`<img>`)が実際に成功するか
は、プロジェクトオーナーの次回の実機確認に委ねる。もしこれも失敗する
場合、報告される実際のエラー文言(開発用ログ、または「もう一度試すか、
撮り直してください」という定型文しか出ないため、必要なら実機の
開発者ツール/リモートデバッグでのconsole確認をお願いすることになる)
を踏まえて、次の手を検討する。

## 採用理由 (Rationale)

- 認証を新設せず、公開読書メモAPI(Decision Log 0189)と同じ
  セッション+CSRFの仕組みを再利用することで、実装量を最小限にし、
  かつ「本人限定」という要件を、既に実機で動作確認済みの仕組みの
  上で満たせる。
- コスト防止を「画像サイズ」「1分あたりの回数」「月次上限」の3段に
  分けたのは、それぞれ防ぐ対象が違うため: サイズ上限は1回あたりの
  無駄な転送・処理を防ぎ、レート制限は誤操作・バグによる連打を防ぎ、
  月次上限はGoogle側の無料枠超過による課金の急増そのものを止める
  最後の砦。
- 撮影とOCR起動を分離した(自動→手動)のは、プロジェクトオーナーの
  明示的な指摘のとおり、外部(Google)への送信を伴う操作を、本人の
  明示的な操作なしに毎回自動実行するべきではないため。
- Tesseractを即削除せず`ocrTesseractLocal.ts`に退避させたのは、
  実機確認前に戻せる余地を残したいというプロジェクトオーナーの
  要望による。動作確認後、別PRでの掃除を前提にしている。

## 他の案 (Alternatives)

- secret名を環境ごとに分ける案(`GOOGLE_VISION_API_KEY_PRODUCTION`/
  `_PREVIEW`)も検討したが、プロジェクトオーナーの指示により、
  同じ変数名でCloudflare側の値だけを分ける方式に変更した。
- 月次上限を単一のグローバル値(合算で1,000)として扱う案も検討したが、
  Preview/Production間の食い合いを防ぐため、環境ごとに個別の
  D1データベース(既存のPreview/Production分離構成、Decision Log
  0146)を活かして、それぞれ独立に判定する設計にした。
- サービスアカウント(JSON鍵)を使う方式も検討したが、Cloudflare
  Workerからの呼び出しでは「APIキーのみ制限したキー」の方が、
  秘密鍵ファイルの管理を増やさずに済むため、こちらを採用した
  (比較ツール側のADC認証、Decision Log 0197とは別の判断)。
- テストの実行環境として、`@cloudflare/vitest-pool-workers`
  (Miniflare上でD1・secretを本物に近い形で再現する、Cloudflare公式の
  テスト基盤)も試した。しかし`worker/index.ts`は最初から
  `@cloudflare/workers-types`を増やさず、D1等を自前の最小限の型
  だけで書く設計になっており(ファイル冒頭コメント参照)、実際に
  使っている標準Web API(`fetch`/`Request`/`Response`/
  `crypto.subtle`/`btoa`/`atob`)はいずれもNode上でも動く。D1も
  今回のテスト対象クエリだけを解釈する最小限のフェイクで十分再現
  できたため、Miniflare・wrangler設定・D1マイグレーション適用と
  いった追加の仕組みを持ち込まず、プレーンな`vitest`(Node環境)だけで
  完結させた(CLAUDE.mdの「プレーンな関数で解決できる問題にライブラリ
  を増やさない」という方針に沿う判断)。

## 将来の変更可能性 (Future changes)

- 実機確認が完了し、Tesseractへ戻す必要がないと判断できた時点で、
  別PRで`ocrTesseractLocal.ts`・`public/vendor/tesseract/`・
  `tesseract.js`依存を削除する。
- 呼び出し量が増え、Preview/Productionそれぞれの月次上限が窮屈に
  なった場合は、Google Cloudプロジェクト自体を分離し、無料枠の
  合算を回避することを検討する。
- 「処理中のまま中断された記録」への再試行導線(現状は本人が改めて
  「読み取る」を押せば良いだけで、専用のUIは設けていない)は、
  実際に問題になった場合に改めて検討する。

## Research Context

「公開研究室」としての本棚・読書メモ公開機能とは別に、個人の読書
記録という私的な領域でGoogle Cloud Visionという外部サービスを使う
以上、「何を・いつ・誰の操作で送るか」を曖昧にしないことが、この
プロジェクトの一貫した姿勢(Decision Log 0141・0143・0197の認証・
送信範囲の扱いに通じる)に沿う。撮影を自動から手動トリガーへ変えた
判断も、「送信」という行為には本人の明示的な意思が伴うべきだという、
研究記録を本人のものとして扱う設計の延長にある。
