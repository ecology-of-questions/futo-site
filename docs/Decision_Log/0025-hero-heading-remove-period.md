# 0025. Hero・Research Statement見出し末尾の句点「。」を削除し、両者の表記を揃える

- 日付: 2026-08-15
- 状態: 採用中

## Decision

「気づいたら、そこに問いがある。」という見出し文言から、末尾の
句点「。」を削除した(プロジェクトオーナーの指示)。対象は次の2箇所:

- `src/pages/index.astro`の`<Hero>`に渡す`headingLines`:
  `["気づいたら、", "そこに", "問いがある。"]` →
  `["気づいたら、", "そこに", "問いがある"]`(改行位置は変更せず)。
- `<ResearchStatement>`の`heading`プロパティ(`src/pages/index.astro`の
  抜粋・`src/pages/research-statement.astro`の全文ページの両方):
  `"気づいたら、そこに問いがある。"` → `"気づいたら、そこに問いがある"`。

はじめはHeroのみを対象に変更したが(このDecision Log作成当初の
版)、直後の指示でResearch Statement側も同じ句点を削除し、Hero・
Research Statementの見出し表記を再び一致させた。

## 採用理由

- コピーの変更自体はプロジェクトオーナーの権限内の判断であり
  (CLAUDE.md Workflow: 研究方向・コンテンツ・最終決定はProject
  Owner)、指示のとおり更新した。
- `Hero.astro`・`ResearchStatement.astro`のprops設計(Decision Log
  0003・0008)がコピーをすべて呼び出し側からpropsで受け取る形に
  なっているため、この変更は`index.astro`・`research-statement.astro`
  の該当行を書き換えるだけで完結し、どちらのコンポーネントの
  ロジックにも触れていない。

## Decision Log 0017との関係

Decision Log 0017は、Heroの見出しを「気づいたら、そこに問いはある。」
→「気づいたら、そこに問いがある。」(は→が)へ変更した際、
「Research Statementの見出し(Decision Log 0016)にも同じ文言
『気づいたら、そこに問いがある。』が使われており、HeroとResearch
Statementの見出しが揃うのは意図的な変更だと考えられる」と記録して
いた。

今回、Heroの句点を先に削除した時点では、Research Statement側が
句点ありのまま据え置かれ、0017が記録した「Hero≒Research Statement
の一致」が一時的に崩れていた。直後の指示でResearch Statement側も
揃えたため、この一致は「気づいたら、そこに問いがある」(句点なし)
という形で回復している。

Design Spec v0.4 Section 2(Brand Statement)は0017の時点で既に
「気づいたら、そこに問いはある。」(は・句点あり)のまま実装との
差分が生じていた。今回の変更でHero・Research Statement側の表記は
揃った一方、Design Spec側は「は」も句点も未更新のままのため、
実装とDesign Specのあいだの差分は次の通りになる:

| 箇所 | 表記 |
|---|---|
| Design Spec v0.4 Brand Statement(未更新) | 気づいたら、そこに問いはある。 |
| Hero / Research Statement見出し(実装、今回で一致) | 気づいたら、そこに問いがある |

依頼により、この差分は新規Decision Logではなく、既存のDecision
Log 0017に追記して記録した(0017は元々「は→が」の表記差分を
記録したエントリであり、今回の句点削除も同じ趣旨の差分のため)。
詳細は0017を参照。

## 他の案

- **Research Statementの句点を残し、Heroだけ句点なしにする案**:
  最初の指示時点ではこの状態だったが、0017が記録した「見出しの
  一致は意図的」という経緯を踏まえ、直後の指示でResearch
  Statement側も揃えることになった。Hero/Research Statementの
  見出しが異なる表記のまま放置されるのは、0017の記録と矛盾する
  ため見送った。

## 将来の変更可能性

- Design Spec側でBrand Statement(Section 2)が改版される際は、
  現時点の実装表記(「気づいたら、そこに問いがある」)を正式表記と
  して反映するかどうかを、プロジェクトオーナー・ChatGPT側で決定
  すること。

## Research Context

「は」から「が」への一字の変更を記録した0017は、「Design Spec
更新前に実装側が先に変わるという順序は、Research shapes software.
Software shapes research. Neither comes first.という循環する構造
そのものの一例」だとした。今回の句点の有無という、さらに小さな
一字(句点)の変更も同じ循環の一例である。Hero・Research Statement
の表記を揃え直す一方で、Design Spec側の差分はあえて0017に一本化
して記録し、実装とDesign Specの差分を無理に都度リセットせず
積み重ねていくことが、「完成を目指さず、育て続ける」という本
プロジェクトの姿勢(CLAUDE.md Philosophy)に沿っている。
