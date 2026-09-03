# 0067. FooterナビゲーションをHeaderと同じ3項目に揃える

- 日付: 2026-09-03
- 状態: 採用中(Decision Log 0057・0058の一部を上書き)

## Decision

Homeの右上(Headerナビ: 研究断面/ふ、とについて/お問い合わせの3項目)
と左下(Footerナビ: 従来はResearch Statement/研究断面/ふ、とに
ついて/note/お問い合わせの5項目)で項目数が異なり紛らわしい、という
指摘を受け、FooterもHeaderと同じ3項目(研究断面/ふ、とについて/
お問い合わせ)に揃えた。

- `src/components/Footer.astro`から、`Research Statement`
  (`/research-statement`)と`note`(外部リンク)への個別リンクを削除
  した。`noteUrl`のimportも使わなくなったため削除した。
- Research Statementへの導線は、既存のページ内リンク
  (Home「Research Statementを読む」CTA、Home「いま、取り組んで
  いること」の「Research Statementを読む」、研究断面詳細ページ末尾
  など)で引き続き確保されている。Footerから消しても、サイト内から
  完全に到達不能になるわけではない。
- noteへの導線は、Contactページの「noteから問い合わせる →」に
  一本化されている(Decision Log 0058)。Footerからの直接リンクは
  なくなるが、noteという外部発信先自体はContact経由で引き続き
  到達可能。

## 採用理由

- HeaderとFooterの項目数・文言が完全に一致することで、「この2つの
  ナビゲーションは同じサイト構造を指している」という一貫性が
  一目で伝わるようになる。
- Research Statementとnoteは、いずれも「サイトの主要ページ」という
  よりは「特定の文脈(HomeのCTA、Contactの問い合わせ手段)で
  遷移する先」という位置づけであり、グローバルなFooterナビに
  常時置く必要性は薄いと判断した。

## 他の案

- 逆にHeaderをFooterに揃えて5項目に増やす案も選択肢として提示したが、
  Header側は項目数を増やすとMobileの折り返し・メニューが窮屈になる
  こと(Decision Log 0057)、そして「Home」の文字リンクを重複を避けて
  あえて削除した経緯(同上)を踏まえ、Header側を絞ったまま、Footer側を
  合わせる方針を選んだ。

## 将来の変更可能性

- 将来的にnoteへの導線をFooterにも復活させたくなった場合は、
  `noteUrl`のimportとリンクを`Footer.astro`に戻せばよい。
- Research Statementのページ自体が独立した主要ページとして
  再定義される場合は、Header/Footer双方への追加を改めて検討する。

## Research Context

サイトの骨格(ナビゲーション)における言葉と数の一致は、読者が
「このサイトはどう構成されているか」を無意識に理解する手がかりに
なる。Header/Footerで項目数が食い違っていると、読者は「Footerの
方が情報が多い、見落としている主要ページがあるのでは」と余計な
詮索をしてしまう。この「余計な詮索を減らす」という調整は、
「余白を思考時間として扱う」という設計思想とも一致する
(詮索に使う時間は、余白ではなくノイズである)。
