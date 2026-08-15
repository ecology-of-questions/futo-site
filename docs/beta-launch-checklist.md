# β公開チェックリスト

「公開研究室、開室。」に向けた、公開前確認用のチェックリスト。
実装タスクではなく、公開判断のための確認項目。

## コンテンツ

- [x] Home(Hero)
- [x] Home(Research Statement) — v0.1(First Draft)反映済み。今後も改訂前提
- [x] Research Statement 正式版への差し替え(v0.1 First Draft)
- [x] Research ページ(プレースホルダー)
- [ ] About(運営者について。公開直前に情報設計を詰める)

## ページ間の導線

- [x] Home → Research(Research Statement末尾のリンク)
- [x] Research → Research Statement(アンカーリンク)
- [x] Research Statement → Research Reviews(アンカーリンク)
- [x] Header(グローバルナビ)実装後、上記との重複・整合を再確認 — Research Statementへの導線はHeaderに含めず、既存のページ内リンクのみとした(Decision Log 0021)

## 見た目・体験

- [x] モバイル確認(Hero / Research Statement / Research ページ) — Heroのモバイル表示順バグを修正(Decision Log 0020)
- [ ] リンク確認(内部リンク・アンカーがすべて正しい遷移先か)
- [ ] Hero Visual Fragment の画像差し替え(現在プレースホルダー表示)
- [ ] 色(tokens.css)の最終確認 — 現在は仮値

## 技術・SEO

- [x] favicon(Decision Log 0021)
- [ ] OGP(タイトル・説明文・画像)
- [x] 404ページ(Decision Log 0019)
- [ ] 各ページの `<title>` / meta description 確認
- [ ] Footer の内容確認(現在未実装)
- [x] Header の内容確認 — ロゴ + Home/Researchナビを実装(Decision Log 0021)
- [ ] ビルド確認(`npm run build` がエラーなく通ること)
- [ ] 実機での表示確認(デスクトップ・スマートフォン)

## 公開後にやること(β公開時点では未着手でよい)

- [ ] Research Review 詳細UIの実装
- [ ] Research Reviewのバージョン管理
- [ ] Research Fragmentsの実装

---

このチェックリストは `docs/Design_Spec/` や `docs/Decision_Log/` とは
性質が異なる、運用のためのドキュメント。項目の追加・削除は
自由に行ってよい。
