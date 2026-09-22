/**
 * worker/index.ts
 * ------------------------------------------------------------
 * 「実験室」ノート(交換ノート)のAPIを処理するCloudflare Workerの
 * エントリポイント(2026-09-13、Decision Log 0141・0142ではCloudflare
 * Pages Functions前提だったが、実際の本番環境はPagesではなく
 * Custom Domain `futoing.com` を持つCloudflare Worker
 * `futo-site`(Workers Builds連携)だったため、Decision Log 0143で
 * Worker + Workers Static Assets + D1構成へ変更した)。
 *
 * ルーティング:
 * - `/api/notebooks/:slug/entries` (GET/POST) … このWorkerが処理する。
 * - それ以外 … `env.ASSETS`(Workers Static Assets、Astroの`dist/`)へ
 *   フォールバックする。`wrangler.toml`の`assets.run_worker_first`を
 *   `["/api/*"]`に限定しているため、実際には`/api/*`以外のリクエストは
 *   Cloudflare側のルーティングの時点でこのWorkerを経由せず直接assetsへ
 *   配信される(このWorkerの`fetch`は基本的に`/api/*`のみを受け取る)。
 *   下記のASSETSフォールバックは、それでも到達した場合の保険。
 *
 * サイト全体をSSR化するものではない。Astro本体は`output: "static"`の
 * ままで、このWorkerは`/api/*`だけを処理する薄いレイヤーとして追加した
 * (Decision Log 0143参照)。
 *
 * @cloudflare/workers-typesを新規依存として追加せず、必要最小限の型を
 * このファイル内で手書きしている(tsconfig.jsonの`include`はsrc配下の
 * みのため、`npx astro check`はこのファイルを型チェックしない)。
 *
 * 【IPハッシュについて】生IPは保存しない。連投判定用に、Cloudflare
 * Workerのsecret(`IP_HASH_SECRET`、クライアントには一切露出しない)を
 * 鍵にしたHMAC-SHA256でハッシュ化してから保存する。`IP_HASH_SECRET`が
 * 設定されていない場合は、弱いハッシュにフォールバックせず500を返す
 * (fail closed)。
 *
 * 【本人限定の公開読書メモAPIを追加(2026-09-20、Decision Log 0189)】
 * `/api/reading-notes`(公開本棚の読書メモ)は、GET(一覧取得)のみ
 * 誰でも呼べる。POST(公開)・PUT(更新)・DELETE(取り下げ)は、
 * `/api/admin/login`でパスワード認証したセッションでのみ許可する
 * (fail closed: 認証用secretが未設定の場合はログイン自体を500で拒否)。
 * セッションは署名付きHttpOnly Cookie(サーバー側にセッションテーブルを
 * 持たない、ステートレスな設計)。状態変更系のリクエストは、Cookieに
 * 加えてCSRFトークン(ログイン応答のボディで返し、リクエストヘッダで
 * 照合)も要求する。詳細な設計判断・実測はDecision Log 0189参照。
 * ------------------------------------------------------------
 */

// --- Cloudflare Workers / D1 の最小限の型宣言 -------------------------
interface D1Result<T = unknown> {
  results: T[];
  success: boolean;
  /** `run()`で更新/削除された行数などを確認するために使う
   * (楽観的ロックの判定: 0件ならWHERE条件に一致する行が無かった)。 */
  meta?: { changes?: number };
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(): Promise<T | null>;
  run(): Promise<D1Result>;
  all<T = unknown>(): Promise<D1Result<T>>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

/** Workers Static Assetsのbinding(`env.ASSETS`)の最小限の型。 */
interface Fetcher {
  fetch(request: Request): Promise<Response>;
}

interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  /** 連投判定用IPハッシュのHMAC鍵。Cloudflare Workerのsecretとして
   * Production/Previewそれぞれに設定する(クライアントへは露出しない)。 */
  IP_HASH_SECRET: string;
  /** どのwrangler環境(env未指定=production/production/preview)で
   * 解決されたかを示す非secretな診断用var。`X-Notebook-Env`レスポンス
   * ヘッダとして返し、Cloudflare側で実際にどの環境設定が使われたかを
   * 外部から確認できるようにする(2026-09-14、Decision Log 0145)。 */
  NOTEBOOK_ENV?: string;
  /** 本人限定ログインのパスワードハッシュ(SHA-256(password:pepper)の
   * 16進数)。`scripts/hash-admin-password.mjs`で生成する。 */
  ADMIN_PASSWORD_HASH?: string;
  /** 上記ハッシュ計算に使うpepper。ADMIN_PASSWORD_HASHとは別のsecret
   * として保存する(片方が漏れてももう片方が無ければ元のパスワードは
   * 復元できない)。 */
  ADMIN_PASSWORD_PEPPER?: string;
  /** セッションCookieの署名鍵。IP_HASH_SECRETやADMIN_PASSWORD_*とは
   * 別のsecretにする(役割ごとに鍵を分け、1つの漏洩の影響範囲を
   * 限定する)。 */
  ADMIN_SESSION_SECRET?: string;
  /** Fieldnote OCR(Google Cloud Vision)用のAPIキー(2026-09-21、
   * Decision Log 0198)。Cloud Vision APIのみに制限したキーを想定。
   * Preview/Productionで同じ変数名のまま、Cloudflare secretとして
   * それぞれ別の値を設定する(コード側は環境名を意識しない)。 */
  GOOGLE_VISION_API_KEY?: string;
  /** 月次のOCR呼び出し上限(secretではなくvars)。同じGoogle Cloud
   * プロジェクトでPreview/Productionを動かす場合、Vision APIの無料枠
   * (1,000ユニット/月)は合算されるため、Preview/Productionそれぞれに
   * 低めの値を設定する想定(例: preview=50, production=900)。未設定時は
   * OCR_DEFAULT_MONTHLY_LIMITを使う。 */
  OCR_MONTHLY_LIMIT?: string;
}

