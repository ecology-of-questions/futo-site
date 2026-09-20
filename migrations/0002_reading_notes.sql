-- 0002_reading_notes.sql
-- ------------------------------------------------------------
-- 公開本棚(/bookshelf)の読書メモを、Fieldnote Readingの公開プレビュー
-- から本人限定の認証付きAPIで直接反映できるようにするためのスキーマ
-- (2026-09-20、Decision Log 0189)。
--
-- 既存の交換ノート(entries)テーブルと同じD1データベース
-- (futo-lab-notebooks-production / -preview)を再利用する。新しい
-- D1データベースリソースは作らない(Cloudflare側の追加設定を
-- 最小限にするため)。
--
-- 訪問者は誰も書き込めない(entriesテーブルとは異なり、書き込みは
-- 認証済みの運営者本人のみ)。statusは論理削除(取り下げ)用で、
-- 'published'のみが公開本棚に表示される。'retracted'は物理削除せず
-- 履歴として残す(誤操作からの復旧・監査のため)。
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reading_notes (
  id TEXT PRIMARY KEY,
  book_id TEXT NOT NULL,
  author_reflection TEXT NOT NULL,
  quote TEXT,
  quote_location TEXT,
  related_records_json TEXT,
  -- 表示用の公開日(YYYY-MM-DD)。既存のPublicReadingNote.publishedAtと
  -- 同じ意味で、created_at/updated_at(操作の実時刻)とは別に持つ。
  published_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'retracted')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 本棚表示(book_id・status絞り込み・新しい順)用のインデックス。
CREATE INDEX IF NOT EXISTS idx_reading_notes_book_id ON reading_notes (book_id, status, published_at);

-- ログイン試行のレート制限用(entriesテーブルのip_hashと同じ考え方:
-- 生IPは保存せず、Workerのsecretで鍵付けしたハッシュのみ保存する)。
-- 失敗したログイン試行のみ記録し、一定時間・一定回数を超えたら
-- 429を返す(Decision Log 0189)。
CREATE TABLE IF NOT EXISTS admin_login_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip_hash TEXT NOT NULL,
  attempted_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_admin_login_attempts_ip_hash ON admin_login_attempts (ip_hash, attempted_at);
