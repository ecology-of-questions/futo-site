# Decision Log

「ふ、と」実装における設計判断の記録。

`README.md` が「今どうなっているか」を説明するのに対し、
ここでは「なぜそうしたか」「他に何を検討したか」「将来どう変わりうるか」、
そして「その判断がこの研究室の思想とどうつながっているか」を残す。

`docs/Design_Spec/` がデザインの唯一のソースであるのに対し、
Decision Log は **実装上の判断とその背景** の記録であり、性質が異なる。
Design Spec の内容そのものを繰り返し書き写すことはしない。

このプロジェクトでは、コードも研究成果の一部です。
実装だけでなく、設計判断や思想とのつながりも記録します。

## Decision Log Rule

Decision Logは「正しい判断の記録」ではなく、
**設計がどう進化したかの記録**である。

過去の判断が変更された場合も、削除・上書きはしない。
新しいDecision Logを追加し、以下を記録する。

- なぜ変更したのか
- 何を学んだのか
- どのDecisionを置き換えたのか

置き換えられた側のDecisionは、状態欄に
「一部上書き済み(→ NNNN)」のように、置き換えた側の番号を明記した上で残す。

## ルール

- 1判断 = 1ファイル。連番 + 短い名前(例: `0001-design-tokens.md`)
- 実装中に「複数の選択肢から1つを選んだ」判断があれば都度追加する
- 各ファイルは以下の4項目を簡潔に書く

  1. **採用理由**: なぜその設計を採用したのか
  2. **他の案**: 他に検討した案
  3. **将来の変更可能性**: 将来変更する可能性
  4. **Research Context**: この判断が「ふ、と」の思想(観察・過程・余白・
     暮らしと研究の一体性など)とどうつながっているか。
     技術的な理由だけでは説明しきれない「なぜこのコードが存在するのか」
     を残す項目。

- 後から判断を覆した場合、元のファイルは残したまま新しい番号で
  「上書き」であることを明記する(Design Specの変更履歴と同様、消さずに積み重ねる)

## テンプレート

```markdown
# NNNN. タイトル

- 日付: YYYY-MM-DD
- 状態: 採用中 / 上書き済み(→ NNNN)

## Decision
(何を決めたか、一文で)

## 採用理由
(なぜその設計を採用したのか)

## 他の案
(検討したが採用しなかった案)

## 将来の変更可能性
(将来どう変わりうるか)

## Research Context
(この判断が「ふ、と」の思想とどうつながっているか)
```

## 一覧

