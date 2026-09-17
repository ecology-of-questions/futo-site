# 0163. Hero行を横並びに、一覧冒頭(音の道の上)に罫線を追加

- 日付: 2026-09-17
- 状態: 採用
- 関連: Decision Log 0161(「いま、考えていること」見出し削除・
  1画面圧縮)。PR #90 merge後の新規PR。

## Decision

プロジェクトオーナーから、以下2点の指示を受けた。

- 「実験室」の右横に、lead文(「考えるために、つくったり、試したり
  する場所。」)を置く。
- 「音の道」の上にも線を引く。

## 対応

### Hero行の横並び化

`src/pages/participate.astro`: 見出し`<h1>`とlead`<p>`を、新設した
`<div class={styles.heroRow}>`でまとめた。

`src/pages/participate.module.css`: `.heroRow`を追加した。

```css
.heroRow {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: var(--space-1) var(--space-3);
}
```

- `align-items: baseline`で、サイズの異なる見出し(`--fs-2xl`)と
  lead文(`--fs-base`)の文字のベースラインを揃えた。
- `.heading`に`flex: 0 0 auto`(縮まない)、`.lead`に
  `flex: 1 1 16rem; min-width: 0;`(余った幅を使うが、最低16remは
  確保)を設定した。
- `flex-wrap: wrap`により、両方を並べる幅が無いmobile幅では自然に
  縦積みに戻る(見た目は0161以前と同じ縦積み)。JS・メディアクエリを
  使わない、flexboxの折り返しのみでの対応。

### 一覧冒頭(音の道の上)への罫線追加

`src/components/LabNotebookList.module.css`: `.item:first-child`の
`border-top: none;`という上書きを削除した。これにより、全項目
(1件目の音の道を含む)に`.item`の`border-top: 1px solid
var(--color-accent-beige);`が適用され、Hero行と一覧の境目に罫線が
入るようになった。

### あわせて修正したドキュメントの不整合

`participate.module.css`冒頭のコメントに残っていた「IDセレクタは
CSS Modulesでもハッシュ化されない」という誤った説明(Decision Log
0161の追記で誤りと判明済みだったが、この冒頭コメント側の更新が
漏れていた)を削除し、コメント内の参照先を「Decision Log 0162」から
実際の記載場所である「Decision Log 0161の追記」に修正した。

## 対応ファイル

- `src/pages/participate.astro`: `.heroRow`でheading/leadをラップ。
- `src/pages/participate.module.css`: `.heroRow`新設、`.heading`/
  `.lead`をflexアイテムとして調整、コメントの不整合修正。
- `src/components/LabNotebookList.module.css`: `.item:first-child`の
  border-top抑制を削除。

`LabNotebookList.astro`(モチーフのSVG自体)・`labNotebooks.ts`・
`/participate/[slug].astro`・Worker/D1/APIは今回も変更していない。

## 確認結果

- desktop(1440px): 「実験室」とlead文が同じ行に、ベースラインを
  揃えて並ぶことを確認した。「音の道」の上に罫線が入ることも確認
  した。
- mobile(390px): 幅が足りずheading/leadは縦積みに戻る(意図通りの
  折り返し)。この場合も「音の道」の上の罫線は表示される。
- Playwrightで3項目目(研究断面をひらく)の下端を実測し、mobile
  (390×844)・desktop(1440×900)とも引き続きスクロールなしで収まる
  ことを確認した(mobile: y=746px、desktop: y=681px。Hero行の高さが
  横並び化で若干低くなったため、0161時点よりむしろ余裕が増えた)。
- mobile/desktopとも`document.documentElement.scrollWidth ===
  clientWidth`を確認し、横方向のoverflowが無いことを確認した。
- `/participate/oto-no-michi`(notebook detail)を390pxで確認し、
  横方向のoverflowが無いこと・このページの変更の影響を受けないこと
  を確認した。
- `npx astro check`: 0 errors, 0 warnings, 1 hint(既存の無関係な
  hint)。
- `npm run build`: 15ページ生成、エラーなし。

## 採用理由

flexboxの`flex-wrap`による折り返しのみで対応し、メディアクエリを
追加しなかった。理由は、このページの他の要素(モチーフの`clamp()`
サイズ、notebook一覧のタイトル行)も同様にメディアクエリを使わず
flexboxの伸縮のみで幅に応じた見た目の変化を実現しており、実装
パターンを揃えるため。

罫線は`.item`側の既存スタイルをそのまま使い(`:first-child`の
打ち消しを外すだけ)、新しい罫線スタイルを追加しなかった。他の項目
間の罫線と完全に同じ見た目になる。

## 将来の変更可能性

- 「いま、ひらいている実験」セクションが将来有効化された際、
  その一覧の1件目にも同じ罫線が入る(`.item:first-child`の抑制を
  全体で外したため)。Hero直下ではなく「いま、ひらいている実験」の
  見出し直下に来るため、見出しの罫線(`.sectionRule`)と一覧の罫線が
  連続して見える可能性がある。実際にセクションが有効化された際に
  見た目を確認し、必要なら調整する。

## Research Context

見出しとlead文を横並びにする変更は、情報の意味を変えるものではなく、
「LAB / 実験室」という導入をより一続きの帯として見せる調整である。
一覧冒頭への罫線追加も同様に、Heroという「場についての説明」と、
一覧という「実在する3つの取り組み」を、罫線という一貫した記法
(このページの他の区切りと同じ表現)で視覚的に分けるものであり、
新しい視覚言語を持ち込んでいない。
