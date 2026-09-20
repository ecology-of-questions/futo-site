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
 * 提案する仕組みを追加した。`./ocr.ts`は動的import
 * (`await import("tesseract.js")`)しており、OCRを使わない利用者は
 * 追加のJS/WASM/学習データを一切ダウンロードしない。
 *
 * 【撮影を止めずに連続撮影・背後キュー処理に変更(2026-09-20、Decision
 * Log 0192)】OCRの実行は`./ocrQueue.ts`(`OcrQueue`)に委ねた。
 * `capturePage()`は撮影→保存の直後にキューへ積むだけで、OCRの完了を
 * 待たない(カメラは開いたまま、次の撮影にすぐ進める)。読み取り結果は
 * `ocrCandidateText`/`ocrCandidatePage`という「候補」に置かれるだけで、
 * `excerptText`/`pageLabel`は本人が「使う」を押すまで書き換わらない。
 * アプリ起動時に`ocrQueue.resumeUnfinished()`を呼び、前回中断した
 * 未処理分を再開する。
 * ------------------------------------------------------------
 */
import { IndexedDbFieldnoteStore } from "./indexedDbStore";
import { FieldnoteCamera, FieldnoteCameraError } from "./camera";
import { books } from "../../data/bookshelf";
import type { FieldnoteExportBundle } from "./store";
import type { OcrOrientation } from "./ocr";
import { OcrQueue, type OcrQueueEvent } from "./ocrQueue";
import {
  adminLogin,
  adminLogout,
  recoverAdminSession,
  fetchPublishedNotes,
  publishNote,
  updateNote,
  retractNote,
  PublishApiError,
  type AdminSession,
  type PublishedNoteRecord,
  type ReadingNoteDraft,
} from "./publishApi";
import type { FieldnoteCapture, FieldnoteCollection, FieldnoteSession } from "../../types/fieldnote";

const store = new IndexedDbFieldnoteStore();
const camera = new FieldnoteCamera();
const ocrQueue = new OcrQueue(store);
const bookById = new Map(books.map((book) => [book.id, book]));

let currentSession: FieldnoteSession | null = null;
let shotCount = 0;
let sessionOcrOrientation: OcrOrientation = "horizontal";
/** 現在のカメラセッションで、まだOCRが終わっていない記録のID(カメラ画面の「読み取り待ち」表示用)。 */
const pendingOcrIdsThisSession = new Set<string>();
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
const ocrOrientationSelect = byId<HTMLSelectElement>("ocr-orientation-select");
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
const ocrPendingCountEl = byId<HTMLElement>("ocr-pending-count");
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

const publishLoginBlock = byId<HTMLElement>("publish-login-block");
const publishAdminPassword = byId<HTMLInputElement>("publish-admin-password");
const publishLoginBtn = byId<HTMLButtonElement>("publish-login-btn");
const publishAuthedBlock = byId<HTMLElement>("publish-authed-block");
const publishSessionStatus = byId<HTMLElement>("publish-session-status");
const publishExistingNotes = byId<HTMLElement>("publish-existing-notes");
const publishSubmitBtn = byId<HTMLButtonElement>("publish-submit-btn");
const publishLogoutBtn = byId<HTMLButtonElement>("publish-logout-btn");
const publishAdminStatus = byId<HTMLElement>("publish-admin-status");

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

function updateOcrPendingIndicator(): void {
  const count = pendingOcrIdsThisSession.size;
  if (count === 0) {
    ocrPendingCountEl.hidden = true;
    return;
  }
  ocrPendingCountEl.hidden = false;
  ocrPendingCountEl.textContent = `読み取り待ち ${count}枚`;
}

