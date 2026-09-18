# 0178 — ノート詳細から交換ノートUI(書かれたこと・書き残す)を撤去

## Decision
2026-09-18、プロジェクトオーナーの指示により、実験室ノート詳細ページ(`/participate/[slug]`、3ノート共通テンプレート)から「書かれたこと」(記録一覧)と「ふと思い出したことを書き残す」(投稿フォーム)を削除した。Decision Log 0141で追加した交換ノートUI全体が対象。ノート冒頭のGoogleスライド区画、説明文、「他のノートを見る」は維持する。

## 採用理由 (Rationale)
UI(表示・投稿フォーム・関連JS)のみを撤去した。`POST/GET /api/notebooks/:slug/entries`(Cloudflare Pages Function + D1)、`wrangler.toml`、`migrations/`、`src/data/labNotebooks.ts`の`entries`データ自体は本コミットでは変更していない。CLAUDE.mdの「Pages・Workersの連携や設定は変更しない」方針と、Cloudflare依存部分の拡張には新規Decision Logが要るという既存ルール(アーキテクチャ節)を踏まえ、バックエンド・データ構造の削除は本指示の範囲外と判断した。

## 他の案 (Alternatives)
「書かれたこと」の記録一覧のみ残し投稿フォームだけ消す案もあったが、ユーザーに交換ノート機能全体の削除を確認のうえ指示を受けたため、一覧・フォームの両方を削除した。

## 将来の変更可能性 (Future changes)
`commonNotebookDescription`(`src/data/labNotebooks.ts`)には「読んで、ふと思い出したことがあれば書き足せます。」という、今回削除した機能を前提にした文言が残っている。これは content/copy の変更にあたるため、本コミットでは触れていない。UIの整合性のため近い将来の更新が必要。
バックエンドAPI・D1・`entries`データを本当に使わない方針が確定した場合は、別途Decision Logを起票のうえ撤去を検討する。

## Research Context
訪問者参加の導線は「参加を強く要求しない」という基本方針のもとで実験してきたが(0137・0154等)、今回はノート詳細の交換ノート機能自体を一旦閉じる判断。研究の見せ方を継続的に見直す、という本スタジオの姿勢に沿った変更。
