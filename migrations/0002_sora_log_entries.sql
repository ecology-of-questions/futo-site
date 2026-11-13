-- 0002_sora_log_entries.sql
-- ------------------------------------------------------------
-- 「そらのようす」(実験室のノート、/sora-no-yousu/)の記録用スキーマ
-- (2026-11-13、Decision Log 0216)。頭上を飛ぶ飛行機・ヘリの音を
-- 暮らしの観察として記録し、その集計を公開するための公開記録。
--
-- 0001_init.sqlの`entries`(交換ノート機能)とは別のテーブルにする。
-- 記録の性質が異なる(こちらは不特定多数が繰り返し投稿する定点観測の
-- 記録で、ノート単位の長文コメントではない)ため、同じテーブルを
-- 流用せず専用テーブルとした。
--
-- 時刻は`created_at`(サーバーが受信した時刻)のみを保持する。投稿者が
-- 時刻を指定・修正する機能は持たせない(記録の確かさを保つため、
-- 「いつ受け取ったか」という1つの、サーバー側で制御された時刻だけを
-- 正とする)。
--
-- 個人を特定できる情報(氏名・メールアドレス・端末ID・位置情報)は
-- 保存しない。不正投稿対策用のIPハッシュのみ、0001_init.sqlの`entries`
-- と同じ方式(HMAC-SHA256、生IPは保存しない)で保持する。
--
-- `status`は将来の不正対策(荒らし投稿を集計から外す)のための列。
-- 'excluded'にした記録も削除せず残す(除外した記録も消さない、という
-- 利用規約ドラフトの方針に沿うが、実際に除外理由・件数を公開する
-- 仕組み自体はまだ実装していない。現時点では全件'visible'で運用する)。
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sora_log_entries (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('plane', 'heli', 'unknown')),
  loudness TEXT NOT NULL CHECK (loudness IN ('heard', 'loud', 'very-loud')),
  weather TEXT CHECK (weather IS NULL OR weather IN ('sun', 'cloud', 'rain')),
  place TEXT CHECK (place IS NULL OR place IN ('indoor', 'outdoor')),
  count INTEGER CHECK (count IS NULL OR count IN (1, 2, 3)),
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  status TEXT NOT NULL DEFAULT 'visible' CHECK (status IN ('visible', 'excluded')),
  ip_hash TEXT
);

-- 公開一覧の取得(公開分のみ、時系列順)と、IPハッシュによる連投
-- チェックの両方で使うための複合インデックス。
CREATE INDEX IF NOT EXISTS idx_sora_log_status_created_at ON sora_log_entries (status, created_at);
CREATE INDEX IF NOT EXISTS idx_sora_log_ip_hash ON sora_log_entries (ip_hash, created_at);
