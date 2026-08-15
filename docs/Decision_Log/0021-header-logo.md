# 0021. ロゴ一式の到着を受けてHeaderを実装する

- 日付: 2026-08-15
- 状態: 採用中

## Decision

design-assets/ に届いたロゴ一式(logo.svg / logo.png / favicon.svg /
favicon.ico)をもとに、保留にしていたHeaderコンポーネントを実装した。

1. **ロゴの正式配置**: `public/images/logo/` に
   `logo.svg` / `logo.png` / `favicon.svg` / `favicon.ico` を配置した。
   デザイン納品時の原本は `design-assets/`(直下)にそのまま保管する。
   実装当初は原本を `design-assets/logo/` サブディレクトリへ整理
   していたが、その後 `git pull` で取り込んだ `origin/main` 側の
   コミット(`72dad1c` / `168610d`)が同じロゴ一式を `design-assets/`
   直下に再アップロードしていたため、独自に作った
   `design-assets/logo/` サブディレクトリは削除し、upstream側の
   構成(直下配置)に合わせた。
2. **Header.astro**: `logo.svg` をロゴとして配置し、グローバルナビは
   Home / Research の2項目のみとした。About は未実装のため含めない
   (Design Spec 3: Information Architecture)。
3. **favicon**: `DefaultLayout.astro` の `<head>` に
   `favicon.svg`(第一候補)と `favicon.ico`(互換用の
   `rel="alternate icon"`)を追加した。
4. **Design Spec**: ロゴの確定仕様(構成・かすれ表現のルール・使用
   データ・使用上のルール)をDesign Spec v0.5として新規追加した
   (v0.4は変更していない)。

## 採用理由

- Headerの実装は、Design Spec v0.4「11. Components」で
  「未実装」、Decision Log 0010・0011で「ナビゲーション実装時に
  反映」として明示的に保留されていた事項であり、その保留理由は
  「モックアップ/仕様が到着してから実装する」だった。ロゴ一式の
  到着によりこの前提が満たされたため、実装に進んだ。
- ナビゲーション項目をHome / Researchの2つに絞ったのは、
  Design Spec v0.4「3. Information Architecture」で導線が
  Home → Research Statement → Research の一本道と定義されており、
  Research StatementはHomeに属する「宣言」であってResearchの
  一部ではないため。Aboutは「公開直前に情報設計を詰める」段階で
  未実装のため、実装されていないページへのリンクを置かない
  (Design Spec 3)。
- ロゴの詳細仕様(かすれの有無・濃淡)はDesign Specに記録がなかった
  ため、v0.4を上書きせずv0.5として追加した(Decision Log Rule /
  ドキュメント方針)。
- 原本置き場を最終的に `design-assets/`(直下)に一本化したのは、
  Design Specの「使用データ」欄から参照できる場所を1箇所に固定し、
  upstream(`origin/main`)側の配置と食い違わないようにするため。
  独自にサブディレクトリへ整理する案は、共同編集者(ChatGPT /
  Project Owner)が別途同じファイルを直下にアップロードしていた
  ことと衝突したため見送った。

## 他の案

- **ロゴをpublic直下(`public/logo.svg`等)に配置する案**: 将来
  ヒーロー画像(`public/images/hero/`)のように画像アセットが
  増えていくことを見越し、`public/images/` 配下に種類ごとの
  サブディレクトリを持たせる既存の構成(`images/hero/`)に
  合わせ、`public/images/logo/` にまとめる方が一貫性があると
  判断し採用した。
- **ナビにResearch Statementへのアンカーリンクも含める案**:
  Decision Log 0011で「Headerのグローバルナビが実装された際、
  Research Statementへの導線をナビ側に持たせるかどうかは
  別途検討する」と将来課題として残されていたが、今回は口頭仕様に
  ナビ項目の指定がなく(Home / Researchのみ)、情報設計に関わる
  追加判断のため見送った。必要であればProject Owner /
  ChatGPT側の判断を仰ぐ。

## 将来の変更可能性

- Aboutページが実装された際、Headerのナビに追加する。
- Research Statementへの導線をHeaderのグローバルナビに持たせるか
  どうかは、Decision Log 0011の課題として引き続き未決着。
- 現在Headerはスクロールに追従しない静的配置。スクロール追従
  (sticky header)が必要かはUXレビュー待ち。
- ロゴの色・向き・小サイズ時の扱いについて、Design Spec v0.5に
  記載のないケース(例: ダークモード、印刷用途)が出てきた場合は
  ChatGPT側と確認の上でv0.6として追記する。

## Research Context

Headerは「研究室の入口」そのものであり、この研究室が「完成度より
育てられることを優先する」(Design Spec 8)という思想を持つ以上、
Headerも最初から完璧な形である必要はない。今回はロゴという
確定した材料が揃った範囲(ロゴ + 実装済みページへのナビ)だけを
形にし、About導線やResearch Statement導線のような未確定要素は
Parking Lotとして保留したままにした。これは「保留を隠さず、
積極的に使ってよい」という方針をHeaderの実装そのものにも
適用した判断である。
