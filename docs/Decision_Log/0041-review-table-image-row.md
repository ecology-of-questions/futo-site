# 0041. 研究断面詳細ページの表・図版を横並びの行(RowBlock)として配置する

- 日付: 2026-08-16
- 状態: 採用中(Decision Log 0040の続き。floatによる回り込み方式
  (0038〜0040)を置き換える)

## Decision

セクション3(「「ふと」は何を修飾しているのか」)の表と図1を、
プロジェクトオーナーが画面キャプチャに書き込んだレイアウト案
(表を左、図版を右に並べる)に沿って、横並びの行として配置し直した。

`ContentBlock`(`src/types/researchReview.ts`)に`RowBlock`を追加した。

```ts
export interface RowBlock {
  type: "row";
  items: [TableBlock | ImageBlock, TableBlock | ImageBlock];
}
```

`items[0]`が可変幅(1fr)の列、`items[1]`が図版の実サイズに応じた
固定幅の列に描画される。Mobile幅では1列に積み重なる
(`ResearchReviewArticle.module.css`の`.row`)。

これに伴い、Decision Log 0038〜0040で試みたfloatによる回り込み
(`ImageBlock.float`、`.imageFloatRight`)は撤去した。`.section`も
floatを前提としたブロックフロー(0038で導入)から、元のflex
column(0034以前の状態)に戻した。

また、ブロックごとの描画ロジック(paragraph/list/quote/subheading/
image/table の分岐)を`ReviewContentBlock.astro`という独立した
コンポーネントに切り出した。Astroのfrontmatterはプレーンな
TypeScriptであり、JSX相当のタグをfrontmatter内の関数として
定義できない(テンプレート部分でのみ有効)ため、`RowBlock`内の
アイテムとセクション直下のブロックの両方から同じ描画ロジックを
再利用するには、別コンポーネントへの切り出しが必要だった。

## 採用理由

- floatによる回り込みは、Decision Log 0039で直面したように、
  同じセクション内に複数のfloatがあると「後続の段落がどちらの
  floatの回り込み範囲に入るか」がテキスト量に強く依存し、
  意図通りにならないことがあった。RowBlockによる明示的な
  グリッド配置は、テキスト量に関わらず常に同じ見た目になり、
  壊れにくい。
- 表と図版はどちらも「「ふと」の用例を身体・知覚・記憶・思考に
  分類する」という同じ内容を、表と図という異なる形式で示している。
  横に並べることで、読者が両者を見比べながら参照できる。
- `ReviewContentBlock.astro`への切り出しは、コードの重複を避ける
  ためだけでなく、02以降のReviewページで図版・表を単独で使う場合と
  RowBlockとして並べる場合の両方に、同じ描画ロジックをそのまま
  再利用できるようにする意図もある。

## 他の案

- Decision Log 0038〜0040で試みたfloatベースの回り込みは、この
  横並びレイアウトの要求(表と図版を同じ行に、それぞれ独立した
  幅で配置する)には本質的に不向きだった。floatは「テキストが
  ブロックの周りを回り込む」ことには向くが、「2つのブロック
  同士を横に並べる」ことにはCSS Grid/Flexboxの方が素直に対応できる。
- `RowBlock.items`を`ContentBlock[]`(任意個数・任意の型)として
  汎用化する案も検討したが、現時点で必要なのは「表+図版の2列」
  という具体的なケースのみのため、タプル型`[A, B]`に絞って
  YAGNIを優先した。将来3列以上や他の組み合わせが必要になれば、
  その時点で型を緩める。

## 将来の変更可能性

- 02以降のReviewページで同様に表・図版を横並びにしたい場合、
  同じ`RowBlock`をそのまま再利用できる。
- 表以外の2つの図版を並べたい、といった要望が出た場合も
  `RowBlock.items`の型(`TableBlock | ImageBlock`のタプル)の範囲で
  対応できる。それ以外の組み合わせが必要になった場合は型を見直す。

## Research Context

プロジェクトオーナーが画面キャプチャに直接書き込んで示した配置案を、
そのまま实装に落とし込んだ。これは「ChatGPT/プロジェクトオーナーが
情報設計・レビューを担い、Claudeが実装する」というCLAUDE.mdの役割
分担そのものであり、Decision Log 0038〜0040の試行錯誤(float方式)は
無駄ではなく、「この配置にはfloatではなく明示的なグリッドが適切
だった」という学びとして残す。
