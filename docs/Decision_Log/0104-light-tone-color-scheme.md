# 0104. サイト全体配色をライトトーンに変更(夜空背景の廃止)

- 日付: 2026-09-10
- 状態: 採用

## Decision

プロジェクトオーナーから、参考画像(白に近い落ち着いたトーンのデザイン、
「研究の本棚」「研究便り」「研究を支える」等のセクション構成は参考対象
外・色とトーンのみの参考)とともに、次の指示を受けた。

> 研究の文章を長く読んでも疲れにくく、本の表紙や写真も見やすいサイトに
> する。今の青はアクセントとして残す。

指定された出発点の色を基準に、以下の配色変更を実施した。

### 1. トークン(`tokens.css`)の更新

| トークン | 旧値 | 新値 | 用途 |
|---|---|---|---|
| `--color-paper` | `#f7f3ea` | `#fafaf7` | 基本背景 |
| `--color-ink` | `#2b2a26` | `#303432` | 本文 |
| `--color-ink-muted` | (新設) | `#606663` | 補足文・meta・eyebrow |
| `--color-accent-blue` | (新設) | `#365f78` | リンク・アクセント |
| `--color-accent-beige` | `#d8cbb0` | `#d9deda` | 区切り線(トークン名は歴史的経緯でbeigeのまま) |
| `--color-surface` | (新設) | `#ffffff` | フォーム入力欄の背景 |
| `--color-night` | `#354c7d`(変更なし) | 同左 | 値は履歴として残置。ページ背景としては不使用に |
| `--color-night-gradient-top/mid/bottom` | 濃紺3色 | `--color-paper`基準の`color-mix()` | Research Statementエリアのグラデーション |
| `--color-ink-on-surface` | `#2b2a26`相当 | `--color-ink`と同値 | 後述(4)参照 |

`--color-accent-green`(`#a9b79c`)は実質使用箇所がなくなったが、値は
変更せず残している。

### 2. 「夜空テーマ」の廃止

`DefaultLayout.astro`の`theme?: "default" | "night"` propは、
`global.css`内の1つのCSSルール
(`body[data-theme="night"] main, body[data-theme="night"] footer`で
`--color-ink`を`--color-paper`に上書きし文字色を反転する)以外に効果を
持たないことを確認した上で、このルールを削除した。これにより、
`.astro`ファイルを1つも変更せずにサイト全体を光背景・濃色文字に統一
できた(「配色に限定」という指示への対応)。`theme` propおよび
`data-theme`属性自体は残しているため、将来的な巻き戻しも容易。

`NightBackground.module.css`の`.background`の`background-color`も
`--color-night`から`--color-paper`に変更した。コンポーネント名・DOM
構造・5つの光の粒のアニメーション自体は削除していない。光の粒の
`rgba(247,243,234,…)`(旧`--color-paper`と同値)も新`--color-paper`
(`250,250,247`)に合わせて更新し、「背景に溶け込んでほとんど見えない」
という元の設計意図を新配色でも維持した。

### 3. リンク・アクセント色の統一

`ArrowLink`(`currentColor`で周囲の文字色を継承)、`Header`の
`.navLink`/`.menuToggle`(`--color-night`)、`Footer`の`.link`
(`--color-ink`)は、それぞれ異なる色・異なるopacityで実装されていた。
今回、全て`--color-accent-blue`に統一し、hover/focus-visibleは
opacityでの減光ではなく`text-decoration: underline`に変更した
(理由は4.参照)。

### 4. 補足文・meta情報のコントラスト対応

`.eyebrow`・`.hint`・`.note`・meta情報等、従来`opacity: 0.6〜0.75`で
`--color-ink`を薄めていた箇所を、新設した固定色`--color-ink-muted`に
置き換えた。新しい背景(`--color-paper` `#fafaf7`)上で計算すると、
`opacity: 0.6`の`--color-ink`(新値`#303432`)は約3.65:1までしか
コントラストが出ず、本文相当のテキストとして使うにはWCAG AAの
4.5:1を割り込む。指定された`--color-ink-muted`(`#606663`)は
`--color-paper`に対し約5.61:1で、AAを安全に満たす。

同じ理由で、リンクのhover/focus-visibleもopacity減光をやめた
(`--color-accent-blue`はopacityを下げるとAAを割り込む可能性がある
ため、色そのものは変えず下線のみで状態を示す方式にした)。

