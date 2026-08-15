# 0033. /researchページを「管理画面」から「研究断面の一覧」に作り直す

- 日付: 2026-08-15
- 状態: 採用中(Decision Log 0004・0005が設計したResearchCardの
  用途をこのページからは廃止。ResearchStatus型自体は継続)

## Decision

/researchページの構成を、プロジェクトオーナー・Creative Directorとの
やりとりを経て、次のように作り直した。

**指摘の要旨**: 「研究断面01」がResearchCard(Status: Published /
Current Focus: "..." / Last Updated: 2026.08.15という管理情報中心の
カード)として表示されており、「これは記事なのか、プロジェクトなのか、
ステータス管理画面なのか」が一目で伝わらない。読者が知りたいのは
管理情報ではなく「どんな研究なのか」であり、今のデザインは「論文の
一覧」に見えてしまっている、という指摘だった。

**変更点**:

1. **Research Reviews / Research Fragmentsのセクション統合**:
   これまで別々のセクション(SectionTitle「Research Reviews」+
   ResearchCard、SectionTitle「Research Fragments」+「Coming Soon」)
   だったものを、「研究断面」という1つのシリーズの一覧に統合した。
   `SectionTitle`で小さく「RESEARCH」、その下に大きな見出しで
   「研究断面」を表示する(ResearchStatement・ResearchReviewArticle
   と同じ「小さな英語ラベル+大きな日本語見出し」のパターン、
   Decision Log 0016の踏襲)。
2. **ResearchCardの廃止、ResearchReviewListへの置き換え**:
   `ResearchCard`(Status/Current Focus/Last Updatedという3行の
   管理情報表示)を削除し、新規`ResearchReviewList`コンポーネントに
   置き換えた。公開済み(`PublishedReviewEntry`)のエントリは
   番号・タイトル・サブタイトル・説明文・更新日を表示し、詳細ページ
   全体へのリンクになる。構想中(`PlannedReviewEntry`)のエントリは
   番号・タイトル・「(構想中)」のみの1行(リンクなし)。両者の
   あいだに区切り線を1本引く。
3. **Statusという概念自体の廃止**: 「Published」という表示は、
   「この研究は公開した瞬間に完成するものではない」という考え方と
   合わないという指摘を受け、Status行そのものを廃止した。代わりに
   「2026.08.15 更新」という更新日のみを表示する。ラベルの言い換え
   (Published→公開中/Ongoing等)ではなく、フィールド自体を削除する
   という判断になった。
4. **02, 03の先出し**: これまで「Coming Soon」という無内容な
   プレースホルダーだった部分を、実際に構想している次のテーマ
   (「認識の変化と言語の生態系」「世界はどのように見えてくるのか」)
   のタイトルに差し替えた。「(構想中)」という言葉で、公開済みの
   01とは違う段階にあることを示す。

## 採用理由

- 今回の変更はすべてプロジェクトオーナー・Creative Directorとの
  やりとりの中で具体的なモックアップ(テキストでのレイアウト案)
  として示され、最終的にそのまま反映してほしいという指示を受けた。
  情報設計・コピーの決定はProject Owner/Creative Directorの領域
  (CLAUDE.md Workflow)であり、実装側で意匠を変える判断はしていない。
- 「セクションを統合するか」「Publishedの代わりの表記」については
  やりとりの中で複数案が出たが、最終的にプロジェクトオーナーから
  具体的なテキストモックアップが示されたため、それを正としてそのまま
  実装した。

## ResearchCard・ResearchStatus(Decision Log 0004・0005・0006)との関係

`ResearchCard`(Decision Log 0004で新設、0005で「出版状態ではなく
研究状態」という設計思想を得たコンポーネント)は、このページでの
役割を`ResearchReviewList`に譲り、削除した。他にこのコンポーネントを
使っている箇所は無かったため、削除に伴う影響はない。

一方、`ResearchStatus`型・`researchStatusLabel`・
`researchStatusTransitions`(`src/types/research.ts`)は、
Research Review以外(Research Fragment、Logs等)将来のコンテンツ
種別で研究状態を表示する可能性を見込んで残した。現時点でこの型を
使うコンポーネントはコードベース上に存在しないが、Decision Log
0005・0006が積み重ねた「出版状態ではなく研究状態を表す」という
設計思想そのものは、今回の変更(「Publishedという表示は研究の
本質と合わない」という指摘)によってむしろ裏付けられたと考えている。
長期間未使用のままであれば、削除を検討すること。

## 他の案

- **「Published」のラベルだけを「公開中」「Ongoing」等に差し替える案**:
  検討の初期段階ではこの方向で進みかけたが、最終的にはStatus行
  そのものを削除する案が採用された。ラベルを言い換えるだけでは
  「管理情報が前面に出ている」という根本の指摘には応えられていない、
  という判断だったと理解している。
- **Research Reviews/Fragmentsを分けたまま、カードの意匠だけ変える案**:
  「研究断面」という言葉が既に1つの独立した概念として機能している
  ため、セクションを分けたままだと「研究断面」と「Research Reviews」
  の関係がわかりにくいという指摘があり、統合する案を採用した。

## 将来の変更可能性

- 研究断面02, 03が実際に公開されたら、`research.astro`の
  `plannedReviews`から`publishedReviews`へエントリを移し、詳細ページ
  (`02.astro`等)を追加する。
- Research Fragments・Logsが将来「研究断面」とは異なる種類の
  コンテンツとして独立実装される場合は、`ResearchReviewList`とは
  別のコンポーネント・セクションを新設することになる。現時点では
  「研究断面」に一本化されているが、これは「Fragmentsという概念を
  廃止した」という意味ではなく、「今はまだ研究断面しか実体がない」
  という状態を反映しただけである。

## Research Context

「論文の一覧ではなく、公開研究室らしく」という指摘は、このプロジェクト
の根本理念(PROJECT.md、CLAUDE.md Philosophy: 「完成を目指さず、
育て続ける」)を、最も読者と近い一覧画面のレベルで具体化したものだと
考えている。Status/Current Focus/Last Updatedという管理情報の並びは、
実装側からすると「進捗を正確に伝える」という意味で合理的だったが、
読者からすると「研究の中身より先に、管理の仕組みを見せられている」
という体験になっていた。今回の変更は、実装の正確さよりも、読者が
最初に何と出会うべきかを優先した判断だと言える。