| # | タイトル |
|---|---|
| [0001](./0001-design-tokens.md) | 色・タイポ・余白を tokens.css に一元化する |
| [0002](./0002-visual-fragment.md) | VisualFragment を独立コンポーネントとして分離する |
| [0003](./0003-hero-props.md) | Hero のコピー・CTA・画像を props で受け取る |
| [0004](./0004-research-card-preparing.md) | ResearchCard を Preparing 状態に対応させる |
| [0005](./0005-research-status.md) | ResearchStatus を「出版状態」ではなく「研究状態」として再定義する |
| [0006](./0006-research-state-model.md) | ResearchStatus を状態遷移込みの Research State Model として設計する |
| [0007](./0007-research-statement.md) | Research Statement をモックアップなしで実装する |
| [0008](./0008-research-statement-container.md) | ResearchStatement を「文章を受け取る器」として位置づけ直す |
| [0009](./0009-research-placeholder-page.md) | Research ページ(プレースホルダー)を About より先に実装する |
| [0010](./0010-page-navigation.md) | ページ間の回遊導線を実装し、ArrowLinkを共通コンポーネント化する |
| [0011](./0011-fix-circular-navigation.md) | Research Statement と Research の循環導線を解消する |
| [0012](./0012-research-statement-v0-1.md) | Research Statement v0.1 へ差し替え、propsを段落構造に再設計する |
| [0013](./0013-latest-version-container.md) | ResearchStatement を「最新版を表示するための器」として位置づける |
| [0014](./0014-claude-md-charter.md) | CLAUDE.md を「開発ルール集」から「プロジェクト憲章」へ再構成する |
| [0015](./0015-project-md.md) | PROJECT.md を新設し、CLAUDE.md と役割を分離する |
| [0016](./0016-research-statement-final.md) | Research Statement正式版へ差し替え、全文ページを新設する |
| [0017](./0017-hero-heading-wording.md) | Heroの見出し文言を更新し、Design Spec Brand Statementとの表記差分を記録する |
| [0018](./0018-hero-visual-fit.md) | Heroのビジュアルを画像の縦横比に合わせ、見出しの改行を固定する |
| [0019](./0019-404-page.md) | 404ページを、静かなトーンの独立レイアウトとして実装する |
| [0020](./0020-hero-mobile-order-fix.md) | Heroのモバイル表示順バグを修正する(ビジュアルがコピーより先に出ていた) |
| [0021](./0021-header-logo.md) | ロゴ一式の到着を受けてHeaderを実装する |
| [0022](./0022-header-fixed-position.md) | Headerをposition: fixedにし、スマホ幅での表示崩れがないか確認する |
| [0023](./0023-hero-mobile-visual-watermark.md) | Mobile幅のHeroビジュアルを、縦積みから背景の「透かし」表現に変更する |
| [0024](./0024-hero-visual-fixed-background.md) | Desktop幅で、渦のアートワークをHero内から切り離しHome全体のposition: fixed背景にする |
| [0025](./0025-hero-heading-remove-period.md) | Hero・Research Statement見出し末尾の句点「。」を削除し、両者の表記を揃える |
| [0026](./0026-research-statement-paragraph-linebreaks.md) | Research Statementの段落内改行をすべて廃止し、自然な折返しに統一する(Decision Log 0012の続き) |
| [0027](./0027-home-excerpt-shorten.md) | HomeのResearch Statement抜粋を冒頭2段落に短縮する |
| [0028](./0028-home-excerpt-first-paragraph-break.md) | Home抜粋1段落目に、指定位置の改行を1箇所追加する |
| [0029](./0029-research-statement-desktop-width.md) | Research Statement本文のDesktop列幅を36remから52remに広げる |
| [0030](./0030-research-review-01-launch.md) | Research Review詳細UIをParking Lotから一部解禁し、研究断面01を公開する |
| [0031](./0031-remove-readable-width-constraint.md) | サイト全体の本文列幅の制限(readable width)を廃止する |
| [0032](./0032-hero-heading-two-lines.md) | Heroの見出しを3行から2行に変更する(「気づいたら、」/「そこに問いがある」) |
| [0033](./0033-research-page-redesign.md) | /researchページを「管理画面」から「研究断面の一覧」に作り直す |
| [0034](./0034-review-detail-title-hierarchy.md) | 研究断面詳細ページの文字サイズを入れ替え、記事タイトルを主役にする |
| [0035](./0035-review-article-typography-tighten.md) | 研究断面詳細ページのタイトル・本文の文字サイズと行間を調整する |
| [0036](./0036-research-review-01-revision.md) | 研究断面01の本文を改訂版に差し替え、図版(quote/subheading/image)を追加する |
| [0037](./0037-review-figure-max-width.md) | 研究断面詳細ページの図版に最大幅を設定する |
| [0038](./0038-review-figure-float-right.md) | 研究断面詳細ページの図版を、セクション右上に回り込み配置できるようにする(→ 上書き済み、0041) |
| [0039](./0039-review-table-float-right.md) | 研究断面詳細ページの表をセクション右下に回り込み配置し、図版・表の回り込みを「グループ」として独立させる(→ 上書き済み、0040) |
| [0040](./0040-review-table-float-revert.md) | 研究断面詳細ページの表の回り込み配置を撤回し、全幅表示に戻す(→ 一部上書き済み、0041) |
| [0041](./0041-review-table-image-row.md) | 研究断面詳細ページの表・図版を横並びの行(RowBlock)として配置する |
| [0042](./0042-review-row-proportions.md) | 研究断面詳細ページの行内で、表を狭く・図版を大きく調整する |
| [0043](./0043-review-row-image-nudge.md) | 研究断面詳細ページの行内で、図版を少し右に寄せる |
| [0044](./0044-review-row-table-cell-nowrap.md) | 研究断面詳細ページの行内の表で、長い用例セルを1行に収める |
| [0045](./0045-review-row-table-header-nowrap.md) | 研究断面詳細ページの行内の表で、見出し「便宜的な分類」も1行に収める |
| [0046](./0046-research-heading-note.md) | /researchページの「研究断面」見出しに、短い説明文を添える(→ 一部上書き済み、0047) |
| [0047](./0047-research-heading-note-trim.md) | /researchページの説明文から1行目を削除する |
| [0048](./0048-research-review-01-revision2.md) | 研究断面01の本文を2度目の改訂版に差し替える |
| [0049](./0049-research-review-01-revision3.md) | 研究断面01の本文を3度目の改訂版に差し替える |
| [0050](./0050-lh-body-tighten.md) | サイト全体の本文行間(--lh-body)を1.9から1.6に詰める |
| [0051](./0051-review-body-lh-align.md) | 研究断面詳細ページの本文行間を、サイト全体の--lh-bodyに揃える |
| [0052](./0052-review-paragraph-flow.md) | 研究断面01の段落区切りを見直し、より自然な流れにする(→ 一部上書き済み、0053) |
| [0053](./0053-review-hypothesis2-merge.md) | 研究断面01の仮説2も、他の仮説と同じく1段落に統合する |
| [0054](./0054-research-list-compact.md) | /researchページの一覧を、コンパクトな行+矢印の形に作り替える |
| [0055](./0055-research-list-spacing.md) | /researchページの見出し位置を上げ、区切り線を一本化する |
| [0056](./0056-research-list-description-side.md) | /research一覧の右側に説明文を2行までの要約として復活させる |
| [0057](./0057-official-launch-update.md) | 正式公開に向けたHeader/Footer/About/Contact/Home更新(→ 一部上書き済み、0058) |
| [0058](./0058-note-contact-finalize.md) | noteプロフィールURLの確定を受け、note導線とContactページを一本化する |
| [0059](./0059-home-night-sky-background.md) | Home Desktop背景を「夜空」にし、ふと現れて消える光を追加する |
| [0060](./0060-home-night-background-remove-artwork.md) | Home夜空背景から渦のアートワーク画像を撤去し、光のみにする |
| [0061](./0061-home-night-color-ultramarine.md) | Home夜空背景の色を、プロジェクトオーナー指定の群青に変更する |
| [0062](./0062-home-night-color-darker.md) | Home夜空背景の群青を、黒よりに調整する |
| [0063](./0063-night-background-expand-to-subpages.md) | 夜空背景を/research・/about・/contactにも揃え、コンポーネント化する |
| [0064](./0064-research-list-description-left-align.md) | /research一覧の説明文を右揃えから左揃えに変更する |
| [0065](./0065-hero-cta-wording.md) | Hero CTAの文言を「研究について知る」から「Research Statementを読む」に変更する |
| [0066](./0066-fieldnote-reading-mvp.md) | Fieldnote Reading 最小プロトタイプを実装する |
| [0067](./0067-footer-nav-align-header.md) | FooterナビゲーションをHeaderと同じ3項目に揃える |
| [0068](./0068-research-review-1-5.md) | 研究断面01と02のあいだに「研究断面1.5」を追加する |
| [0069](./0069-research-review-1-5-paragraph-density.md) | 研究断面1.5の段落構成を、原稿の改行から意味のまとまりへ組み替える |
| [0070](./0070-research-review-1-5-touchups.md) | 研究断面1.5の句点削除と夜空背景の適用 |
| [0071](./0071-night-background-full-rollout.md) | 夜空背景を、DefaultLayoutを使う全ページに揃える |
| [0072](./0072-about-fieldnote-content-update.md) | 「運営者について」本文の改訂とHome「Practice」項目の更新 |
| [0073](./0073-review-figure-currentcolor.md) | 研究断面01の図版を、生成りの版面ではなくcurrentColorで背景に溶け込ませる |
| [0074](./0074-about-fontsize-home-copy-update.md) | Aboutページの本文フォントサイズを揃え、Home「いま、取り組んでいること」の文言を改訂する |
| [0075](./0075-support-page-deferred.md) | ご支援（寄付）ページは、β公開後に着手する |
| [0076](./0076-contact-form-formspree.md) | Contactページをnote経由からフォーム(Formspree経由でメール転送)に変更する |
| [0077](./0077-remove-fieldnote-mentions.md) | 「Fieldnote（仮称）」への言及を全ページから削除する |
| [0078](./0078-cursor-glow-home-experiment.md) | カーソル追従の光を、Homeページのみに試験的に実装する(→ 一部上書き済み、0079) |
| [0079](./0079-cursor-glow-tuning.md) | カーソル追従の光を、範囲を狭く・強度を強く調整する |
| [0080](./0080-copy-fixes-header-color.md) | 文言修正3件とHeaderの文字色変更 |
| [0081](./0081-newsletter-deferred.md) | メルマガは、β公開後に着手する |
| [0082](./0082-hero-heading-font-and-ogp.md) | Hero見出しに手書き調フォント(Klee One)を採用し、OGPを実装する |
