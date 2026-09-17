# トップページ改修 v1 — Claude Codeへの引き継ぎ

基準: ecology-of-questions/futo-site main ec5e1d7363fde5802536f12a9d54037aa82310a2
公開・GitHub push・Cloudflare設定変更は行っていません。

## 取り込み

1. 現在のmainと作業ツリーを確認し、新しいブランチを作る。
2. ZIP内 `changes.patch` に対し `git apply --check /path/to/changes.patch`。
3. 問題がなければ `git apply /path/to/changes.patch`。ZIP内source/は変更後のソース一式なので、比較にも使える。patch適用と全ソース上書きを両方行わない。
4. `npm ci` → `npm run build` → `npx astro check`。
5. 通常のプレビュー手順でPC・スマホ表示を確認し、ユーザーにプレビューURLを渡す。本番マージはレビュー後。

mainがec5e1d7から進んでいる場合は差分を確認し、後続変更を上書きしない。docs/Decision_Log/0174の番号が使用済みなら新番号に変更して参照も揃える。

## 変更内容

- `src/pages/index.astro` / `index.module.css`: 画像案の方向性をもとに、実データでHomeを再構成。
- `src/components/HomeBook.astro`: Homeの書影表示。取得待ち・失敗・JS無効でも書名を保持。小さいカバーでは著者を省略して書名を優先。書誌データは変更していない。
- `src/layouts/DefaultLayout.astro`: opt-inのeditorialテーマを追加。
- `src/styles/tokens.css`: Home限定の色・寸法トークン。
- `src/styles/global.css`: Home限定のHeader/Footer整形。
- Design Spec v0.6-home-editorial、Decision Log 0174、0150の部分的なsupersession追記。

構成: 短い紹介 → 音の道 → 最新研究断面2件・読書中3冊 → 既存研究便りフォーム。
既存ナビゲーション・ロゴ・全URL・記事・本棚のcanonical data・問い合わせ・Googleスライド・Worker/D1・Cloudflare設定は維持。

## 大きい画像

未確定のため、仮の抽象線画です。実際の身体譜や作品写真ではありません。
index.astroの`featureImage`にローカル画像URLを設定すると差し替わります。現状は仮置きのままレビューする想定。
画像案にあった架空の記事・書籍、未実装の独立ページリンクは採用していません。

## 検証

- `npm run build`: 成功、15ページ生成。
- `npx astro check`: エラー0、警告0。既存SectionTitle.astroの未使用Propsに関するhintが1件。
- Chromiumで幅1440 / 768 / 390 / 320pxを描画し、横はみ出し無し・pageerror無し。スクリーンショットで見た目を確認。
- モバイルメニュー開閉・Escape閉じを確認。
- 研究便りの成功／サーバーエラーをリクエストの差し替えで確認。実際の外部送信は行っていない。
- トップ内のルート相対リンクがビルド結果に存在することを確認。
- 書影リクエストを遮断しフォールバック表示を確認。スクリーンショットの本は仮カバー。実書影の取得成功は未検証。
- ブラウザーの制約によりローカルHTTPサーバーへの接続ができなかったため、ビルド済みHTML/CSS/JSをPlaywrightのrouteで供給して描画。実デプロイ経路、iOS Safari、Googleスライド、D1、フォームの実受信は今回の検証対象外。
- 日本語スクリーンショットはQA環境のNoto Serif CJK。Mac/iOSは既存指定のヒラギノ/游明朝を使用するため字形は異なる。QA専用フォントとブラウザーはソース・依存関係に追加していない。

## 内容についての注意

研究便りは基準コードのFormspree登録希望送信を維持しており、Substackへの自動登録を新設したわけではありません。書籍の所有状況等は元のデータを維持しています。

## 同梱物

- source/: 変更後のソース一式（依存パッケージ・秘密情報・ビルド物なし）
- changes.patch: 基準ZIPからの変更。新規コンポーネント・設計資料も含む。
- previews/: 実コードのPC・スマホ・タブレット画像と検証結果
- IMPLEMENTATION.md: この手順書
