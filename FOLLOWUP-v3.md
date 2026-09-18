# v3: concept motion — Claude Codeへの引き継ぎ

対象: PR #100、claude/home-editorial-v1 相当の既存PRブランチ。GitHub上の正確なブランチ名はPRから取得すること。
基準: v2適用済み commit 96ed2bf（96ed2bff…）。これはv2からの増分でありmain向けではありません。

1. PR HEADと作業ツリーを確認。変更が進んでいれば差分を精査し、既存変更を上書きしない。
2. `git apply --check changes-v2-to-v3.patch` → `git apply changes-v2-to-v3.patch`。
3. changed-files/と照合、`npx astro check` / `npm run build`。
4. スマホ・PCで初回再生、再生ボタン、reduced-motion、JSなし、リンクを確認。
5. 同じPRブランチへcommit/pushし、最新commitのデプロイ結果とプレビューURLを共有。マージはまだしない。

内容: HomeMotion（SVG/CSS、依存追加なし）、導入/音の道に配置、余白調整、専用寸法トークン、Decision Log 0176とDesign Spec v0.8。
実記録の可視化や音声再生ではなく概念図です。自動ループはしません。GIFは説明用にループしています。
データ・ルート・Worker/D1・Cloudflare・本棚・フォームは変更なし。

ローカル確認: build成功(15 pages)、astro check 0 errors/0 warnings・既存hint 1。390/320/1440pxで横overflowなし。390pxで研究断面見出しの上端598px。動きを減らす設定ではアニメーション0、再生ボタン非表示。macOS/iOS実機は未確認。
