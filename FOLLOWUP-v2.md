# PR #100への追加修正 v2

適用先: futo-home-editorial-v1.zipを適用済みのPR #100ブランチ（報告されたHEAD ccb3c794）。
これはv1からの追加パッチ。古いmain ec5e1d7に直接適用しない。

1. PR #100のブランチで作業ツリーを確認。
2. git apply --check /path/to/changes-v1-to-v2.patch
3. git apply /path/to/changes-v1-to-v2.patch
4. npm run build / npx astro check
5. 同じPRブランチにpushしてプレビューを更新。ユーザー確認前に本番マージしない。

変更: 重複ラベル削除、コピー修正、見出し縮小、説明短縮、仮線画撤去。研究断面と下層ページは変更なし。
本棚の背表紙写真はまだ未提供。index.astroのbookshelfPhotoに実写真のURLを設定可能にしただけで、実写真への置換は未完了。素材を受け取ったら写っている本にaltを合わせる。

ビルド・型チェック成功（既存Propsのhint1件のみ）。スクリーンショットはChromium描画、外部書影を遮断したフォールバック状態。実機iOSと外部サービスへの実送信は未検証。
