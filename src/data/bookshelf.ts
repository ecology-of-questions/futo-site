/**
 * bookshelf.ts (src/data)
 * ------------------------------------------------------------
 * 「研究の本棚」が表示する本の唯一のデータソース。`/bookshelf`本体
 * ページ・`/participate`の「本をプレゼントする」teaser(旧「本から
 * 関わる」、2026-09-11にDecision Log 0128で改称)の2箇所が、この配列を
 * 共有する(2026-09-11、Decision Log 0117、プロジェクトオーナーの
 * 指示により本データを1か所に集約)。以前はHome「研究の本棚」
 * プレビュー(index.astro)も共有していたが、Decision Log 0125で
 * そのプレビュー自体を廃止した。
 *
 * 旧`src/data/participateBooks.ts`(Decision Log 0116)の内容を
 * そのまま引き継いでいる。
 *
 * 著者等が現時点で不明な本は、コード上で推測して補わず、フィールド
 * 自体を省略している。
 *
 * 【実際の書影表示に向けてisbn13を追加(2026-09-17、Decision Log
 * 0170)】プロジェクトオーナーからの指示書(v0.2)に基づき、6冊すべて
 * について、公開書誌データベース(国立国会図書館サーチ・版元
 * ドットコム・出版書誌データベース等、複数の情報源で相互に確認できた
 * もの)を調べ、確認できたISBN-13を`isbn13`に追加した。あわせて、
 * 「調査的感性術」の著者(マシュー・フラー、エヤル・ヴァイツマン。
 * 訳者は中井悠)も同じ調査で判明したため追加した(推測ではなく、
 * 版元ドットコム・出版書誌データベース等で確認済み)。
 * 「想像の共同体」は、初版(NTT出版・1997年)と「定本 想像の共同体」
 * (書籍工房早山・2007年)の2つの版が流通しているが、現在も入手しやすい
 * 「定本」版のISBNを採用した(データ上のtitleは版を区別していないため、
 * この判断はDecision Log 0170に記録している)。
 *
 * 【購入導線を各出版元のページに変更(2026-09-19、Decision Log 0183)】
 * プロジェクトオーナーの発案「本の詳細ページ、各出版元のサイトに
 * 繋がるのがいいかな」を受け、6冊すべてに`purchaseUrl`を追加した。
 * Amazonアソシエイトが未設定のまま(`affiliate`は付与せず)、
 * `purchaseProvider: "other"`として扱う。5冊は出版社自身のサイト
 * (講談社・水声社・みすず書房・左右社・ひつじ書房)の該当書籍ページ。
 * 「想像の共同体」のみ出版元(書籍工房早山)自体の公式サイトが見つから
 * なかったため、プロジェクトオーナーの判断で出版書誌データベース
 * (Books、`isbn13`と一致する記録)のページを代用している。詳細は
 * Decision Log 0183を参照。
 *
 * 【2026-09-11、「読みたい・未所蔵」の本を3冊追加(Decision Log 0118)】
 * インゴルド等の「読みたい本」(このコメントは当初「未確定のため
 * 追加していない」としていたが、プロジェクトオーナーから所有状況の
 * 確定した3冊の提示を受け、実データとして追加した)。この3冊は
 * `owned: false` / `giftEnabled: true`で、実際に「この本を贈る」
 * 導線が表示される最初の本になる。`newBookUrl`/`usedBookUrl`は購入先が
 * 未確定のため設定していない(BookshelfFullList.astro側で、
 * 未設定の贈り方は選択肢自体を出さない実装にしている。ダミーの
 * "#"は使わない)。
 *
 * 【「読みたい」3冊もfeaturedに追加(2026-09-11、Decision Log 0129)】
 * `/participate`の「本をプレゼントする」teaserには、当初`featured:
 * true`の「読書中」3冊のみを表示していたが、この3冊は`giftEnabled:
 * false`で実際には贈れない本だった。プロジェクトオーナーの指示
 * (「気になる本も追加して」)により、実際に贈れる「読みたい」3冊も
 * `featured: true`に変更した(既存の3冊は残したまま追加、置き換えでは
 * ない)。これにより、贈ることを主目的とするteaserに、実際に
 * `giftEnabled: true`の本が表示されるようになった(→ 一部上書き済み、
 * 0132)。
 *
 * 【`/participate`は`giftFeatured`で選定する形に変更(2026-09-11、
 * Decision Log 0132)】0129の対応では、読書中3冊と読みたい3冊の
 * 計6冊が`/participate`に並んで表示され、「読書中の本はここでは
 * 見せない」「本が増えても本一覧ページにならないようにする」という
 * 方針に合わなくなった。`/participate`側の選定基準を`featured`から
 * `status === "wishlist" && giftEnabled && giftFeatured`に変更し、
 * 現在wishlistにある3冊(マツタケ・生きていること・現代日本語に
 * おける意図性副詞の意味研究)に`giftFeatured: true`を付けた。
 * `featured`の値(読書中3冊・読みたい3冊すべてtrue)はそのまま残して
 * いる(将来のプレビュー用途のため。現時点でこの値を参照するUIは
 * 無い)。
 *
 * 将来、外部データソースからの追加・更新に発展する可能性があるが、
 * 今回はこの配列を直接編集する運用のみ実装する(Google Sheets連携等は
 * 実装しない)。
 * ------------------------------------------------------------
 */
