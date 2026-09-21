import { defineConfig } from "vitest/config";

/**
 * vitest.config.ts
 * ------------------------------------------------------------
 * Google Cloud Vision統合(2026-09-21、Decision Log 0198)で追加した
 * 実際の挙動テスト用。worker/index.tsはCloudflare Workers固有のAPI
 * を、外部依存(@cloudflare/workers-types)を増やさず自前の最小限の
 * 型(D1Database等)だけで書いている(worker/index.tsの冒頭コメント
 * 参照)。そのため、Cloudflareの実行環境(Miniflare等)を持ち込まなくても、
 * fetch/crypto.subtle/Request/Response等の標準Web APIが揃っている
 * プレーンなNode環境で直接テストできる。D1・Google Cloud Visionは
 * テストごとに最小限のフェイク実装/vi.stubGlobalで差し替える
 * (`worker/ocr-recognize.test.ts`参照)。
 * ------------------------------------------------------------
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["worker/**/*.test.ts", "src/**/*.test.ts"],
  },
});
