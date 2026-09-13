# 0141. 実験室ノートの書き込みをCloudflare Pages Functions + D1で永続化・即時公開する

- 日付: 2026-09-13
- 状態: 採用

## Decision

Decision Log 0140で実装した「実験室」の3冊のノート(交換ノート)は、
訪問者の書き込みをFormspreeで受け取るだけで、実際にノートへ載せるには
「ふ、と」が内容を確認して`src/data/labNotebooks.ts`へ手動で追記する
運用だった。プロジェクトオーナーから、この手動掲載の手間をなくし、
「書く→保存→そのノートにすぐ表示される→問題があるものだけ後から
非表示にできる」という体験に変える指示を受けた。

調査の結果、このサイトはCloudflare Pagesにデプロイされており
(`futoing.com`、Cloudflareダッシュボードのgit連携によるデプロイ、
リポジトリ内にCI/CD設定は無い)、Astroは`output: "static"`・
Cloudflare固有アダプター無し・`functions/`ディレクトリ無しの
ポータブルな静的サイトだった。CLAUDE.mdは「Cloudflare Pagesが
デプロイ先だが、ビルドはCloudflare固有機能に依存しないポータブルな
静的サイトを保つ」と明記しており、今回の要件(永続化・即時反映)は
これと直接ぶつかる。プロジェクトオーナーに調査結果を報告し、以下の
方針で明示的な承認を得た。

- Astro本体は`output: "static"`のまま維持する
- Cloudflare固有機能への依存は「交換ノートの永続化・API部分」に限定する
- サイト本体の静的ページは引き続きポータブルな状態を保つ

**CLAUDE.mdの該当箇所に、この決定へのポインタとしてスコープ限定の
例外を追記した(削除・上書きはしていない)。** 詳細はこのDecision Log
を参照する形にした。

## 採用した技術構成

- **Cloudflare Pages Functions**: `functions/api/notebooks/[slug]/
  entries.ts`。Astroのビルド(`dist/`)とは独立したファイルベース
  ルーティングで、Cloudflare Pagesが自動検出・デプロイする。Astroの
  SSRアダプターは導入していない(Astro自体は`output: "static"`の
  ままで、Cloudflare Pages Functionsは並行する別レイヤーとして追加
  しただけ)。
- **Cloudflare D1**: SQLite互換のエッジデータベース。`wrangler.toml`の
  `[[d1_databases]]`で`DB`という名前でバインドする。
- **型**: `@cloudflare/workers-types`は新規依存として追加せず、
  `D1Database`・`D1PreparedStatement`・`PagesFunctionContext`等の
  最小限の型を`functions/api/notebooks/[slug]/entries.ts`内に
  手書きした(このプロジェクトの依存最小化の方針に合わせた)。
  `tsconfig.json`の`include`はsrc配下のみのため、`npx astro check`は
  このファイルを対象にしない(Cloudflare側のビルド時型チェックと
  ローカルでの動作確認で担保する)。
- **wrangler**: `devDependencies`に追加した(`package.json`の
  `pages:dev`・`d1:migrate:local`・`d1:migrate:remote`スクリプトから
  利用する)。ローカルではCloudflareの実アカウント無しに
  `wrangler d1 execute --local`・`wrangler pages dev`で完全に
  動作確認できることを確認済み。

## 追加したD1 schema

`migrations/0001_init.sql`:

```sql
CREATE TABLE IF NOT EXISTS entries (
  id TEXT PRIMARY KEY,
  notebook_slug TEXT NOT NULL,
  body TEXT NOT NULL,
  context TEXT,
  url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  status TEXT NOT NULL DEFAULT 'visible' CHECK (status IN ('visible', 'hidden')),
  ip_hash TEXT
);
```

指示どおり、名前・メールアドレス・アカウントは保存しない。`ip_hash`は
スパム対策(連投防止)専用で、公開APIのレスポンスには含めない。

## API・Functions構成

- `GET /api/notebooks/:slug/entries` — 該当ノートの`status = 'visible'`
  なエントリを`created_at`昇順で返す。存在しないslugは404。
- `POST /api/notebooks/:slug/entries` — 新しい書き込みを保存する。

### スパム対策

- 空文字・空白のみの本文を拒否(400)。
- 本文2000文字・状況200文字を上限に拒否(400)。
- URLはhttp/https以外(`javascript:`等)を拒否(400)。
- honeypot(`_gotcha`、既存フォームと同じ命名)が埋まっている場合は
  保存せず、あたかも成功したかのような201レスポンスを返す(botに
  検知を悟らせない一般的な対処)。
- `CF-Connecting-IP`をSHA-256でハッシュ化して`ip_hash`に保存し、
  同一ハッシュからの投稿を60秒に1回・1日20件までに制限する
  (429)。Cloudflare Turnstile等の追加認証は、この規模・想定投稿数
  では過剰と判断し導入していない。

## 書き込み→表示までの流れ

