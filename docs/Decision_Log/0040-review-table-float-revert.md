# 0040. 研究断面詳細ページの表の回り込み配置を撤回し、全幅表示に戻す

- 日付: 2026-08-16
- 状態: 採用中(Decision Log 0039を上書き)

## Decision

Decision Log 0039で表(TableBlock)に追加した`float: "right"`と、
それを支えるための`groupBlocks()`/`.floatGroup`(display: flow-root)
の仕組みを撤回した。表は常に全幅のブロックとして表示し、直前の
図版(`.imageFloatRight`)の回り込みの影響を受けないよう、`.table`に
`clear: both`を戻した。図版の右上回り込み配置(Decision Log 0038)は
維持している。

`TableBlock`型からも`float`フィールドを削除し、
`ResearchReviewArticle.astro`は0038時点のシンプルな
per-block `.map()`描画に戻した。

## 採用理由

プロジェクトオーナーに「表を本文と同じ扱いにできないか」と問われ、
実装側(Claude)の判断として、表の回り込みをやめることを提案し、
承認を得た。

- 表は複数列の構造化データであり、22remのような狭い列に押し込むと
  セル内のテキストが窮屈に折り返され、可読性が落ちやすい。単体の
  図版(Decision Log 0038)とは性質が異なる。
- 同じセクション内に回り込み要素(図版・表)が2つ並ぶと、本文が
  「狭まる→広がる→また狭まる」というジグザグを描くことになり、
  Design Spec 10が掲げる「余白を思考時間として扱う」落ち着いた
  読書体験と噛み合わない。
- Decision Log 0039で導入した`groupBlocks()`/`.floatGroup`は、
  表の回り込みを機能させるためだけに必要になった仕組みであり、
  表を全幅に戻した今、その複雑さを維持する理由がなくなった。
  不要になったコードは残さず削除する(CLAUDE.md: 「If you are
  certain that something is unused, you can delete it completely」)。

## 他の案

- `groupBlocks()`の仕組み自体は02以降で複数の回り込み要素が
  必要になった際に再利用できる可能性があるため、コードとして
  残しておく案も検討したが、現時点で使用箇所がなく、
  「将来使うかもしれない」という理由だけでコードを残すのは
  CLAUDE.mdの「don't design for hypothetical future requirements」
  に反するため削除した。必要になれば、このDecision Logと
  Decision Log 0039の記録をもとに再実装できる。

## 将来の変更可能性

- 02以降で表を回り込ませたいという具体的な要望が出た場合は、
  Decision Log 0039の実装(`groupBlocks`/`.floatGroup`)を
  参考に再導入できる。ただし、その際も「表という構造物が狭い
  列に収まるか」を個別に検討すべきで、画像と同列に一律で
  回り込ませることは推奨しない。
- 図版の回り込み配置(Decision Log 0038)は今回の変更で影響を
  受けておらず、そのまま維持される。

## Research Context

「回り込みで情報を密に詰め込む」ことよりも「まっすぐ読める」ことを
優先した判断。研究断面は読み手が思考をたどるための文章であり、
視覚的な工夫よりも読書体験の一貫性を優先する、というこのプロジェクト
の基本姿勢(Design Spec 10)に立ち返った選択。
