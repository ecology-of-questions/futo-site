-- 0004_sora_log_municipality.sql
-- ------------------------------------------------------------
-- 「そらのようす」の記録に、任意の市区町村を追加する(2026-11-13、
-- Decision Log 0220)。都道府県だけでは、飛行ルート・基地周辺との
-- 関連付けができず研究・報道等の用途に対してデータとして粗すぎる、
-- との指摘を受けたが、自由入力は表記ゆれ・データ品質の懸念から
-- 見送った(Decision Log 0219)。そのため、全国の市区町村の公式名称
-- 一覧(`public/municipalities.json`、Geolonia住所データ/国土交通省
-- 位置参照情報ベース、CC BY 4.0)から選ぶ、選択式の項目として追加する。
--
-- 都道府県と同様、CHECK制約で候補一覧そのものを埋め込むには件数が
-- 多すぎる(約1,900件)ため、DB側のCHECK制約は持たせず、
-- worker/index.ts側で「選ばれた都道府県の中に実在する市区町村名か」を
-- 検証する(アプリケーション側でのみ保証する設計)。
-- ------------------------------------------------------------
ALTER TABLE sora_log_entries ADD COLUMN municipality TEXT;

CREATE INDEX IF NOT EXISTS idx_sora_log_municipality ON sora_log_entries (status, prefecture, municipality);