1. 各ノート詳細ページ(`/participate/[slug]`)の「ふと思い出したことを
   書き残す」フォームは、送信時に`fetch()`で
   `POST /api/notebooks/:slug/entries`へJSONを送る(Formspreeは
   このノート機能から完全に外した。他ページのFormspree利用
   ([contactFormEndpoint]、お問い合わせ・寄贈会話UI等)には影響しない)。
2. 保存に成功すると、ページ遷移せずその場でレスポンスのエントリを
   `<template>`要素からクローンして「書かれたこと」一覧に追記し、
   ステータスに「書き残しました。」を表示する。
3. ページ表示時にも`GET /api/notebooks/:slug/entries`を呼び、
   訪問者の既存エントリを取得して同様に追記する。
4. 「ふ、と」自身の記録(`src/data/labNotebooks.ts`の静的`entries`、
   `kind: "studio"`)はビルド時にそのまま表示し、訪問者の記録は
   ページ表示後にAPIから追記する構成にした。**簡略化点**として、
   静的な記録と動的な記録は「静的→動的」の順で表示され、両者を
   `created_at`/`publishedAt`で完全に時系列マージしているわけでは
   ない。今回の投稿量・頻度では実用上問題にならないと判断した
   (静的entriesは今のところ0件のノートが大半のため)。将来、
   「ふ、と」自身の制作記録がD1側にも増えるようであれば、静的データを
   D1へ統合する形に見直す。
5. 送信失敗時(ネットワークエラー・レート制限・バリデーションエラー)は
   フォームをリセットせず、入力済みの本文を保持したまま
   「書き残せませんでした。もう一度お試しください。」と表示する。

## 非表示方法(手動運用)

管理画面・管理用API・追加の認証基盤は作らなかった(指示により、
管理用secretをクライアントコードに埋め込むことは禁止されており、
安全な管理UIには追加の認証基盤が必要になるため)。荒らし・不適切な
投稿を非公開にする場合は、Cloudflareダッシュボードの D1 コンソール、
または以下のコマンドを直接実行する。

```bash
# ローカル(開発環境)
npx wrangler d1 execute futo-lab-notebooks --local \
  --command "UPDATE entries SET status='hidden' WHERE id='対象のid';"

# 本番
npx wrangler d1 execute futo-lab-notebooks --remote \
  --command "UPDATE entries SET status='hidden' WHERE id='対象のid';"
```

対象の`id`は、`GET /api/notebooks/:slug/entries`のレスポンス、または
以下のSELECTで確認できる。

```bash
npx wrangler d1 execute futo-lab-notebooks --remote \
  --command "SELECT id, notebook_slug, body, status, created_at FROM entries ORDER BY created_at DESC LIMIT 20;"
```

`hidden`にしたエントリは、次回`GET`から自動的に除外される(即時)。
再表示したい場合は`status='visible'`に戻す。

## 表示順・UIの制約

指示どおり、いいね・コメント・返信・フォロワー・人気順・閲覧数・
ユーザー名・プロフィールは実装していない。表示順は時系列(古い順)の
みで、「誰かが書き残したものをぱらぱら読む」体験を優先した。

## Cloudflare本番側で必要な手動設定

実装後、プロジェクトオーナー側で以下の作業が必要になる。

1. **D1データベースを作成する**(Cloudflareダッシュボード → Workers &
   Pages → D1、または`npx wrangler d1 create futo-lab-notebooks`)。
   作成すると`database_id`が発行される。
2. **`wrangler.toml`の`database_id`を実際の値に置き換える**
   (現在`"REPLACE_WITH_PRODUCTION_DATABASE_ID"`というプレースホルダーが
   入っている)。
3. **Pagesプロジェクトへバインドする**: Cloudflareダッシュボードの
   Pagesプロジェクト設定 → Functions → D1 database bindings で、
   変数名`DB`として、作成したD1データベースを本番・プレビュー両方の
   環境に追加する(`wrangler.toml`のCLIからの適用に加えて、ダッシュ
   ボード側の設定も必要)。
4. **マイグレーションを本番D1に適用する**:
   `npx wrangler d1 execute futo-lab-notebooks --remote --file=./migrations/0001_init.sql`
5. **secret設定は不要**: 管理用secretを使わない方針(前述)のため、
   Pages側でこの機能のために新しく設定する環境変数・secretは無い。

上記が完了すれば、`/participate/[slug]`の書き込みフォームは自動的に
本番D1へ保存されるようになる(コード側の変更は不要)。

## 実装確認(build・astro check・E2E)

- `npx astro check`: 0 errors / 0 warnings(既存の1 hintのみ、
  今回の変更と無関係)。
- `npm run build`: 成功(`functions/`はAstroのビルド対象外のため、
  静的サイト本体の出力に一切影響しない)。
