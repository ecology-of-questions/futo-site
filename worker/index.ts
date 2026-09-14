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
 * ------------------------------------------------------------
 */

// --- Cloudflare Workers / D1 の最小限の型宣言 -------------------------
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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const match = url.pathname.match(/^\/api\/notebooks\/([^/]+)\/entries\/?$/);

    if (match) {
      const slug = match[1];
      let response: Response;
      if (request.method === "GET") response = await handleGetEntries(slug, env);
      else if (request.method === "POST") response = await handlePostEntries(slug, request, env);
      else response = json({ error: "method not allowed" }, 405);

      // どのwrangler環境が実際に使われたかを外部から確認できるように
      // する診断用ヘッダ(secretではない)。Decision Log 0145参照。
      response.headers.set("X-Notebook-Env", env.NOTEBOOK_ENV ?? "unset");
      return response;
    }

    // `/api/*`以外は静的assetsへ(通常はwrangler.tomlのrun_worker_first
    // により、このWorkerに到達する前にassetsへ直接ルーティングされる)。
    return env.ASSETS.fetch(request);
  },
};