// --- 定数 ------------------------------------------------------------
// src/data/labNotebooks.tsのslugと一致させる(このAPIが受け付けて良い
// ノートを明示的に限定するallowlist)。
const VALID_SLUGS = new Set(["oto-no-michi", "fieldnote", "research-fragments"]);

const MAX_BODY_LENGTH = 2000;
const MAX_CONTEXT_LENGTH = 200;

// 連投防止: 同じIPハッシュからの投稿は、直前の投稿からRATE_LIMIT_WINDOW_
// SECONDS秒は次を受け付けない。さらに1日あたりRATE_LIMIT_DAILY_MAX件を
// 上限にする(Cloudflare Turnstile等の追加認証基盤は、この規模では
// 過剰と判断し導入していない)。
const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_DAILY_WINDOW_SECONDS = 24 * 60 * 60;
const RATE_LIMIT_DAILY_MAX = 20;

interface EntryRow {
  id: string;
  body: string;
  context: string | null;
  url: string | null;
  created_at: string;
}

interface PublicEntry {
  id: string;
  kind: "visitor";
  body: string;
  context?: string;
  url?: string;
  publishedAt: string;
  visible: true;
}

function toPublicEntry(row: EntryRow): PublicEntry {
  return {
    id: row.id,
    kind: "visitor",
    body: row.body,
    ...(row.context ? { context: row.context } : {}),
    ...(row.url ? { url: row.url } : {}),
    publishedAt: row.created_at,
    visible: true,
  };
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

/** 添えられたURLがhttp/https以外(javascript:等)でないことを確認する。 */
function isValidUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * IPアドレスをそのまま保存せず、secretを鍵にしたHMAC-SHA256でハッシュ化
 * してから保存する。鍵の無い単純なSHA-256/MD5等は、IPv4アドレス空間が
 * 約43億通りしかなく総当たりで元のIPへ復元されうるため使わない。
 */
async function hashIp(ip: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(ip));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function handleGetEntries(slug: string, env: Env): Promise<Response> {
  if (!VALID_SLUGS.has(slug)) {
    return json({ error: "notebook not found" }, 404);
  }

  const { results } = await env.DB.prepare(
    "SELECT id, body, context, url, created_at FROM entries WHERE notebook_slug = ?1 AND status = 'visible' ORDER BY created_at ASC",
  )
    .bind(slug)
    .all<EntryRow>();

  return json({ entries: results.map(toPublicEntry) });
}

async function handlePostEntries(slug: string, request: Request, env: Env): Promise<Response> {
  if (!VALID_SLUGS.has(slug)) {
    return json({ error: "notebook not found" }, 404);
  }

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "invalid request body" }, 400);
  }

  // honeypot: botが埋めてしまうダミー欄。埋まっていた場合は保存せず、
  // 見た目上は成功したかのような応答を返す(botに検知されたことを
  // 悟らせない標準的な対処)。
  if (typeof payload._gotcha === "string" && payload._gotcha.trim() !== "") {
    return json(
      {
        entry: {
          id: crypto.randomUUID(),
          kind: "visitor",
          body: typeof payload.body === "string" ? payload.body : "",
          publishedAt: new Date().toISOString(),
          visible: true,
        },
      },
      201,
    );
  }

  const rawBody = typeof payload.body === "string" ? payload.body.trim() : "";
  if (!rawBody) {
    return json({ error: "body is required" }, 400);
  }
  if (rawBody.length > MAX_BODY_LENGTH) {
    return json({ error: `body must be ${MAX_BODY_LENGTH} characters or fewer` }, 400);
  }

  let rawContext: string | null = null;
  if (typeof payload.context === "string" && payload.context.trim() !== "") {
    const trimmed = payload.context.trim();
    if (trimmed.length > MAX_CONTEXT_LENGTH) {
      return json({ error: `context must be ${MAX_CONTEXT_LENGTH} characters or fewer` }, 400);
    }
    rawContext = trimmed;
  }

  let rawUrl: string | null = null;
  if (typeof payload.url === "string" && payload.url.trim() !== "") {
    const trimmed = payload.url.trim();
    if (!isValidUrl(trimmed)) {
      return json({ error: "url must be a valid http(s) URL" }, 400);
    }
    rawUrl = trimmed;
  }

  const ipHashSecret = env.IP_HASH_SECRET;
  if (!ipHashSecret) {
    // secret未設定のまま弱いハッシュへフォールバックしない(fail
    // closed)。Cloudflare Worker側でIP_HASH_SECRETが未設定
    // (Production/Preview双方に必要)。
    return json({ error: "server misconfigured" }, 500);
  }

  const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
  const ipHash = await hashIp(ip, ipHashSecret);

  // created_atはnew Date().toISOString()(例: "2026-09-14T05:05:56.746Z")で
  // 保存しているが、SQLiteのdatetime('now', ...)は"2026-09-14 05:05:56"
  // のように空白区切りの文字列を返す。この2つを文字列としてそのまま
  // 比較すると、"T"(0x54)が空白(0x20)より大きいため、日付部分が
  // 一致する限り常にcreated_at側が大きいと判定されてしまい、実際の
  // 経過時間に関わらず「直近の投稿」とみなされ続けるバグがあった
  // (2026-09-14、Decision Log 0148で発見・修正)。unixepoch()で
  // どちらも秒単位の数値に正規化してから比較する。
  const recentPost = await env.DB.prepare(
    `SELECT id FROM entries WHERE ip_hash = ?1 AND unixepoch(created_at) > unixepoch('now') - ?2 LIMIT 1`,
  )
    .bind(ipHash, RATE_LIMIT_WINDOW_SECONDS)
    .first();
  if (recentPost) {
    return json({ error: "please wait a moment before posting again" }, 429);
  }

  const dailyCount = await env.DB.prepare(
    `SELECT COUNT(*) as count FROM entries WHERE ip_hash = ?1 AND unixepoch(created_at) > unixepoch('now') - ?2`,
  )
    .bind(ipHash, RATE_LIMIT_DAILY_WINDOW_SECONDS)
    .first<{ count: number }>();
  if ((dailyCount?.count ?? 0) >= RATE_LIMIT_DAILY_MAX) {
    return json({ error: "daily post limit reached" }, 429);
  }

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  await env.DB.prepare(
    "INSERT INTO entries (id, notebook_slug, body, context, url, created_at, status, ip_hash) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'visible', ?7)",
  )
    .bind(id, slug, rawBody, rawContext, rawUrl, createdAt, ipHash)
    .run();

  return json(
    {
      entry: toPublicEntry({ id, body: rawBody, context: rawContext, url: rawUrl, created_at: createdAt }),
    },
    201,
  );
}

