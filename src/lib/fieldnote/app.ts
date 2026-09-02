/**
 * app.ts
 * ------------------------------------------------------------
 * Fieldnote Reading のクライアント側エントリーポイント。
 * src/pages/fieldnote/index.astro から <script src="..."> で読み込む
 * (src/pages配下の.tsはAstroにサーバーエンドポイントとして扱われて
 * しまうため、ここ(src/lib/)に置く)。
 * 画面遷移(タイトル入力 → カメラ → 一覧)とDOMの配線だけを担う。
 * 保存はFieldnoteStore、カメラ制御はFieldnoteCameraに委譲し、
 * このファイルは「何を」ではなく「いつ呼ぶか」だけを知っている
 * (2026-09-02, Decision Log 0058)。
 *
 * このページはフレームワークを使わない1枚のstatic pageのため、
 * 「コンポーネントのunmount」に相当するライフサイクルは存在しない。
 * 代わりにpagehide(ページ離脱・タブを閉じる・bfcache行き)を
 * カメラを止めるべきタイミングとして扱う
 * (2026-09-02, PRセルフレビューで追加)。
 * ------------------------------------------------------------
 */
import { IndexedDbFieldnoteStore } from "./indexedDbStore";
import { FieldnoteCamera, FieldnoteCameraError } from "./camera";
import type { FieldnoteCapture, FieldnoteSession } from "../../types/fieldnote";

const store = new IndexedDbFieldnoteStore();
const camera = new FieldnoteCamera();

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

const setupForm = byId<HTMLFormElement>("setup-form");
const titleInput = byId<HTMLInputElement>("book-title-input");
const setupErrorEl = byId<HTMLElement>("setup-error");

const videoEl = byId<HTMLVideoElement>("camera-video");
const captureBtn = byId<HTMLButtonElement>("capture-btn");
const endSessionBtn = byId<HTMLButtonElement>("end-session-btn");
const shotCountEl = byId<HTMLElement>("shot-count");
const cameraErrorEl = byId<HTMLElement>("camera-error");
const sessionTitleLabel = byId<HTMLElement>("session-title-label");
const shutterFlash = byId<HTMLElement>("shutter-flash");

const listTitle = byId<HTMLElement>("list-title");
const listMeta = byId<HTMLElement>("list-meta");
const captureGrid = byId<HTMLElement>("capture-grid");
const startNewSessionBtn = byId<HTMLButtonElement>("start-new-session-btn");

function showView(name: "setup" | "camera" | "list"): void {
  setupView.hidden = name !== "setup";
  cameraView.hidden = name !== "camera";
  listView.hidden = name !== "list";
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

async function startSession(title: string): Promise<void> {
  clearSetupError();

  let session: FieldnoteSession;
  try {
    session = await store.createSession(title);
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

function renderCaptureList(session: FieldnoteSession, captures: FieldnoteCapture[]): void {
  captureObjectUrls.forEach((url) => URL.revokeObjectURL(url));
  captureObjectUrls.length = 0;
  captureGrid.replaceChildren();

  listTitle.textContent = session.title || "(無題)";
  listMeta.textContent = `${captures.length}枚を撮影しました`;

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
  renderCaptureList(ended, captures);
  currentSession = null;
  showView("list");
}

window.addEventListener("pagehide", () => {
  camera.stop();
});

setupForm.addEventListener("submit", (event) => {
  event.preventDefault();
  void startSession(titleInput.value);
});

captureBtn.addEventListener("click", () => {
  void capturePage();
});

endSessionBtn.addEventListener("click", () => {
  void endSession();
});

startNewSessionBtn.addEventListener("click", () => {
  titleInput.value = "";
  showView("setup");
});
