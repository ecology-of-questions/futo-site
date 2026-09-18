# 全ページアップデート v4 — Claude Code引き継ぎ

## 基準と適用先
基準はPR #100にv3を適用した `a723e06`。ZIPのpatchはv3からの増分です。v1/v2/main旧版に直接適用しないでください。

- PR #100が未マージなら、その実際のHEADブランチへ追記。
- 既にマージ済みなら、最新mainにv3相当が含まれることを確認して新規ブランチ/PR。
- HEADや作業ツリーに後続変更があれば精査し、無理な上書きやresetをしない。

1. `git apply --check changes-v3-to-v4.patch` で基準一致を確認して適用。
2. `changed-files/` と照合。build/check、PC/スマホで確認。
3. commit/pushし、対象commitに対するCloudflareのデプロイ結果と実際のプレビューURLを共有。
4. ユーザーのレビュー前にマージしない。Cloudflare連携設定は変更不要。

## 変更
公開ページ全体のeditorial化、PageHeading共通化、研究断面一覧/記事/目次、本棚、実験室一覧、ノート詳細、About、ステートメント、フォーム、プライバシー、404。Fieldnote独立アプリは配色と入力画面のみ整え、戻るリンクと拡大を可能にした。
トップの構成・モーション、canonical data、記事本文、外部URL、Worker/D1、フォーム送信処理は維持。一覧導入文2箇所のみ短縮。実写真は未提供。

## ローカル検証
- `npm run build`: 成功、15ページ（別途既存supportリダイレクト）。
- `npx astro check`: 0 errors / 0 warnings、既存SectionTitle Propsのhint 1。
- 15画面 × 390/1440/320px = 45条件: 横overflowなし、pageerrorなし。
- 本の提案開閉/モック送信成功、交換ノート任意入力開閉/モック送信後追記を確認。
- お問い合わせはモックの成功/失敗の両方を確認。実送信は一切していません。
- 記事目次の開閉、書影の画像成功時への切替（合成画像）を確認。
- スライド枠: 390px画面でy198〜406px、1440×900でy216〜835px、320pxでy198〜364px。外部Google描画はモックのため実機確認が必要。
- 書影スクリーンショットは外部取得を止めた仮カバー表示です。実書影の取得成功は未検証。

## デプロイ後に確認すること
Googleスライドの読込と操作・コメントリンク、Workers側のD1保存/再読込、iOS Safari実機、Fieldnoteのカメラ/保存。Pages成功だけでWorkers/D1を検証済みとしないこと。
プレビューをユーザーに提示。既知のWorkersプレビュー: https://futo-site-preview.momokay75.workers.dev/ （対象commitで更新済みか別途確認）。

ZIPには差分、変更ファイル、PC/スマホ各ページの画像、QA計測JSONを同梱。外部スライドの灰色枠はローカル検証用の表示であり、ソースでは既存のGoogle埋め込みURLを保持しています。
