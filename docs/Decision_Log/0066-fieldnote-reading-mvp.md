# 0066. Fieldnote Reading 最小プロトタイプを実装する

- 日付: 2026-09-02
- 状態: 採用中

## Decision

「読書を中断せず、気になったページを残せるか」だけを検証するための
最小プロトタイプを、`/fieldnote/`(未リンク、直接URLでのみ到達可能)
として実装した。範囲は以下のみ。

- 本のタイトル入力 → 読書セッション開始
- カメラプレビューを維持したまま、1タップで静止画を保存
- 保存後、確認画面を挟まずすぐカメラへ戻る
- 読書セッション終了
- 撮影したページの一覧表示

OCR・AI・ログイン・課金・ISBN検索・タグ・引用範囲選択・Apple Watch
連携・集中モードのネイティブ連携は、この検証には不要なため実装
していない。

画像は`IndexedDbFieldnoteStore`(`src/lib/fieldnote/indexedDbStore.ts`)
経由でセッションごとに端末内(IndexedDB)へ保存する。UI
(`src/lib/fieldnote/app.ts`)は`FieldnoteStore`インターフェース
(`src/lib/fieldnote/store.ts`)にしか依存しておらず、将来Supabase等の
実装に差し替える際もこのインターフェースを満たせばUI側の変更は
不要。カメラ制御(`FieldnoteCamera`、`src/lib/fieldnote/camera.ts`)も
同様にUIから分離し、`<video>`のプレビューを止めずにcanvas経由で
1フレームをBlobとして取り出す。

iPhone Safari・ホーム画面追加PWAを優先し、`viewport-fit=cover`・
`apple-mobile-web-app-capable`等のメタタグと、`/fieldnote/`を
`start_url`/`scope`とするWeb App Manifest
(`public/fieldnote/manifest.webmanifest`)を用意した。

## 採用理由

- **「新機能」ではあるが、CLAUDE.mdのParking Lot(β公開までは着手
  しない)には含まれない**: Parking Lotに列挙されているのはConcept
  Graph・Version UI・Research Timeline・Research Logsページ・
  Research Reviewの詳細UI・バージョン履歴表示であり、Fieldnoteは
  対象外。むしろHome「いま、取り組んでいること」セクション
  (Decision Log 0057)に「Fieldnote(制作中、リンクなし)」として
  既に予告されている、並行して育てる想定の別トラックの検証ツール。
- **公開研究室本体のβ公開範囲を広げない**: `DefaultLayout`
  (Header/Footer)を使わず、サイト内ナビゲーションからもリンクしない
  独立ページとした。β公開の対象であるHome/About/Contact/研究断面等の
  情報設計には一切触れていない。
- **「読書を中断しない」という仮説だけを検証する構成**: 撮影後の
  確認画面を挟まない、カメラプレビューを止めない、といった要件は
  すべて「中断しないこと」を検証するための制約であり、それ以外の
  機能(OCR等)を足さないことで検証の焦点をぼかさない。
- **保存処理をUIから分離**: 将来Supabaseへの切り替えが明言されて
  いるため、`FieldnoteStore`インターフェースを最初から用意した。
  これは「将来の変更可能性」に備えるための抽象化であり、過剰設計を
  避けるという原則には反しない(実際に近い将来の変更が指示されて
  いるケース)。
- **フレームワーク不使用の方針を維持**: サイト全体が素のAstro/
  TypeScriptであるため、Fieldnoteも React 等を導入せず、vanilla
  TypeScript + DOM APIで実装した。

## 他の案

- Fieldnoteの実装自体をParking Lot入りさせ、β公開後に着手する案も
  検討した。しかしタスク自体がプロジェクトオーナーから明示的に
  依頼されたものであり、かつHome側で「制作中」と既に予告されている
  独立ツールであるため、β公開の範囲(サイト本体の情報設計・UI)を
  拡張しない形であれば並行して着手して問題ないと判断した。
