# 0030. Research Review詳細UIをParking Lotから一部解禁し、研究断面01を公開する

- 日付: 2026-08-15
- 状態: 採用中

## Decision

CLAUDE.md Parking Lot(「β公開まで実装しない」リスト)にあった
「Research Review detail UI / version history display」のうち、
詳細UI(本文を表示するページ)を、研究断面01の1件に限って解禁した
(プロジェクトオーナーの指示)。バージョン履歴表示は引き続き
Parking Lotに残す。

実装は以下の構成にした。

**型(`src/types/researchReview.ts`)**: `ParagraphBlock` /
`ListBlock` / `TableBlock` の判別可能ユニオン型`ContentBlock`と、
`{ heading: string; blocks: ContentBlock[] }`の`ReviewSection`を
新設した。元原稿(見出し→本文→箇条書き→表という構造を持つPDF)を
そのまま表現するための最小限の型で、`status`の型を`ResearchCard`
から独立させた前例(`src/types/research.ts`)に倣った。

**コンポーネント(`src/components/ResearchReviewArticle.astro`)**:
`ReviewSection[]`を受け取り、セクション見出し(`<h2>`)→段落
(`<p>`)/箇条書き(`<ul>`)/表(`<table>`)を順に描画する。
「文章を受け取る器」という設計(Decision Log 0003・0008の踏襲)。
段落内の改行は強制せず、Research Statementの方針(Decision Log
0026)と同じく自然な折返しに任せている。

**URL構造**: `/research/reviews/01`(`src/pages/research/reviews/
01.astro`という静的ファイル)。02, 03...と増える前提の構造にした
(Design Spec v0.4のIA: Research > Reviews/Fragments/Logs に対応)。
このリポジトリには動的ルーティング(`[slug].astro`やcontent
collections)の前例が無く、既存ページ(`index.astro` /
`research.astro` / `research-statement.astro` / `404.astro`)は
すべて1ページ1ファイルの静的構成のため、それに合わせた。02以降を
追加する際は、`02.astro`等を同じ構造で追加し、`sections`配列と
`ResearchReviewArticle`への渡し方だけをコピーすれば済む。

**命名**: ページの見出しは「研究断面01」(大きな`<h1>`)とし、その
上に`SectionTitle`で「Research Review」という小さな英語ラベルを
添えた。これはResearchStatementコンポーネントの`title`(小さな
英語ラベル)+`heading`(大きな日本語見出し)という既存パターン
(Decision Log 0016)をそのまま踏襲したもので、「日本語タイトル
『研究断面』・英語ラベル『Research Review』の併用」という指示を、
既存のデザインシステムの語彙で実現した形になる。

**タイトルの読み替え**: 共有されたPDF原稿のタイトルは「研究断面02」
だったが、既存のプレースホルダー(研究断面01)を置き換える形で
「研究断面01」として公開する(プロジェクトオーナーの指示)。文章の
内容・語順は変更せず、タイトル中の番号のみ01に読み替えた。

**`/research`ページ側の更新**: `ResearchCard`の`status`を
`preparing`→`published`に、`lastUpdated`を`2026.08.15`に変更し、
`currentFocus`を`"What is Inquiry?"`(準備中期のプレースホルダー)
から`"「ふと」という日本語について"`(公開したReviewの主題)に
差し替えた。`currentFocus`は元々のJSDocコメントで「現在取り組んで
いる問い、または公開時のテーマ」と定義されていたため、削除せず
この用途にそのまま使えた。

**`ResearchCard`への`href`追加**: カード全体を詳細ページへの
リンクにできるよう、`href?: string`を追加した。未指定時は従来通り
リンクなしのカードとして表示されるため、詳細ページを持たない
今後の`preparing`カードにも影響しない。

## 採用理由

- Parking Lotの一部解禁はプロジェクトオーナーの明示的な指示であり、
  CLAUDE.mdのルール(「Parking Lotの項目が出てきたら実装せず
  Decision Logに記録して止まる」)は、指示のない先回りの実装を
  防ぐためのものである。今回は指示があったため、その理由(研究断面
  01という具体的な1本のReviewが用意できたこと)をこのDecision Log
  に記録した上で実装した。
- 詳細UIのみを解禁し、バージョン履歴表示は解禁しなかったのは、
  今回の指示が明確に「01のみ実装済み、02以降は同じ構造を再利用」
  という詳細UIの話であり、複数バージョンの履歴を見せる機能とは
  別の話だったため。Parking Lotの1エントリを機械的に丸ごと解禁
  するのではなく、指示された範囲だけを解禁する方が、CLAUDE.mdの
  Parking Lotルールの趣旨(「指示のない機能を先回りして作らない」)
  に忠実だと判断した。