// ======================================================================
// 本人限定の公開読書メモAPI(/api/reading-notes, /api/admin/*)
// (2026-09-20、Decision Log 0189)
// ======================================================================

// src/data/bookshelf.tsのidと一致させる(このAPIが受け付けて良い本を
// 明示的に限定するallowlist。VALID_SLUGSと同じ考え方)。
const VALID_BOOK_IDS = new Set([
  "keiken-to-kyouiku",
  "chousateki-kansei-jutsu",
  "souzou-no-kyoudoutai",
  "matsutake",
  "ikiteiru-koto",
  "ito-sei-fukushi",
]);

const MAX_REFLECTION_LENGTH = 4000;
const MAX_QUOTE_LENGTH = 4000;
const MAX_QUOTE_LOCATION_LENGTH = 200;
const MAX_RELATED_RECORDS = 10;
const MAX_RELATED_LABEL_LENGTH = 200;

const SESSION_COOKIE_NAME = "futo_admin_session";
const SESSION_TTL_SECONDS = 8 * 60 * 60; // 8時間

const LOGIN_RATE_LIMIT_WINDOW_SECONDS = 15 * 60;
const LOGIN_RATE_LIMIT_MAX = 5;

interface ReadingNoteRow {
  id: string;
  book_id: string;
  author_reflection: string;
  quote: string | null;
  quote_location: string | null;
  related_records_json: string | null;
  published_at: string;
  status: "published" | "retracted";
  created_at: string;
  updated_at: string;
}

interface PublicReadingNoteApi {
  id: string;
  bookId: string;
  authorReflection: string;
  publishedAt: string;
  quote?: string;
  quoteLocation?: string;
  relatedRecords?: { label: string; href: string }[];
  /** 更新・取り下げ時の楽観的ロックに使う(呼び出し側はこの値を
   * そのまま次のPUT/DELETEのexpectedUpdatedAtに渡す)。 */
  updatedAt: string;
}

function toPublicReadingNote(row: ReadingNoteRow): PublicReadingNoteApi {
  const note: PublicReadingNoteApi = {
    id: row.id,
    bookId: row.book_id,
    authorReflection: row.author_reflection,
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
  };
  if (row.quote) note.quote = row.quote;
  if (row.quote_location) note.quoteLocation = row.quote_location;
  if (row.related_records_json) {
    try {
      note.relatedRecords = JSON.parse(row.related_records_json);
    } catch {
      // 壊れたJSONは無視する(関連記録なしとして扱う。全体を500にしない)。
    }
  }
  return note;
}

function toHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/** 固定長16進数文字列同士を、タイミング攻撃を避けて比較する。 */
function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function base64UrlEncode(input: string): string {
  return btoa(input).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(input: string): string {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (padded.length % 4)) % 4;
  return atob(padded + "=".repeat(padLength));
}

async function hmacSha256Hex(key: string, message: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(message));
  return toHex(signature);
}

interface SessionPayload {
  exp: number;
  csrf: string;
}

async function signSession(payload: SessionPayload, secret: string): Promise<string> {
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const sigHex = await hmacSha256Hex(secret, payloadB64);
  return `${payloadB64}.${sigHex}`;
}

async function verifySession(token: string, secret: string): Promise<SessionPayload | null> {
  const [payloadB64, sigHex] = token.split(".");
  if (!payloadB64 || !sigHex) return null;
  const expectedSigHex = await hmacSha256Hex(secret, payloadB64);
  if (!timingSafeEqualHex(sigHex, expectedSigHex)) return null;
  try {
    const payload = JSON.parse(base64UrlDecode(payloadB64)) as SessionPayload;
    if (typeof payload.exp !== "number" || typeof payload.csrf !== "string") return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

function parseCookies(request: Request): Record<string, string> {
  const header = request.headers.get("Cookie");
  if (!header) return {};
  const result: Record<string, string> = {};
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (key) result[key] = decodeURIComponent(value);
  }
  return result;
}

function buildSessionCookie(token: string): string {
  return `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/api/; Max-Age=${SESSION_TTL_SECONDS}; HttpOnly; Secure; SameSite=Strict`;
}

function buildClearSessionCookie(): string {
  return `${SESSION_COOKIE_NAME}=; Path=/api/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;
}

/**
 * リクエストが有効なセッションCookieを持つか検証する。
 * secret未設定は常に認証失敗として扱う(fail closed、
 * IP_HASH_SECRETと同じ方針)。
 */
async function requireSession(request: Request, env: Env): Promise<SessionPayload | null> {
  if (!env.ADMIN_SESSION_SECRET) return null;
  const cookies = parseCookies(request);
  const token = cookies[SESSION_COOKIE_NAME];
  if (!token) return null;
  return verifySession(token, env.ADMIN_SESSION_SECRET);
}

/** 状態変更系リクエストのCSRFトークンを検証する(ヘッダとセッション内の値を比較)。 */
function requireCsrf(request: Request, session: SessionPayload): boolean {
  const header = request.headers.get("X-CSRF-Token");
  return typeof header === "string" && header.length > 0 && header === session.csrf;
}

/**
 * ログインに必要な4つのsecretのうち、未設定のものだけを名前で返す
 * (値は一切含まない。2026-09-21、Decision Log 0198——Preview環境で
 * `IP_HASH_SECRET`だけ設定し忘れる、といった事象を、本人がDashboardの
 * secret一覧を目視するだけでは気づきにくかったための追加)。
 */
function missingAdminLoginSecrets(env: Env): string[] {
  const missing: string[] = [];
  if (!env.ADMIN_PASSWORD_HASH) missing.push("ADMIN_PASSWORD_HASH");
  if (!env.ADMIN_PASSWORD_PEPPER) missing.push("ADMIN_PASSWORD_PEPPER");
  if (!env.ADMIN_SESSION_SECRET) missing.push("ADMIN_SESSION_SECRET");
  if (!env.IP_HASH_SECRET) missing.push("IP_HASH_SECRET");
  return missing;
}

async function handleAdminLogin(request: Request, env: Env): Promise<Response> {
  const missingSecrets = missingAdminLoginSecrets(env);
  if (missingSecrets.length > 0) {
    // 認証用secretが揃っていない場合は、弱い既定値へフォールバック
    // せず常に拒否する(fail closed)。IPハッシュ化は既存の
    // IP_HASH_SECRET(handlePostEntriesと同じ鍵)をそのまま使う——
    // 「IPをハッシュ化する」という役割は1つの鍵にまとめる。
    // `missing`はsecretの値を一切含まない、未設定の変数名だけの配列。
    return json({ error: "server misconfigured", missing: missingSecrets }, 500);
  }

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "invalid request body" }, 400);
  }
  const password = typeof payload.password === "string" ? payload.password : "";
  if (!password) return json({ error: "password is required" }, 400);

  const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
  const ipHash = await hashIp(ip, env.IP_HASH_SECRET);

  const recentAttempts = await env.DB.prepare(
    `SELECT COUNT(*) as count FROM admin_login_attempts WHERE ip_hash = ?1 AND unixepoch(attempted_at) > unixepoch('now') - ?2`,
  )
    .bind(ipHash, LOGIN_RATE_LIMIT_WINDOW_SECONDS)
    .first<{ count: number }>();
  if ((recentAttempts?.count ?? 0) >= LOGIN_RATE_LIMIT_MAX) {
    return json({ error: "too many attempts, please wait" }, 429);
  }

  const candidateHash = await hmacSha256HexLike(password, env.ADMIN_PASSWORD_PEPPER);
  const valid = timingSafeEqualHex(candidateHash, env.ADMIN_PASSWORD_HASH);

  if (!valid) {
    await env.DB.prepare(`INSERT INTO admin_login_attempts (ip_hash) VALUES (?1)`).bind(ipHash).run();
    return json({ error: "invalid password" }, 401);
  }

  const csrf = toHex(crypto.getRandomValues(new Uint8Array(16)).buffer);
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const token = await signSession({ exp, csrf }, env.ADMIN_SESSION_SECRET);

  const response = json({ csrfToken: csrf, expiresAt: new Date(exp * 1000).toISOString() });
  response.headers.append("Set-Cookie", buildSessionCookie(token));
  return response;
}

/**
 * パスワード候補のハッシュを、ADMIN_PASSWORD_HASHと同じ計算式
 * (SHA-256(password:pepper))で求める。`scripts/hash-admin-password.mjs`
 * と必ず同じ式にすること。
 */
async function hmacSha256HexLike(password: string, pepper: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${password}:${pepper}`));
  return toHex(digest);
}

