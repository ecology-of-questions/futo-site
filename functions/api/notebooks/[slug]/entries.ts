/**
 * functions/api/notebooks/[slug]/entries.ts
 * ------------------------------------------------------------
 * 「実験室」ノート(交換ノート)への書き込みを永続化するCloudflare
 * Pages Function(2026-09-13、Decision Log 0141。IPハッシュのHMAC化・
 * Preview/Production D1分離は2026-09-13、Decision Log 0142でレビュー
 * 反映)。
 *
 * このファイルはAstroのビルド対象外(Cloudflare Pagesがdist/と並行して
 * 自動検出・デプロイする)。Astro本体は`output: "static"`のまま維持し、
 * Cloudflare固有機能への依存はこのAPI部分だけに限定している
 * (tsconfig.jsonの`include`はsrc配下のみのため、`npx astro check`は
 * このファイルを型チェックしない。`@cloudflare/workers-types`を新規
 * 依存として追加せず、必要最小限の型をこのファイル内で手書きしている)。
 *
 * - GET  /api/notebooks/:slug/entries  … 公開済み(visible)の書き込みを
 *   時系列順で返す。
 * - POST /api/notebooks/:slug/entries … 新しい書き込みを保存する。
 *   名前・メールアドレス・アカウントは保存しない。非公開化(hidden)は
 *   管理API・管理画面を用意せず、`wrangler d1 execute --remote`または
 *   Cloudflareダッシュボード経由の手動SQLで行う運用にしている
 *   (Decision Log 0141参照)。
 *
 * 【IPハッシュについて】生IPは保存しない。連投判定用に、Cloudflare
 * Pages Secret(`IP_HASH_SECRET`、クライアントには一切露出しない)を
 * 鍵にしたHMAC-SHA256でハッシュ化してから保存する(単純なSHA-256
 * ハッシュはIPv4アドレス空間が小さく総当たりで復元されうるため、
 * secretを鍵に使うHMACへ変更した。Decision Log 0142参照)。
 * `IP_HASH_SECRET`が設定されていない場合は、弱いハッシュにフォール
 * バックせず500を返す(fail closed)。
 * ------------------------------------------------------------
 */

// --- Cloudflare Pages Functions / D1 の最小限の型宣言 -----------------
// @cloudflare/workers-typesを追加依存にせず、このファイルで使う分だけ
// 手書きしている(プロジェクト全体の依存最小化の方針に合わせた)。
interface D1Result<T = unknown> {
  results: T[];
  success: boolean;
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

interface Env {
  DB: D1Database;
  /** 連投判定用IPハッシュのHMAC鍵。Cloudflare PagesのSecretとして
   * Production/Previewそれぞれに設定する(クライアントへは露出しない)。 */
  IP_HASH_SECRET: string;
}

interface PagesFunctionContext<P extends Record<string, string> = Record<string, string>> {
  request: Request;
  env: Env;
  params: P;
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
 * 約43億通りしかなく総当たりで元のIPへ復元されうるため使わない
 * (2026-09-13、Decision Log 0142)。
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

export const onRequestGet = async (context: PagesFunctionContext<{ slug: string }>): Promise<Response> => {
  const { slug } = context.params;
  if (!VALID_SLUGS.has(slug)) {
    return json({ error: "notebook not found" }, 404);
  }

  const { results } = await context.env.DB.prepare(
    "SELECT id, body, context, url, created_at FROM entries WHERE notebook_slug = ?1 AND status = 'visible' ORDER BY created_at ASC",
  )
    .bind(slug)
    .all<EntryRow>();

  return json({ entries: results.map(toPublicEntry) });
};

export const onRequestPost = async (context: PagesFunctionContext<{ slug: string }>): Promise<Response> => {
  const { slug } = context.params;
  if (!VALID_SLUGS.has(slug)) {
    return json({ error: "notebook not found" }, 404);
  }

  let payload: Record<string, unknown>;
  try {
    payload = await context.request.json();
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

  const ipHashSecret = context.env.IP_HASH_SECRET;
  if (!ipHashSecret) {
    // secret未設定のまま弱いハッシュへフォールバックしない(fail
    // closed)。Cloudflare Pages側でIP_HASH_SECRETが未設定
    // (Production/Preview双方に必要)。
    return json({ error: "server misconfigured" }, 500);
  }

  const ip = context.request.headers.get("CF-Connecting-IP") ?? "unknown";
  const ipHash = await hashIp(ip, ipHashSecret);

  const recentPost = await context.env.DB.prepare(
    `SELECT id FROM entries WHERE ip_hash = ?1 AND created_at > datetime('now', ?2) LIMIT 1`,
  )
    .bind(ipHash, `-${RATE_LIMIT_WINDOW_SECONDS} seconds`)
    .first();
  if (recentPost) {
    return json({ error: "please wait a moment before posting again" }, 429);
  }

  const dailyCount = await context.env.DB.prepare(
    `SELECT COUNT(*) as count FROM entries WHERE ip_hash = ?1 AND created_at > datetime('now', '-1 day')`,
  )
    .bind(ipHash)
    .first<{ count: number }>();
  if ((dailyCount?.count ?? 0) >= RATE_LIMIT_DAILY_MAX) {
    return json({ error: "daily post limit reached" }, 429);
  }

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  await context.env.DB.prepare(
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
};
