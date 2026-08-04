# 0015. PROJECT.md を新設し、CLAUDE.md と役割を分離する

- 日付: 2026-08-04
- 状態: 採用中

## Decision

`PROJECT.md` を新規作成し、`CLAUDE.md` の内容の一部を移設した。

- `PROJECT.md`(人間向け): ビジョン・「公開研究室とは」「問いの
  生態系とは」・ロードマップ・今週やること・Parking Lot・将来像
- `CLAUDE.md`(AI向け): Claudeの振る舞い方・ドキュメント更新ルール・
  コーディングルール・判断基準・Current Phaseの運用的要点

`CLAUDE.md`の「The Project」「Product Identity」セクションは、
詳細をPROJECT.mdへ委ね、要点(名称・種別・ステータス・バージョン)と
参照リンクのみを残す形に縮小した。「Current Phase」も同様に、
優先順位リストの詳細はPROJECT.mdに一本化し、CLAUDE.md側は
ルール(新機能凍結)とParking Lotのみを保持した。

## 採用理由

- CLAUDE.mdに全てを詰め込むと、「AIへの指示」と「人間向けの
  プロジェクト説明」が混在し、どちらの読者にとっても読みにくい
  ファイルになる。役割を分けることで、それぞれが本来の読者に
  最適化された文章になる。
- Design Specが「プロダクト」を、CLAUDE.mdが「チーム(AIの振る舞い)」
  を定義するのに対し、「プロジェクトそのもの(なぜこれをやっているか、
  どこに向かっているか)」を定義する場所が無かった。PROJECT.mdが
  その役割を担う。
- このリポジトリを「GitHub Repository」ではなく「Research
  Repository」として扱うという考え方をPROJECT.mdの冒頭に明記した
  ことで、README・PROJECT.md・CLAUDE.md・Design Spec・Decision Log・
  Research Log・Project Journalが、すべて同じ重みを持つ一次資料
  である、という位置づけが揃った。

## 他の案

- CLAUDE.mdに全部残し、セクション順だけ整理する案: 検討したが、
  Current Phaseの優先順位リストのような「人間が読んで意思決定に
  使う情報」と、Coding Rulesのような「AIが実装時に参照する情報」は
  更新頻度も読者も異なるため、ファイルごと分けた方が両方の
  メンテナンス性が上がると判断した。

## 将来の変更可能性

- Current Phase(優先順位・Parking Lot)は、PROJECT.mdとCLAUDE.md
  の両方に(前者は詳細、後者は要点として)存在する。二重管理になる
  ため、更新時は両方を同時に直す必要がある。将来的にはCLAUDE.mdから
  PROJECT.mdを`@`参照で読み込む形(Claude Codeのimport機能)に
  一本化できる可能性がある。

## Research Context

「器と中身を分ける」という設計原則を、ドキュメント体系そのものに
もう一段適用した判断。PROJECT.mdの冒頭に置いた「The software exists
to support the research. The research exists to shape the
software.」という二文は、このリポジトリで進んでいる作業の
本質を最も短く言い表している。