async function handleAdminLogout(request: Request, env: Env): Promise<Response> {
  const session = await requireSession(request, env);
  if (session) {
    if (!requireCsrf(request, session)) {
      return json({ error: "invalid csrf token" }, 403);
    }
  }
  const response = json({ ok: true });
  response.headers.append("Set-Cookie", buildClearSessionCookie());
  return response;
}

/**
 * 有効なセッションCookieを持っているかどうかを確認する。ページ再読み込み
 * 後、パスワードの再入力なしにCSRFトークンを復元するために使う
 * (CSRFトークンは署名済みCookieの中身にそのまま入っているので、
 * サーバー側に別途セッションを保存しなくても検証・再取得できる)。
 */
async function handleAdminSession(request: Request, env: Env): Promise<Response> {
  const session = await requireSession(request, env);
  if (!session) return json({ error: "not authenticated" }, 401);
  return json({ csrfToken: session.csrf, expiresAt: new Date(session.exp * 1000).toISOString() });
}

async function handleGetReadingNotes(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const bookId = url.searchParams.get("bookId");
  if (!bookId || !VALID_BOOK_IDS.has(bookId)) {
    return json({ error: "bookId is required and must be a known book" }, 400);
  }
  const { results } = await env.DB.prepare(
    `SELECT id, book_id, author_reflection, quote, quote_location, related_records_json, published_at, status, created_at, updated_at
     FROM reading_notes WHERE book_id = ?1 AND status = 'published' ORDER BY published_at DESC`,
  )
    .bind(bookId)
    .all<ReadingNoteRow>();
  return json({ notes: results.map(toPublicReadingNote) });
}

interface ReadingNoteInput {
  bookId: unknown;
  authorReflection: unknown;
  quote?: unknown;
  quoteLocation?: unknown;
  relatedRecords?: unknown;
}

/** POST/PUT共通の入力検証。エラーがあればエラーメッセージ、無ければnullを返す。 */
function validateReadingNoteInput(input: ReadingNoteInput): string | null {
  if (typeof input.bookId !== "string" || !VALID_BOOK_IDS.has(input.bookId)) {
    return "bookId must be a known book id";
  }
  if (typeof input.authorReflection !== "string" || input.authorReflection.trim() === "") {
    return "authorReflection is required";
  }
  if (input.authorReflection.length > MAX_REFLECTION_LENGTH) {
    return `authorReflection must be ${MAX_REFLECTION_LENGTH} characters or fewer`;
  }
  if (input.quote !== undefined && input.quote !== null) {
    if (typeof input.quote !== "string" || input.quote.length > MAX_QUOTE_LENGTH) {
      return `quote must be a string of ${MAX_QUOTE_LENGTH} characters or fewer`;
    }
  }
  if (input.quoteLocation !== undefined && input.quoteLocation !== null) {
    if (typeof input.quoteLocation !== "string" || input.quoteLocation.length > MAX_QUOTE_LOCATION_LENGTH) {
      return `quoteLocation must be a string of ${MAX_QUOTE_LOCATION_LENGTH} characters or fewer`;
    }
  }
  if (input.relatedRecords !== undefined && input.relatedRecords !== null) {
    if (!Array.isArray(input.relatedRecords) || input.relatedRecords.length > MAX_RELATED_RECORDS) {
      return `relatedRecords must be an array of at most ${MAX_RELATED_RECORDS} items`;
    }
    for (const record of input.relatedRecords) {
      if (
        typeof record !== "object" ||
        record === null ||
        typeof (record as Record<string, unknown>).label !== "string" ||
        typeof (record as Record<string, unknown>).href !== "string"
      ) {
        return "each relatedRecords item must have a string label and href";
      }
      const label = (record as { label: string }).label;
      const href = (record as { href: string }).href;
      if (label.length === 0 || label.length > MAX_RELATED_LABEL_LENGTH) {
        return `relatedRecords label must be 1-${MAX_RELATED_LABEL_LENGTH} characters`;
      }
      // 公開プレビューUI(Fieldnote)と同じ制約: サイト内パスのみ許可する
      // (外部リンクはサーバー側でも拒否する、クライアント側検証だけに
      // 頼らない)。
      if (!href.startsWith("/")) {
        return "relatedRecords href must be a site-internal path starting with /";
      }
    }
  }
  return null;
}

