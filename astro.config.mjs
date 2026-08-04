import { defineConfig } from "astro/config";

// 静的サイトとして出力する。
// Cloudflare Pages を第一候補としつつ、特定サービスに依存しない構成を維持する。
// (Cloudflare固有のアダプター/機能は導入しない)
export default defineConfig({
  output: "static",

  // CSS Modules をデフォルトで利用可能にする(Astro/Viteの標準機能。追加設定不要)
  // 参考: *.module.css というファイル名にするとCSS Modulesとして扱われる

  build: {
    format: "directory",
  },
});
