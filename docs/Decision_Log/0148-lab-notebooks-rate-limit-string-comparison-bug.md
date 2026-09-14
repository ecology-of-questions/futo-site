# 0148. スパム対策の連投判定SQLが文字列比較になっていた不具合の修正

- 日付: 2026-09-14
- 状態: 採用
- 関連: Decision Log 0141・0142(連投防止・1日上限という仕様自体は
  変わらない。実装のSQLにあった不具合を修正する)

## Decision

Preview環境で投稿を試みたところ、初回投稿から30分以上経過しても
常に429(連投制限)が返り続けるという報告を受けた。Cloudflare Live
Logで実際に429が返っていること、D1の`created_at`が
`2026-09-14T05:05:56.746Z`のようなISO 8601形式(`T`区切り、末尾`Z`)
で保存されていることを確認いただき、プロジェクトオーナーから
「SQLiteの`datetime()`は`2026-09-14 05:05:56`のように空白区切りに
なるため、文字列としての辞書順比較になり、同日中の投稿がずっと
『60秒以内』と判定されている可能性がある」という具体的な指摘を
受けた。

`worker/index.ts`の連投判定SQLを確認したところ、指摘どおりの
不具合があった。

```sql
-- 修正前
SELECT id FROM entries WHERE ip_hash = ?1 AND created_at > datetime('now', ?2) LIMIT 1
-- ?2 = '-60 seconds'
```

`created_at`は`new Date().toISOString()`で生成した
`"2026-09-14T05:05:56.746Z"`のような文字列で保存される。一方、
SQLiteの`datetime('now', '-60 seconds')`は`"2026-09-14 05:04:56"`の
ような、`T`の代わりに半角スペースを使った文字列を返す。

`created_at > datetime(...)`はどちらもTEXT型のため、SQLiteは
これを**文字列としての辞書順比較**で評価する。日付部分
(`"2026-09-14"`)が一致する限り、次の1文字は`created_at`側が`T`
(0x54)、`datetime()`側が半角スペース(0x20)であり、ASCIIコード上
`T`のほうが大きいため、**実際の時刻に関わらず`created_at >
datetime(...)`は常に真になる**。つまり、投稿からどれだけ時間が
経っても、同じ日付のうちは「直近60秒以内の投稿」と誤判定され
続け、429が解除されないバグだった。1日上限のクエリ
(`created_at > datetime('now', '-1 day')`)も同じ理由で、日付を
跨がない限り常に真になる同種の不具合を抱えていた。

## 対応

`unixepoch()`でどちらも秒単位のUNIXエポック数値に正規化してから
比較するように修正した。

```ts
const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_DAILY_WINDOW_SECONDS = 24 * 60 * 60; // 追加
const RATE_LIMIT_DAILY_MAX = 20;
```

```sql
-- 連投防止(60秒)
SELECT id FROM entries WHERE ip_hash = ?1
  AND unixepoch(created_at) > unixepoch('now') - ?2 LIMIT 1
-- ?2 = RATE_LIMIT_WINDOW_SECONDS (60、数値のまま)

-- 1日上限
SELECT COUNT(*) as count FROM entries WHERE ip_hash = ?1
  AND unixepoch(created_at) > unixepoch('now') - ?2
-- ?2 = RATE_LIMIT_DAILY_WINDOW_SECONDS (86400、数値のまま)
```

`unixepoch(created_at)`はSQLiteの日時関数がISO 8601形式
(`T`区切り・`Z`終端・小数秒を含む)を正しく解釈できるため、
`created_at`の保存形式自体は変更していない。

## 実装確認(ローカルD1)

`wrangler dev`のローカルD1エミュレーションで、指示された3パターンを
すべて確認した。

1. **直前の投稿から60秒未満で再投稿 → 429**
   ```
   POST(1回目) → 201 Created
   POST(直後)  → 429 {"error":"please wait a moment before posting again"}
   ```
2. **60秒(65秒)待ってから再投稿 → 201**
   ```
   (65秒待機)
   POST → 201 Created
   ```
3. **1日20件の上限に達した状態で投稿 → 429**
   同一`ip_hash`で、60秒以上前(5分間隔)のタイムスタンプを持つ
   投稿を18件directly SQLで投入し、実際のPOSTによる2件と合わせて
   合計20件にした状態で21件目をPOSTしたところ、
   ```
   POST → 429 {"error":"daily post limit reached"}
   ```
   となることを確認した。60秒以内の連投制限には引っかからない
   タイムスタンプ(直近から5分以上前)を使っており、1日上限の
   判定単体が正しく機能していることを確認している。

テストに使ったデータ(実投稿2件・直接INSERTした18件)は、確認後に
ローカルD1から`DELETE FROM entries;`で削除済みで、本番・Preview
データへの影響は無い。

## build・astro check結果

- `npx astro check`: 0 errors, 0 warnings, 1 hint(既存の無関係な
  hint)
- `npm run build`: 0エラー、15ページ生成

## 採用理由

`unixepoch()`による数値正規化は、文字列フォーマットの違い
(区切り文字・小数秒の有無・タイムゾーン表記)に依存しない、最も
確実な比較方法である。`created_at`の保存形式(`toISOString()`)を
変更する案も検討し得たが、`toISOString()`はJavaScript標準の
UTCタイムスタンプ形式であり、Response bodyとしてクライアントへ
そのまま返している値でもあるため、保存形式は変更せず、SQL側で
正規化する方針にした。

## 他の案

- **`created_at`を`datetime('now')`が返す形式(空白区切り)で保存する**:
  比較は単純になるが、`toISOString()`という標準的なJS表現を
  やめる理由が無く、クライアントに返すレスポンスの`publishedAt`
  フィールドの形式まで変わってしまうため見送った。
- **`created_at`をUNIXエポック数値そのもの(INTEGER)で保存する**:
  最も比較が単純になるが、`GET`のレスポンスで人間が読める日時
  文字列を返す必要があり(`publishedAt`)、都度変換が必要になる
  ため、保存形式はISO文字列のまま、比較時にのみ`unixepoch()`で
  正規化する現在の方式を採用した。

## 将来の変更可能性

D1(SQLite)の日時関数の挙動に変更があった場合は、この比較方法を
再検証する。当面はSQLite標準の`unixepoch()`関数に依存する。

## Research Context

「Preview環境が本番から正しく分離された」ことを実機確認した
直後に見つかったこの不具合は、環境分離とは無関係の、独立した
実装上のバグだった。訪問者からの報告(30分待っても投稿できない)
を起点に、Cloudflare Live Logの実データとD1の実際の保存形式を
突き合わせて原因を特定するという進め方は、これまでのDecision Log
0143〜0147で繰り返してきた「一次情報を確認してから直す」姿勢と
一貫している。
