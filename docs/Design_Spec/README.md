# Design Spec

「ふ、と」ホームページの、完成した設計を格納する場所。

ここに置かれるのは「決定済み」の設計内容のみ。
検討中のもの、ChatGPTとの対話の途中経過は `docs/Research_Log/` に置く。
実装上の判断とその理由は `docs/Decision_Log/` に置く。

## バージョン

| バージョン | 内容 |
|---|---|
| [v0.3](./v0.3.md) | Internal Working Draft。Home全体の構造・思想・コンポーネント一覧を定義 |
| [v0.4](./v0.4.md) | β公開優先への方針転換を反映。Claudeが草案を作成、ChatGPTのレビュー待ち |
| [v0.5](./v0.5.md) | ロゴ一式(logo.svg/png, favicon.svg/ico)の確定仕様を追加。Headerを実装済みに更新 |

Design Specが更新された場合、既存バージョンは上書きせず、
新しいファイル(例: `v0.4.md`)として追加する。
どの実装がどのバージョンのDesign Specに基づいているかを
後から追跡できるようにするため。