- 撮影画像をBase64文字列としてlocalStorageに保存する案も検討したが、
  画像バイナリを扱うにはIndexedDB + Blobの方が容量・パフォーマンス
  両面で適切であり、Supabase Storageへの将来的な移行(バイナリの
  アップロード)とも構造が近い。
- カメラ撮影後にサムネイル確認・保存/破棄を選べる画面を挟む案も
  検討したが、要件で明示的に「確認画面を挟まない」とされているため
  採用しなかった。撮影成功のフィードバックは、操作を止めない
  一瞬のフラッシュ演出のみに留めた。

## 将来の変更可能性

- `FieldnoteStore`をSupabase実装に差し替える際は、
  `src/lib/fieldnote/indexedDbStore.ts`と同じインターフェースを
  満たす新しい実装ファイルを追加し、`app.ts`のimport先を切り替える
  だけで済む想定。
- ホーム画面用アイコン(PWA manifestのicons)は、現時点ではロゴの
  wordmark SVG(`favicon.svg`)を仮に使っている。専用の正方形
  アイコン素材が用意でき次第差し替える。
- 検証の結果「中断しない」という仮説が支持されれば、Home
  「いま、取り組んでいること」のFieldnote項目にリンクを追加し、
  OCR・セッション履歴の閲覧・タグ等の機能追加を検討する
  (その際は改めてDecision Logに記録する)。

## 追記(2026-09-02、PRセルフレビュー)

Draft PR作成前のセルフレビューで、以下の問題を修正した(状態・
方針の変更ではなく、この実装自体の不具合修正のため、新しい番号は
起こさずこのDecision Logに追記する)。

- `FieldnoteCamera.start()`で`video.play()`が失敗した場合(自動再生
  ブロック等)、取得済みのMediaStream trackがstopされずに残っていた。
  失敗経路でも`stop()`してからエラーを投げるよう修正。
- ページ離脱(タブを閉じる/他ページへ遷移/bfcache行き)時にカメラの
  trackが止まらなかった。`pagehide`イベントで`camera.stop()`を
  呼ぶようにした(このページはフレームワークを使わない1枚の
  static pageのため、「コンポーネントのunmount」に相当する
  ライフサイクルはpagehideで代替している)。
- セッション終了時、IndexedDBへの書き込みが失敗する可能性を
  考慮していなかった(先にカメラを止めてから書き込みを試みており、
  失敗すると画面が進まないまま停止しうる状態だった)。書き込みを
  先に済ませ、成功してからカメラを止める順序に変更し、失敗時は
  カメラを止めずにエラー表示・再試行できるようにした。
- セッション開始時にIndexedDBの初期化自体が失敗する場合(プライベート
  ブラウジングの制限等)のエラー表示がなく、無反応のまま止まって
  見える状態だった。タイトル入力画面にエラー表示を追加した。
- 撮影画像を`video.videoWidth`/`videoHeight`のまま(端末のカメラ
  ネイティブ解像度のまま)無加工でIndexedDBに保存していたため、
  20〜50枚の撮影でIndexedDBの容量・メモリを圧迫する可能性があった。
  `getUserMedia`の`width`/`height`制約(ideal 1600px)と、
  `capture()`内でのcanvas描画サイズの縮小(長辺1600px上限)を
  二重にかけ、JPEG品質も0.9から0.85に調整した。OCRでの可読性を
  損なわない範囲での縮小(文字が判読できる解像度の目安として
  長辺1600pxを採用)。

## Research Context

このプロジェクトの核である「観察・実践がどう問いを生むか」を
確かめる装置の一つとして、Fieldnote Readingは「読む」という実践の
最中に「気になった」という反応をどう記録できるかを試すための
道具である。まだ何も証明されていない段階でOCRやAIによる自動化を
足さず、「中断しないこと」自体が成立するかどうかだけを最小構成で
確かめる態度は、「完成を目指すのではなく、育てる」というこの
研究室の哲学(CLAUDE.md冒頭)と一致している。
