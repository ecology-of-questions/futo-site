/**
 * app.ts
 * ------------------------------------------------------------
 * Fieldnote Reading のクライアント側エントリーポイント。
 * src/pages/fieldnote/index.astro から <script src="..."> で読み込む
 * (src/pages配下の.tsはAstroにサーバーエンドポイントとして扱われて
 * しまうため、ここ(src/lib/)に置く)。
 * 画面遷移とDOMの配線だけを担う。保存はFieldnoteStore、カメラ制御は
 * FieldnoteCameraに委譲する(2026-09-02, Decision Log 0066)。
 *
 * このページはフレームワークを使わない1枚のstatic pageのため、
 * 「コンポーネントのunmount」に相当するライフサイクルは存在しない。
 * 代わりにpagehide(ページ離脱・タブを閉じる・bfcache行き)を
 * カメラを止めるべきタイミングとして扱う
 * (2026-09-02, PRセルフレビューで追加)。
 *
 * 【本棚との紐づけ・過去のセッション一覧を追加(2026-09-20、Decision
 * Log 0185)】本棚のcanonical data(`src/data/bookshelf.ts`)を参照する
 * (別の手書きリストを作らない)。IDによる引き当てだけに使う。
 *
 * 【抜粋・コメント・まとめ・公開プレビューを追加(2026-09-20、Decision
 * Log 0187)】画面(`view-*`)が増えた分、動的に作る要素は全て
 * data属性でCSSフックする(CSS Modulesのハッシュ化されたクラス名を
 * このファイルから参照しない、既存の書き方を踏襲)。
 *
 * 【OCR(文字の読み取り)を追加(2026-09-20、Decision Log 0188)】
 * 写真記録の抜粋欄に、Tesseract.jsによる読み取り結果を「下書き」として
 * 提案する`buildOcrBlock`を追加した。`./ocr.ts`は動的import
 * (`await import("tesseract.js")`)しており、OCRを使わない利用者は
 * 追加のJS/WASM/学習データを一切ダウンロードしない。認識結果は
 * 既存の抜粋欄(`excerptInput`)に値を入れるだけで、保存は既存の
 * blurハンドラに委ねる(このファイルが独自に保存処理を持たない)。
 * ------------------------------------------------------------
 */
import { IndexedDbFieldnoteStore } from "./indexedDbStore";
import { FieldnoteCamera, FieldnoteCameraError } from "./camera";
import { books } from "../../data/bookshelf";
import type { FieldnoteExportBundle } from "./store";
import { recognizeExcerpt, type OcrOrientation } from "./ocr";
import type { FieldnoteCapture, FieldnoteCollection, FieldnoteSession } from "../../types/fieldnote";

const store = new IndexedDbFieldnoteStore();
const camera = new FieldnoteCamera();
const bookById = new Map(books.map((book) => [book.id, book]));

let currentSession: FieldnoteSession | null = null;
let shotCount = 0;
const captureObjectUrls: string[] = [];
let publishCapture: FieldnoteCapture | null = null;
let publishSession: FieldnoteSession | null = null;

function byId<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) {
    throw new Error(`要素が見つかりません: #${id}`);
  }
  return el as T;
}

const setupView = byId<HTMLElement>("view-setup");
const cameraView = byId<HTMLElement>("view-camera");
const listView = byId<HTMLElement>("view-list");
const historyView = byId<HTMLElement>("view-history");
const collectionsView = byId<HTMLElement>("view-collections");
const publishView = byId<HTMLElement>("view-publish");

const setupForm = byId<HTMLFormElement>("setup-form");
const titleInput = byId<HTMLInputElement>("book-title-input");
const bookSelect = byId<HTMLSelectElement>("book-select");
const bookLocationField = byId<HTMLElement>("book-location-field");
const bookLocationInput = byId<HTMLInputElement>("book-location-input");
const setupErrorEl = byId<HTMLElement>("setup-error");
const openHistoryBtn = byId<HTMLButtonElement>("open-history-btn");
const openCollectionsBtn = byId<HTMLButtonElement>("open-collections-btn");

const quickTextInput = byId<HTMLTextAreaElement>("quick-text-input");
const quickUrlInput = byId<HTMLInputElement>("quick-url-input");
const quickUrlTitleInput = byId<HTMLInputElement>("quick-url-title-input");
const quickSaveBtn = byId<HTMLButtonElement>("quick-save-btn");

const exportBtn = byId<HTMLButtonElement>("export-btn");
const importFileInput = byId<HTMLInputElement>("import-file-input");
const backupStatus = byId<HTMLElement>("backup-status");

const videoEl = byId<HTMLVideoElement>("camera-video");
const captureBtn = byId<HTMLButtonElement>("capture-btn");
const endSessionBtn = byId<HTMLButtonElement>("end-session-btn");
const shotCountEl = byId<HTMLElement>("shot-count");
const cameraErrorEl = byId<HTMLElement>("camera-error");
const sessionTitleLabel = byId<HTMLElement>("session-title-label");
const shutterFlash = byId<HTMLElement>("shutter-flash");

