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

(実装時点では未設定。プロジェクトオーナー自身の作業として残っている)

1. Google Cloudプロジェクトで Cloud Vision API を有効化する。
2. 課金アカウントを紐づける(無料枠を超えた分の請求先)。
3. 「Cloud Vision APIのみ」に制限したAPIキーを発行する
   (Google Cloud Console > 認証情報 > APIキー制限)。
4. 発行したキーの値を、後述のCloudflare secretとして設定する
   (このAPIキーの値自体はチャット・コミットに一切含めない)。

### Cloudflareに設定するsecret名

- `GOOGLE_VISION_API_KEY` — Preview/Productionで**同じ変数名**、
  値だけを環境ごとに個別設定する(プロジェクトオーナーの指示により、
  環境名をキー名に含めない設計にした。コードは環境名を意識しない)。
  `wrangler secret put GOOGLE_VISION_API_KEY`(Production)/
  `wrangler secret put GOOGLE_VISION_API_KEY --env preview`
  (`futo-site-preview`)を、本人の確認後にそれぞれ実行する想定。
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

### 既存PR #114〜#119との依存関係・ブランチ

- ブランチ`claude/fieldnote-ocr-google-vision`を、Decision Log
  0192〜0195の連続撮影・クロップガイド実装がまとまっている
  `claude/fieldnote-ocr-continuous-v3`(PR #119)から分岐して作業した。
  この変更はその上に積む形なので、PR #119の内容に依存する。
- PR #114〜#118(認証・公開API等)は`main`に既にマージ済みの前提の
  上に成り立っている(`requireSession`/`requireCsrf`を新規実装せず
  再利用しているため)。

## 変更したファイル(実装)

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
