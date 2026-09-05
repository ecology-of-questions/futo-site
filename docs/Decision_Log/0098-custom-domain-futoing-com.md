# 0098. 独自ドメイン futoing.com への切り替え

- 日付: 2026-09-05
- 状態: 採用

## Decision

プロジェクトオーナーが独自ドメイン`futoing.com`を取得したため、サイトの
正式URLを`https://futo-site.pages.dev`(Cloudflare Pagesの既定URL)から
`https://futoing.com`に変更した。

- `astro.config.mjs`の`site`を`https://futoing.com`に変更した。
  `DefaultLayout.astro`のcanonical URL・OGP(`og:url`・`og:image`)・
  Twitter Card画像URLはいずれも`Astro.site`から絶対URLを組み立てて
  いるため(Decision Log 0082)、この1箇所の変更で全ページに反映
  される。
- コードベース全体を検索し、`futo-site.pages.dev`への直接参照は
  `astro.config.mjs`の`site`1箇所のみだったことを確認した。
  `src/config/site.ts`(noteのURL、Formspreeのエンドポイント)は
  サイト自身のURLとは無関係の外部リンク先設定のため対象外。
- 構造化データ(JSON-LD)・`sitemap.xml`・`robots.txt`は、いずれも
  このプロジェクトにまだ存在しない(実装されたことがない)ため、
  今回は対象がなかった。将来これらを追加する際は、既に`Astro.site`
  を使う設計にしておけば、今回のようなドメイン変更時も
  `astro.config.mjs`の1箇所を直すだけで済む。
- ホスティング自体は変更していない。Cloudflare Pagesにデプロイした
  ままで、Cloudflare Registrarで取得した独自ドメインを接続する
  構成(CLAUDE.mdの「ポータブルな静的サイトを保つ」「Cloudflare
  固有のアダプター/機能を使わない」方針にも合致する)。
- ビルド後のHTMLで、canonical・og:url・og:imageがすべて
  `https://futoing.com`基点になっており、`futo-site.pages.dev`への
  参照が残っていないことを確認した。

## 採用理由

- サイトをnoteより中心的な活動拠点として育てたい、助成申請や取材
  対応で正式な活動サイトとして提示したい、Instagram(@futoing)や
  専用Gmail(futoing@gmail.com)とURL・表記を揃えたい、という
  プロジェクトオーナーの意図による。
- `Astro.site`を経由する設計(Decision Log 0082)にしていたため、
  ドメイン変更の実装コストは`astro.config.mjs`の1行のみで済んだ。
  「1箇所の設定を変えるだけで全ページに波及する」という設計判断が
  実際に効果を発揮した例。

## 他の案

- ドメイン取得を保留し`pages.dev`のまま運用する案も検討したが、
  「サイトを今後の活動の中心に育てたい」という方針のもと、比較的
  低コスト(年間3,000円程度)で得られる効果(正式な活動サイトとしての
  信頼感、URLの一貫性、将来ホスティングを変えてもURLを維持できる
  こと)を優先し、取得を選んだ。
- なお、ドメイン取得は商標登録の代替にはならない(名称の独占権を
  得るものではない)ため、商標登録は別途の検討事項として保留した
  ままにしている。

## 将来の変更可能性

- 将来、構造化データ・サイトマップ・robots.txtを追加する場合も、
  `Astro.site`(`futoing.com`)を基点にすれば、ドメインを変更しても
  改修箇所は`astro.config.mjs`の1箇所で済む。
- Formspreeの送信先(`src/config/site.ts`の`contactFormEndpoint`)・
  noteのURL(`noteUrl`)はこのサイト自身のドメインとは独立しており、
  今回の変更の影響を受けない。

## Research Context

「今後の活動の中心として育てたい」という判断のもと、noteという
プラットフォーム依存から一歩進めて独自ドメインを取得したことは、
Decision Log 0076(Contactフォームのnoteからの独立)と同じ方向性の、
研究室としての輪郭を少しずつ固めていく過程の一部である。一方で、
ドメイン取得と商標登録を明確に区別し、名称の独占権については
別途保留とした判断は、実務上必要な範囲だけを段階的に固めていく
という、このプロジェクトの姿勢とも一致する。
