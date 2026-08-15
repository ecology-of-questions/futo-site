# 0025. Heroの見出し末尾の句点「。」を削除する

- 日付: 2026-08-15
- 状態: 採用中

## Decision

`src/pages/index.astro`の`<Hero>`に渡す`headingLines`を、
`["気づいたら、", "そこに", "問いがある。"]`から
`["気づいたら、", "そこに", "問いがある"]`へ変更した(プロジェクト
オーナーの指示)。改行位置(3行構成)は変更せず、最終行末尾の
句点「。」のみを削除した。

## 採用理由

- コピーの変更自体はプロジェクトオーナーの権限内の判断であり
  (CLAUDE.md Workflow: 研究方向・コンテンツ・最終決定はProject
  Owner)、指示のとおりHero側の`headingLines`のみを更新した。
- `Hero.astro`のprops設計(Decision Log 0003)がコピーをすべて
  呼び出し側からpropsで受け取る形になっているため、この変更は
  `index.astro`の1行を書き換えるだけで完結し、コンポーネントの
  ロジックには一切触れていない。

## Design Spec 0017との関係

Decision Log 0017は、Heroの見出しを「気づいたら、そこに問いはある。」
→「気づいたら、そこに問いがある。」(は→が)へ変更した際、
「Research Statementの見出し(Decision Log 0016)にも同じ文言
『気づいたら、そこに問いがある。』が使われており、HeroとResearch
Statementの見出しが揃うのは意図的な変更だと考えられる」と記録して
いた。

今回の変更でHero側の文言は「気づいたら、そこに問いがある」(句点
なし)になった一方、Research Statement側の見出し(`index.astro`の
抜粋・`research-statement.astro`の全文ページとも)は「気づいたら、
そこに問いがある。」(句点あり)のまま、今回の指示の対象外だった
ため変更していない。そのため、0017で記録した「Hero≒Research
Statementの見出しの一致」は、句点の有無という一点でこの変更により
崩れている。

Design Spec v0.4 Section 2(Brand Statement)は0017の時点で既に
「気づいたら、そこに問いはある。」(は・句点あり)のまま実装との
差分が生じており、今回の変更でHero・Research Statement・Design
Specの3箇所すべてが微妙に異なる表記になった:

| 箇所 | 表記 |
|---|---|
| Design Spec v0.4 Brand Statement(未更新) | 気づいたら、そこに問いはある。 |
| Hero(今回更新) | 気づいたら、そこに問いがある |
| Research Statement見出し(今回対象外) | 気づいたら、そこに問いがある。 |

Design Specはこの変更でも更新していない(0017と同じ理由: Design
Specの改版はプロジェクトオーナー・ChatGPT側の役割であり、Claude
側から先回りして書き換えるのは越権と判断)。Research Statement側の
句点についても、今回の指示に含まれていなかったため変更していない。
Hero/Research Statementの表記を揃えるかどうかは、次にResearch
Statementの見出し自体に手を入れる機会があれば、プロジェクトオーナー
に確認すること。

## 他の案

- **Research Statementの見出しも同時に句点なしへ揃える案**: 0017が
  「見出しの一致は意図的」と記録していたことを踏まえると一貫性は
  高まるが、今回の指示は明確にHeroのみを対象としており、Research
  Statementのコピーを変更する指示ではなかった。コピー・情報設計は
  プロジェクトオーナーの決定領域(CLAUDE.md Workflow)であるため、
  指示されていない範囲を先回りして変更することは見送った。

## 将来の変更可能性

- Research Statementの見出しの句点についても変更する指示が来れば、
  同様にpropsを更新し、このDecision Logに追記するのではなく新規
  Decision Logを起票する。
- Design Spec側でBrand Statement(Section 2)が改版される際は、
  現時点の実装(Hero: 句点なし、Research Statement: 句点あり)の
  どちらか、あるいは両方を正式表記として反映するかを、プロジェクト
  オーナー・ChatGPT側で決定すること。

## Research Context

「は」から「が」への一字の変更を記録した0017は、「Design Spec
更新前に実装側が先に変わるという順序は、Research shapes software.
Software shapes research. Neither comes first.という循環する構造
そのものの一例」だとした。今回の句点の有無という、さらに小さな
一字(句点)の変更は、その循環がまだ止まっていないことを示している。
Hero・Research Statement・Design Specの3箇所がそれぞれ微妙に異なる
表記のまま並存している状態を「あるべき不整合」として無理に統一
せず記録しておくこと自体が、「完成を目指さず、育て続ける」という
本プロジェクトの姿勢(CLAUDE.md Philosophy)に沿っている。
