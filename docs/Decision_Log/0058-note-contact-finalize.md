# 0058. noteプロフィールURLの確定を受け、note導線とContactページを一本化する

- 日付: 2026-08-17
- 状態: 一部上書き済み(→ 0067)。Footerの個別noteリンクは、Header/
  Footerの項目数を揃える目的で削除された(noteへの導線はContactの
  「noteから問い合わせる」に一本化)。それ以外の内容(Header/Contact
  周りの記述)はそのまま有効。詳細はDecision Log 0067参照。
  (Decision Log 0057を一部上書き)

## Decision

プロジェクトオーナーからnoteのプロフィールURL
(`https://note.com/dreamers`)が明示的に共有されたことを受け、
Decision Log 0057で導入した「note URL未確定時のプレースホルダー
運用」を終了し、以下に変更した。

- `src/config/site.ts`: `noteUrl`を環境変数(`PUBLIC_NOTE_URL`)経由の
  nullableな値から、確定した文字列定数に変更した。合わせて、
  Contactページで使っていた`contactEmail`/`contactFormUrl`
  (環境変数経由)は、後述の理由により削除した。`.env.example`・
  `src/env.d.ts`のカスタム`ImportMetaEnv`宣言も、参照箇所が
  なくなったため削除した。
- **Header**: noteの項目自体を削除した。「note(準備中)」の非
  リンク表示も廃止した。ナビゲーションは「研究断面(/research) /
  ふ、とについて(/about) / お問い合わせ(/contact)」の3項目になった。
  noteは「サイト内の主要ページ」ではなく「外部の発信先」として
  扱う、というプロジェクトオーナーの位置づけに合わせた。
- **Footer**: noteを通常の外部リンク(`target="_blank"` +
  `rel="noopener noreferrer"` + 「(外部サイトが新しいタブで
  開きます)」を含むaria-label)にした。「note(準備中)」の分岐は
  削除した。
- **Contactページ**: これまでのメールアドレス/フォームURLによる
  分岐と「連絡先準備中」表示をやめ、noteの「クリエイターへの
  お問い合わせ」に一本化した。本文・ArrowLinkによるCTA
  (「noteから問い合わせる →」、`external` propで外部リンク扱い)・
  補足文(noteのクリエイターページ下部にある「クリエイターへの
  お問い合わせ」を利用する旨)を、プロジェクトオーナーが指定した
  文言のまま実装した。

サイト内にnote専用ページは作っていない(既存のFooter/Header/
Contactからの外部リンクのみ)。

## 採用理由

- 値が確定した以上、Decision Log 0057時点の「未確定な値を環境変数
  経由でプレースホルダー運用する」という設計を維持する理由がなく
  なった。使われなくなった分岐・CSS・型宣言を残すとコードが
  実態と乖離するため、削除した(CLAUDE.md: 「If you are certain
  that something is unused, you can delete it completely」)。
- noteをHeaderから外しFooterにのみ残す、という構成は、
  プロジェクトオーナーが明示的に指示した「noteはサイトの主要
  ページではなく外部の発信先として扱う」という情報設計判断を
  そのまま反映したもの。
- Contactページをnote経由の問い合わせに一本化したことで、
  メール窓口や外部フォームを別途用意・維持する必要がなくなった。

## 他の案

- `noteUrl`を引き続き環境変数経由で管理し、値だけを`.env`に
  設定する案も検討したが、値が既に確定しており今後変わる想定も
  薄いため、`src/config/site.ts`に直接定数として持たせる方が
  シンプルで、参照する側(Header/Footer/Contact)のロジックも
  減らせる。

## 将来の変更可能性

- noteのアカウントURLが変わった場合は`src/config/site.ts`の
  `noteUrl`を書き換えるだけでよい(Header/Footer/Contactの3箇所は
  自動的に追従する)。
- 将来的にメールやフォームでの問い合わせも受け付ける方針になった
  場合は、Decision Log 0057時点の分岐ロジックを参考に再実装できる。

## Research Context

「サイトの主要ページ」と「外部の発信先」を区別し、前者はサイト内の
ナビゲーションに、後者はFooterや個別ページの導線に留める、という
情報設計判断。この研究室の「発信」がnoteという既存のプラット
フォーム上でも行われている、という実態をそのままサイト構造に
反映した。
