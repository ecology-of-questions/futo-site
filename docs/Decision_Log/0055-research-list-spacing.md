# 0055. /researchページの見出し位置を上げ、区切り線を一本化する

- 日付: 2026-08-17
- 状態: 採用中(Decision Log 0054の続き)

## Decision

プロジェクトオーナーの「RESEARCHと研究断面の文字自体をもう少し
上に配置して。区切れ目は二本線じゃなくて一本線でいい。」という
指摘への対応。

- `/research`ページのセクション(`id="research-reviews"`)の上余白を、
  共通コンポーネント`ResearchSection`が持つ`padding-block: var
  (--space-6)`(6rem)から、`research.module.css`側で`padding-top:
  var(--space-5)`(4rem)に上書きした。`ResearchSection`自体は
  Home等の他のセクションでも使う共通コンポーネントのため変更せず、
  このページの`#research-reviews`だけを対象にした。
- `ResearchReviewList.astro`から、公開済み/構想中の間にあった
  `<hr class={styles.divider}>`を削除した。各公開済みエントリは
  もともと`border-bottom`を持っており(Decision Log 0054)、直前の
  `<hr>`と近接して「二本線」に見えていた。最後の公開済みエントリの
  border-bottomをそのまま区切り線として使う形に一本化した。

## 採用理由

- CSS Modulesは、エクスポートされるクラス名(`styles.foo`として
  参照される`.foo`)を含まない「素のIDセレクタ/要素セレクタのみの
  ルール」を未使用とみなしてビルド時に削除することが分かった
  (`#research-reviews { ... }`をそのまま書いたところ、ビルド後の
  CSSから消えていた)。`:global(#research-reviews)`と明示することで、
  CSS Modulesのスコープ変換・削除の対象外にした。
- 区切り線は、Decision Log 0054で導入した「各エントリのborder-
  bottomでリストらしさを出す」という設計と、公開済み/構想中の
  境界を示す`<hr>`が同じ役割を担ってしまっていたための重複。
  重複を解消し、境界は1本の線で示すことにした。

## 他の案

- 見出しの上余白について、`ResearchSection`自体の`padding-block`を
  変更する案も検討したが、Home他のセクションにも影響するため、
  このページだけの調整として上書きする方法を選んだ。

## 将来の変更可能性

- `ResearchSection`を使う他のページでも同様の「上余白を個別に
  調整したい」という要望が出た場合、`:global(#id)`による上書きを
  都度書くより、`ResearchSection`にoptionalな`class`prop・
  余白サイズpropを持たせる方が保守しやすくなる可能性がある。
  現時点では1ページのみの要望のため、シンプルな上書きにとどめた。

## Research Context

余白の量そのものが「思考時間」を表すというDesign Spec 10の思想に
対し、今回は「余白が多すぎて見出しが遠く感じる」という具体的な
フィードバックが入った。抽象的な思想よりも実際の見え方を優先し、
微調整を重ねていくプロセスの記録。