async function handlePostReadingNotes(request: Request, env: Env): Promise<Response> {
  const session = await requireSession(request, env);
  if (!session) return json({ error: "authentication required" }, 401);
  if (!requireCsrf(request, session)) return json({ error: "invalid csrf token" }, 403);

  let payload: ReadingNoteInput;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "invalid request body" }, 400);
  }
  const validationError = validateReadingNoteInput(payload);
  if (validationError) return json({ error: validationError }, 400);

  const id = crypto.randomUUID();
  const now = new Date();
  const nowIso = now.toISOString();
  const publishedAt = nowIso.slice(0, 10);
  const relatedRecordsJson =
    Array.isArray(payload.relatedRecords) && payload.relatedRecords.length > 0
      ? JSON.stringify(payload.relatedRecords)
      : null;

  await env.DB.prepare(
    `INSERT INTO reading_notes (id, book_id, author_reflection, quote, quote_location, related_records_json, published_at, status, created_at, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'published', ?8, ?8)`,
  )
    .bind(
      id,
      payload.bookId,
      (payload.authorReflection as string).trim(),
      payload.quote ? (payload.quote as string).trim() : null,
      payload.quoteLocation ? (payload.quoteLocation as string).trim() : null,
      relatedRecordsJson,
      publishedAt,
      nowIso,
    )
    .run();

  const row = await env.DB.prepare(
    `SELECT id, book_id, author_reflection, quote, quote_location, related_records_json, published_at, status, created_at, updated_at
     FROM reading_notes WHERE id = ?1`,
  )
    .bind(id)
    .first<ReadingNoteRow>();
  if (!row) return json({ error: "failed to create" }, 500);
  return json({ note: toPublicReadingNote(row) }, 201);
}

async function handlePutReadingNote(id: string, request: Request, env: Env): Promise<Response> {
  const session = await requireSession(request, env);
  if (!session) return json({ error: "authentication required" }, 401);
  if (!requireCsrf(request, session)) return json({ error: "invalid csrf token" }, 403);

  let payload: ReadingNoteInput & { expectedUpdatedAt?: unknown };
  try {
    payload = await request.json();
  } catch {
    return json({ error: "invalid request body" }, 400);
  }
  const validationError = validateReadingNoteInput(payload);
  if (validationError) return json({ error: validationError }, 400);
  if (typeof payload.expectedUpdatedAt !== "string") {
    return json({ error: "expectedUpdatedAt is required (optimistic locking)" }, 400);
  }

  const nowIso = new Date().toISOString();
  const relatedRecordsJson =
    Array.isArray(payload.relatedRecords) && payload.relatedRecords.length > 0
      ? JSON.stringify(payload.relatedRecords)
      : null;

  const result = await env.DB.prepare(
    `UPDATE reading_notes
     SET author_reflection = ?1, quote = ?2, quote_location = ?3, related_records_json = ?4, updated_at = ?5
     WHERE id = ?6 AND updated_at = ?7 AND status = 'published'`,
  )
    .bind(
      (payload.authorReflection as string).trim(),
      payload.quote ? (payload.quote as string).trim() : null,
      payload.quoteLocation ? (payload.quoteLocation as string).trim() : null,
      relatedRecordsJson,
      nowIso,
      id,
      payload.expectedUpdatedAt,
    )
    .run();

  if (!result.meta?.changes) {
    // 行が無い(idが不正・取り下げ済み)か、expectedUpdatedAtが
    // 現在の値と一致しない(他の場所で先に更新された)かのいずれか。
    // どちらも呼び出し側から見れば「今の状態を確認してやり直す」
    // べき状況なので、区別せず409を返す。
    const exists = await env.DB.prepare(`SELECT id FROM reading_notes WHERE id = ?1`).bind(id).first();
    return json({ error: exists ? "conflict: this note was updated elsewhere" : "not found" }, exists ? 409 : 404);
  }

  const row = await env.DB.prepare(
    `SELECT id, book_id, author_reflection, quote, quote_location, related_records_json, published_at, status, created_at, updated_at
     FROM reading_notes WHERE id = ?1`,
  )
    .bind(id)
    .first<ReadingNoteRow>();
  if (!row) return json({ error: "not found" }, 404);
  return json({ note: toPublicReadingNote(row) });
}

