# OCRエンジン比較ツール

Fieldnote(`/fieldnote/`)の縦書きOCR精度改善のため、現行のTesseract.js
実装と、他のOCRエンジン(まずGoogle Cloud Vision
DOCUMENT_TEXT_DETECTION)を、実際の書籍ページ写真で比較するための
ローカル専用ツール(2026-09-21〜、Decision Log 0196)。

**公開サイトのビルドには一切含まれない。** `src/`の外(`scripts/`配下)
にあり、`npm run build`の対象にもならない。

## 使い方

```bash
# Tesseract.jsのみ(完全にローカル、外部送信なし)
node scripts/ocr-compare/compare.mjs \
  --image path/to/photo.jpg \
  --orientation vertical \
  --image-id photo-01 \
  --crop-condition "ガイド枠相当に切り出し済み"

# 正解文と比較する場合(必ず人が確認した正解文を用意すること。
# AIが生成した文字起こしを未確認のまま正解文として使わない)
node scripts/ocr-compare/compare.mjs \
  --image path/to/photo.jpg \
  --orientation vertical \
  --image-id photo-01 \
  --ground-truth path/to/correct-text.txt

# Google Cloud Visionも含めて比較する場合(下記「Google Cloud Vision
# の設定」を先に行い、--with-googleを明示的に付けたときだけ送信する)
node scripts/ocr-compare/compare.mjs \
  --image path/to/photo.jpg \
  --orientation vertical \
  --image-id photo-01 \
  --with-google
```

## 外部送信について(重要)

- `--with-google`を付けない限り、画像はどこにも送信されない
  (Tesseract.jsは完全に端末内で完結する)。
- `--with-google`を付けても、本人のPC上で`gcloud auth
  application-default login`によるログインが済んでいなければ送信
  されない(スクリプトが自動でスキップする)。
- **写真をGoogleへ送る前に、必ず「どの写真のどの範囲を送るか」を
  本人が確認・同意すること。** このツール自体は同意確認をしない
  (呼び出す人間の責任)。
- 原則として、本のページ範囲のみを送る。背景の物・手等が写り込んだ
  全体画像は送らない。

## Google Cloud Visionの設定(Application Default Credentials方式)

APIキーではなく、**本人がこのPC上でGoogleにログインして発行する
認証情報(ADC)** を使う。認証情報はリポジトリにもブラウザにも置かず、
`gcloud` CLIがOS標準の場所(`~/.config/gcloud/`等)に保存する。
**この比較スクリプトは、本人のPC(このリポジトリをcloneした端末)上で
実行すること。** クラウド上の実行環境では、本人のGoogleアカウントでの
ログイン操作自体ができないため。

1. **Google Cloud CLI(`gcloud`)をインストールする**(未インストール
   の場合のみ)。公式手順: https://cloud.google.com/sdk/docs/install
   インストール済みかどうかは `gcloud --version` で確認できる。
2. **Google Cloudプロジェクトを作る**(Google Cloud Consoleで、または
   `gcloud projects create`)。
3. **課金を有効化する**(Google Cloud Consoleの「お支払い」から、
   作成したプロジェクトに請求先アカウントを紐づける)。
4. **Cloud Vision APIを有効化する**:
   ```bash
   gcloud services enable vision.googleapis.com --project=<プロジェクトID>
   ```
5. **既定のプロジェクトを設定する**:
   ```bash
   gcloud config set project <プロジェクトID>
   ```
6. **Application Default Credentialsでログインする**(自分のPCの
   ブラウザが開き、Googleアカウントでのログイン・同意を求められる):
   ```bash
   gcloud auth application-default login
   ```
7. 上記が済んだら、`--with-google`付きで実行する。認証情報は
   このコマンドを実行した端末にのみ保存され、スクリプトはその場限りの
   アクセストークンを取得して使うだけで、トークン自体を保存・出力
   しない。

料金については、このリポジトリのDecision Log 0196
(`docs/Decision_Log/`)に、公式料金ページに基づく試算を記録している。

## 出力・記録について

- 認識結果の全文は、デフォルトでは標準出力に表示しない
  (`--show-text`で表示できるが、これはローカルでの目視確認専用)。
- 比較結果(処理時間・文字誤り率等の集計値)は、Decision Logに記録する
  際も画像ID単位の集計のみとし、写真本文・認識結果の全文・正解文は
  Git・PR・公開ログに含めない。

## ファイル構成

- `compare.mjs` — 実行スクリプト(CLI)
- `engines/tesseract-engine.mjs` — Tesseract.js(ローカル、自己ホスト
  済みアセットを使用、Fieldnote本体と同じPSM設定)
- `engines/google-vision-engine.mjs` — Google Cloud Vision
  (DOCUMENT_TEXT_DETECTION、REST API、Application Default
  Credentials認証)
- `cer.mjs` — 文字誤り率(編集距離÷正解文字数)の計算
