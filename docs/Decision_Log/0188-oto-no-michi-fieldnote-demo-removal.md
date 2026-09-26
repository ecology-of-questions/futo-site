# 0188 — Decision Log 0187を修正: 散歩譜は非公開にせず、操作可能なデモだけを外す

## Decision
プロジェクトオーナーから、Decision Log 0187(散歩譜=`oto-no-michi`を`published: false`で公開停止)を取り消す方針修正の指示を受けた。同じPR(#121)上で以下のとおり実装し直した。

1. `published`/`publishedLabNotebooks`によるルート・一覧・sitemapからの除外を取り消した(`src/types/labNotebook.ts`・`src/data/labNotebooks.ts`・`src/data/researchReviews.ts`・`src/pages/index.astro`・`src/pages/participate.astro`・`src/pages/participate/[slug].astro`を、Decision Log 0187以前の状態に戻した)。これにより`/participate/oto-no-michi`は再びビルドされ、トップページの注目ノート紹介・実験室一覧・研究断面の関連リンクにも(該当があれば)再び現れる。
2. 代わりに、「未完成の試作を、完成しているかのように見せない」という目的は、**ページを隠すのではなく、操作可能なデモだけを外す**形で満たすことにした。
   - 散歩譜(`/participate/oto-no-michi`): 身体譜プレイヤー(`WalkingScorePlayer`、架空24秒データ)の描画を外し、「身体の動きを記録する道具は、まだつくっている途中です。」という短い一文に置き換えた。見出し・紹介文・Googleスライドの常時埋め込み・「この記録にコメントする」リンクは変更していない。
   - Fieldnote(`/participate/fieldnote`): 操作可能なメモアプリのデモ(`FieldnoteMemoDemo`、架空データ)の描画を外し、「実際に触れるデモは、まだつくっている途中です。」という短い一文に置き換えた。見出し・紹介文・`commonNotebookDescription`は変更していない。
   - どちらも本文中で理由を説明しすぎない、1文だけの「制作中」表現にとどめた(指示どおり)。
3. Fieldnote実アプリ(`/fieldnote/`、個人用ツール)への公開ページからの導線を確認した。`src/pages/participate/[slug].astro`・`FieldnoteMemoDemo.astro`・その他の公開ページのいずれにも`/fieldnote/`へのリンクは元々存在しない(Decision Log 0186で、公開本棚からの「この本にメモする →」導線もすでに撤去済み)。**今回コードの変更は不要**だったが、ビルド出力全体を`grep`し、`href="/fieldnote/"`を含む公開ページが1件も無いことを確認した。`/fieldnote/`自体はこれまでどおりURL・コードとも維持し、ビルドも継続する(直接URLを知っている人が使う個人用ツールという位置づけは変えない)。

## 何を削除していないか(確認事項)
- `src/components/WalkingScorePlayer.astro`・`src/data/walkingScoreDemo.ts`・`src/types/walkingScore.ts`(身体譜プレイヤー本体)
- `src/components/FieldnoteMemoDemo.astro`・`src/data/fieldnoteMemoDemo.ts`・`src/types/fieldnoteMemo.ts`(Fieldnoteデモ本体)
- 散歩譜のGoogle Slides元データ(`slidesEmbedUrl`・`slidesCommentUrl`、`src/data/labNotebooks.ts`)
- `/fieldnote/`個人用Fieldnoteアプリ一式(`src/pages/fieldnote/`・`src/lib/fieldnote/`)
すべて`src/pages/participate/[slug].astro`からの参照(import・呼び出し)を外しただけで、ファイル自体は削除・変更していない。将来これらのデモを再度組み込みたくなった場合も、コンポーネント・データはそのまま再利用できる。

## 採用理由 (Rationale)
- 「試作段階のものを完成しているように見せない」という目的に対して、ページ全体を隠すのはやりすぎだった。散歩譜・Fieldnoteという2つの実験の存在自体、その説明文、散歩譜の実際の途中経過(Googleスライド)は、むしろ「育てている途中の研究室」を見せるという「ふ、と」の核心的な価値と一致するため、公開を維持する方が方針に合う。
- 一方で、架空データで「動く・触れる」デモ(身体譜の再生UI、メモアプリの操作)は、実際にはまだ存在しない機能を体験できるかのように誤解させる度合いが強い。ページの存在そのものより、この「操作できる=完成している」という誤解のほうが、CLAUDE.mdの「未完成表示の残存チェック」が警戒する対象に近いと判断した。
- 説明文を「制作中」の短い一文にとどめたのは、指示どおり「説明しすぎず、実験を育てている途中だと分かる程度でよい」という要求に沿ったもの。長い言い訳やロードマップは書かない。

## 他の案 (Alternatives)
- デモを条件付きで残し、"デモ・架空データです"という注記を強調する案(Decision Log 0182が散歩譜について実際に採用していた方針に近い)は見送った。今回の指示が「デモの場所自体を外す」ことを明確に求めているため。
- WalkingScorePlayer/FieldnoteMemoDemoのコード自体を削除する案は、指示で明示的に禁止されているため見送った。

## 将来の変更可能性 (Future changes)
- 実際に動く身体譜プレイヤー(実データ・実音声)や、実際のFieldnoteアプリへの公開導線を用意するタイミングが来たら、`src/pages/participate/[slug].astro`に該当コンポーネントを再度importし、この「制作中」の一文と差し替えるだけでよい。データ・コンポーネント側の変更は不要。
- `/fieldnote/`への公開導線を将来追加する場合は、認証・個人情報の扱いを含め、別途プロジェクトオーナーの判断を仰ぐこと(Decision Log 0186と同じ扱い)。

## Research Context
「ふ、と」は完成品を見せる場所ではなく、育てている過程そのものを見せる公開研究室である。今回の修正は、「過程を隠す」(0187)ではなく「過程はそのまま見せつつ、まだ無い機能を体験できるかのように誤解させない」という、より精度の高い線引きに落ち着いた。これはCLAUDE.mdの「Never optimize for completion. Always optimize for growth.」という方針と、「未完成のものを完成しているかのように見せない」という誠実さの両方を、ページ単位ではなく機能単位で満たす判断である。

## 検証・未検証事項
- `npx astro check`: 0 errors / 0 warnings(既存の無関係な警告1件のみ)。
- `npm run build`: 成功。ビルド出力で以下を確認した。
  - `/participate/oto-no-michi/`が再び生成され、sitemapにも含まれる。
  - 同ページのHTMLに身体譜プレイヤー関連のマークアップが無く、Googleスライドの埋め込み・コメントリンク・新しい「制作中」の一文は存在する。
  - `/participate/fieldnote/`のHTMLにFieldnoteMemoDemo関連のマークアップが無く、新しい「制作中」の一文は存在する。
  - トップページの注目ノート紹介・実験室一覧に散歩譜が再び表示される。
  - ビルド出力全体(全HTML)に`href="/fieldnote/"`を含むページが無いことを確認(公開ページからの導線が無い状態を維持)。
- Cloudflare Preview環境での実URL確認はPRコメントに記録する。
- 本番(`futoing.com`)への反映はこのPRのマージ後。今回もマージしない。