- ローカルD1 + `wrangler pages dev`でのE2E確認:
  - 音の道を開く→本文のみで書き残す→即座にノートへ表示される
  - 状況つきで書き残す(60秒以内の連投は429で拒否されることも確認)
  - URLつきで書き残す(`javascript:`等の不正URLは400で拒否)
  - 空文字の投稿は400で拒否
  - honeypot(`_gotcha`)を埋めたリクエストは201を返すが、実際には
    保存されない(GETで確認)
  - 保存したエントリはリロード後も表示される(サーバー側永続化のため)
  - Fieldnote・研究断面をひらくには、音の道の投稿が表示されない
    (`notebook_slug`によるノート単位の分離を確認)
  - 手動SQLで`status='hidden'`にしたエントリは、次のGETから消える
  - 送信失敗時(レート制限)は入力済み本文が消えないことを確認
  - モバイル幅(390px)での6ステップ往復(3冊の表紙を見る→1冊開く→
    読む→その場で書き残す→実験室へ戻る→別のノートを開く)を確認
  - テスト用に投稿したデータは、ローカルD1(`.wrangler/`、
    `.gitignore`に追加済みでリポジトリには含まれない)から削除済み。
    本番データへの影響は無い。

## 対応

- `wrangler.toml`(新規): D1バインディング宣言。
- `migrations/0001_init.sql`(新規): `entries`テーブルとインデックス。
- `functions/api/notebooks/[slug]/entries.ts`(新規): GET/POST API。
- `package.json`: `wrangler`をdevDependenciesに追加。
  `pages:dev`・`d1:migrate:local`・`d1:migrate:remote`スクリプトを追加。
- `.gitignore`: `.wrangler/`(ローカルD1状態・キャッシュ)を追加。
- `src/pages/participate/[slug].astro`: 書き込みフォームの送信先を
  Formspreeから新APIへ変更。ページ表示時に訪問者エントリを取得して
  追記するクライアントスクリプトを追加。成功時メッセージを
  「書き残しました。」に簡略化。失敗時に入力済み本文を保持するように
  変更。即時公開に伴い、フォーム直下の案内文言を「確認のうえ掲載する
  ことがある」から「そのまま公開される・不適切なものは後から非表示に
  することがある」に更新した。
- `CLAUDE.md`: Architectureのポータブル静的サイト原則に、この機能への
  スコープ限定の例外を追記(既存の記述は削除していない)。

## 採用理由

Cloudflare Pages + D1は、既にデプロイ先として使っているCloudflareの
範囲内で完結し、新しい外部サービス・CMSを増やさずに永続化を実現できる
(指示の「大きな外部サービスやCMSは、必要性がない限り追加しない」に
対応)。無料枠はD1が5GBストレージ・1日500万回読み取り・1日10万回書き込み、
Pages Functionsが1日10万リクエストであり、実験室ノートへの投稿という
規模では十分に収まる。

管理画面・管理用APIを作らず手動SQLでの非表示運用にしたのは、
「過剰な本人確認・アカウント登録は不要」「管理用secretをクライアント
コードに埋め込むことは禁止」という指示に対し、安全な管理UIには
新たな認証基盤が必要になり、今回のスコープ(交換ノート機能の永続化)
を超えるため。プロジェクトオーナー自身がCloudflareダッシュボード/
wranglerを直接操作できることを前提に、最小構成を優先した。

## 他の案

- **ヘッドレスCMS**: Webhookでの再ビルド・動的フェッチが必要になり、
  新しい外部サービスへの依存が増えるため見送った。
- **Formspreeの定期取得による自動反映**: 「即時」ではなく実行間隔に
  依存する仕組みになり、「書く→保存→すぐ表示される」という指示の
  体験を満たせないため見送った。
- **管理用secret付きの非表示API**: クライアントコードにsecretを
  埋め込むことを避けるにはサーバーサイドの認証(Cloudflare Access等)
  が必要になり、今回のスコープを超えると判断し見送った(指示により
  明示的に許可された手動SQL運用を採用)。
- **静的entriesとD1の統合管理**: 「ふ、と」自身の記録もD1に一本化する
  案も検討したが、現時点で静的な`studio`記録がほぼ存在せず、
  今のタイミングで移行する実益が薄いため見送った。将来的な検討事項
  として「将来の変更可能性」に記載した。

## 将来の変更可能性

- 投稿量が増え、静的→動的の表示順の簡略化(完全な時系列統合ではない
  こと)が体験上問題になった場合は、「ふ、と」自身の記録もD1へ移行し、
  1つのクエリで時系列統合する構成に見直す。
- 荒らし投稿が増え、手動SQLでの非表示運用が煩雑になった場合は、
  Cloudflare Access等で保護した最小限の管理APIを別途検討する。
- スパムが増えた場合は、Cloudflare Turnstileの導入を再検討する
  (現時点では未導入)。

## Research Context

Decision Log 0140で「交換ノート」という比喩を採用したが、実際に
「訪問者が書き残したものがすぐそこに積み重なる」という体験が無ければ、
交換ノートという比喩は名ばかりになってしまう。今回、永続化と即時反映を
実装したことで、「実験室」が本当の意味で「ふ、と」と訪問者が同じノートを
共有する場所になった。一方で、管理画面やSNS的な仕組みを増やさず、
最小限の永続化層(D1)と手動SQLでの非表示運用にとどめたことは、
「完成させてから公開するのではなく、育てながら公開する」という
プロジェクトの哲学と、必要になるまで機能を増やさないという判断
基準の両方に沿っている。
