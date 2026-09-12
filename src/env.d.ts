/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  /**
   * Amazonアソシエイトのトラッキングタグ。未設定でよい(値が無い場合、
   * 購入リンクはアソシエイトタグなしの通常リンクとして扱われる)。
   * `src/config/site.ts`参照(2026-09-12、Decision Log 0138)。
   */
  readonly PUBLIC_AMAZON_ASSOCIATE_TAG?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
