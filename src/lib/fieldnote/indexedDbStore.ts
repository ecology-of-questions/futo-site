/**
 * indexedDbStore.ts
 * ------------------------------------------------------------
 * FieldnoteStoreの端末内実装(IndexedDB)。
 * セッション情報(sessions)と撮影画像(captures、Blobを直接保存)を
 * 別々のobject storeに分け、sessionIdで引けるようにする。
 *
 * 【本棚との紐づけ・過去のセッション一覧を追加(2026-09-20、Decision
 * Log 0185)】sessionsのobject store自体(keyPath: "id")は変更して
 * いない。bookId/bookLocationは既存レコードには存在しない任意
 * フィールドとして書き込むだけなので、DB_VERSIONを上げる必要は
 * ない。`listSessions`もgetAll()を使うだけで新しいindexは作って
 * いない(端末1台・個人利用規模のデータ量であればフルスキャンで十分)。
 *
 * 【抜粋・コメント・まとめ・バックアップを追加(2026-09-20、Decision
 * Log 0187)】`comments`/`collections`という新しいobject storeを
 * 追加するため、DB_VERSIONを1→2に上げた。既存の`sessions`/`captures`
 * ストアはそのまま(onupgradeneededは`contains`チェック付きで新規
 * ストアだけを追加する、既存データは一切触らない)。`captures`の
 * 新フィールド(kind/excerptText/pageLabel/url/urlTitle/relatedLinks)は
 * 既存レコードに存在しない任意フィールドとして扱い、読み込み側で
 * `kind`未設定を"photo"とみなす(下位互換)。
 * ------------------------------------------------------------
 */
import type {
  FieldnoteStore,
  FieldnoteCaptureUpdate,
  FieldnoteOcrStateUpdate,
  FieldnoteExportBundle,
  FieldnoteImportResult,
} from "./store";
import type { FieldnoteCapture, FieldnoteCollection, FieldnoteComment, FieldnoteSession } from "../../types/fieldnote";