対象外としたもの(理由付き):
- disabledボタンの`opacity: 0.5`(非活性状態であることが目的で、
  読む文字ではないため)
- Aboutページの循環図(`.cycleArrow`/`.cycleLabel`/`.cycleCenter`、
  `aria-hidden="true"`の装飾要素。本文が情報源のため対象外)
- `NightBackground`の光の粒、`CursorGlow`のカーソル追従グロー
  (装飾的な環境光で、本文コントラストの対象ではない)

### 5. フォーム(`/contact`)の調整

- `.input`/`.textarea`/`.select`の背景を`--color-surface`(白)にし、
  地の背景(`--color-paper`)との区別をつけた。
- フォーカス時、枠線の色に加えて`outline: 2px solid
  --color-accent-blue`を追加し、キーボードフォーカスを見分けやすく
  した。
- 送信ボタンを`--color-ink-on-surface`地の塗りつぶしから、
  `--color-accent-blue`の枠線ボタンに変更。hoverは減光ではなく
  塗りつぶし反転(背景色⇔文字色の入れ替え)にし、hover中もコントラスト
  比を保つようにした。

### 6. 波及的に見つかった修正

`index.module.css`の`.openPracticePanel`(OPEN PRACTICEパネル)は
`color-mix(in srgb, var(--color-night) 100%, white 6%)`で背景色を
算出しており、`--color-night`の値自体は変更していないため、この
まま放置すると新しい光背景の上に大きな紺色の箱が残ってしまう状態
だった。`color-mix(in srgb, var(--color-ink) 5%, var(--color-paper))`
に作り直し、新しい地の色をごくわずかに暗くした面になるよう修正した。
新しいHEX値を決め打ちせず、既存トークンから算出する方針
(Decision Log 0094)は維持している。

## 採用理由

- プロジェクトオーナーが具体的な色の出発点(HEX値)を指定しており、
  実装者側で恣意的に調整する余地は小さい。指定値をそのまま
  トークンに反映した。
- 「本文の文字と背景はWCAG AA相当のコントラストを確保」という明示
  条件があったため、opacityベースの減色をすべて固定色に置き換える
  という、当初の指示(配色の値の変更)より一段広い対応が必要になった。
  ただし変更範囲は「色の指定方法」に留めており、レイアウト・文言・
  コンポーネント構造は一切変更していない。
- `NightBackground`をはじめ、DOM構造やコンポーネントAPIを変えずに
  CSS(トークン+`.module.css`)のみで完結させる方針を貫くことで、
  「配色に限定」という制約と、別途進行中の文章修正(PR #73)を
  上書きしないという制約の両方を満たした。

## 他の案

- 光の粒のrgba値を大きく下げて完全に非表示にする案も検討したが、
  「機能自体は削除しない」という指示の趣旨に反するため、色を新しい
  `--color-paper`に合わせて自然に溶け込ませる方向に留めた。
- `--color-ink-muted`を導入せず、`--color-ink`に薄いopacityのままで
  済ませる案もあったが、AA基準を満たせないため採用しなかった。

## 将来の変更可能性

- 本の表紙・写真等のメディア要素を実際に配置する際、新しい地の色
  (`#fafaf7`)との相性を改めて確認する必要がある(今回は既存ページに
  写真要素がないため未検証)。
- `--color-night`関連のトークン(`--color-night`、
  `--color-night-gradient-*`の元々の濃紺値の履歴)は、将来的に完全に
  不要と判断されれば削除してよいが、今回は「値の履歴を残す」方針を
  優先し、コメントで経緯を明記するに留めた。
- 参考画像にあった「研究の本棚」「研究便り」「研究を支える」等の
  新セクションは、今回のスコープに含まれない。ベータ後の別タスクと
  して扱う。

## Research Context

「研究の文章を長く読んでも疲れにくい」ことは、公開研究室が長期的に
文章を蓄積・成長させていく場である以上、コンテナ(配色)がコンテンツ
(研究の文章)の可読性を損なわないための土台にあたる。今回の変更は
コンテンツやページ構成には一切手を加えず、配色という「器」の側だけを
調整した点で、CLAUDE.mdの「コンテナとコンテンツを分離する」という
設計原則に沿っている。
