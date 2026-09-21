# public/vendor/tesseract/

Fieldnote Reading(`/fieldnote/`)のOCR機能(Decision Log 0188)が使う
Tesseract.js関連アセットを、npmパッケージからそのまま(無改変で)自己
ホストしたもの。CDN(cdn.jsdelivr.net等)には依存しない——このリポジトリ
のビルド出力だけで完結させるため、また外部CDNの到達性・可用性に機能を
左右されないため。

## 内容・取得元・バージョン

| ファイル | 取得元パッケージ | バージョン | ライセンス |
|---|---|---|---|
| `worker.min.js` | `tesseract.js`(`dist/worker.min.js`) | 5.1.1 | Apache-2.0 |
| `tesseract-core-simd-lstm.wasm.js` | `tesseract.js-core` | 6.1.2 | Apache-2.0 |
| `tesseract-core-lstm.wasm.js` | `tesseract.js-core`(非SIMD版) | 6.1.2 | Apache-2.0 |
| `lang-data/jpn.traineddata.gz` | `@tesseract.js-data/jpn`(`4.0.0_best_int/`) | 1.0.0 | MIT(パッケージ) / Apache-2.0(訓練データ本体、tesseract-ocr/tessdata_best由来) |
| `lang-data/jpn_vert.traineddata.gz` | `@tesseract.js-data/jpn_vert`(`4.0.0_best_int/`) | 1.0.0 | 同上 |

## SIMD版・非SIMD版の両方を同梱している理由(2026-09-20、Decision Log 0192で変更)

当初はSIMD版のみを同梱していたが、実機(iPhone、実際のCloudflareデプロイ)で
OCRが失敗する事象が報告され、原因の切り分けのため非SIMD版
(`tesseract-core-lstm.wasm.js`)も同梱するよう変更した。`src/lib/fieldnote/ocr.ts`が
`wasm-feature-detect`の`simd()`で実行時に対応状況を判定し、非対応の場合は
自動的に非SIMD版へフォールバックする。判定自体に失敗した場合はSIMD版を
既定にする。

## 量子化モデル(`best_int`)を選んだ理由

`best`(非量子化、jpn単体で約16MB)ではなく`best_int`(量子化、約2MB)を
採用した。実測(Decision Log 0187)で両者の精度に有意差が見られず、
ダウンロードサイズが1/8で済むため。

## 更新方法

`npm view @tesseract.js-data/jpn`等でバージョンを確認し、該当パッケージを
一時的に`npm install`してから、上表のファイルをそのまま上書きコピーする
(このディレクトリ自体はpackage.jsonの依存関係には含めていない——
ビルド時に必要なのはこの自己ホスト済みの静的ファイルのみで、
`tesseract.js`本体だけがnpm依存として`src/lib/fieldnote/ocr.ts`から
importされる)。
