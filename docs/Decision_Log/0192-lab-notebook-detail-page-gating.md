# 0192 — 中身の無いノート(Fieldnote・研究断面をひらく)は詳細ページ自体を無くす

## Decision
プロジェクトオーナーから、実験室(`/participate`)のFieldnote・研究断面をひらくは「まだノートが無い」ため、「ノートを見る」リンクと個別のノートページ自体を無くす指示を受けた。

- `src/data/labNotebooks.ts`に`hasDetailPage(notebook)`を追加した。現状の判定基準は「Googleスライド(`slidesEmbedUrl`)を持っているか」で、これを満たすのは散歩譜(oto-no-michi)のみ。Fieldnote・研究断面をひらくはentriesが空でスライドも無く、判定はfalseになる。
- `src/pages/participate/[slug].astro`の`getStaticPaths`を`hasDetailPage`でフィルタし、Fieldnote・研究断面をひらくのページ(`/participate/fieldnote`・`/participate/research-fragments`)自体を生成しないようにした。アクセスすると、`wrangler.toml`の`[assets] not_found_handling = "404-page"`により実HTTP 404になる(散歩譜を非公開にした際、Decision Log 0187で確認した仕組みと同じ)。
- 上記に伴い、スライドが無い場合の非スライド用レイアウト(旧Fieldnote・研究断面をひらく向け、Decision Log 0184のデモ跡地・0188の「制作中」置き換えを含む)は到達不能になったため削除した。散歩譜専用のスライドレイアウトのみが残る。
- `src/components/LabNotebookList.astro`(`/participate`一覧の行を描画)は、`hasDetailPage`がtrueのノートだけ`<a>`でリンクし、CTA(「ノートを見る →」)を表示する。falseのノート(Fieldnote・研究断面をひらく)は同じ見た目の`<div>`(新設`.linkless`クラス、`.link`と全く同じ宣言)で、category・title・descriptionだけを表示し、CTAは出さない。
- 散歩譜自身のノート詳細ページ内「他のノートを見る」section は、`otherNotebooks`(他に詳細ページを持つノート)が0件の場合は描画しないようにした(現状、詳細ページを持つのは散歩譜のみのため、この section は現時点では表示されない)。

## 採用理由 (Rationale)
- 「まだ中身が無いページを公開する」ことは、CLAUDE.mdの「未完成表示の残存チェック」が警戒する状態そのもの。ページへのリンクだけ用意して開いても実質空、というのは訪問者の期待を裏切る。
- 新しい`published`のような汎用フラグを追加するのではなく、既存の`slidesEmbedUrl`(実際の中身の有無を示す既存シグナル)をそのまま判定に使う`hasDetailPage()`を1関数として切り出した。判定基準が1箇所にまとまり、`/participate`一覧・`[slug].astro`のルーティング・「他のノートを見る」の3箇所すべてが同じ関数を参照するため、将来ノートの中身が増えたときも矛盾なく反映される。
- ページ自体を作らない(getStaticPathsで除外)方式は、9/26の散歩譜非公開化(Decision Log 0187、その後取り消し)で検証済みの仕組みをそのまま踏襲しており、確実に404・sitemap除外になることが分かっている。

## 他の案 (Alternatives)
- ページは残したまま、リンクだけを外す案は見送った。URLを直接知っていれば空のページに到達できてしまい、「中身が無いページを無くす」という指示の趣旨に合わない。
- ノートごとに個別の`hasDetailPage`フラグを`labNotebooks.ts`のデータに直接持たせる案(例: `published: false`と同様の明示的なboolean)も検討したが、実際の中身の有無(スライドの有無)と2重管理になり、スライドを追加したのにフラグを更新し忘れるリスクがあるため、既存の`slidesEmbedUrl`から導出する関数のほうが単純で確実と判断した。

## 将来の変更可能性 (Future changes)
- Fieldnote・研究断面をひらくに実際の中身(Googleスライド、または将来別の実データ形式)ができた場合は、該当ノートに`slidesEmbedUrl`を設定するか、`hasDetailPage()`の判定基準を拡張するだけで、ページ生成・一覧のリンク化・「他のノートを見る」への出現が自動的に揃う。
- entriesを使った別形式のノート運用を再開する場合は、`hasDetailPage()`の判定に「entriesが1件以上あるか」も加えること。

## Research Context
「ふ、と」は実際に存在するものだけを見せる方針を一貫して取っている。まだ何もひらいていないノートに「開く」入口だけを用意することは、この方針とずれる。今回の変更は、実験室の3冊が「同じ見た目の棚」に並びながらも、実際に開けるものと、まだ開けないものを正直に区別する対応である。

## 検証・未検証事項
- `npx astro check` / `npm run build`: 実施しエラーなし。
- ビルド出力で以下を確認済み:
  - `/participate/fieldnote/`・`/participate/research-fragments/`が生成されない(`dist/participate/`配下に存在しない)
  - `sitemap-index.xml`にこの2つのURLが含まれない
  - `/participate`一覧で、散歩譜のみ`<a>`+「ノートを見る →」、Fieldnote・研究断面をひらくは`<div>`(リンク無し・CTA無し)で表示される
  - `/participate/oto-no-michi/`の「他のノートを見る」sectionが描画されない(他に詳細ページを持つノートが無いため)
- Cloudflare Preview環境での実URL確認はPRコメントに記録する。