const listTitle = byId<HTMLElement>("list-title");
const listMeta = byId<HTMLElement>("list-meta");
const listBookLink = byId<HTMLButtonElement>("list-book-link");
const entryList = byId<HTMLElement>("entry-list");
const startNewSessionBtn = byId<HTMLButtonElement>("start-new-session-btn");
const listOpenHistoryBtn = byId<HTMLButtonElement>("list-open-history-btn");
const listOpenCollectionsBtn = byId<HTMLButtonElement>("list-open-collections-btn");

const historyBookFilter = byId<HTMLSelectElement>("history-book-filter");
const historyList = byId<HTMLElement>("history-list");
const historyBackBtn = byId<HTMLButtonElement>("history-back-btn");

const collectionsListEl = byId<HTMLElement>("collections-list");
const collectionTitleInput = byId<HTMLInputElement>("collection-title-input");
const collectionPickerEl = byId<HTMLSelectElement>("collection-picker");
const collectionSaveBtn = byId<HTMLButtonElement>("collection-save-btn");
const collectionStatus = byId<HTMLElement>("collection-status");
const collectionsBackBtn = byId<HTMLButtonElement>("collections-back-btn");

const publishReflection = byId<HTMLTextAreaElement>("publish-reflection");
const publishQuoteToggle = byId<HTMLInputElement>("publish-quote-toggle");
const publishQuoteFields = byId<HTMLElement>("publish-quote-fields");
const publishQuote = byId<HTMLTextAreaElement>("publish-quote");
const publishCitation = byId<HTMLElement>("publish-citation");
const publishRelatedList = byId<HTMLElement>("publish-related-list");
const publishOutput = byId<HTMLElement>("publish-output");
const publishCopyBtn = byId<HTMLButtonElement>("publish-copy-btn");
const publishCopyStatus = byId<HTMLElement>("publish-copy-status");
const publishBackBtn = byId<HTMLButtonElement>("publish-back-btn");

function showView(name: "setup" | "camera" | "list" | "history" | "collections" | "publish"): void {
  setupView.hidden = name !== "setup";
  cameraView.hidden = name !== "camera";
  listView.hidden = name !== "list";
  historyView.hidden = name !== "history";
  collectionsView.hidden = name !== "collections";
  publishView.hidden = name !== "publish";
}

function showCameraError(message: string): void {
  cameraErrorEl.textContent = message;
  cameraErrorEl.hidden = false;
  captureBtn.disabled = true;
}

function clearCameraError(): void {
  cameraErrorEl.hidden = true;
  captureBtn.disabled = false;
}

function showSetupError(message: string): void {
  setupErrorEl.textContent = message;
  setupErrorEl.hidden = false;
}

function clearSetupError(): void {
  setupErrorEl.hidden = true;
}

function flashShutter(): void {
  shutterFlash.style.opacity = "1";
  window.setTimeout(() => {
    shutterFlash.style.opacity = "0";
  }, 120);
}

