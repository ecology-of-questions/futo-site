# 0187 — 散歩譜(旧・音の道)を公開停止し、Fieldnote/OCR系PRとは切り離して本体を公開する

## Decision
プロジェクトオーナーから、「散歩譜」(実験室ノートの1冊、route slug `oto-no-michi`)がまだ試作段階であるため、公開サイトからは外し、`main`をそのまま「ふ、と」本体として公開・告知できる状態にしたいという指示を受けた。あわせて、Fieldnote OCR(Google Vision統合含む)関連のPR群(#114〜#120)はすべて未マージのまま保留する方針を再確認済み(別スレッドで報告済み)。

今回の変更は`main`から新規ブランチを切って行い、Fieldnote/OCR系PRのスタックには一切触れていない。

1. `src/types/labNotebook.ts`に`LabNotebook.published?: boolean`(省略時true)を追加した。
2. `src/data/labNotebooks.ts`の散歩譜(`slug: "oto-no-michi"`)エントリに`published: false`を設定し、`publishedLabNotebooks`(`published !== false`のものだけを残した配列)を新設してエクスポートした。
3. 公開サイト側でノート一覧・詳細を参照している箇所を、すべて生の`labNotebooks`ではなく`publishedLabNotebooks`を参照するように変更した。
   - `src/pages/index.astro`(トップページの注目ノート紹介)
   - `src/pages/participate.astro`(実験室一覧)
   - `src/pages/participate/[slug].astro`(`getStaticPaths`・「他のノートを見る」)
   - `src/data/researchReviews.ts`(研究断面詳細ページの「この断面のそばにあるもの」関連リンク解決)
4. 散歩譜自体のデータ(entries・Google Slidesの`slidesEmbedUrl`/`slidesCommentUrl`)、`WalkingScorePlayer.astro`・`walkingScoreDemo.ts`・`types/walkingScore.ts`(身体譜プレイヤー)、`SupportSection`/`SupportLedger`(散歩譜ページ専用の支援欄)は一切削除していない。将来`published: true`に戻すだけで、コード変更なしに再公開できる。

## 何が変わったか(公開面)
- トップページ: 散歩譜を紹介するセクション(`{featured && ...}`)が描画されなくなった(`featured`が常に`undefined`になるため)。
- 実験室一覧(`/participate`): 3件中2件(Fieldnote・研究断面をひらく)のみが表示される。
- `/participate/oto-no-michi`: `getStaticPaths`がこのslugを生成しなくなるため、**ビルド後にこのURLの静的ファイルが存在しない**。`wrangler.toml`の`[assets] not_found_handling = "404-page"`(本番Worker `futo-site`・Preview `futo-site-preview`共通)により、このURLへの直接アクセスは自動的にAstroの`404.astro`(実HTTPステータス404)を返す。追加のリダイレクト設定・Worker側の変更は不要。
- `sitemap.xml`(`@astrojs/sitemap`)はビルド時に実際に生成されたページのみを列挙するため、`/participate/oto-no-michi`は自動的に含まれなくなる(検索エンジンに案内されない)。
- 研究断面(`/research/reviews/*`)・本棚(`/bookshelf`)・参加ページの他ノート(Fieldnote・研究断面をひらく)・ナビゲーション(Header/Footer)には変更なし。現行の公開済み研究断面(01・1.5)はいずれも`relatedNotebookSlugs`に`oto-no-michi`を含んでいないため、今回の変更による表示差分は無い。

## 採用理由 (Rationale)
- 「削除ではなく非公開」を`published`という1つのbooleanフラグに閉じ込めることで、CLAUDE.mdの「コンテナと中身の分離」の考え方に沿い、将来の再公開を値の変更だけで済むようにした。slugごとの個別分岐をページ側に増やすと、再公開時に修正漏れが起きやすくなるため避けた。
- 静的生成そのものを止める(`getStaticPaths`から除外)ことで、"noindex"のようなメタタグに頼らず、URLを直接叩いても本当に404になる状態にした。これは「検索にも出ないように」という要求に対して、robots制御より確実な方法と判断した。
- Fieldnote/OCR系PR(#114〜#120)には一切触れず、`main`から独立した新規ブランチのみで完結させた。目的(本体を先に公開、OCR関連は保留)に対して、両者を混在させる理由がないため。

## 他の案 (Alternatives)
- ページファイル自体を削除する案は見送った。指示が「Google Slidesの元データ・散歩譜のコード・資料そのものは削除しない」と明記しているため。
- `[slug].astro`側でslug名を直接分岐して非表示にする案(例: `if (notebook.slug === "oto-no-michi") return null`)は見送った。散歩譜専用の分岐がページ側に散らばり、再公開時の修正箇所が増えるため、データ側の`published`フラグ1箇所に判断を集約する方を選んだ。
- Cloudflare側でルーティングリダイレクト・Workerレベルのブロックを追加する案は見送った。Astroが静的生成しないだけで404になる既存の`not_found_handling`設定で要件を満たせるため、Cloudflare固有設定への追加依存(CLAUDE.mdのスコープ外拡張禁止)を避けた。

## 将来の変更可能性 (Future changes)
- 散歩譜を再公開する場合は、`src/data/labNotebooks.ts`の`published: false`を削除(または`true`に変更)するだけでよい。トップページ・実験室一覧・詳細ページ・研究断面の関連リンクはすべて自動的に復帰する。
- 再公開のタイミングで、身体譜プレイヤーに実データ(`kind: "recorded"`)や支援口座情報を追加する場合は、Decision Log 0182に記載済みの拡張方法をそのまま使える。

## Research Context
「ふ、と」は完成品ではなく育て続ける研究室そのものを見せる場所であり、試作段階のものを完成しているかのように見せないことは、CLAUDE.mdの中心的な方針(「未完成表示の残存チェック」を公開前チェックリストの常設項目にしている)と一致する。今回の変更は、散歩譜という探究自体を止めるのではなく、公開のタイミングだけを切り離す判断であり、「継続的に育てる」という研究室の姿勢と矛盾しない。

## 検証・未検証事項
- `npx astro check` / `npm run build`: 実施し、エラーなし・`/participate/oto-no-michi`が出力に含まれないことを確認(詳細はPR本文・build確認コメント参照)。
- Cloudflare Preview環境での実URL確認(トップページ・実験室一覧・`/participate/oto-no-michi`が404になること・他ページの無変化)はPRコメントに記録する。
- 本番(`futoing.com`)への反映はこのPRのマージ後。今回はマージしない。
