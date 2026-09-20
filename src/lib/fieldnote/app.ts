/**
 * app.ts
 * ------------------------------------------------------------
 * Fieldnote Reading のクライアント側エントリーポイント。
 * src/pages/fieldnote/index.astro から <script src="..."> で読み込む
 * (src/pages配下の.tsはAstroにサーバーエンドポイントとして扱われて
 * しまうため、ここ(src/lib/)に置く)。
 * 画面遷移(タイトル入力 → カメラ → 一覧 → 過去の記録)とDOMの配線
 * だけを担う。保存はFieldnoteStore、カメラ制御はFieldnoteCameraに
 * 委譲し、このファイルは「何を」ではなく「いつ呼ぶか」だけを知って
 * いる(2026-09-02, Decision Log 0066)。
 *
 * このページはフレームワークを使わない1枚のstatic pageのため、
 * 「コンポーネントのunmount」に相当するライフサイクルは存在しない。
 * 代わりにpagehide(ページ離脱・タブを閉じる・bfcache行き)を
 * カメラを止めるべきタイミングとして扱う
 * (2026-09-02, PRセルフレビューで追加)。
 *
 * 【本棚との紐づけ・過去の記録一覧を追加(2026-09-20、Decision Log
 * 0185)】本棚のcanonical data(`src/data/bookshelf.ts`)をこの
 * ファイルでも参照する(別の手書きリストを作らない)。IDによる
 * 引き当てだけに使い、本棚データを書き換えることはない。
 * ------------------------------------------------------------
 */
import { IndexedDbFieldnoteStore } from "./indexedDbStore";
import { FieldnoteCamera, FieldnoteCameraError } from "./camera";
import { books } from "../../data/bookshelf";
import type { FieldnoteCapture, FieldnoteSession } from "../../types/fieldnote";

const store = new IndexedDbFieldnoteStore();
const camera = new FieldnoteCamera();
const bookById = new Map(books.map((book) => [book.id, book]));

let currentSession: FieldnoteSession | null = null;
let shotCount = 0;
const captureObjectUrls: string[] = [];

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

const setupForm = byId<HTMLFormElement>("setup-form");
const titleInput = byId<HTMLInputElement>("book-title-input");
const bookSelect = byId<HTMLSelectElement>("book-select");
const bookLocationField = byId<HTMLElement>("book-location-field");
const bookLocationInput = byId<HTMLInputElement>("book-location-input");
const setupErrorEl = byId<HTMLElement>("setup-error");
const openHistoryBtn = byId<HTMLButtonElement>("open-history-btn");

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
const captureGrid = byId<HTMLElement>("capture-grid");
const startNewSessionBtn = byId<HTMLButtonElement>("start-new-session-btn");
const listOpenHistoryBtn = byId<HTMLButtonElement>("list-open-history-btn");

const historyBookFilter = byId<HTMLSelectElement>("history-book-filter");
const historyList = byId<HTMLElement>("history-list");
const historyBackBtn = byId<HTMLButtonElement>("history-back-btn");

function showView(name: "setup" | "camera" | "list" | "history"): void {
  setupView.hidden = name !== "setup";
  cameraView.hidden = name !== "camera";
  listView.hidden = name !== "list";
  historyView.hidden = name !== "history";
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
}

async function startSession(title: string, bookId: string, bookLocation: string): Promise<void> {
  clearSetupError();

  let session: FieldnoteSession;
  try {
    session = await store.createSession(title, bookId || undefined, bookLocation || undefined);
  } catch {
    // IndexedDBが使えない(プライベートブラウジングの制限等)場合も、
    // 無反応のまま止まらせず、タイトル入力画面にとどめてエラーを示す。
    showSetupError("保存先を初期化できませんでした。ブラウザの設定をご確認のうえ、もう一度お試しください。");
    return;
  }

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
function renderSessionBookLink(session: FieldnoteSession): void {
  if (!session.bookId) {
    listBookLink.hidden = true;
    listBookLink.disabled = false;
    listBookLink.onclick = null;
    return;
  }

  const book = bookById.get(session.bookId);
  listBookLink.hidden = false;

  if (!book) {
    listBookLink.textContent = "本の情報を確認できません";
    listBookLink.disabled = true;
    listBookLink.onclick = null;
    return;
  }

  const locationSuffix = session.bookLocation ? `・${session.bookLocation}` : "";
  listBookLink.textContent = `この本の記録: ${book.title}${locationSuffix} →`;
  listBookLink.disabled = false;
  const bookId = session.bookId;
  listBookLink.onclick = () => {
    void renderHistory(bookId).then(() => showView("history"));
  };
}

function renderCaptureList(session: FieldnoteSession, captures: FieldnoteCapture[]): void {
  captureObjectUrls.forEach((url) => URL.revokeObjectURL(url));
  captureObjectUrls.length = 0;
  captureGrid.replaceChildren();

  listTitle.textContent = session.title || "(無題)";
  listMeta.textContent = `${captures.length}枚を撮影しました`;
  renderSessionBookLink(session);

  if (captures.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "撮影したページはありません。";
    captureGrid.append(empty);
    return;
  }

  for (const capture of captures) {
    const url = URL.createObjectURL(capture.image);
    captureObjectUrls.push(url);
    const img = document.createElement("img");
    img.src = url;
    img.alt = `${session.title || "(無題)"} のページ`;
    img.loading = "lazy";
    captureGrid.append(img);
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
  renderCaptureList(ended, captures);
  showView("list");
}

/** 「過去の記録」から選んだセッションを開く。撮影一覧の取得に失敗した場合も、0枚として表示に留める(履歴自体は閲覧できる状態を保つ)。 */
async function openSessionFromHistory(session: FieldnoteSession): Promise<void> {
  let captures: FieldnoteCapture[];
  try {
    captures = await store.listCaptures(session.id);
  } catch {
    captures = [];
  }
  renderCaptureList(session, captures);
  showView("list");
}

function formatSessionDate(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}

/**
 * 「過去の記録」一覧を描画する。`filterBookId`が空文字なら全件、
 * 指定があればそのbookIdのセッションだけに絞り込む(2026-09-20、
 * Decision Log 0185)。CSS Modulesのハッシュ化されたクラス名を
 * ここから参照しないよう、動的に作る要素にはdata属性だけを付け、
 * スタイルは`#history-list`配下のセレクタで当てる。
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

function openHistory(filterBookId: string): void {
  void renderHistory(filterBookId).then(() => showView("history"));
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
  void startSession(title, bookId, bookLocationInput.value);
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
  openHistory("");
});

listOpenHistoryBtn.addEventListener("click", () => {
  openHistory("");
});

historyBookFilter.addEventListener("change", () => {
  void renderHistory(historyBookFilter.value);
});

historyBackBtn.addEventListener("click", () => {
  showView("setup");
});
