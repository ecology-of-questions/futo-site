-- 0005_sora_log_watch_mode.sql
-- ------------------------------------------------------------
-- 「みはりモード」(自動検知による記録、Decision Log 0221)用の列を
-- 追加する。使っていない端末を窓辺に置いて開いておくと、マイクで
-- 測った音の大きさ(dB相当の数値)が、設定した大きさ以上に設定した
-- 秒数以上続いたときだけ、自動で1件記録する。音声そのものは録音・
-- 送信しない。送信されるのは、記録時刻・継続秒数・最大の大きさの
-- 数値だけ。
--
-- `source`は既存の全行に対して既定値'manual'を設定する(過去の記録は
-- すべて手動記録として扱う)。
-- ------------------------------------------------------------
ALTER TABLE sora_log_entries ADD COLUMN source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'watch'));
ALTER TABLE sora_log_entries ADD COLUMN duration_seconds INTEGER CHECK (duration_seconds IS NULL OR (duration_seconds >= 0 AND duration_seconds <= 600));
ALTER TABLE sora_log_entries ADD COLUMN max_level_db INTEGER CHECK (max_level_db IS NULL OR (max_level_db >= 0 AND max_level_db <= 140));

CREATE INDEX IF NOT EXISTS idx_sora_log_source ON sora_log_entries (status, source, created_at);
