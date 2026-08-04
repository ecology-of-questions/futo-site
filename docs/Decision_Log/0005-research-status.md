# 0005. ResearchStatus を「出版状態」ではなく「研究状態」として再定義する

- 日付: 2026-08-04
- 状態: 採用中(0004を一部上書き)

## Decision

`ResearchCard` の `status` の型を `"preparing" | "published"` から、
`preparing / reading / writing / reviewing / published / archived` の
6段階を持つ `ResearchStatus` へ拡張する。この型は `ResearchCard.astro`
から独立させ、`src/types/research.ts` に置く。Research Review だけでなく、
将来の Research Fragment 等でも共通して使えるようにするため。

現時点で実際にコンポーネントに渡すのは `"preparing"` のみ。
他のステータスは型とラベルだけ先に用意しておく。

## 採用理由

- フィードバックにより、「Research Reviewは出版状態だけでなく研究状態を
  持っている」という認識が示された。Preparing→Reading→Writing→
  Reviewing→Published という流れは、「過程こそ主役」というDesign
  Principles(Design Spec 8)の実装への翻訳そのものだと判断した。
- Union型を `"preparing" | "published"` のように必要最小限に絞ると、
  将来ステータスが増えるたびに型定義・ラベル・分岐処理を
  複数箇所で修正することになる。あらかじめ想定されているステータスを
  型として先に定義しておく方が、「変更しやすさ」を優先する方針
  (キックオフ文書)に合う。
- statusをResearchCardから切り出したのは、Research Review専用の
  概念ではなく、Research Fragment等、他の研究成果にも
  再利用したいという要望に対応するため。

## 他の案

- **必要になった時点でstatusの値を1つずつ追加していく案**: 実装の
  手間は最小だが、「研究状態」という概念そのものが後から追加された
  ものに見えてしまい、Research Cardが「出版フラグを持つカード」だと
  誤解されたまま実装が進むリスクがあった。今回、思想レベルで
  「研究状態を表すもの」だと明確になったタイミングで型ごと
  直しておく方が良いと判断した。
- **statusをResearchCard.astro内にとどめる案**: Research Fragment等、
  他の研究成果カードでも同じ状態遷移を使う可能性が高いと判断し、
  型を独立させる方を選んだ。

## 将来の変更可能性

- Research Fragment用のカードコンポーネントを作る際、
  `ResearchCard` をそのまま使うか、`ResearchStatus` 型だけ共有した
  別コンポーネントにするかは、Research Fragmentの仕様が来た時点で判断する。
- ステータスの並び順(preparing→reading→writing→reviewing→published→
  archived)を視覚的に表現する(進捗バー等)かどうかは、
  UI/UXの判断としてChatGPT側に委ねる。

## Research Context

「ふ、と」における研究成果は、公開された瞬間に価値を持つのではなく、
準備し、観察し、書き、見直すという時間の流れそのものに価値がある
(Design Spec 7: Research Attitude「時の流れに身を任せる」)。
出版状態(published/unpublished)という二値ではこの時間の流れを
表現できない。ResearchStatusを研究の進行段階として設計し直したことは、
「数字がすべてではない。感じることがすべて」という研究姿勢を、
コンポーネントのデータモデルという最も地味な場所に落とし込んだ
判断だと考えている。