async function handleDeleteReadingNote(id: string, request: Request, env: Env): Promise<Response> {
  const session = await requireSession(request, env);
  if (!session) return json({ error: "authentication required" }, 401);
  if (!requireCsrf(request, session)) return json({ error: "invalid csrf token" }, 403);

  let payload: { expectedUpdatedAt?: unknown } = {};
  try {
    payload = await request.json();
  } catch {
    // 取り下げは本文が空でも許容する(expectedUpdatedAt省略時は
    // ロックなしで取り下げる。呼び出し側UIは常に付ける設計だが、
    // APIとしては必須にしない)。
  }

  const nowIso = new Date().toISOString();
  let result: D1Result;
  if (typeof payload.expectedUpdatedAt === "string") {
    result = await env.DB.prepare(
      `UPDATE reading_notes SET status = 'retracted', updated_at = ?1 WHERE id = ?2 AND updated_at = ?3 AND status = 'published'`,
    )
      .bind(nowIso, id, payload.expectedUpdatedAt)
      .run();
  } else {
    result = await env.DB.prepare(
      `UPDATE reading_notes SET status = 'retracted', updated_at = ?1 WHERE id = ?2 AND status = 'published'`,
    )
      .bind(nowIso, id)
      .run();
  }

  if (!result.meta?.changes) {
    const exists = await env.DB.prepare(`SELECT id FROM reading_notes WHERE id = ?1`).bind(id).first();
    return json({ error: exists ? "conflict: this note was updated elsewhere" : "not found" }, exists ? 409 : 404);
  }
  return json({ ok: true });
}

// ======================================================================
// Fieldnote OCR(Google Cloud Vision)API(/api/ocr/recognize)
// (2026-09-21、Decision Log 0198)
//
// 本人限定(requireSession/requireCsrf、reading-notesの書き込み系と
// 同じ仕組みを再利用)。画像・認識結果は一切保存・ログ出力しない
// (件数のみをocr_usage_monthly/ocr_recent_callsに記録する)。
// ======================================================================

/** 6MB程度のデコード後サイズに相当する、base64文字列としての上限(安全弁)。 */
const OCR_MAX_IMAGE_BASE64_LENGTH = 8_000_000;
const OCR_RATE_LIMIT_WINDOW_SECONDS = 60;
const OCR_RATE_LIMIT_MAX = 10;
/** env.OCR_MONTHLY_LIMIT未設定時の既定値。 */
const OCR_DEFAULT_MONTHLY_LIMIT = 900;

function currentMonthPeriod(): string {
  return new Date().toISOString().slice(0, 7); // "YYYY-MM"(UTC)
}

interface GoogleVisionResponseBody {
  responses?: Array<{
    fullTextAnnotation?: { text?: string; pages?: Array<{ confidence?: number }> };
    error?: { message?: string };
  }>;
}

async function handleOcrRecognize(request: Request, env: Env): Promise<Response> {
  const session = await requireSession(request, env);
  if (!session) return json({ error: "authentication required" }, 401);
  if (!requireCsrf(request, session)) return json({ error: "invalid csrf token" }, 403);

  if (!env.GOOGLE_VISION_API_KEY) {
    // secret未設定は常に拒否する(fail closed、他のsecretと同じ方針)。
    return json({ error: "server misconfigured: OCR is not configured", missing: ["GOOGLE_VISION_API_KEY"] }, 500);
  }

  let payload: { imageBase64?: unknown; orientation?: unknown };
  try {
    payload = await request.json();
  } catch {
    return json({ error: "invalid request body" }, 400);
  }
  const imageBase64 = typeof payload.imageBase64 === "string" ? payload.imageBase64 : "";
  if (!imageBase64) return json({ error: "imageBase64 is required" }, 400);
  if (imageBase64.length > OCR_MAX_IMAGE_BASE64_LENGTH) {
    return json({ error: "image is too large" }, 413);
  }

  // 簡易レート制限(1分あたりの呼び出し回数)。古い行は機会的に削除する。
  await env.DB.prepare(`DELETE FROM ocr_recent_calls WHERE unixepoch(called_at) < unixepoch('now') - 3600`).run();
  const recentCalls = await env.DB.prepare(
    `SELECT COUNT(*) as count FROM ocr_recent_calls WHERE unixepoch(called_at) > unixepoch('now') - ?1`,
  )
    .bind(OCR_RATE_LIMIT_WINDOW_SECONDS)
    .first<{ count: number }>();
  if ((recentCalls?.count ?? 0) >= OCR_RATE_LIMIT_MAX) {
    return json({ error: "too many OCR requests, please wait a moment" }, 429);
  }

  // 月次上限。Preview/Productionは物理的に別のD1データベースなので
  // カウンタも自然に分かれるが、Google Cloud側の無料枠(1,000ユニット/月)
  // は同一プロジェクトなら合算されるため、Worker側の上限もそれぞれ
  // 低めの値(env.OCR_MONTHLY_LIMIT)にしておく(Decision Log 0198)。
  const monthlyLimit = Number(env.OCR_MONTHLY_LIMIT) || OCR_DEFAULT_MONTHLY_LIMIT;
  const period = currentMonthPeriod();
  const monthlyRow = await env.DB.prepare(`SELECT count FROM ocr_usage_monthly WHERE period = ?1`)
    .bind(period)
    .first<{ count: number }>();
  if ((monthlyRow?.count ?? 0) >= monthlyLimit) {
    return json({ error: "monthly OCR limit reached" }, 429);
  }

  await env.DB.prepare(`INSERT INTO ocr_recent_calls DEFAULT VALUES`).run();

  const orientation = payload.orientation === "vertical" ? "vertical" : "horizontal";

  let visionResponse: Response;
  try {
    visionResponse = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${env.GOOGLE_VISION_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [
            {
              image: { content: imageBase64 },
              features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
              imageContext: { languageHints: ["ja"] },
            },
          ],
        }),
      },
    );
  } catch {
    return json({ error: "failed to reach Google Cloud Vision" }, 502);
  }

  if (!visionResponse.ok) {
    // Google側から返るエラー本文には画像そのものは含まれないが、本文を
    // そのまま返さず、ステータスだけ伝える(詳細はGoogle Cloud Console側
    // のログで確認する前提。このWorkerからは画像・認識結果・Googleの
    // 生のエラー本文のいずれもログ・レスポンスに出さない)。
    return json({ error: `Google Cloud Vision error (${visionResponse.status})` }, 502);
  }

  const visionJson = (await visionResponse.json()) as GoogleVisionResponseBody;
  const result = visionJson.responses?.[0];
  if (result?.error) {
    // Googleが返すエラーメッセージ本文もそのまま転送しない(要約せず
    // 定型文だけ返す。上のHTTPレベルのエラーと同じ方針)。
    return json({ error: "Google Cloud Vision error" }, 502);
  }

  // 成功した呼び出しだけを月次カウンタに計上する(拒否・失敗は課金
  // されないため数えない)。
  await env.DB.prepare(
    `INSERT INTO ocr_usage_monthly (period, count) VALUES (?1, 1)
     ON CONFLICT(period) DO UPDATE SET count = count + 1`,
  )
    .bind(period)
    .run();

  const text = result?.fullTextAnnotation?.text ?? "";
  const confidence = result?.fullTextAnnotation?.pages?.[0]?.confidence ?? null;

  return json({ text, confidence, orientation });
}

