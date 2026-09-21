-- 0003_ocr_usage.sql
-- ------------------------------------------------------------
-- Fieldnote ReadingのOCR(Google Cloud Vision)機能の、費用暴走防止用
-- カウンタ(2026-09-21、Decision Log 0198)。
--
-- 画像・認識結果(OCRの入出力の中身)は一切保存しない。ここに置くのは
-- 「いつ何回呼ばれたか」という件数だけ。
--
-- ocr_usage_monthly: 月次上限(Google Cloud Vision無料枠がGCPプロジェクト
-- 単位で合算されるため、Preview/Productionそれぞれ個別の上限をWorker側
-- のvarsで判定する。このテーブル自体はPreview/Production共用のD1
-- スキーマ定義だが、実際のD1データベースリソースはPreview/Productionで
-- 物理的に別(wrangler.toml参照)なので、カウンタも自然に分かれる)。
--
-- ocr_recent_calls: 直近の呼び出し時刻のみを記録する、簡易レート制限用
-- (1分あたりの呼び出し回数を判定する。admin_login_attemptsと同じ考え方)。
-- 古い行は呼び出しのたびに機会的に削除する(専用のバッチ処理は設けない)。
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ocr_usage_monthly (
  -- "YYYY-MM"(UTC)。
  period TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS ocr_recent_calls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  called_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ocr_recent_calls_called_at ON ocr_recent_calls (called_at);
