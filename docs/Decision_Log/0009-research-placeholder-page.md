# 0009. Research ページ(プレースホルダー)を About より先に実装する

- 日付: 2026-08-04
- 状態: 採用中(URL/IAはレビュー対象)

## Decision

`/research` に、Research Statement / Research Reviews / Research
Fragments の3グループからなるプレースホルダーページを実装した。
既存の `ResearchCard`(status: preparing)をそのまま再利用し、
新しいUIは作り込んでいない。

優先順位を「Home → About → Research → β公開」から
「Home → Research(プレースホルダー) → About → β公開」に変更した
(README・Project Journal・Research Logへ反映)。

## 採用理由

- β公開時に「この研究はこれから育っていく」という印象を作ることが
  優先されると明確になった。Aboutより先にResearchのプレースホルダーを
  見せる方が、「公開研究室、開室。」という今週のゴールに直接貢献する。
- 3グループの構成は、ChatGPTから直接例示された内容であり、
  新たな情報設計の判断を必要としなかった。「実装として自然に
  決められる部分」と判断し、モックアップを待たずに着手した。
- Research Reviewsのカードは、既に実装済みのResearchCard
  (Decision Log 0004・0005)をそのまま使えたため、追加の実装は
  ほぼ発生しなかった。

## 他の案

- 検討せず。指定された3グループ構成をそのまま採用した。

## 将来の変更可能性(要レビュー)

- **URL(`/research`)**: 仮の命名。Design Spec 3(Information
  Architecture)では「研究断面」という日本語の項目名が使われており、
  URLと表示名の対応関係は正式には決まっていない。
- **見出し文言("Research Statement" "Research Reviews"
  "Research Fragments")**: 英語のラベルのままにしたが、Home側の
  日本語コピー("研究断面"等)との整合性は確認が必要。
- Research Statementの行は現状 `/#research-statement` へのリンクに
  留めている。ページを分けて独立したURLにするかどうかは
  IA確定後に判断する。
- Research Fragmentsは "Coming Soon" の一文のみ。コンテンツが
  決まり次第、ResearchCardと同様のプレースホルダーパターンに
  差し替える可能性がある。

## Research Context

「空の棚を恐れない」という方針転換の思想を、Home単体だけでなく
サイト全体の入口(Research)にも広げた実装。Research Fragmentsの
"Coming Soon" は、何もないことを隠すのではなく、「ここにいずれ
何かが置かれる」という余白そのものを見せるという、Design Spec全体を
貫く姿勢の延長線上にある。
