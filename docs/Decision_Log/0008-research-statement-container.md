# 0008. ResearchStatement を「文章を受け取る器」として位置づけ直す

- 日付: 2026-08-04
- 状態: 一部上書き済み(→ 0012。propsをattitudeLines/principleLinesからparagraphsへ再設計)

## Decision

`ResearchStatement.astro` のコンポーネント自体は変更しない。
ただし、コンポーネントの位置づけを明文化する。

- レイアウト・タイポグラフィ・余白 → 確定事項
- コンテンツ(現在は Design Spec 7・8 の文章) → 仮コンテンツ。
  正式な Research Statement(「問いの生態系」のステートメント)が
  執筆され次第、`index.astro` 側の props を差し替えて反映する。

## 採用理由

- 0007では「Research Statementの中身を、Design Spec自身の思想的な
  文章から推測して実装した」が、これは実装上の判断であり、
  情報設計(何を載せるべきか)そのものの決定ではなかった。
- フィードバックにより、Research Statementには正式なステートメントが
  別途執筆されることが明らかになった。実装(コンポーネント・
  レイアウト)と、コンテンツ(実際の文章)は最初から分離されていた
  (Decision Log 0003でコンテンツをpropsに外出しした設計)ため、
  コンポーネント自体の変更は不要だった。
- 「器」と「中身」を明確に区別して記録しておくことで、今後
  正式なステートメントが届いた際に、何を変更すればよいか
  (index.astroのprops)が誰にでも分かるようにした。

## 他の案

- 検討せず。0003の時点で既にコンテンツをpropsで分離する設計に
  していたため、今回追加の実装は発生していない。今回の対応は
  「位置づけの明文化」のみ。

## 将来の変更可能性

- 正式なResearch Statementの文章量やリズム(短文の羅列か、
  段落形式かなど)によっては、`attitudeLines` / `principleLines` という
  2配列の構造自体が合わなくなる可能性がある。その場合はpropsの
  形を再設計する(例: 単一の `lines: string[]` や `paragraphs: string[]`)。

## Research Context

「実装が先に進み、コンテンツが後から入る」という流れは、
ResearchStatus(Decision Log 0005・0006)で扱った「概念が先、
事例が後」という考え方と同じ構造を持っている。ResearchStatement も、
文章という「事例」を後から迎え入れるための「器(概念・構造)」として
先に作られた、と捉え直すことができる。
