import { defineConfig } from "astro/config";

// 静的サイトとして出力する。
// Cloudflare Pages を第一候補としつつ、特定サービスに依存しない構成を維持する。
// (Cloudflare固有のアダプター/機能は導入しない)
export default defineConfig({
  output: "static",

  // OGPメタタグ(og:image・og:url等)の絶対URL生成に使う(2026-09-04、
  // Decision Log 0082)。2026-09-05、独自ドメイン取得(Decision Log
  // 0098)に伴いhttps://futo-site.pages.devから変更した。ホスティング
  // 自体はCloudflare Pagesのまま、独自ドメインを接続している。
  site: "https://futoing.com",

  // CSS Modules をデフォルトで利用可能にする(Astro/Viteの標準機能。追加設定不要)
  // 参考: *.module.css というファイル名にするとCSS Modulesとして扱われる

  build: {
    format: "directory",
  },
});
