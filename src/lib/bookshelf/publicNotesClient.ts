/**
 * publicNotesClient.ts
 * ------------------------------------------------------------
 * `/bookshelf`の各行に、`/api/reading-notes?bookId=`(Cloudflare
 * Worker + D1、Decision Log 0189)から取得した公開読書メモを追記する
 * progressive enhancementスクリプト。
 *
 * `BookshelfShelf.astro`はビルド時に`src/data/publicReadingNotes.ts`
 * (静的・手動キュレーション)だけを描画する。このスクリプトは、それに
 * 加えて実行時にAPIから取得した分を追記する——Fieldnote
 * Readingで「公開する」を押した内容が、再ビルド・再デプロイなしで
 * 本棚に反映されるようにするための仕組み(Decision Log 0189の
 * 「手動でコードへ転記する運用を完成形にしない」という要件に対応)。
 *
 * サーバー側(Worker)のsecret設定が未完了、またはこのページが
 * `/api/*`を処理しないホストで配信されている場合、fetchは失敗するか
 * 404/500を返す。その場合は何もせず、静的キュレーション分だけが
 * そのまま表示され続ける(壊れた表示・エラー文言を出さない)。
 * ------------------------------------------------------------
 */

interface RelatedRecord {
  label: string;
  href: string;
}

interface ApiNote {
  id: string;
  bookId: string;
  authorReflection: string;
  publishedAt: string;
  quote?: string;
  quoteLocation?: string;
  relatedRecords?: RelatedRecord[];
}

async function fetchNotesForBook(bookId: string): Promise<ApiNote[]> {
  try {
    const response = await fetch(`/api/reading-notes?bookId=${encodeURIComponent(bookId)}`);
    if (!response.ok) return [];
    const data = (await response.json()) as { notes?: ApiNote[] };
    return Array.isArray(data.notes) ? data.notes : [];
  } catch {
    return [];
  }
}

function buildNoteArticle(note: ApiNote): HTMLElement {
  const article = document.createElement("article");
  article.dataset.dynamicReadingNote = "true";

  const meta = document.createElement("p");
  meta.dataset.dynamicReadingNoteMeta = "true";
  meta.textContent = note.publishedAt;
  article.append(meta);

  const body = document.createElement("p");
  body.dataset.dynamicReadingNoteBody = "true";
  body.textContent = note.authorReflection;
  article.append(body);

  if (note.quote) {
    const quote = document.createElement("blockquote");
    quote.dataset.dynamicReadingNoteQuote = "true";
    const quoteText = document.createElement("p");
    quoteText.textContent = note.quote;
    quote.append(quoteText);
    if (note.quoteLocation) {
      const cite = document.createElement("cite");
      cite.textContent = note.quoteLocation;
      quote.append(cite);
    }
    article.append(quote);
  }

  if (note.relatedRecords && note.relatedRecords.length > 0) {
    const list = document.createElement("ul");
    list.dataset.dynamicReadingNoteRelated = "true";
    note.relatedRecords.forEach((link) => {
      const item = document.createElement("li");
      const anchor = document.createElement("a");
      anchor.href = link.href;
      anchor.textContent = link.label;
      item.append(anchor);
      list.append(item);
    });
    article.append(list);
  }

  return article;
}

async function enhanceRow(row: HTMLElement): Promise<void> {
  const bookId = row.dataset.bookRow;
  if (!bookId) return;
  const notes = await fetchNotesForBook(bookId);
  if (notes.length === 0) return;

  const details = document.createElement("details");
  details.dataset.dynamicReadingNotes = "true";
  const summary = document.createElement("summary");
  summary.dataset.dynamicReadingNotesSummary = "true";
  summary.textContent = "読書メモを読む";
  details.append(summary);

  const body = document.createElement("div");
  body.dataset.dynamicReadingNotesBody = "true";
  notes.forEach((note) => body.append(buildNoteArticle(note)));
  details.append(body);

  row.append(details);
}

document.querySelectorAll<HTMLElement>("[data-book-row]").forEach((row) => {
  void enhanceRow(row);
});