async function startCameraSession(session: FieldnoteSession): Promise<void> {
  currentSession = session;
  shotCount = 0;
  shotCountEl.textContent = "0枚";
  sessionTitleLabel.textContent = session.title || "(無題)";
  pendingOcrIdsThisSession.clear();
  updateOcrPendingIndicator();

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

/**
 * 撮影は保存が終わり次第すぐ完了し、OCRの完了は待たない
 * (2026-09-20、Decision Log 0192)。カメラは閉じず、次の撮影に
 * すぐ進める。OCRは`ocrQueue`が裏で1件ずつ進める。
 */
async function capturePage(): Promise<void> {
  if (!currentSession || captureBtn.disabled) {
    return;
  }
  captureBtn.disabled = true;
  try {
    const image = await camera.capture();
    const capture = await store.addCapture(currentSession.id, image);
    shotCount += 1;
    shotCountEl.textContent = `${shotCount}枚`;
    flashShutter();

    await store.updateOcrState(capture.id, { ocrStatus: "pending", ocrOrientation: sessionOcrOrientation });
    pendingOcrIdsThisSession.add(capture.id);
    updateOcrPendingIndicator();
    ocrQueue.enqueue(capture.id);
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
 * 写真記録の「文字の読み取り」状態を表示するブロック(2026-09-20、
 * Decision Log 0192で全面刷新)。読み取りは`ocrQueue`が裏で進める
 * ため、ここではキューへ積む/状態を表示する/結果を「候補」として
 * 提示するだけで、このブロック自体は認識処理を直接呼ばない。
 *
 * 候補を抜粋・ページ欄に反映するのは、本人が明示的に「使う」を押した
 * ときだけ(自動上書きしない)。原本の写真と見比べやすいよう、候補が
 * 出た最初のタイミングで写真の`<details>`を開く。
 */
function buildOcrBlock(
  capture: FieldnoteCapture,
  excerptInput: HTMLTextAreaElement,
  pageInput: HTMLInputElement,
  photoDetails: HTMLDetailsElement | null,
  persistExcerpt: (value: string) => Promise<void>,
  persistPage: (value: string) => Promise<void>,
): HTMLElement {
  const wrap = document.createElement("div");
  wrap.dataset.ocrBlock = "true";
  wrap.dataset.ocrCaptureId = capture.id;

  const details = document.createElement("details");
  details.dataset.ocrDetails = "true";
  const summary = document.createElement("summary");
  summary.textContent = "文字の読み取りについて(詳細)";
  details.append(summary);
  const note = document.createElement("p");
  note.dataset.ocrNote = "true";
  note.textContent =
    "実験的機能です。読み取り結果は候補として扱われ、「使う」を押すまで抜粋・ページ欄は書き換わりません。誤読があるので、必ず元の写真と見比べてください。初回は文字向きごとに約2MBのデータをダウンロードします。";
  details.append(note);
  wrap.append(details);

  const status = document.createElement("p");
  status.dataset.ocrStatus = "true";
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  wrap.append(status);

  const actions = document.createElement("div");
  actions.dataset.ocrActions = "true";
  wrap.append(actions);

  function buildOrientationSelect(initial: OcrOrientation): HTMLSelectElement {
    const select = document.createElement("select");
    select.setAttribute("aria-label", "文字の向き");
    const optHorizontal = document.createElement("option");
    optHorizontal.value = "horizontal";
    optHorizontal.textContent = "横書き";
    const optVertical = document.createElement("option");
    optVertical.value = "vertical";
    optVertical.textContent = "縦書き";
    select.append(optHorizontal, optVertical);
    select.value = initial;
    return select;
  }

  function runOcr(orientation: OcrOrientation): void {
    void store
      .updateOcrState(capture.id, { ocrStatus: "pending", ocrOrientation: orientation })
      .then((updated) => {
        Object.assign(capture, updated);
        ocrQueue.enqueue(capture.id);
        renderState();
      });
  }

  function renderState(): void {
    actions.replaceChildren();
    const orientation = capture.ocrOrientation ?? "horizontal";

    if (!capture.ocrStatus) {
      status.textContent = "";
      const orientationSelect = buildOrientationSelect(orientation);
      const runBtn = document.createElement("button");
      runBtn.type = "button";
      runBtn.dataset.ocrRun = "true";
      runBtn.textContent = "文字を読み取る";
      runBtn.addEventListener("click", () => runOcr(orientationSelect.value as OcrOrientation));
      actions.append(orientationSelect, runBtn);
      return;
    }

    if (capture.ocrStatus === "pending") {
      status.textContent = "読み取り待ち…";
      return;
    }

    if (capture.ocrStatus === "processing") {
      status.textContent = "読み取り中…";
      return;
    }

    if (capture.ocrStatus === "failed") {
      status.textContent = capture.ocrError ?? "読み取りに失敗しました。";
      const orientationSelect = buildOrientationSelect(orientation);
      const retryBtn = document.createElement("button");
      retryBtn.type = "button";
      retryBtn.dataset.ocrRetry = "true";
      retryBtn.textContent = "もう一度読み取る";
      retryBtn.addEventListener("click", () => runOcr(orientationSelect.value as OcrOrientation));
      actions.append(orientationSelect, retryBtn);
      return;
    }

    // ocrStatus === "done"
    if (!capture.ocrCandidateText) {
      status.textContent = "文字を読み取れませんでした。傾きや明るさを変えて撮り直すか、手入力してください。";
      const orientationSelect = buildOrientationSelect(orientation);
      const retryBtn = document.createElement("button");
      retryBtn.type = "button";
      retryBtn.dataset.ocrRetry = "true";
      retryBtn.textContent = "もう一度読み取る";
      retryBtn.addEventListener("click", () => runOcr(orientationSelect.value as OcrOrientation));
      actions.append(orientationSelect, retryBtn);
      return;
    }

    status.textContent = "読み取り候補があります。元の写真と見比べてから使ってください。";
    if (photoDetails) photoDetails.open = true;

    const candidateBox = document.createElement("p");
    candidateBox.dataset.ocrCandidateText = "true";
    candidateBox.textContent = capture.ocrCandidateText;
    actions.append(candidateBox);

    const useExcerptBtn = document.createElement("button");
    useExcerptBtn.type = "button";
    useExcerptBtn.dataset.ocrUseExcerpt = "true";
    useExcerptBtn.textContent = "この内容を抜粋に使う";
    useExcerptBtn.addEventListener("click", () => {
      void (async () => {
        const candidate = capture.ocrCandidateText ?? "";
        if (excerptInput.value.trim() !== "" && excerptInput.value !== candidate) {
          const proceed = window.confirm("既存の抜粋を読み取り結果で置き換えますか?");
          if (!proceed) return;
        }
        excerptInput.value = candidate;
        await persistExcerpt(candidate);
        status.textContent = "抜粋欄に反映し、保存しました。";
      })();
    });
    actions.append(useExcerptBtn);

    if (capture.ocrCandidatePage) {
      const pageRow = document.createElement("div");
      pageRow.dataset.ocrPageCandidate = "true";
      const pageLabel = document.createElement("span");
      const pageValue = document.createElement("strong");
      pageValue.textContent = capture.ocrCandidatePage;
      pageLabel.append("ページ番号の候補: ", pageValue);
      pageRow.append(pageLabel);
      const usePageBtn = document.createElement("button");
      usePageBtn.type = "button";
      usePageBtn.dataset.ocrPageUse = "true";
      usePageBtn.textContent = "ページ欄に使う";
      usePageBtn.addEventListener("click", () => {
        void (async () => {
          pageInput.value = capture.ocrCandidatePage ?? "";
          await persistPage(pageInput.value);
          pageRow.hidden = true;
        })();
      });
      pageRow.append(usePageBtn);
      actions.append(pageRow);
    }

    const orientationSelect = buildOrientationSelect(orientation);
    const retryBtn = document.createElement("button");
    retryBtn.type = "button";
    retryBtn.dataset.ocrRetry = "true";
    retryBtn.textContent = "この向きで読み取り直す";
    retryBtn.addEventListener("click", () => runOcr(orientationSelect.value as OcrOrientation));
    actions.append(orientationSelect, retryBtn);
  }

  renderState();
  return wrap;
}

/**
 * OCRキューの進行通知を受けて、表示中の記録一覧のうち該当する
 * カードだけを最新の状態で作り直す(全体を再描画しない)。
 */
async function refreshEntryCardOcr(captureId: string): Promise<void> {
  const block = entryList.querySelector<HTMLElement>(`[data-ocr-block][data-ocr-capture-id="${captureId}"]`);
  if (!block) return;
  const card = block.closest<HTMLElement>("[data-entry-card]");
  if (!card) return;
  const fresh = await store.getCapture(captureId);
  if (!fresh) return;
  const newCard = await buildEntryCard(fresh);
  card.replaceWith(newCard);
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

  let photoDetails: HTMLDetailsElement | null = null;
  if (kind === "photo" && capture.image) {
    const url = URL.createObjectURL(capture.image);
    captureObjectUrls.push(url);
    photoDetails = document.createElement("details");
    photoDetails.dataset.entryPhoto = "true";
    const summary = document.createElement("summary");
    summary.textContent = "元の写真を見る";
    photoDetails.append(summary);
    const img = document.createElement("img");
    img.src = url;
    img.alt = "撮影したページ";
    img.loading = "lazy";
    photoDetails.append(img);
    card.append(photoDetails);
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

  /** 抜粋欄のblur保存・OCR候補の「使う」ボタンの両方から呼ぶ、唯一の保存経路。 */
  async function persistExcerpt(value: string): Promise<void> {
    const updated = await store.updateCapture(capture.id, { excerptText: value });
    capture.excerptText = updated.excerptText;
  }

  /** ページ欄のblur保存・OCR候補の「ページ欄に使う」ボタンの両方から呼ぶ、唯一の保存経路。 */
  async function persistPage(value: string): Promise<void> {
    const updated = await store.updateCapture(capture.id, { pageLabel: value });
    capture.pageLabel = updated.pageLabel;
  }

  const excerptInput = document.createElement("textarea");
  excerptInput.dataset.entryExcerpt = "true";
  excerptInput.setAttribute("aria-label", "抜粋・自分の考え");
  excerptInput.placeholder = "抜粋・自分の考え";
  excerptInput.rows = 3;
  excerptInput.value = capture.excerptText ?? "";
  excerptInput.addEventListener("blur", () => {
    void persistExcerpt(excerptInput.value);
  });

  const pageInput = document.createElement("input");
  pageInput.type = "text";
  pageInput.dataset.entryPage = "true";
  pageInput.setAttribute("aria-label", "ページ・位置");
  pageInput.placeholder = "ページ・位置(任意)";
  pageInput.value = capture.pageLabel ?? "";
  pageInput.addEventListener("blur", () => {
    void persistPage(pageInput.value);
  });

  if (kind === "photo" && capture.image) {
    card.append(buildOcrBlock(capture, excerptInput, pageInput, photoDetails, persistExcerpt, persistPage));
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

/** フォームの現在の内容から、公開用データの形(サーバーへ送る形と同じ)を組み立てる。 */
function buildPublishDraft(): ReadingNoteDraft | null {
  if (!publishSession?.bookId || !publishCapture) return null;
  const reflection = publishReflection.value.trim();
  const includeQuote = publishQuoteToggle.checked;
  const quote = includeQuote ? publishQuote.value.trim() : "";
  const quoteLocation = includeQuote ? publishCapture.pageLabel || publishSession.bookLocation || "" : "";

  const relatedRecords = Array.from(
    publishRelatedList.querySelectorAll<HTMLInputElement>("[data-publish-related-checkbox]"),
  )
    .filter((checkbox) => checkbox.checked)
    .map((checkbox) => publishCapture!.relatedLinks![Number(checkbox.dataset.publishRelatedCheckbox)]);

  const draft: ReadingNoteDraft = {
    bookId: publishSession.bookId,
    authorReflection: reflection,
  };
  if (quote) {
    draft.quote = quote;
    if (quoteLocation) draft.quoteLocation = quoteLocation;
  }
  if (relatedRecords.length > 0) {
    draft.relatedRecords = relatedRecords;
  }
  return draft;
}

function updatePublishOutput(): void {
  const draft = buildPublishDraft();
  if (!draft) {
    publishOutput.textContent = "";
    return;
  }
  const note = { id: "REPLACE-ME", ...draft, publishedAt: new Date().toISOString().slice(0, 10) };
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
  publishAdminStatus.textContent = "";
  renderAdminAuthState();
  void renderExistingNotesForBook();
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

// ----------------------------------------------------------------------
// 本人限定の公開機能(2026-09-20、Decision Log 0189)。
// サーバー側(Cloudflare Worker + D1)のsecret設定が完了していない
// 環境では、ログイン自体がfail closedで失敗する。その場合はエラーを
// 捕捉して案内を出し、下にある「この内容をコピーする」(手動反映)へ
// 誘導する。
// ----------------------------------------------------------------------
let adminSession: AdminSession | null = null;

function renderAdminAuthState(): void {
  const loggedIn = adminSession !== null;
  publishLoginBlock.hidden = loggedIn;
  publishAuthedBlock.hidden = !loggedIn;
  if (loggedIn && adminSession) {
    const expires = new Date(adminSession.expiresAt);
    publishSessionStatus.textContent = `ログイン中(有効期限: ${expires.toLocaleString("ja-JP")})`;
  }
}

async function renderExistingNotesForBook(): Promise<void> {
  publishExistingNotes.replaceChildren();
  if (!publishSession?.bookId) return;

  let notes: PublishedNoteRecord[];
  try {
    notes = await fetchPublishedNotes(publishSession.bookId);
  } catch {
    // GETは認証不要のため、失敗はサーバー未配線・通信不可を意味する。
    // ここでは静かに諦める(ログインボタン側のエラー表示に任せる)。
    return;
  }

  if (notes.length === 0) {
    const empty = document.createElement("p");
    empty.dataset.publishExistingEmpty = "true";
    empty.textContent = "この本の公開メモはまだありません。";
    publishExistingNotes.append(empty);
    return;
  }

  const heading = document.createElement("p");
  heading.dataset.fieldHeading = "true";
  heading.textContent = "この本の公開済みメモ(いまの内容で更新・取り下げできます)";
  publishExistingNotes.append(heading);

  notes.forEach((note) => {
    const row = document.createElement("div");
    row.dataset.publishExistingRow = "true";

    const preview = document.createElement("p");
    preview.textContent = `${note.publishedAt} ${note.authorReflection.slice(0, 40)}${note.authorReflection.length > 40 ? "…" : ""}`;
    row.append(preview);

    const updateBtn = document.createElement("button");
    updateBtn.type = "button";
    updateBtn.textContent = "この内容で更新する";
    updateBtn.addEventListener("click", () => void handleUpdateExisting(note));
    row.append(updateBtn);

    const retractBtn = document.createElement("button");
    retractBtn.type = "button";
    retractBtn.textContent = "取り下げる";
    retractBtn.addEventListener("click", () => void handleRetractExisting(note));
    row.append(retractBtn);

    publishExistingNotes.append(row);
  });
}

async function refreshAdminSection(): Promise<void> {
  renderAdminAuthState();
  await renderExistingNotesForBook();
}

async function handleAdminLoginClick(): Promise<void> {
  const password = publishAdminPassword.value;
  if (!password) {
    publishAdminStatus.textContent = "パスワードを入力してください。";
    return;
  }
  publishLoginBtn.disabled = true;
  publishAdminStatus.textContent = "ログイン中…";
  try {
    adminSession = await adminLogin(password);
    publishAdminPassword.value = "";
    publishAdminStatus.textContent = "";
    await refreshAdminSection();
  } catch (error) {
    if (error instanceof PublishApiError && error.status === 401) {
      publishAdminStatus.textContent = "パスワードが違います。";
    } else if (error instanceof PublishApiError && error.status === 429) {
      publishAdminStatus.textContent = "試行回数が多すぎます。しばらく待ってから試してください。";
    } else if (error instanceof PublishApiError && error.status === 500) {
      publishAdminStatus.textContent =
        "サーバー側の設定が未完了です(本番未配線)。下の「この内容をコピーする」で手動反映してください。";
    } else {
      publishAdminStatus.textContent =
        "通信できませんでした。この環境ではAPIが使えない可能性があります。下の「この内容をコピーする」で手動反映してください。";
    }
  } finally {
    publishLoginBtn.disabled = false;
  }
}

async function handleAdminLogoutClick(): Promise<void> {
  if (!adminSession) return;
  await adminLogout(adminSession.csrfToken).catch(() => {});
  adminSession = null;
  publishAdminStatus.textContent = "ログアウトしました。";
  renderAdminAuthState();
}

async function handlePublishSubmit(): Promise<void> {
  if (!adminSession) {
    publishAdminStatus.textContent = "ログインしてください。";
    return;
  }
  const draft = buildPublishDraft();
  if (!draft) {
    publishAdminStatus.textContent = "本が選ばれていない記録は公開できません(本棚に紐づく記録のみ対象です)。";
    return;
  }
  if (!draft.authorReflection) {
    publishAdminStatus.textContent = "「自分の考え」を入力してください。";
    return;
  }
  publishSubmitBtn.disabled = true;
  publishAdminStatus.textContent = "公開しています…";
  try {
    await publishNote(adminSession.csrfToken, draft);
    publishAdminStatus.textContent = "公開しました。本棚に反映されています。";
    await renderExistingNotesForBook();
  } catch (error) {
    publishAdminStatus.textContent =
      error instanceof PublishApiError ? `公開に失敗しました: ${error.message}` : "公開に失敗しました(通信エラー)。";
  } finally {
    publishSubmitBtn.disabled = false;
  }
}

async function handleUpdateExisting(note: PublishedNoteRecord): Promise<void> {
  if (!adminSession) {
    publishAdminStatus.textContent = "ログインしてください。";
    return;
  }
  const draft = buildPublishDraft();
  if (!draft) return;
  publishAdminStatus.textContent = "更新しています…";
  try {
    await updateNote(adminSession.csrfToken, note.id, draft, note.updatedAt);
    publishAdminStatus.textContent = "更新しました。";
    await renderExistingNotesForBook();
  } catch (error) {
    if (error instanceof PublishApiError && error.status === 409) {
      publishAdminStatus.textContent = "他の場所で先に更新されていました。一覧を読み込み直しました。";
      await renderExistingNotesForBook();
    } else {
      publishAdminStatus.textContent =
        error instanceof PublishApiError ? `更新に失敗しました: ${error.message}` : "更新に失敗しました(通信エラー)。";
    }
  }
}

async function handleRetractExisting(note: PublishedNoteRecord): Promise<void> {
  if (!adminSession) {
    publishAdminStatus.textContent = "ログインしてください。";
    return;
  }
  const proceed = window.confirm("この公開メモを取り下げますか?本棚から表示されなくなります。");
  if (!proceed) return;
  publishAdminStatus.textContent = "取り下げています…";
  try {
    await retractNote(adminSession.csrfToken, note.id, note.updatedAt);
    publishAdminStatus.textContent = "取り下げました。";
    await renderExistingNotesForBook();
  } catch (error) {
    if (error instanceof PublishApiError && error.status === 409) {
      publishAdminStatus.textContent = "他の場所で先に更新されていました。一覧を読み込み直しました。";
      await renderExistingNotesForBook();
    } else {
      publishAdminStatus.textContent =
        error instanceof PublishApiError ? `取り下げに失敗しました: ${error.message}` : "取り下げに失敗しました(通信エラー)。";
    }
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
  sessionOcrOrientation = ocrOrientationSelect.value === "vertical" ? "vertical" : "horizontal";
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

publishLoginBtn.addEventListener("click", () => {
  void handleAdminLoginClick();
});
publishLogoutBtn.addEventListener("click", () => {
  void handleAdminLogoutClick();
});
publishSubmitBtn.addEventListener("click", () => {
  void handlePublishSubmit();
});

// ページ読み込み時、有効なセッションCookieが残っていればパスワード再
// 入力なしで復元する(公開プレビューを開く前でも構わない、非同期に
// 裏で確認するだけ)。
void recoverAdminSession().then((session) => {
  if (session) {
    adminSession = session;
    renderAdminAuthState();
  }
});

// OCRキューの進行通知。カメラ画面の「読み取り待ち」件数を更新し、
// 記録一覧が表示中ならその記録のカードだけを最新化する
// (2026-09-20、Decision Log 0192)。
ocrQueue.onEvent((event: OcrQueueEvent) => {
  if (event.status === "done" || event.status === "failed") {
    pendingOcrIdsThisSession.delete(event.captureId);
    updateOcrPendingIndicator();
  }
  void refreshEntryCardOcr(event.captureId);
});

// 前回タブを閉じた・再読み込みした時点で終わっていなかったOCRを
// 再開する(処理中のまま止まっていた記録も、最初からやり直す)。
void ocrQueue.resumeUnfinished();

exportBtn.addEventListener("click", () => {
  void handleExport();
});

importFileInput.addEventListener("change", () => {
  void handleImport();
});
