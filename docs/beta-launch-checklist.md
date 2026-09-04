# β公開チェックリスト

「公開研究室、開室。」に向けた、公開前確認用のチェックリスト。
実装タスクではなく、公開判断のための確認項目。

## コンテンツ

- [x] Home(Hero)
- [x] Home(Research Statement) — v0.1(First Draft)反映済み。今後も改訂前提
- [x] Research Statement 正式版への差し替え(v0.1 First Draft)
- [x] Research ページ(プレースホルダー)
- [x] About(運営者について) — 実装済み(Decision Log 0057、以降複数回改訂)

## ページ間の導線

- [x] Home → Research(Research Statement末尾のリンク)
- [x] Research → Research Statement(アンカーリンク)
- [x] Research Statement → Research Reviews(アンカーリンク)
- [x] Header(グローバルナビ)実装後、上記との重複・整合を再確認 — Research Statementへの導線はHeaderに含めず、既存のページ内リンクのみとした(Decision Log 0021)

## 見た目・体験

- [x] モバイル確認(Hero / Research Statement / Research ページ) — Heroのモバイル表示順バグを修正(Decision Log 0020)
- [x] リンク確認(内部リンク・アンカーがすべて正しい遷移先か) — 全ページのhref/linkHrefを棚卸しし、実在ルートへの遷移を確認済み(2026-09-04)
- [x] Hero Visual Fragment の画像差し替え(現在プレースホルダー表示) — 正式アートワーク(03_top_page_artwork.png)に差し替え済み
- [ ] 色(tokens.css)の最終確認 — 現在も「仮値」というコメントが残っているが、多数のDecision Log(0059〜0062等)を経て実質的に確定した値として使われている。コメント自体の更新は未着手

## 技術・SEO

- [x] favicon(Decision Log 0021)
- [x] OGP(タイトル・説明文・画像) — 実装済み(Decision Log 0082)
- [x] 404ページ(Decision Log 0019)
- [x] 各ページの `<title>` / meta description 確認 — 全ページに個別のtitleを設定済み。descriptionは一部ページが既定値のまま(必要に応じて追加)
- [x] Footer の内容確認 — 実装済み(Decision Log 0057・0067)
- [x] Header の内容確認 — ロゴ + ナビを実装(Decision Log 0021・0057・0080)
- [x] ビルド確認(`npm run build` がエラーなく通ること)
- [x] 実機での表示確認(デスクトップ・スマートフォン) — Playwrightでのモバイル幅・横スクロール確認は都度実施

## 公開後にやること(β公開時点では未着手でよい)

- [x] Research Review 詳細UIの実装 — 一部解禁済み(01・1.5、Decision Log 0030・0068)
- [ ] Research Reviewのバージョン管理
- [ ] Research Fragmentsの実装
- [x] Contactフォームの送信先設定 — FormspreeのForm ID設定・実機での送信確認まで完了(Decision Log 0076)

---

このチェックリストは `docs/Design_Spec/` や `docs/Decision_Log/` とは
性質が異なる、運用のためのドキュメント。項目の追加・削除は
自由に行ってよい。
