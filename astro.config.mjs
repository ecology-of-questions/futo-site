import { defineConfig } from "astro/config";

// 静的サイトとして出力する。
// Cloudflare Pages を第一候補としつつ、特定サービスに依存しない構成を維持する。
// (Cloudflare固有のアダプター/機能は導入しない)
export default defineConfig({
  output: "static",

  // OGPメタタグ(og:image・og:url等)の絶対URL生成に使う(2026-09-04、
  // Decision Log 0082)。現在の公開先(Cloudflare Pages)のURL。
  // 独自ドメインを設定した場合はここを更新すること。
  site: "https://futo-site.pages.dev",

  // CSS Modules をデフォルトで利用可能にする(Astro/Viteの標準機能。追加設定不要)
  // 参考: *.module.css というファイル名にするとCSS Modulesとして扱われる

  build: {
    format: "directory",
  },
});
