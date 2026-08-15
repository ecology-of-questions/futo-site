# 0017. Heroの見出し文言を更新し、Design Spec Brand Statementとの表記差分を記録する

- 日付: 2026-08-07(2026-08-15 追記: 句点の差分を追加記録)
- 状態: 採用中

## Decision

Heroの見出しを「気づいたら、そこに問いはある。」から「気づいたら、そこに
問いがある。」(は→が)へ、プロジェクトオーナーの意図的な指示により変更
した。Design Spec v0.4 Section 2(Brand Statement)には旧表記「気づいたら、
そこに問いはある。」がそのまま残っており、実装(Hero)とDesign Specの
あいだに表記差分が生じている。Design Spec自体はこの差替えでは更新しない。

## 採用理由

- コピーの変更自体はプロジェクトオーナーの権限内の判断であり
  (CLAUDE.md Workflow: 研究方向・コンテンツ・最終決定はProject Owner)、
  Claude側で変更の是非を判断する対象ではない。指示のとおりHero側を更新
  した。
- `docs/Design_Spec/` は「finalized design。Never overwritten — new
  versions are added as new files」という運用ルール(CLAUDE.md
  Documentation)を持つ。今回の指示にDesign Spec自体の更新は含まれて
  いなかったため、v0.4は変更せず、実装側(Hero)とのあいだに生じた表記
  差分をこのDecision Logに記録するに留めた。
- 同じ「気づいたら、そこに問いがある。」という文言が、今回正式版として
  実装したResearch Statementの見出し(Decision Log 0016)にもそのまま
  使われている。HeroとResearch Statementの見出しが揃うのは、意図的な
  変更だと考えられる。

## 他の案

- **Design Spec v0.4のBrand Statementも同時に書き換える案**: Design Spec
  の更新はプロジェクトオーナー・ChatGPT側の役割であり、Claude側から
  先回りして書き換えるのは越権と判断し見送った。次のDesign Spec改版
  (v0.5等)でBrand Statementが更新される際に、この差分がその根拠として
  参照されることを想定している。

## 将来の変更可能性

- 次のDesign Spec改版時に、Brand Statement(Section 2)の表記が「そこに
  問いがある。」へ正式に更新されれば、この差分は解消される。その際は
  新しいDesign Specファイルが追加されるだけで、Decision Log側の追記は
  不要。

## Research Context

「は」から「が」への一字の変更だが、Design Spec更新前に実装側が先に
変わるという順序は、「Research shapes software. Software shapes research.
Neither comes first.」(PROJECT.md)という循環する構造そのものの一例で
ある。ドキュメントとコードのどちらを正典として固定するかを急がず、
両者の差分をそのまま記録しておくことが、公開研究室というコンセプトに
沿うと考えている。

## 追記(2026-08-15、Decision Log 0025)

Hero・Research Statementの見出し末尾の句点「。」を削除し、
「気づいたら、そこに問いがある。」→「気づいたら、そこに問いがある」
に変更した(プロジェクトオーナーの指示、詳細はDecision Log 0025)。
Design Spec v0.4 Brand Statementは「気づいたら、そこに問いはある。」
のまま未更新のため、実装とDesign Specの差分は「は→が」に加えて
「句点の有無」も含む形になった。この追記も、新規Decision Logでは
なくこのエントリに追記する形で記録している(同じ「実装がDesign
Specより先に変わった表記差分」という趣旨のため)。

差分は次の通り:

| 箇所 | 表記 |
|---|---|
| Design Spec v0.4 Brand Statement(未更新) | 気づいたら、そこに問いはある。 |
| Hero / Research Statement見出し(実装、2026-08-15時点) | 気づいたら、そこに問いがある |

「他の案」「将来の変更可能性」に記載した内容(Design Spec自体の
書き換えは見送る/次のDesign Spec改版時に解消される)は、この追記に
も同様に当てはまる。
