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
- `--with-google`を付けても、`GOOGLE_VISION_API_KEY`環境変数が
  設定されていなければ送信されない(スクリプトが自動でスキップする)。
- **写真をGoogleへ送る前に、必ず「どの写真のどの範囲を送るか」を
  本人が確認・同意すること。** このツール自体は同意確認をしない
  (呼び出す人間の責任)。
- 原則として、本のページ範囲(ガイド枠で切り出した範囲)のみを送る。
  背景の物・他の書類が写り込んだ全体画像はなるべく送らない。

## Google Cloud Visionの設定

1. Google Cloud Consoleでプロジェクトを作成(または既存のものを使う)、
   課金を有効化する。
2. Cloud Vision APIを有効化する。
3. APIキーを発行し、Cloud Vision APIのみに制限する(推奨)。
4. 発行したキーは、**このチャット・コミット・リポジトリのどこにも
   貼らず**、実行する端末のシェルで環境変数として設定する:
   ```bash
   export GOOGLE_VISION_API_KEY="発行したキー"
   ```
5. 上記コマンドを`--with-google`付きで実行する。

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
  (DOCUMENT_TEXT_DETECTION、REST API、APIキー認証)
- `cer.mjs` — 文字誤り率(編集距離÷正解文字数)の計算