async function routeRequest(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const notebookMatch = url.pathname.match(/^\/api\/notebooks\/([^/]+)\/entries\/?$/);

  if (notebookMatch) {
    const slug = notebookMatch[1];
    let response: Response;
    if (request.method === "GET") response = await handleGetEntries(slug, env);
    else if (request.method === "POST") response = await handlePostEntries(slug, request, env);
    else response = json({ error: "method not allowed" }, 405);

    // どのwrangler環境が実際に使われたかを外部から確認できるように
    // する診断用ヘッダ(secretではない)。Decision Log 0145参照。
    response.headers.set("X-Notebook-Env", env.NOTEBOOK_ENV ?? "unset");
    return response;
  }

  if (url.pathname === "/api/admin/login" && request.method === "POST") {
    return handleAdminLogin(request, env);
  }
  if (url.pathname === "/api/admin/logout" && request.method === "POST") {
    return handleAdminLogout(request, env);
  }
  if (url.pathname === "/api/admin/session" && request.method === "GET") {
    return handleAdminSession(request, env);
  }

  if (url.pathname === "/api/reading-notes/" || url.pathname === "/api/reading-notes") {
    if (request.method === "GET") return handleGetReadingNotes(request, env);
    if (request.method === "POST") return handlePostReadingNotes(request, env);
    return json({ error: "method not allowed" }, 405);
  }

  const readingNoteMatch = url.pathname.match(/^\/api\/reading-notes\/([^/]+)\/?$/);
  if (readingNoteMatch) {
    const id = readingNoteMatch[1];
    if (request.method === "PUT") return handlePutReadingNote(id, request, env);
    if (request.method === "DELETE") return handleDeleteReadingNote(id, request, env);
    return json({ error: "method not allowed" }, 405);
  }

  if (url.pathname === "/api/ocr/recognize" && request.method === "POST") {
    return handleOcrRecognize(request, env);
  }

  // `/api/*`以外は静的assetsへ(通常はwrangler.tomlのrun_worker_first
  // により、このWorkerに到達する前にassetsへ直接ルーティングされる)。
  return env.ASSETS.fetch(request);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await routeRequest(request, env);
    } catch (error) {
      // 想定外の例外(D1バインディングの設定ミス・SQLエラー等)を、
      // Cloudflareの既定のエラーページ(JSONではない場合がある)では
      // なく、必ずJSONで返す(2026-09-21、Decision Log 0198——secretが
      // 4つとも設定済みなのにログインが失敗する事象の調査で、
      // クライアント側がJSONを期待しているのに応答が想定と食い違う
      // ケースがあり得ると判明したための追加)。
      //
      // 例外の詳細(D1のSQLエラー文言等、値そのものは含まないが内部の
      // スキーマ情報ではある)は、レスポンスには含めずCloudflare側の
      // ログにだけ出す(`console.error`はCloudflare Dashboardの
      // Workers Logsで確認できる)。`/api/admin/login`はログイン前
      // (未認証)から呼べるエンドポイントのため、応答本文は誰でも見える
      // 前提で扱い、"internal error"という定型文以上の情報は返さない。
      console.error("unhandled exception in routeRequest:", error instanceof Error ? error.message : String(error));
      return json({ error: "internal error" }, 500);
    }
  },
};
