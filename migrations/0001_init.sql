-- 0001_init.sql
-- ------------------------------------------------------------
-- 「実験室」ノートの書き足し(交換ノート)機能用スキーマ
-- (2026-09-13、Decision Log 0141)。
--
-- 保存するのは本文・状況・URL・投稿日時・公開状態・不正投稿対策用の
-- IPハッシュのみ(名前・メールアドレス・アカウントは保存しない)。
-- notebook_slugはsrc/data/labNotebooks.tsのslug(oto-no-michi /
-- fieldnote / research-fragments)と対応する。
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS entries (
  id TEXT PRIMARY KEY,
  notebook_slug TEXT NOT NULL,
  body TEXT NOT NULL,
  context TEXT,
  url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  status TEXT NOT NULL DEFAULT 'visible' CHECK (status IN ('visible', 'hidden')),
  ip_hash TEXT
);

-- ノート単位の一覧取得(公開分のみ、時系列順)と、IPハッシュによる
-- 連投チェックの両方で使うための複合インデックス。
CREATE INDEX IF NOT EXISTS idx_entries_notebook_slug ON entries (notebook_slug, status, created_at);
CREATE INDEX IF NOT EXISTS idx_entries_ip_hash ON entries (ip_hash, created_at);
