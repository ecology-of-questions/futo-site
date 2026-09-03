# 0060. Home夜空背景から渦のアートワーク画像を撤去し、光のみにする

- 日付: 2026-09-03
- 状態: 採用中(Decision Log 0059の一部を上書き)

## Decision

Decision Log 0059で実装したHome Desktop背景(「夜空」)から、
これまで使っていた渦のアートワーク画像(VisualFragment、
`03_top_page_artwork.png`)を撤去し、`--color-night`の紺の背景色と
光の粒(`.lights`/`.light`)のみの構成にした。プロジェクトオーナーの
明示的な指示(「これまで使ってた画像はつかわず、光だけにしたい」)
による。

- `src/pages/index.astro`: `.background`div内の
  `<VisualFragment src={heroVisualSrc} alt="" />`を削除した。
  `VisualFragment`のimportも(直接使う箇所がなくなったため)削除した。
  `heroVisualSrc`定数自体は、Hero側(Mobileの透かし表現、Decision
  Log 0023)が`visualSrc` propとして引き続き参照するため残している。
- `src/pages/index.module.css`: `.background :global(img)`ルール
  (画像のcover表示・opacity指定)を削除した。`.background`自体の
  `background-color: var(--color-night)`と`.lights`/`.light`は
  変更していない。

Mobileの表示(Hero内蔵の透かし、Decision Log 0023)には影響しない。
渦のアートワーク画像自体(アセットファイル)は削除していない。

## 採用理由

- プロジェクトオーナーからの明示的な指示であり、「container
  separated from content」の原則にも合致する。Decision Log 0024が
  導入した「Desktop幅でHome全体を貫くposition: fixed背景」という
  容れ物(container)はそのまま残し、そこに何を表示するか
  (content: アートワーク画像 → 紺色+光のみ)を差し替えただけで、
  構造自体は変えていない。

## 他の案

- 画像自体(アセットファイル)を削除する案もあり得たが、指示は
  「使わない」であり、他の箇所(将来的な再利用や、Hero Mobile版の
  透かしなど)への影響を避けるため、アセットファイル自体は残し、
  参照だけを外した。

## 将来の変更可能性

- 将来的に画像を使った演出に戻す、あるいは別の画像を使う場合は、
  `.background`div内に`VisualFragment`を再度追加すればよい
  (`heroVisualSrc`は既に残っている)。
- 光の数・動きの調整は引き続きDecision Log 0059の対象のまま。

## Research Context

「渦のアートワーク」という具体的な図像に頼らず、紺の背景と光の
粒だけで「ふと現れて、いつの間にか消える」という現象そのものを
表現する、というより抽象化された演出への転換。この研究室が
扱う「ふと」という現象自体、具体的な形を持たない一瞬の気づきで
あることを踏まえると、装飾を削ぎ落として現象そのものに寄せる
今回の判断は、Design Specの「完成度よりも育てられることを優先する」
姿勢、および「余白を思考時間として扱う」という考え方とも一致する。
