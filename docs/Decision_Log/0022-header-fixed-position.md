# 0022. Headerをposition: fixedにし、スマホ幅での表示崩れがないか確認する

- 日付: 2026-08-15
- 状態: 採用中

## Decision

`Header.astro` にCSSの `position` 指定が一切なく、`Header`が
ドキュメントの通常フローに置かれたままだったバグを修正した。

修正前は、Headerが「ページ先頭に一度だけ表示される通常の要素」に
なっており、スクロールすると本文と一緒に画面外へ流れていった。
Design Spec 11 Componentsで「Header」がグローバルナビとして扱われて
いる以上、常時可視であるべきという依頼者の指摘は仕様の欠落を
突いたもので、実装漏れと判断した。

対応として:

- `Header.module.css` の `.header` に `position: fixed; top: 0;
  inset-inline: 0; z-index: 100; background-color:
  var(--color-paper);` を追加し、Headerを画面最上部に固定した。
  背景色を明示したのは、fixedにより本文がHeaderの下を通過する
  ようになるため、背景を透過させたままだと本文がHeader越しに
  透けて見えてしまうため。
- `tokens.css` に `--header-height: 73px` を追加した(Headerの
  実測高さ = ロゴ40px + `padding-block: var(--space-2)` ×2 + border
  1px)。Headerがfixedになったことで本文がその分だけ上に食い込む
  ため、`global.css` の `body` に `padding-top: var(--header-height)`
  を追加し、全ページで本文の開始位置をHeaderの下まで押し下げた。
- `ResearchSection.module.css` に `scroll-margin-top:
  var(--header-height)` を追加した。Hero内のページ内リンク
  (`#research-statement`へのCTA)がfixed Headerの下にジャンプ先の
  見出しを隠してしまう問題への対応。

あわせて、モバイル幅(375px / 320px)でのHeader内レイアウト
(ロゴとナビの配置・折返し)をヘッドレスブラウザで確認したが、
現在のナビ項目数(Home / Research の2つ)では折返しや崩れは
発生していなかったため、レイアウト自体への変更は行っていない。

## 採用理由

- `position: fixed` はグローバルナビを常時可視にする標準的な手段で
  あり、アニメーションライブラリ等を必要としないため、「ライブラリ
  を持ち込まない」方針とも矛盾しない。
- `--header-height` をハードコードの数値ではなくトークンとして
  `tokens.css` に定義したのは、body側のpadding・
  `scroll-margin-top` など複数箇所から同じ値を参照する必要が
  あったため。値がずれると本文の食い込み/余分な空白として
  すぐに視覚的な不具合になるため、単一の参照元を持たせた。

## 他の案

- **JS(ResizeObserver等)でHeaderの実高さを測定し、CSS変数に
  動的反映する案**: より厳密だが、現時点でHeaderの中身(ロゴ1つ+
  ナビ2項目)が変わる予定はなく、静的な値で十分と判断し見送った。
  将来Headerの高さが可変になる場合(例: モバイルでのハンバーガー
  メニュー導入等)は、この判断を再検討する必要がある。
- **`position: sticky` を使う案**: 常時可視という要件に対しては
  `fixed`と`sticky`のどちらでも実現できるが、`sticky`は祖先要素の
  `overflow`設定に挙動が左右されやすく、`<body>`直下に置かれる
  Headerの単純さに対して`fixed`の方が挙動を予測しやすいため`fixed`
  を採用した。

## 将来の変更可能性

- Headerの中身(ロゴサイズ、padding、ナビ項目数)を変更する場合は、
  `--header-height`の値を実測し直して更新すること。
- モバイルでナビ項目が増える、またはハンバーガーメニュー化する
  場合は、Headerの高さが状態によって変わりうるため、静的な
  `--header-height`前提を見直す必要がある。

## Research Context

依頼の1点目(fixed位置)は、コードを読むだけでは気づきにくい
「仕様として書かれていない期待値」だった。Design Specは
「Headerがv0.5で実装済み」とだけ記録しており、常時可視かどうかは
明記されていなかった。実際にスマホ幅で操作して初めて可視になる
ずれを直す作業は、Decision Log 0020と同様、「観察から始める」
(Design Spec 8)という研究室の姿勢が実装の検証プロセスにも
そのまま当てはまることを示している。