function formatDateTime(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** 「ページ・位置」欄は、本を選んでいる間だけ表示する。本の選択解除時は値も消し、迷子の位置情報を残さない(2026-09-20、Decision Log 0185)。 */
function updateBookLocationVisibility(): void {
  const hasBook = bookSelect.value !== "";
  bookLocationField.hidden = !hasBook;
  if (!hasBook) {
    bookLocationInput.value = "";
  }
}

/**
 * `<select>`に無い値(未知のbookId)を渡された場合は、選択状態を
 * 変えない(先頭の「本を選ばない」のまま)。エラー表示はしない
 * (2026-09-20、Decision Log 0185)。
 */
function applyBookSelection(bookId: string): void {
  bookSelect.value = bookId;
  if (bookSelect.value !== bookId) {
    bookSelect.value = "";
  }
  updateBookLocationVisibility();
}

function resetSetupForm(): void {
  titleInput.value = "";
  applyBookSelection("");
  quickTextInput.value = "";
  quickUrlInput.value = "";
  quickUrlTitleInput.value = "";
}

async function startSession(title: string, bookId: string, bookLocation: string): Promise<FieldnoteSession | null> {
  clearSetupError();
  try {
    return await store.createSession(title, bookId || undefined, bookLocation || undefined);
  } catch {
    // IndexedDBが使えない(プライベートブラウジングの制限等)場合も、
    // 無反応のまま止まらせず、タイトル入力画面にとどめてエラーを示す。
    showSetupError("保存先を初期化できませんでした。ブラウザの設定をご確認のうえ、もう一度お試しください。");
    return null;
  }
}

async function startCameraSession(session: FieldnoteSession): Promise<void> {
  currentSession = session;
  shotCount = 0;
  shotCountEl.textContent = "0枚";
  sessionTitleLabel.textContent = session.title || "(無題)";

  showView("camera");
  clearCameraError();

  try {
    await camera.start(videoEl);
  } catch (error) {
    showCameraError(
      error instanceof FieldnoteCameraError
        ? error.message
        : "カメラを起動できませんでした。カメラへのアクセスを許可してください。",
    );
  }
}

async function capturePage(): Promise<void> {
  if (!currentSession || captureBtn.disabled) {
    return;
  }
  captureBtn.disabled = true;
  try {
    const image = await camera.capture();
    await store.addCapture(currentSession.id, image);
    shotCount += 1;
    shotCountEl.textContent = `${shotCount}枚`;
    flashShutter();
  } catch (error) {
    showCameraError(
      error instanceof FieldnoteCameraError ? error.message : "保存に失敗しました。もう一度お試しください。",
    );
  } finally {
    captureBtn.disabled = false;
  }
}

/** セッションに紐づく本の表示を更新する。本が削除されていた場合も、リンク切れやエラー表示にはしない(2026-09-20、Decision Log 0185)。 */
function renderSessionBookLink(bookId: string | undefined, bookLocation: string | undefined): void {
  if (!bookId) {
    listBookLink.hidden = true;
    listBookLink.disabled = false;
    listBookLink.onclick = null;
    return;
  }

  const book = bookById.get(bookId);
  listBookLink.hidden = false;

  if (!book) {
    listBookLink.textContent = "本の情報を確認できません";
    listBookLink.disabled = true;
    listBookLink.onclick = null;
    return;
  }

  const locationSuffix = bookLocation ? `・${bookLocation}` : "";
  listBookLink.textContent = `この本の記録: ${book.title}${locationSuffix} →`;
  listBookLink.disabled = false;
  listBookLink.onclick = () => {
    void renderHistory(bookId).then(() => showView("history"));
  };
}

function formatEntryMeta(capture: FieldnoteCapture): string {
  const kind = capture.kind ?? "photo";
  const kindLabel = kind === "photo" ? "写真" : kind === "url" ? "URL" : "テキスト";
  return `${kindLabel}・${formatDateTime(capture.createdAt)}`;
}

async function renderComments(captureId: string, container: HTMLElement): Promise<void> {
  const comments = await store.listComments(captureId);
  container.replaceChildren();

  if (comments.length === 0) {
    const empty = document.createElement("p");
    empty.dataset.commentEmpty = "true";
    empty.textContent = "コメントはまだありません。";
    container.append(empty);
    return;
  }

  for (const comment of comments) {
    const row = document.createElement("div");
    row.dataset.commentRow = "true";

    const body = document.createElement("p");
    body.dataset.commentBody = "true";
    body.textContent = comment.body;
    row.append(body);

    const meta = document.createElement("span");
    meta.dataset.commentMeta = "true";
    meta.textContent = formatDateTime(comment.updatedAt ?? comment.createdAt) + (comment.updatedAt ? "(編集済み)" : "");
    row.append(meta);

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.dataset.commentEdit = "true";
    editBtn.textContent = "編集";
    editBtn.addEventListener("click", () => {
      const textarea = document.createElement("textarea");
      textarea.value = comment.body;
      textarea.rows = 2;
      textarea.setAttribute("aria-label", "コメントを編集");
      const saveBtn = document.createElement("button");
      saveBtn.type = "button";
      saveBtn.dataset.commentEditSave = "true";
      saveBtn.textContent = "保存";
      saveBtn.addEventListener("click", () => {
        void store.updateComment(comment.id, textarea.value).then(() => renderComments(captureId, container));
      });
      row.replaceChildren(textarea, saveBtn);
    });
    row.append(editBtn);

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.dataset.commentDelete = "true";
    deleteBtn.textContent = "削除";
    deleteBtn.addEventListener("click", () => {
      void store.deleteComment(comment.id).then(() => renderComments(captureId, container));
    });
    row.append(deleteBtn);

    container.append(row);
  }
}

function renderRelatedLinks(capture: FieldnoteCapture, container: HTMLElement): void {
  container.replaceChildren();
  const links = capture.relatedLinks ?? [];

  if (links.length === 0) {
    const empty = document.createElement("p");
    empty.dataset.relatedEmpty = "true";
    empty.textContent = "つながりはまだありません。";
    container.append(empty);
    return;
  }

  links.forEach((link, index) => {
    const row = document.createElement("div");
    row.dataset.relatedRow = "true";

    const a = document.createElement("a");
    a.href = link.href;
    a.textContent = link.label;
    if (/^https?:\/\//.test(link.href)) {
      a.target = "_blank";
      a.rel = "noopener noreferrer";
    }
    row.append(a);

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.dataset.relatedRemove = "true";
    removeBtn.textContent = "削除";
    removeBtn.addEventListener("click", () => {
      const newLinks = links.filter((_, i) => i !== index);
      void store.updateCapture(capture.id, { relatedLinks: newLinks }).then((updated) => {
        capture.relatedLinks = updated.relatedLinks;
        renderRelatedLinks(capture, container);
      });
    });
    row.append(removeBtn);

    container.append(row);
  });
}

/**
 * 写真記録に「文字を読み取る」ブロックを追加する。読み取り結果は
 * `excerptInput`に値を入れるだけで、保存はしない(呼び出し側が持つ
 * 既存のblurハンドラで保存される)。実測(Decision Log 0187)で、傾き・
 * ノイズ・JPEG圧縮を加えただけでも精度が大きく落ちることを確認して
 * いるため、常に「下書き・要確認」であることを明示する。
 */
function buildOcrBlock(
  capture: FieldnoteCapture,
  image: Blob,
  excerptInput: HTMLTextAreaElement,
  pageInput: HTMLInputElement,
): HTMLElement {
  const wrap = document.createElement("div");
  wrap.dataset.ocrBlock = "true";

  const controls = document.createElement("div");
  controls.dataset.ocrControls = "true";

  const orientationSelect = document.createElement("select");
  orientationSelect.setAttribute("aria-label", "文字の向き");
  const optHorizontal = document.createElement("option");
  optHorizontal.value = "horizontal";
  optHorizontal.textContent = "横書き";
  const optVertical = document.createElement("option");
  optVertical.value = "vertical";
  optVertical.textContent = "縦書き";
  orientationSelect.append(optHorizontal, optVertical);
  controls.append(orientationSelect);

  const runBtn = document.createElement("button");
  runBtn.type = "button";
  runBtn.dataset.ocrRun = "true";
  runBtn.textContent = "文字を読み取る(実験的)";
  controls.append(runBtn);
  wrap.append(controls);

  const note = document.createElement("p");
  note.dataset.ocrNote = "true";
  note.textContent =
    "実験的機能です。読み取り結果は下書きとして抜粋欄に入ります。誤読があるので、必ず確認・修正してから使ってください。初回は文字向きごとに約2MBのデータをダウンロードします。";
  wrap.append(note);

  const status = document.createElement("p");
  status.dataset.ocrStatus = "true";
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  wrap.append(status);

  const pageCandidateRow = document.createElement("div");
  pageCandidateRow.dataset.ocrPageCandidate = "true";
  pageCandidateRow.hidden = true;
  const pageCandidateLabel = document.createElement("span");
  const pageCandidateValue = document.createElement("strong");
  pageCandidateLabel.append("ページ番号の候補: ", pageCandidateValue);
  pageCandidateRow.append(pageCandidateLabel);
  const usePageCandidateBtn = document.createElement("button");
  usePageCandidateBtn.type = "button";
  usePageCandidateBtn.dataset.ocrPageUse = "true";
  usePageCandidateBtn.textContent = "ページ欄に使う";
  usePageCandidateBtn.addEventListener("click", () => {
    pageInput.value = pageCandidateValue.textContent ?? "";
    void store.updateCapture(capture.id, { pageLabel: pageInput.value }).then((updated) => {
      capture.pageLabel = updated.pageLabel;
    });
    pageCandidateRow.hidden = true;
  });
  pageCandidateRow.append(usePageCandidateBtn);
  wrap.append(pageCandidateRow);

  runBtn.addEventListener("click", () => {
    void (async () => {
      if (excerptInput.value.trim() !== "") {
        const proceed = window.confirm("既存の抜粋を読み取り結果の下書きで置き換えますか?");
        if (!proceed) return;
      }

      runBtn.disabled = true;
      pageCandidateRow.hidden = true;
      status.textContent = "読み取りの準備をしています…";

      const orientation = orientationSelect.value as OcrOrientation;
      try {
        const result = await recognizeExcerpt(image, orientation, (progress) => {
          const percent = Math.round(progress.progress * 100);
          status.textContent = `${progress.status || "読み取り中"}…${percent}%`;
        });

        if (!result.text) {
          status.textContent = "文字を読み取れませんでした。傾きや明るさを変えて撮り直すか、手入力してください。";
          return;
        }

        excerptInput.value = result.text;
        excerptInput.focus();
        status.textContent = `読み取りました(下書き・信頼度の目安${Math.round(result.confidence)}%)。内容を確認し、必要なら修正してください。ここを離れると保存されます。`;

        if (result.pageCandidate) {
          pageCandidateValue.textContent = result.pageCandidate;
          pageCandidateRow.hidden = false;
        }
      } catch (error) {
        status.textContent = "読み取りに失敗しました。お使いのブラウザが対応していない可能性があります。";
        console.error("OCR failed", error);
      } finally {
        runBtn.disabled = false;
      }
    })();
  });

  return wrap;
}

async function buildEntryCard(capture: FieldnoteCapture): Promise<HTMLElement> {
  const card = document.createElement("article");
  card.dataset.entryCard = "true";
  card.dataset.entryId = capture.id;

  const meta = document.createElement("p");
  meta.dataset.entryMeta = "true";
  meta.textContent = formatEntryMeta(capture);
  card.append(meta);

  const kind = capture.kind ?? "photo";

  if (kind === "photo" && capture.image) {
    const url = URL.createObjectURL(capture.image);
    captureObjectUrls.push(url);
    const details = document.createElement("details");
    details.dataset.entryPhoto = "true";
    const summary = document.createElement("summary");
    summary.textContent = "元の写真を見る";
    details.append(summary);
    const img = document.createElement("img");
    img.src = url;
    img.alt = "撮影したページ";
    img.loading = "lazy";
    details.append(img);
    card.append(details);
  }

  if (kind === "url" && capture.url) {
    const link = document.createElement("a");
    link.href = capture.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.dataset.entryUrl = "true";
    link.textContent = capture.urlTitle || capture.url;
    card.append(link);
  }

  const excerptInput = document.createElement("textarea");
  excerptInput.dataset.entryExcerpt = "true";
  excerptInput.setAttribute("aria-label", "抜粋・自分の考え");
  excerptInput.placeholder = "抜粋・自分の考え";
  excerptInput.rows = 3;
  excerptInput.value = capture.excerptText ?? "";
  excerptInput.addEventListener("blur", () => {
    void store.updateCapture(capture.id, { excerptText: excerptInput.value }).then((updated) => {
      capture.excerptText = updated.excerptText;
    });
  });

  const pageInput = document.createElement("input");
  pageInput.type = "text";
  pageInput.dataset.entryPage = "true";
  pageInput.setAttribute("aria-label", "ページ・位置");
  pageInput.placeholder = "ページ・位置(任意)";
  pageInput.value = capture.pageLabel ?? "";
  pageInput.addEventListener("blur", () => {
    void store.updateCapture(capture.id, { pageLabel: pageInput.value }).then((updated) => {
      capture.pageLabel = updated.pageLabel;
    });
  });

  if (kind === "photo" && capture.image) {
    card.append(buildOcrBlock(capture, capture.image, excerptInput, pageInput));
  }

  card.append(excerptInput);
  card.append(pageInput);

  const commentsHeading = document.createElement("p");
  commentsHeading.dataset.fieldHeading = "true";
  commentsHeading.textContent = "コメント";
  card.append(commentsHeading);

  const commentsWrap = document.createElement("div");
  commentsWrap.dataset.commentsList = "true";
  card.append(commentsWrap);
  void renderComments(capture.id, commentsWrap);

  const commentInput = document.createElement("textarea");
  commentInput.dataset.commentInput = "true";
  commentInput.setAttribute("aria-label", "コメントを追加");
  commentInput.placeholder = "コメントを追加";
  commentInput.rows = 2;
  card.append(commentInput);

  const commentAddBtn = document.createElement("button");
  commentAddBtn.type = "button";
  commentAddBtn.dataset.commentAdd = "true";
  commentAddBtn.textContent = "コメントを追加";
  commentAddBtn.addEventListener("click", () => {
    const body = commentInput.value.trim();
    if (!body) return;
    void store.addComment(capture.id, body).then(() => {
      commentInput.value = "";
      void renderComments(capture.id, commentsWrap);
    });
  });
  card.append(commentAddBtn);

  const relatedHeading = document.createElement("p");
  relatedHeading.dataset.fieldHeading = "true";
  relatedHeading.textContent = "つながり";
  card.append(relatedHeading);

  const relatedWrap = document.createElement("div");
  relatedWrap.dataset.relatedList = "true";
  card.append(relatedWrap);
  renderRelatedLinks(capture, relatedWrap);

  const relatedLabelInput = document.createElement("input");
  relatedLabelInput.type = "text";
  relatedLabelInput.setAttribute("aria-label", "つながりの見出し");
  relatedLabelInput.placeholder = "つながりの見出し(例: 散歩譜｜雨上がりの帰り道)";
  card.append(relatedLabelInput);

  const relatedHrefInput = document.createElement("input");
  relatedHrefInput.type = "text";
  relatedHrefInput.setAttribute("aria-label", "つながりの行き先");
  relatedHrefInput.placeholder = "行き先(URL、または/から始まるサイト内のパス)";
  card.append(relatedHrefInput);

  const relatedAddBtn = document.createElement("button");
  relatedAddBtn.type = "button";
  relatedAddBtn.dataset.relatedAdd = "true";
  relatedAddBtn.textContent = "つながりを追加";
  relatedAddBtn.addEventListener("click", () => {
    const label = relatedLabelInput.value.trim();
    const href = relatedHrefInput.value.trim();
    if (!label || !href) return;
    void store
      .updateCapture(capture.id, { relatedLinks: [...(capture.relatedLinks ?? []), { label, href }] })
      .then((updated) => {
        capture.relatedLinks = updated.relatedLinks;
        relatedLabelInput.value = "";
        relatedHrefInput.value = "";
        renderRelatedLinks(capture, relatedWrap);
      });
  });
  card.append(relatedAddBtn);

  const publishBtn = document.createElement("button");
  publishBtn.type = "button";
  publishBtn.dataset.entryPublish = "true";
  publishBtn.textContent = "公開プレビューを作る →";
  publishBtn.addEventListener("click", () => {
    void openPublishPreview(capture);
  });
  card.append(publishBtn);

  return card;
}

async function renderEntryList(
  headingText: string,
  metaText: string,
  captures: FieldnoteCapture[],
  bookLinkInfo?: { bookId?: string; bookLocation?: string },
): Promise<void> {
  captureObjectUrls.forEach((url) => URL.revokeObjectURL(url));
  captureObjectUrls.length = 0;
  entryList.replaceChildren();

  listTitle.textContent = headingText;
  listMeta.textContent = metaText;
  renderSessionBookLink(bookLinkInfo?.bookId, bookLinkInfo?.bookLocation);

  if (captures.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "記録はありません。";
    entryList.append(empty);
    return;
  }

  for (const capture of captures) {
    const card = await buildEntryCard(capture);
    entryList.append(card);
  }
}

async function endSession(): Promise<void> {
  if (!currentSession) {
    return;
  }

  // 保存処理(IndexedDB)が失敗した場合に備え、カメラを止める前に
  // セッション終了・一覧取得を済ませる。ここで失敗した場合は
  // カメラを止めずにエラーを示し、ユーザーが「終了」をやり直せる
  // ようにする(2026-09-02、PRセルフレビューで修正)。
  let ended: FieldnoteSession;
  let captures: FieldnoteCapture[];
  try {
    ended = await store.endSession(currentSession.id);
    captures = await store.listCaptures(ended.id);
  } catch {
    showCameraError("セッションの終了に失敗しました。もう一度お試しください。");
    return;
  }

  camera.stop();
  currentSession = null;
  await renderEntryList(ended.title || "(無題)", `${captures.length}件の記録`, captures, {
    bookId: ended.bookId,
    bookLocation: ended.bookLocation,
  });
  showView("list");
}

/** 「過去の記録」・「まとめ」から選んだセッション/まとめを開く。撮影一覧の取得に失敗した場合も、0件として表示に留める。 */
async function openSessionFromHistory(session: FieldnoteSession): Promise<void> {
  let captures: FieldnoteCapture[];
  try {
    captures = await store.listCaptures(session.id);
  } catch {
    captures = [];
  }
  await renderEntryList(session.title || "(無題)", `${captures.length}件の記録`, captures, {
    bookId: session.bookId,
    bookLocation: session.bookLocation,
  });
  showView("list");
}

function formatSessionDate(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}

/**
 * 「過去の記録」一覧を描画する。`filterBookId`が空文字なら全件、
 * 指定があればそのbookIdのセッションだけに絞り込む(2026-09-20、
 * Decision Log 0185)。
 */
async function renderHistory(filterBookId: string): Promise<void> {
  historyBookFilter.value = filterBookId;
  historyList.replaceChildren();

  let sessions: FieldnoteSession[];
  try {
    sessions = await store.listSessions();
  } catch {
    const errorEl = document.createElement("p");
    errorEl.textContent = "過去の記録を読み込めませんでした。";
    historyList.append(errorEl);
    return;
  }

  const filtered = filterBookId ? sessions.filter((session) => session.bookId === filterBookId) : sessions;

  if (filtered.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = filterBookId ? "この本のメモはまだありません。" : "まだ記録がありません。";
    historyList.append(empty);

    if (filterBookId) {
      const startBtn = document.createElement("button");
      startBtn.type = "button";
      startBtn.dataset.historyStart = "true";
      startBtn.textContent = "メモする →";
      startBtn.addEventListener("click", () => {
        applyBookSelection(filterBookId);
        showView("setup");
      });
      historyList.append(startBtn);
    }
    return;
  }

  for (const session of filtered) {
    const row = document.createElement("button");
    row.type = "button";
    row.dataset.historyRow = "true";
    row.addEventListener("click", () => {
      void openSessionFromHistory(session);
    });

    const titleEl = document.createElement("span");
    titleEl.dataset.historyRowTitle = "true";
    titleEl.textContent = session.title || "(無題)";
    row.append(titleEl);

    if (session.bookId) {
      const book = bookById.get(session.bookId);
      const bookEl = document.createElement("span");
      bookEl.dataset.historyRowBook = "true";
      bookEl.textContent = book
        ? book.title + (session.bookLocation ? `・${session.bookLocation}` : "")
        : "本の情報を確認できません";
      row.append(bookEl);
    }

    const metaEl = document.createElement("span");
    metaEl.dataset.historyRowMeta = "true";
    metaEl.textContent = formatSessionDate(session.startedAt) + (session.endedAt ? "" : "・進行中");
    row.append(metaEl);

    historyList.append(row);
  }
}

async function renderCollectionsList(): Promise<void> {
  collectionsListEl.replaceChildren();
  const collections = await store.listCollections();

  if (collections.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "まとめはまだありません。";
    collectionsListEl.append(empty);
    return;
  }

  for (const collection of collections) {
    const row = document.createElement("button");
    row.type = "button";
    row.dataset.collectionRow = "true";

    const title = document.createElement("span");
    title.dataset.collectionRowTitle = "true";
    title.textContent = collection.title || "(無題のまとめ)";
    row.append(title);

    const meta = document.createElement("span");
    meta.dataset.collectionRowMeta = "true";
    meta.textContent = `${collection.captureIds.length}件`;
    row.append(meta);

    row.addEventListener("click", () => {
      void openCollectionDetail(collection);
    });

    collectionsListEl.append(row);
  }
}

async function openCollectionDetail(collection: FieldnoteCollection): Promise<void> {
  const captures: FieldnoteCapture[] = [];
  for (const id of collection.captureIds) {
    const capture = await store.getCapture(id);
    if (capture) captures.push(capture);
  }
  await renderEntryList(collection.title || "(無題のまとめ)", `${captures.length}件の記録`, captures);
  showView("list");
}

async function renderCollectionPicker(): Promise<void> {
  collectionPickerEl.replaceChildren();
  const sessions = await store.listSessions();
  for (const session of sessions) {
    // eslint-disable-next-line no-await-in-loop -- 個人利用規模のデータ量を想定し、単純さを優先する
    const captures = await store.listCaptures(session.id);
    for (const capture of captures) {
      const option = document.createElement("option");
      option.value = capture.id;
      const snippet = (capture.excerptText || capture.urlTitle || capture.url || "(写真のみ)").slice(0, 30);
      option.textContent = `${session.title || "(無題)"} ／ ${snippet}`;
      collectionPickerEl.append(option);
    }
  }
}

async function openCollectionsView(): Promise<void> {
  await renderCollectionsList();
  await renderCollectionPicker();
  collectionStatus.textContent = "";
  showView("collections");
}

async function handleSaveCollection(): Promise<void> {
  const title = collectionTitleInput.value.trim();
  const selectedIds = Array.from(collectionPickerEl.selectedOptions).map((option) => option.value);
  if (!title) {
    collectionStatus.textContent = "タイトルを入力してください。";
    return;
  }
  if (selectedIds.length === 0) {
    collectionStatus.textContent = "まとめに入れる記録を選んでください。";
    return;
  }
  await store.createCollection(title, selectedIds);
  collectionTitleInput.value = "";
  collectionPickerEl.selectedIndex = -1;
  collectionStatus.textContent = "まとめを保存しました。";
  await renderCollectionsList();
}

async function findSession(sessionId: string): Promise<FieldnoteSession | undefined> {
  const sessions = await store.listSessions();
  return sessions.find((session) => session.id === sessionId);
}

function updatePublishQuoteVisibility(): void {
  publishQuoteFields.hidden = !publishQuoteToggle.checked;
  updatePublishOutput();
}

function renderPublishCitation(): void {
  if (!publishSession?.bookId) {
    publishCitation.textContent = "";
    return;
  }
  const book = bookById.get(publishSession.bookId);
  if (!book) {
    publishCitation.textContent = "";
    return;
  }
  const location = publishCapture?.pageLabel || publishSession.bookLocation || "";
  publishCitation.textContent = `${book.author ? `${book.author}『${book.title}』` : book.title}${location ? `　${location}` : ""}`;
}

function renderPublishRelatedList(): void {
  publishRelatedList.replaceChildren();
  const links = publishCapture?.relatedLinks ?? [];

  if (links.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "つながりはありません。";
    publishRelatedList.append(empty);
    return;
  }

  links.forEach((link, index) => {
    const internal = link.href.startsWith("/");
    const row = document.createElement("label");
    row.dataset.publishRelatedRow = "true";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.dataset.publishRelatedCheckbox = String(index);
    checkbox.disabled = !internal;
    checkbox.checked = internal;
    checkbox.addEventListener("change", updatePublishOutput);
    row.append(checkbox);

    const text = document.createElement("span");
    text.textContent = internal ? link.label : `${link.label}(外部リンクのため選択できません)`;
    row.append(text);

    publishRelatedList.append(row);
  });
}

function updatePublishOutput(): void {
  if (!publishSession || !publishCapture) {
    publishOutput.textContent = "";
    return;
  }
  const reflection = publishReflection.value.trim();
  const includeQuote = publishQuoteToggle.checked;
  const quote = includeQuote ? publishQuote.value.trim() : "";
  const quoteLocation = includeQuote ? publishCapture.pageLabel || publishSession.bookLocation || "" : "";

  const relatedRecords = Array.from(
    publishRelatedList.querySelectorAll<HTMLInputElement>("[data-publish-related-checkbox]"),
  )
    .filter((checkbox) => checkbox.checked)
    .map((checkbox) => publishCapture!.relatedLinks![Number(checkbox.dataset.publishRelatedCheckbox)]);

  const note: Record<string, unknown> = {
    id: "REPLACE-ME",
    bookId: publishSession.bookId ?? "",
    authorReflection: reflection,
    publishedAt: new Date().toISOString().slice(0, 10),
  };
  if (quote) {
    note.quote = quote;
    if (quoteLocation) note.quoteLocation = quoteLocation;
  }
  if (relatedRecords.length > 0) {
    note.relatedRecords = relatedRecords;
  }

  publishOutput.textContent = JSON.stringify(note, null, 2);
}

async function openPublishPreview(capture: FieldnoteCapture): Promise<void> {
  publishCapture = capture;
  publishSession = (await findSession(capture.sessionId)) ?? null;

  publishReflection.value = capture.excerptText ?? "";
  publishQuoteToggle.checked = false;
  publishQuote.value = "";
  updatePublishQuoteVisibility();
  renderPublishCitation();
  renderPublishRelatedList();
  updatePublishOutput();
  publishCopyStatus.textContent = "";
  showView("publish");
}

async function copyPublishOutput(): Promise<void> {
  const text = publishOutput.textContent ?? "";
  try {
    await navigator.clipboard.writeText(text);
    publishCopyStatus.textContent = "コピーしました。";
  } catch {
    publishCopyStatus.textContent = "コピーできませんでした。上のテキストを選択してコピーしてください。";
  }
}

async function handleQuickSave(): Promise<void> {
  const text = quickTextInput.value.trim();
  const url = quickUrlInput.value.trim();

  if (!text && !url) {
    showSetupError("短い文章かURLのどちらかを入力してください。");
    return;
  }
  if (url && !isValidHttpUrl(url)) {
    showSetupError("URLの形式が正しくありません。");
    return;
  }
  clearSetupError();

  const bookId = bookSelect.value;
  const book = bookId ? bookById.get(bookId) : undefined;
  const title = titleInput.value.trim() || book?.title || "";

  const session = await startSession(title, bookId, bookLocationInput.value);
  if (!session) return;

  try {
    if (text) await store.addTextEntry(session.id, text);
    if (url) await store.addUrlEntry(session.id, url, quickUrlTitleInput.value);
  } catch {
    showSetupError("記録の保存に失敗しました。もう一度お試しください。");
    return;
  }

  const ended = await store.endSession(session.id);
  const captures = await store.listCaptures(ended.id);
  resetSetupForm();
  await renderEntryList(ended.title || "(無題)", `${captures.length}件の記録`, captures, {
    bookId: ended.bookId,
    bookLocation: ended.bookLocation,
  });
  showView("list");
}

async function handleExport(): Promise<void> {
  try {
    const bundle = await store.exportAll();
    const blob = new Blob([JSON.stringify(bundle)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fieldnote-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    backupStatus.textContent = "書き出しました。";
  } catch {
    backupStatus.textContent = "書き出しに失敗しました。";
  }
}

async function handleImport(): Promise<void> {
  const file = importFileInput.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const bundle = JSON.parse(text) as FieldnoteExportBundle;
    const result = await store.importAll(bundle);
    backupStatus.textContent = `読み込みました(セッション${result.importedSessions}件、記録${result.importedCaptures}件、コメント${result.importedComments}件、まとめ${result.importedCollections}件、重複によりスキップ${result.skipped}件)。`;
  } catch {
    backupStatus.textContent = "読み込みに失敗しました。ファイルの形式をご確認ください。";
  } finally {
    importFileInput.value = "";
  }
}

window.addEventListener("pagehide", () => {
  camera.stop();
});

// `/fieldnote/?book=<bookId>`で開いた場合、その本を選択済みにする
// (未知のIDは無視、エラーにはしない。2026-09-20、Decision Log 0185)。
const initialBookId = new URLSearchParams(window.location.search).get("book");
if (initialBookId) {
  applyBookSelection(initialBookId);
}

bookSelect.addEventListener("change", updateBookLocationVisibility);

setupForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const bookId = bookSelect.value;
  const book = bookId ? bookById.get(bookId) : undefined;
  const title = titleInput.value.trim() || book?.title || "";
  void startSession(title, bookId, bookLocationInput.value).then((session) => {
    if (session) void startCameraSession(session);
  });
});

