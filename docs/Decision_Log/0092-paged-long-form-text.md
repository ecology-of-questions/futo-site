# 0092. 長文ページを「1画面ずつ切り替える」ページングを導入する

- 日付: 2026-09-04
- 状態: 採用中

## Decision

「だいぶ見やすくなったが、もう少し文字での説明を減らせないか」との
フィードバックを受けた。前回のUIフリクションレビュー(Decision Log
0089)で示した2案(文章そのものを削る/視覚的な圧縮)以外の第3の案
として、「次のページに遷移するためのボタン」という具体案が示され、
対象範囲(サイト全体の長文ページ)・仕組み(URLは変えず1画面ずつ切り
替え)を確認した上で実装した。

- `src/lib/pager.ts`を新設。`data-pager`属性を持つ要素の中の
  `data-pager-page`要素を1つだけ表示し、`data-pager-prev`/
  `data-pager-next`ボタンと`data-pager-status`(「1 / 5」等)を
  制御するvanilla JS。JSが無効な環境では`data-pager-page`要素は
  どれも隠されず、全文がそのまま読める(`data-pager-controls`側は
  JSが有効なときだけ`hidden`を外して表示する。Contactフォームの
  fetch送信と同じprogressive enhancementの考え方)。
- `ResearchStatement.astro`・`ResearchReviewArticle.astro`に、
  任意prop`pagesOf`(画面ごとの段落数/section数の配列)を追加した。
  指定時のみページングが有効になり、省略時(Home抜粋等)は従来通り
  全文を1画面に表示する。どの段落・sectionをどの画面にまとめるかは
  コンポーネント側では判断せず、内容を知っている呼び出し側
  (各ページのAstroファイル)が`pagesOf`として指定する
  (「container separated from content」の方針に沿う)。
- 適用したページ:
  - `research-statement.astro`(Research Statement全文、14段落を
    意味のまとまりごとに5画面`[2,2,3,3,4]`へ)
  - `research/reviews/01.astro`(研究断面01、10 sectionを6画面
    `[2,2,1,1,3,1]`へ。要旨+節1、節2+節3(表・図版)、節4、節5(仮説
    4つ)、節6+定義+課題、参考文献という区切り)
  - `research/reviews/1-5.astro`(研究断面1.5、9 sectionを5画面
    `[2,2,2,2,1]`へ)
- 適用しなかったもの: Home抜粋(`index.astro`。paragraphsが2件のみで
  ページングの必要がない)、About(`about.astro`。全体で4段落程度と
  短く、ページングを入れるとクリック数が増えるだけで逆効果と判断)。

## 採用理由

- 「1画面ずつ切り替え、URLは変えない」という指定に対し、JSで表示を
  差し替える方式(実際のページ遷移をしない、履歴に積まない)を
  素直に実装した。既存のHeader(メニュー開閉)・Contactフォーム
  (fetch送信)と同じ「vanilla JS + progressive enhancement」の
  流儀を踏襲している。
- `pagesOf`を配列(グループごとの件数)にしたのは、`currentWorkItems`
  や`openPracticeLinks`と同様、データを配列として渡しコンポーネント
  側は`.map()`するだけ、という既存パターンに揃えたため。
- ResearchReviewArticleでは、`.article`(コンテナ)自体ではなく、
  新設した`.page`要素だけを画面単位にした。`.row`(図版・表の横並び
  レイアウト、Decision Log 0042〜045)は`.article`の幅を前提に
  組まれているため、画面を分けても`.row`のレイアウト自体は変更せず、
  1画面の中にsection単位でそのまま収まる形にした。
- 実装中、`data-pager`をpage一覧側の要素にだけ付け、操作ボタン
  (`data-pager-controls`)を兄弟要素として外に出していたところ、
  `initPager`内の`root.querySelectorAll(...)`がボタンを見つけられず
  クリックしても何も起きない不具合が発生した。pageとcontrolsの両方を
  1つの`data-pager`要素の子孫にするよう構造を直した(スクリーン
  ショットで実際にクリックして動作確認済み)。
- `[hidden]`属性のブラウザ既定スタイル(`display: none`)は、同じ
  詳細度の`.page`/`.pagerControls`(`display: flex`)に打ち消される
  ため、`.page[hidden]`/`.pagerControls[hidden]`という明示的な
  上書きルールを追加した。

## 他の案

- ページを実際に分割し、`/research-statement/2`のような別URLへ
  遷移する案も検討候補だったが、「URLは変えない」という指定により
  見送った。
- ページング用の操作UIコンポーネントを共通コンポーネント化する案も
  考えられたが、`ResearchStatement`と`ResearchReviewArticle`で
  ボタンの見た目・配置(`.link`/`.article`との位置関係)が微妙に
  異なるため、CSSは各コンポーネントに残し、JS(`pager.ts`)のみ
  共有する形にした。

## 将来の変更可能性

- `pagesOf`の区切り方(どの段落・sectionをどの画面にまとめるか)は、
  実際の見え方を見てプロジェクトオーナーの判断で調整される可能性
  がある。
- 02以降のResearch Reviewが追加された際も、同じ`pagesOf`propで
  同様にページングできる。
- キーボード操作(矢印キーでの前後移動等)やスワイプ操作は、今回は
  実装していない(戻る/次へボタンのクリック・Enterキーのみ)。要望が
  あれば追加を検討する。

## Research Context

「文字での説明を減らせないか」という要望に対し、文章そのものを削る
のではなく、読む人が一度に向き合う分量を「1画面ぶん」に区切ることで
対応した。これは、この研究室が積み重ねてきた文章(Research Statement
という宣言、研究断面という研究ノート)の言葉そのものを損なわずに、
読む体験だけを軽くするという選択であり、「完成を目指さず、育て
続ける」というこのプロジェクトの姿勢とも矛盾しない。
