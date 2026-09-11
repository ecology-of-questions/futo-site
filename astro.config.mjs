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

  // 【/research-statement/ のリダイレクト削除(2026-09-10)】
  // 2026-09-09に専用ページを廃止しHomeへ統合した際に設定した
  // リダイレクト(Decision Log 0102)。2026-09-10のトップページ
  // 再設計で専用ページを復活させたため(Decision Log 0111)、
  // このリダイレクト設定自体が不要になり削除した。

  // 【/support のリダイレクト追加(2026-09-11、Decision Log 0120)】
  // 支援ページ(/support)を独立ページとして育てない方針に転換した
  // ため、既存URLへのアクセスが404にならないよう/participateへ
  // 誘導する。output: "static"のため、Astroが静的なmeta refresh
  // ページを生成する(Cloudflare固有の_redirects等には依存しない、
  // ポータブルな方式。/research-statement時と同じ考え方)。
  redirects: {
    "/support": "/participate",
  },
});
