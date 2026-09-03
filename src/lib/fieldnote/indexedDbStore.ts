/**
 * indexedDbStore.ts
 * ------------------------------------------------------------
 * FieldnoteStoreの端末内実装(IndexedDB)。
 * セッション情報(sessions)と撮影画像(captures、Blobを直接保存)を
 * 別々のobject storeに分け、sessionIdで引けるようにする。
 * ------------------------------------------------------------
 */
import type { FieldnoteStore } from "./store";
import type { FieldnoteCapture, FieldnoteSession } from "../../types/fieldnote";

const DB_NAME = "futo-fieldnote";
const DB_VERSION = 1;
const SESSIONS_STORE = "sessions";
const CAPTURES_STORE = "captures";
const SESSION_ID_INDEX = "sessionId";

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

export class IndexedDbFieldnoteStore implements FieldnoteStore {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private db(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = openDb();
    }
    return this.dbPromise;
  }

  async createSession(title: string): Promise<FieldnoteSession> {
    const session: FieldnoteSession = {
      id: crypto.randomUUID(),
      title: title.trim(),
      startedAt: Date.now(),
      endedAt: null,
    };
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
      image,
    };
    const db = await this.db();
    const tx = db.transaction(CAPTURES_STORE, "readwrite");
    await requestToPromise(tx.objectStore(CAPTURES_STORE).add(capture));
    return capture;
  }

  async listCaptures(sessionId: string): Promise<FieldnoteCapture[]> {
    const db = await this.db();
    const tx = db.transaction(CAPTURES_STORE, "readonly");
    const index = tx.objectStore(CAPTURES_STORE).index(SESSION_ID_INDEX);
    const results = await requestToPromise(index.getAll(sessionId));
    return (results as FieldnoteCapture[]).sort((a, b) => a.createdAt - b.createdAt);
  }
}