const DB_NAME = "futo-fieldnote";
const DB_VERSION = 2;
const SESSIONS_STORE = "sessions";
const CAPTURES_STORE = "captures";
const COMMENTS_STORE = "comments";
const COLLECTIONS_STORE = "collections";
const SESSION_ID_INDEX = "sessionId";
const CAPTURE_ID_INDEX = "captureId";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(SESSIONS_STORE)) {
        db.createObjectStore(SESSIONS_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(CAPTURES_STORE)) {
        const captures = db.createObjectStore(CAPTURES_STORE, { keyPath: "id" });
        captures.createIndex(SESSION_ID_INDEX, "sessionId", { unique: false });
      }
      if (!db.objectStoreNames.contains(COMMENTS_STORE)) {
        const comments = db.createObjectStore(COMMENTS_STORE, { keyPath: "id" });
        comments.createIndex(CAPTURE_ID_INDEX, "captureId", { unique: false });
      }
      if (!db.objectStoreNames.contains(COLLECTIONS_STORE)) {
        db.createObjectStore(COLLECTIONS_STORE, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // "data:image/jpeg;base64,xxxx" のうちbase64部分だけを使う
      const result = reader.result as string;
      const commaIndex = result.indexOf(",");
      resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function base64ToBlob(base64: string, type: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type });
}

export class IndexedDbFieldnoteStore implements FieldnoteStore {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private db(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = openDb();
    }
    return this.dbPromise;
  }

  async createSession(title: string, bookId?: string, bookLocation?: string): Promise<FieldnoteSession> {
    const session: FieldnoteSession = {
      id: crypto.randomUUID(),
      title: title.trim(),
      startedAt: Date.now(),
      endedAt: null,
    };
    if (bookId) {
      session.bookId = bookId;
      const trimmedLocation = bookLocation?.trim();
      if (trimmedLocation) session.bookLocation = trimmedLocation;
    }
    const db = await this.db();
    const tx = db.transaction(SESSIONS_STORE, "readwrite");
    await requestToPromise(tx.objectStore(SESSIONS_STORE).add(session));
    return session;
  }

  async endSession(sessionId: string): Promise<FieldnoteSession> {
    const db = await this.db();
    const readTx = db.transaction(SESSIONS_STORE, "readonly");
    const session = await requestToPromise<FieldnoteSession | undefined>(
      readTx.objectStore(SESSIONS_STORE).get(sessionId),
    );
    if (!session) {
      throw new Error(`セッションが見つかりません: ${sessionId}`);
    }

    const updated: FieldnoteSession = { ...session, endedAt: Date.now() };
    const writeTx = db.transaction(SESSIONS_STORE, "readwrite");
    await requestToPromise(writeTx.objectStore(SESSIONS_STORE).put(updated));
    return updated;
  }

  async addCapture(sessionId: string, image: Blob): Promise<FieldnoteCapture> {
    const capture: FieldnoteCapture = {
      id: crypto.randomUUID(),
      sessionId,
      createdAt: Date.now(),
      kind: "photo",
      image,
    };
    const db = await this.db();
    const tx = db.transaction(CAPTURES_STORE, "readwrite");
    await requestToPromise(tx.objectStore(CAPTURES_STORE).add(capture));
    return capture;
  }

  async addTextEntry(sessionId: string, excerptText: string): Promise<FieldnoteCapture> {
    const capture: FieldnoteCapture = {
      id: crypto.randomUUID(),
      sessionId,
      createdAt: Date.now(),
      kind: "text",
      excerptText: excerptText.trim(),
    };
    const db = await this.db();
    const tx = db.transaction(CAPTURES_STORE, "readwrite");
    await requestToPromise(tx.objectStore(CAPTURES_STORE).add(capture));
    return capture;
  }

  async addUrlEntry(sessionId: string, url: string, urlTitle?: string): Promise<FieldnoteCapture> {
    const capture: FieldnoteCapture = {
      id: crypto.randomUUID(),
      sessionId,
      createdAt: Date.now(),
      kind: "url",
      url: url.trim(),
      ...(urlTitle?.trim() ? { urlTitle: urlTitle.trim() } : {}),
    };
    const db = await this.db();
    const tx = db.transaction(CAPTURES_STORE, "readwrite");
    await requestToPromise(tx.objectStore(CAPTURES_STORE).add(capture));
    return capture;
  }

  async updateCapture(captureId: string, patch: FieldnoteCaptureUpdate): Promise<FieldnoteCapture> {
    const db = await this.db();
    const readTx = db.transaction(CAPTURES_STORE, "readonly");
    const capture = await requestToPromise<FieldnoteCapture | undefined>(
      readTx.objectStore(CAPTURES_STORE).get(captureId),
    );
    if (!capture) {
      throw new Error(`記録が見つかりません: ${captureId}`);
    }
    const updated: FieldnoteCapture = { ...capture };
    if (patch.excerptText !== undefined) updated.excerptText = patch.excerptText;
    if (patch.pageLabel !== undefined) updated.pageLabel = patch.pageLabel;
    if (patch.relatedLinks !== undefined) updated.relatedLinks = patch.relatedLinks;

    const writeTx = db.transaction(CAPTURES_STORE, "readwrite");
    await requestToPromise(writeTx.objectStore(CAPTURES_STORE).put(updated));
    return updated;
  }

  async updateOcrState(captureId: string, patch: FieldnoteOcrStateUpdate): Promise<FieldnoteCapture> {
    const db = await this.db();
    const readTx = db.transaction(CAPTURES_STORE, "readonly");
    const capture = await requestToPromise<FieldnoteCapture | undefined>(
      readTx.objectStore(CAPTURES_STORE).get(captureId),
    );
    if (!capture) {
      throw new Error(`記録が見つかりません: ${captureId}`);
    }
    const updated: FieldnoteCapture = { ...capture };
    if (patch.ocrStatus !== undefined) updated.ocrStatus = patch.ocrStatus;
    updated.ocrOrientation = patch.ocrOrientation;
    updated.ocrCropRect = patch.ocrCropRect;
    updated.ocrCandidateText = patch.ocrCandidateText;
    updated.ocrCandidatePage = patch.ocrCandidatePage;
    updated.ocrError = patch.ocrError;

    const writeTx = db.transaction(CAPTURES_STORE, "readwrite");
    await requestToPromise(writeTx.objectStore(CAPTURES_STORE).put(updated));
    return updated;
  }

  async getCapture(captureId: string): Promise<FieldnoteCapture | undefined> {
    const db = await this.db();
    const tx = db.transaction(CAPTURES_STORE, "readonly");
    return requestToPromise<FieldnoteCapture | undefined>(tx.objectStore(CAPTURES_STORE).get(captureId));
  }

  async listCaptures(sessionId: string): Promise<FieldnoteCapture[]> {
    const db = await this.db();
    const tx = db.transaction(CAPTURES_STORE, "readonly");
    const index = tx.objectStore(CAPTURES_STORE).index(SESSION_ID_INDEX);
    const results = await requestToPromise(index.getAll(sessionId));
    return (results as FieldnoteCapture[]).sort((a, b) => a.createdAt - b.createdAt);
  }

  async listSessions(): Promise<FieldnoteSession[]> {
    const db = await this.db();
    const tx = db.transaction(SESSIONS_STORE, "readonly");
    const results = await requestToPromise(tx.objectStore(SESSIONS_STORE).getAll());
    return (results as FieldnoteSession[]).sort((a, b) => b.startedAt - a.startedAt);
  }

  async addComment(captureId: string, body: string): Promise<FieldnoteComment> {
    const comment: FieldnoteComment = {
      id: crypto.randomUUID(),
      captureId,
      body: body.trim(),
      createdAt: Date.now(),
    };
    const db = await this.db();
    const tx = db.transaction(COMMENTS_STORE, "readwrite");
    await requestToPromise(tx.objectStore(COMMENTS_STORE).add(comment));
    return comment;
  }

  async updateComment(commentId: string, body: string): Promise<FieldnoteComment> {
    const db = await this.db();
    const readTx = db.transaction(COMMENTS_STORE, "readonly");
    const comment = await requestToPromise<FieldnoteComment | undefined>(
      readTx.objectStore(COMMENTS_STORE).get(commentId),
    );
    if (!comment) {
      throw new Error(`コメントが見つかりません: ${commentId}`);
    }
    const updated: FieldnoteComment = { ...comment, body: body.trim(), updatedAt: Date.now() };
    const writeTx = db.transaction(COMMENTS_STORE, "readwrite");
    await requestToPromise(writeTx.objectStore(COMMENTS_STORE).put(updated));
    return updated;
  }

  async deleteComment(commentId: string): Promise<void> {
    const db = await this.db();
    const tx = db.transaction(COMMENTS_STORE, "readwrite");
    await requestToPromise(tx.objectStore(COMMENTS_STORE).delete(commentId));
  }

  async listComments(captureId: string): Promise<FieldnoteComment[]> {
    const db = await this.db();
    const tx = db.transaction(COMMENTS_STORE, "readonly");
    const index = tx.objectStore(COMMENTS_STORE).index(CAPTURE_ID_INDEX);
    const results = await requestToPromise(index.getAll(captureId));
    return (results as FieldnoteComment[]).sort((a, b) => a.createdAt - b.createdAt);
  }

  async createCollection(title: string, captureIds: string[]): Promise<FieldnoteCollection> {
    const collection: FieldnoteCollection = {
      id: crypto.randomUUID(),
      title: title.trim(),
      captureIds: [...captureIds],
      createdAt: Date.now(),
    };
    const db = await this.db();
    const tx = db.transaction(COLLECTIONS_STORE, "readwrite");
    await requestToPromise(tx.objectStore(COLLECTIONS_STORE).add(collection));
    return collection;
  }

  async updateCollection(
    id: string,
    patch: Partial<Pick<FieldnoteCollection, "title" | "captureIds">>,
  ): Promise<FieldnoteCollection> {
    const db = await this.db();
    const readTx = db.transaction(COLLECTIONS_STORE, "readonly");
    const collection = await requestToPromise<FieldnoteCollection | undefined>(
      readTx.objectStore(COLLECTIONS_STORE).get(id),
    );
    if (!collection) {
      throw new Error(`まとめが見つかりません: ${id}`);
    }
    const updated: FieldnoteCollection = { ...collection, updatedAt: Date.now() };
    if (patch.title !== undefined) updated.title = patch.title.trim();
    if (patch.captureIds !== undefined) updated.captureIds = [...patch.captureIds];

    const writeTx = db.transaction(COLLECTIONS_STORE, "readwrite");
    await requestToPromise(writeTx.objectStore(COLLECTIONS_STORE).put(updated));
    return updated;
  }

  async deleteCollection(id: string): Promise<void> {
    const db = await this.db();
    const tx = db.transaction(COLLECTIONS_STORE, "readwrite");
    await requestToPromise(tx.objectStore(COLLECTIONS_STORE).delete(id));
  }

  async listCollections(): Promise<FieldnoteCollection[]> {
    const db = await this.db();
    const tx = db.transaction(COLLECTIONS_STORE, "readonly");
    const results = await requestToPromise(tx.objectStore(COLLECTIONS_STORE).getAll());
    return (results as FieldnoteCollection[]).sort((a, b) => b.createdAt - a.createdAt);
  }

  async exportAll(): Promise<FieldnoteExportBundle> {
    const db = await this.db();
    const sessions = await requestToPromise<FieldnoteSession[]>(
      db.transaction(SESSIONS_STORE, "readonly").objectStore(SESSIONS_STORE).getAll(),
    );
    const captures = await requestToPromise<FieldnoteCapture[]>(
      db.transaction(CAPTURES_STORE, "readonly").objectStore(CAPTURES_STORE).getAll(),
    );
    const comments = await requestToPromise<FieldnoteComment[]>(
      db.transaction(COMMENTS_STORE, "readonly").objectStore(COMMENTS_STORE).getAll(),
    );
    const collections = await requestToPromise<FieldnoteCollection[]>(
      db.transaction(COLLECTIONS_STORE, "readonly").objectStore(COLLECTIONS_STORE).getAll(),
    );

    const capturesForExport = await Promise.all(
      captures.map(async ({ image, ...rest }) => {
        if (!image) return rest;
        const imageBase64 = await blobToBase64(image);
        return { ...rest, imageBase64, imageType: image.type || "image/jpeg" };
      }),
    );

    return {
      exportedAt: new Date().toISOString(),
      sessions,
      captures: capturesForExport,
      comments,
      collections,
    };
  }

  async importAll(bundle: FieldnoteExportBundle): Promise<FieldnoteImportResult> {
    const db = await this.db();
    const result: FieldnoteImportResult = {
      importedSessions: 0,
      importedCaptures: 0,
      importedComments: 0,
      importedCollections: 0,
      skipped: 0,
    };

    for (const session of bundle.sessions ?? []) {
      const tx = db.transaction(SESSIONS_STORE, "readwrite");
      const existing = await requestToPromise(tx.objectStore(SESSIONS_STORE).get(session.id));
      if (existing) {
        result.skipped += 1;
        continue;
      }
      await requestToPromise(tx.objectStore(SESSIONS_STORE).add(session));
      result.importedSessions += 1;
    }

    for (const { imageBase64, imageType, ...rest } of bundle.captures ?? []) {
      const tx = db.transaction(CAPTURES_STORE, "readwrite");
      const existing = await requestToPromise(tx.objectStore(CAPTURES_STORE).get(rest.id));
      if (existing) {
        result.skipped += 1;
        continue;
      }
      const capture: FieldnoteCapture = imageBase64
        ? { ...rest, image: base64ToBlob(imageBase64, imageType || "image/jpeg") }
        : rest;
      await requestToPromise(tx.objectStore(CAPTURES_STORE).add(capture));
      result.importedCaptures += 1;
    }

    for (const comment of bundle.comments ?? []) {
      const tx = db.transaction(COMMENTS_STORE, "readwrite");
      const existing = await requestToPromise(tx.objectStore(COMMENTS_STORE).get(comment.id));
      if (existing) {
        result.skipped += 1;
        continue;
      }
      await requestToPromise(tx.objectStore(COMMENTS_STORE).add(comment));
      result.importedComments += 1;
    }

    for (const collection of bundle.collections ?? []) {
      const tx = db.transaction(COLLECTIONS_STORE, "readwrite");
      const existing = await requestToPromise(tx.objectStore(COLLECTIONS_STORE).get(collection.id));
      if (existing) {
        result.skipped += 1;
        continue;
      }
      await requestToPromise(tx.objectStore(COLLECTIONS_STORE).add(collection));
      result.importedCollections += 1;
    }

    return result;
  }
}
