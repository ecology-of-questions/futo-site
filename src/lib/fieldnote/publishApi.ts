/**
 * publishApi.ts
 * ------------------------------------------------------------
 * `worker/index.ts`の`/api/admin/*`・`/api/reading-notes*`を呼ぶ、
 * 本人限定の公開機能のクライアント側(2026-09-20、Decision Log 0189)。
 *
 * 【本番未配線でも壊れない設計】このAPIはCloudflare Worker側の
 * secret設定(ADMIN_PASSWORD_HASH等)が終わっていないと動かない
 * (fail closed、サーバー側が500を返す)。設定が終わっていない環境
 * (このリポジトリの開発中や、secret未設定のデプロイ直後)でも、
 * 呼び出し側(`app.ts`)はエラーを捕捉して「サーバー側の設定が
 * 未完了です」という状態を示し、既存のコピー&ペーストによる手動反映
 * (`src/data/publicReadingNotes.ts`への追記)を引き続き使えるように
 * フォールバックする。詳細はDecision Log 0189参照。
 * ------------------------------------------------------------
 */

export interface AdminSession {
  csrfToken: string;
  expiresAt: string;
}

export interface PublishedNoteRecord {
  id: string;
  bookId: string;
  authorReflection: string;
  publishedAt: string;
  updatedAt: string;
  quote?: string;
  quoteLocation?: string;
  relatedRecords?: { label: string; href: string }[];
}

export interface ReadingNoteDraft {
  bookId: string;
  authorReflection: string;
  quote?: string;
  quoteLocation?: string;
  relatedRecords?: { label: string; href: string }[];
}

class PublishApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function parseJsonOrThrow<T>(response: Response): Promise<T> {
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    // 本文がJSONでない(サーバー未配線・ネットワーク層のエラーページ等)
  }
  if (!response.ok) {
    const message =
      body && typeof body === "object" && "error" in body && typeof (body as { error: unknown }).error === "string"
        ? (body as { error: string }).error
        : `HTTP ${response.status}`;
    throw new PublishApiError(message, response.status);
  }
  return body as T;
}

export async function adminLogin(password: string): Promise<AdminSession> {
  const response = await fetch("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  return parseJsonOrThrow<AdminSession>(response);
}

export async function adminLogout(csrfToken: string): Promise<void> {
  await fetch("/api/admin/logout", {
    method: "POST",
    headers: { "X-CSRF-Token": csrfToken },
  });
}

/** 有効なセッションCookieがあれば、再ログインなしでCSRFトークンを復元する。 */
export async function recoverAdminSession(): Promise<AdminSession | null> {
  try {
    const response = await fetch("/api/admin/session");
    if (!response.ok) return null;
    return (await response.json()) as AdminSession;
  } catch {
    return null;
  }
}

export async function fetchPublishedNotes(bookId: string): Promise<PublishedNoteRecord[]> {
  const response = await fetch(`/api/reading-notes?bookId=${encodeURIComponent(bookId)}`);
  const data = await parseJsonOrThrow<{ notes: PublishedNoteRecord[] }>(response);
  return data.notes;
}

export async function publishNote(csrfToken: string, draft: ReadingNoteDraft): Promise<PublishedNoteRecord> {
  const response = await fetch("/api/reading-notes", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
    body: JSON.stringify(draft),
  });
  const data = await parseJsonOrThrow<{ note: PublishedNoteRecord }>(response);
  return data.note;
}

export async function updateNote(
  csrfToken: string,
  id: string,
  draft: ReadingNoteDraft,
  expectedUpdatedAt: string,
): Promise<PublishedNoteRecord> {
  const response = await fetch(`/api/reading-notes/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
    body: JSON.stringify({ ...draft, expectedUpdatedAt }),
  });
  const data = await parseJsonOrThrow<{ note: PublishedNoteRecord }>(response);
  return data.note;
}

export async function retractNote(csrfToken: string, id: string, expectedUpdatedAt: string): Promise<void> {
  const response = await fetch(`/api/reading-notes/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
    body: JSON.stringify({ expectedUpdatedAt }),
  });
  await parseJsonOrThrow<{ ok: true }>(response);
}

export { PublishApiError };
