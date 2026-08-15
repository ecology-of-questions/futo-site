# 0031. サイト全体の本文列幅の制限(readable width)を廃止する

- 日付: 2026-08-15
- 状態: 採用中(Decision Log 0008・0012・0026・0029が積み重ねてきた
  「読みやすい行幅」という制約を撤回)

## Decision

サイト全体で、本文テキストに設定していた`max-width`(36rem/52rem)を
すべて削除した(プロジェクトオーナーの指示: 「改行は特にせずに
画面いっぱいに使いたい」)。対象は次の6箇所:

- `src/components/Hero.module.css`: `.copy`(Desktop、36rem。
  Decision Log 0024で追加したばかりだった)
- `src/components/ResearchStatement.module.css`: `.heading`・
  `.statement`(52rem。Decision Log 0029)
- `src/components/ResearchReviewArticle.module.css`: `.subtitle`・
  `.article`(36rem)
- `src/pages/404.module.css`: `.heading`・`.body`(36rem)
- `src/pages/research.module.css`: `.groupBody`(36rem)。ルール自体
  ここで空になったため、CSSファイルからもクラスを削除し、
  `research.astro`側の`class={styles.groupBody}`も無印の`<div>`に
  変更した。

`max-width`を削除したことで、各要素は親コンテナ
(`ResearchSection`・`Hero`が持つ`max-width: var(--content-max-width)`
=1120px)いっぱいまで広がるようになった。`--content-max-width`
自体(tokens.css)は変更していない。強制改行(`<br>`)は元々
Decision Log 0026で全廃済みのため、この変更でも改行方針自体に
変更はない。自然な折返しの「幅」が、36rem/52rem前後だったものから
1120px(コンテンツ全体の幅)前後に変わった、という変更である。

## 採用理由

- プロジェクトオーナーからの明確な指示であり(CLAUDE.md Workflow:
  研究方向・コンテンツ・最終決定はProject Owner)、コピー・情報設計
  ではなくレイアウトの指示のため、実装してから記録する形にした。
- 対象範囲を「サイト全体の本文幅」と明示的に確認した上で、readable
  widthの制約を使っていた箇所を機械的に洗い出し(`grep`で
  `max-width: 36rem`/`max-width: 52rem`を検索)、漏れなく揃えた。
  一部のページだけ広く、一部だけ従来の狭い列幅のままだと、サイト内で
  一貫性のない見た目になってしまうため。

## Design Spec 9・これまでのDecision Logとの関係

Design Spec 9は「静かな雑誌の読書体験」を掲げ、Decision Log
0008・0012がその具体化として36remという読みやすい行幅を定め、
0026・0029・0024もその路線を踏襲・調整してきた。今回の変更は、
その系譜を明示的に上書きするプロジェクトオーナーの判断である。

CLAUDE.mdは「Don't change `tokens.css` values based on
"readability" — those are the Project Owner / ChatGPT's decisions」
と定めているが、これは逆に「読みやすさに関する変更はProject Owner
の権限」であることを示している。今回はまさにそのProject Owner本人
からの指示であるため、実装側の判断ではなく正規の決定として扱った。

Design Spec 9自体(ドキュメント)は今回更新していない。Design Spec
は「finalized design。Never overwritten」という運用のため、この
差分もHeroの表記変更(Decision Log 0017)などと同様、実装が先に
変わり、Design Spec側は次の改版を待つ形になる。

## 他の案

(プロジェクトオーナーからの明確な指示のため、代替案の検討は行って
いない。)

## 将来の変更可能性

- Homeの背景アートワーク(Decision Log 0024)との重なりが増える
  (本文がより広い範囲に描画されるため)。実際にDesktop幅で確認した
  ところ、opacity 0.4の背景に対して本文(通常のink色、不透明)は
  問題なく読めたが、将来アートワークの密度・配色が変わった場合は
  重なりの見え方を再確認すること。
- 今後Design Spec側で正式に列幅(または「列幅を制限しない」という
  方針そのもの)が改版されれば、そちらが正典になる。
- `--content-max-width`(1120px)自体を広げたい場合は、Header・
  Hero・全セクション共通の値のため、影響範囲がさらに大きくなる。
  今回はその値自体には触れていない。

## Research Context

「読みやすい行幅」という一般的な組版原則よりも、「画面いっぱいに
使いたい」という具体的な意匠上の要望を優先したこの判断は、
Decision Log 0026・0029とも共通する構図(一般則より個別の指示を
優先する)の延長線上にある。ただし今回は範囲が「サイト全体」に
及ぶ点で、これまでの個別調整とは性格が異なる。0008で「静かな雑誌」
というコンセプトのもとに定めた行幅の制約を、Project Owner自身が
明示的に撤回したという事実そのものを記録しておくことが、
「完成を目指さず、育て続ける」というこのプロジェクトの姿勢に
沿っている。デザインの基本方針もまた、一度決めたら固定されるもの
ではなく、実際にサイトを見ながら見直され続けるものである。
