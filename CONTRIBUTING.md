# Contributing

## コミットメッセージ

このプロジェクトでは、技術的な変更内容だけでなく、
その変更が「ふ、と」というプロジェクトの中でどんな役割を持つかも
コミットメッセージに残す。

一般的な Conventional Commits の形式(`type(scope): message`)は使うが、
`message` 部分は技術的な要約に留めず、日本語で「何をしたか」を
役割ごと書く。

### 例

```
feat(hero): 研究室の入口を実装
refactor(tokens): 思考時間としての余白を整理
docs: Hero設計の背景を記録
```

### なぜこうするか

数年後にこのリポジトリを振り返ったとき、
`feat: Hero component` という履歴だけでは「何を作ったか」しか残らない。
「なぜそれを作ったか」まで一言残しておくことで、
コミット履歴そのものが Project Journal の断片になる。

### type の目安

| type | 用途 |
|---|---|
| `feat` | 新しいセクション・コンポーネントの実装 |
| `refactor` | 既存実装の構造変更(見た目やコピーは変えない) |
| `style` | 見た目・余白などデザイン調整 |
| `docs` | Design Spec / Decision Log / Research Log / Project Journal の更新 |
| `chore` | 設定ファイルなど、上記に当てはまらない変更 |

scope はセクション名やコンポーネント名(`hero`, `tokens`, `visual-fragment` 等)を使う。