quickSaveBtn.addEventListener("click", () => {
  void handleQuickSave();
});

captureBtn.addEventListener("click", () => {
  void capturePage();
});

endSessionBtn.addEventListener("click", () => {
  void endSession();
});

startNewSessionBtn.addEventListener("click", () => {
  resetSetupForm();
  showView("setup");
});

openHistoryBtn.addEventListener("click", () => {
  void renderHistory("").then(() => showView("history"));
});

listOpenHistoryBtn.addEventListener("click", () => {
  void renderHistory("").then(() => showView("history"));
});

historyBookFilter.addEventListener("change", () => {
  void renderHistory(historyBookFilter.value);
});

historyBackBtn.addEventListener("click", () => {
  showView("setup");
});

openCollectionsBtn.addEventListener("click", () => {
  void openCollectionsView();
});

listOpenCollectionsBtn.addEventListener("click", () => {
  void openCollectionsView();
});

collectionSaveBtn.addEventListener("click", () => {
  void handleSaveCollection();
});

collectionsBackBtn.addEventListener("click", () => {
  showView("setup");
});

publishQuoteToggle.addEventListener("change", updatePublishQuoteVisibility);
publishReflection.addEventListener("input", updatePublishOutput);
publishQuote.addEventListener("input", updatePublishOutput);

publishCopyBtn.addEventListener("click", () => {
  void copyPublishOutput();
});

publishBackBtn.addEventListener("click", () => {
  showView("list");
});

exportBtn.addEventListener("click", () => {
  void handleExport();
});

importFileInput.addEventListener("change", () => {
  void handleImport();
});