import type { BookEntry } from "@/types/bookshelf";

export const books: BookEntry[] = [
  {
    id: "keiken-to-kyouiku",
    title: "経験と教育",
    author: "ジョン・デューイ",
    status: "reading",
    owned: true,
    giftEnabled: false,
    conversationEnabled: true,
    featured: true,
    tone: "warm",
    // 講談社学術文庫版(市村尚久訳、2004年)
    isbn13: "9784061596801",
    // 講談社の書籍詳細ページ
    purchaseUrl: "https://www.kodansha.co.jp/book/products/0000151271",
    purchaseProvider: "other",
  },
  {
    id: "chousateki-kansei-jutsu",
    title: "調査的感性術",
    author: "マシュー・フラー、エヤル・ヴァイツマン",
    status: "reading",
    owned: true,
    giftEnabled: false,
    conversationEnabled: true,
    featured: true,
    tone: "moss",
    // 水声社版(中井悠訳、2024年)
    isbn13: "9784801007659",
    // 水声社の公式Webストア(プロジェクトオーナー確認済みURL)
    purchaseUrl: "https://comet-bc.stores.jp/items/684baabee99ff90001b34c89",
    purchaseProvider: "other",
  },
  {
    id: "souzou-no-kyoudoutai",
    title: "想像の共同体",
    author: "ベネディクト・アンダーソン",
    status: "reading",
    owned: true,
    giftEnabled: false,
    conversationEnabled: true,
    featured: true,
    tone: "sky",
    // 「定本 想像の共同体」書籍工房早山版(白石さや・白石隆訳、2007年)
    isbn13: "9784904701089",
    // 出版元(書籍工房早山)自体の公式サイトが見つからなかったため、
    // 出版書誌データベース(Books)の該当書誌ページで代用
    // (プロジェクトオーナー判断、Decision Log 0183)
    purchaseUrl: "https://www.books.or.jp/book-details/9784904701089",
    purchaseProvider: "other",
  },
  {
    id: "matsutake",
    title: "マツタケ――不確定な時代を生きる術",
    author: "アナ・チン",
    status: "wishlist",
    owned: false,
    giftEnabled: true,
    conversationEnabled: true,
    reason: "人間だけではないものとの関係から、世界に気づく方法を考えてみたい。",
    featured: true,
    giftFeatured: true,
    tone: "warm",
    // みすず書房版(赤嶺淳訳、2019年)
    isbn13: "9784622088318",
    // みすず書房の書籍詳細ページ
    purchaseUrl: "https://www.msz.co.jp/book/detail/08831/",
    purchaseProvider: "other",
  },
  {
    id: "ikiteiru-koto",
    title: "生きていること――動く、知る、記述する",
    author: "ティム・インゴルド",
    status: "wishlist",
    owned: false,
    giftEnabled: true,
    conversationEnabled: true,
    reason: "観察することと、生きることはどうつながっているのか。",
    featured: true,
    giftFeatured: true,
    tone: "moss",
    // 左右社版(柴田崇ほか訳、2021年)
    isbn13: "9784865280371",
    // 左右社の書籍詳細ページ
    purchaseUrl: "https://sayusha.com/books/-/isbn9784865280371",
    purchaseProvider: "other",
  },
  {
    id: "ito-sei-fukushi",
    title: "現代日本語における意図性副詞の意味研究",
    author: "李澤熊",
    status: "wishlist",
    owned: false,
    giftEnabled: true,
    conversationEnabled: true,
    reason: "「ふと」ということばそのものを、もう少し深くたどってみたい。",
    featured: true,
    giftFeatured: true,
    tone: "sky",
    // ひつじ書房版(ひつじ研究叢書 言語編193、2023年)
    isbn13: "9784823411717",
    // ひつじ書房の書籍詳細ページ(プロジェクトオーナー確認済みURL)
    purchaseUrl: "https://www.hituzi.co.jp/hituzibooks/ISBN978-4-8234-1171-7.htm",
    purchaseProvider: "other",
  },
];
