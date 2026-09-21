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

PreviewのURL(`futo-site-preview.workers.dev`、またはWorkers Builds
が発行するプレビューURL)で、実機(iPhone)から:

1. 管理者ログイン(公開プレビュー画面のログインフォーム)。
2. Fieldnoteで撮影 → 記録一覧で「文字を読み取る」→ 送信前の明示文
   ・候補・信頼度が表示されることを確認 → 「使う」で抜粋に反映される
   ことを確認。
3. Google Cloud Console(該当プロジェクトの「APIとサービス」>
   「割り当てとシステム上限」等)で、Vision APIの呼び出しが実際に
   1回だけ計上されていることを確認する(想定外の多重呼び出しが
   無いかの実地確認)。

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
  `worker/ocr-recognize.test.ts`・`src/lib/fieldnote/ocrQueue.test.ts`
  ・`src/lib/fieldnote/ocr.test.ts`(いずれも新規): 「検証」の節参照。
  devDependencyとして`vitest`のみ追加(Cloudflare実行環境のツールは
  不要だったため追加していない、詳細は「他の案」参照)。
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
  引数に取るようになった(`csrfToken`必須)。
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
- `src/pages/fieldnote/index.astro` / `index.module.css`:
  「読み取り待ち◯枚」表示(`#ocr-pending-count`)のマークアップ・
  スタイルを削除。送信前明示文・ログイン案内文のスタイルを追加。

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

### `src/lib/fieldnote/ocr.test.ts`(2件、送信先の確認)

`createImageBitmap`/`FileReader`(Node に無いブラウザAPI)だけを
最小限のフェイクに差し替え、`recognizeExcerpt`が実際に`fetch`する
先を検証:
- 送信先は常に同一オリジンの相対パス`/api/ocr/recognize`であり、
  `vision.googleapis.com`等のGoogleのドメインを一切含まない
  (＝ブラウザからGoogleへ直接送信しないことの直接的な確認)。
- 送信する本文は、画像原本ではなくJSON(`imageBase64`/`orientation`)
  であり、CSRFトークンがヘッダに含まれること。

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