- URL構造を動的ルーティングではなく静的ファイル(`01.astro`,
  将来`02.astro`)にしたのは、既存コードベースに動的ルーティングの
  前例が一切なく、レビューの本数も現時点で1件のみのため。
  「Don't design for hypothetical future requirements」
  (CLAUDE.md Coding Rules)の通り、02, 03が実際に増えてから
  必要であれば動的ルーティングやcontent collectionsへの移行を
  検討すればよい判断とした。
- `ResearchCard`に`href`を追加する際、新しいコンポーネントを作らず
  既存コンポーネントを拡張したのは、「Keep components small,
  single-responsibility, and easy to replace」の範囲内で収まる
  変更だったため(propsが1つ増えるだけで、責務は変わらない)。

## Research State Model(Decision Log 0006)との関係

`researchStatusTransitions`(`src/types/research.ts`)が定める
状態遷移は`preparing → reading → writing → reviewing → published`
で、`preparing`から直接`published`への遷移は定義されていない。
今回`status`を`preparing`から直接`published`に変更したことは、
この状態機械が定めた遷移経路を辿っていない。

ただし`canTransitionResearchStatus`はコードベースのどこからも
呼び出されておらず(検索して確認済み)、`ResearchCard`の`status`
propに実行時の遷移チェックは掛かっていない。値を直接指定できる
単なる表示用の型である。

この不整合は、「サイト上でトラッキングされる研究状態」と「実際の
研究プロセス」が別物であることに由来すると考えている。研究断面01
の執筆自体は、サイト上で"reading"や"writing"として逐一状態変更が
記録されていたわけではなく、完成した原稿がまとめて共有された。
サイトの状態モデルは、あくまで「このサイト上で研究状態をどう見せる
か」という表示の仕組みであり、実際の思考・執筆プロセスそのものを
強制するものではない。将来、実際に執筆途中の状態(reading/writing
中)をサイト上でリアルタイムに見せたいという要望が出てきた場合は、
この不整合を踏まえて`researchStatusTransitions`の設計(あるいは
運用ルール)を見直す必要がある。

## 他の案

- **`[slug].astro`による動的ルーティングを今回導入する案**: 02以降
  を見越した「将来を見越した構造」という要望はあったが、URLパス
  (`/research/reviews/01`)さえ将来の拡張に耐える形にしておけば、
  実装方式(静的ファイル vs 動的ルーティング)は後からでも移行
  できる。レビュー数が少ないうちに動的ルーティングの複雑さを
  持ち込む必要はないと判断し見送った。
- **`ResearchStatusTransitions`に`preparing → published`の遷移を
  追加する案**: 今回のケース(サイト外で完成した原稿を直接公開する)
  のために状態機械そのものを緩める必要はないと判断した。むしろ
  「サイト上の状態遷移」と「実際の研究プロセス」が異なりうること
  自体を記録に残す方が、Decision Log 0006の設計意図(段階を追って
  育っていく研究状態を表現する)を尊重できると考えた。

## 将来の変更可能性

- 研究断面02以降を追加する際は、`src/pages/research/reviews/
  02.astro`を同じ構造(`ReviewSection[]`を組み立てて
  `ResearchReviewArticle`に渡す)で追加し、`/research`ページに
  カードを追加する。
- レビュー数が増えて一覧・並び替え・タグ付けなどが必要になった
  段階で、静的ファイルの並びから動的ルーティング/content
  collectionsへの移行を検討する。
- バージョン履歴表示(Parking Lot継続)を実装する際は、今回の
  `ContentBlock`/`ReviewSection`型がそのまま「あるバージョン時点
  でのスナップショット」として使える設計になっている。

## Research Context

「01のみ実装済み、02以降は同じ構造を再利用する」という今回の方針
自体が、「Container separated from content」というアーキテクチャ
原則(CLAUDE.md)の実践例になっている。`ResearchReviewArticle`
という「コンテナ」は、研究断面01というコンテンツのために作られた
のではなく、研究断面という形式そのもの(見出し→本文→箇条書き→表)
のために作られている。研究断面01は、そのコンテナに最初に流し込まれた
コンテンツに過ぎない。

また、Parking Lotという仕組み自体が「新機能を思いついたら実装せず
記録するだけでよい」(PROJECT.md)という、性急な実装を避けるための
装置だった。今回、その一部を計画的に解禁したという行為そのものが、
「公開研究室は完成を目指さず、育て続ける」という本プロジェクトの
姿勢と、「一気に全部を作らず、実物(研究断面01)ができた分だけ
機能を追う」という実装側の規律が、両立できることを示していると
考えている。
