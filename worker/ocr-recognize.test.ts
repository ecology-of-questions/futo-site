/**
 * ocr-recognize.test.ts
 * ------------------------------------------------------------
 * `/api/ocr/recognize`(Google Cloud Vision、2026-09-21、Decision Log
 * 0198)の実際の挙動テスト。コンパイル確認(tsc/astro check)だけでは
 * 「動くこと」を保証しないというプロジェクトオーナーの指摘を受け、
 * 実際にworker/index.tsの`fetch`ハンドラへリクエストを投げて検証する。
 *
 * worker/index.tsは@cloudflare/workers-typesを増やさず、D1Database等を
 * 自前の最小限の型として定義している(worker/index.ts冒頭コメント参照)。
 * そのためCloudflareの実行環境(Miniflare等)を持ち込まず、D1をこの
 * ファイル内のFakeD1(必要なクエリだけを解釈する最小限の実装)に
 * 差し替えるだけで、プレーンなNode上のvitestとして直接テストできる。
 *
 * 検証観点(プロジェクトオーナーの指示、2026-09-21):
 * - 未ログインのOCR呼び出しが401になる
 * - CSRFなしが拒否される(403)
 * - Preview月次50回・Production月次900回で停止する(429)
 * - 直近1分のレート制限を超えると429になる
 * - サイズ超過が拒否される(413)
 * - Google Visionの通信失敗・エラー応答時に、画像・APIキー・Googleの
 *   生エラーが画面(レスポンス本文)にもログにも出ない
 * - 成功時は候補(text/confidence)だけを返す
 * ------------------------------------------------------------
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import worker from "./index";
import { API_KEY, type TestEnv, login, makeEnv, currentPeriod } from "./test-helpers";

function ocrRequest(
  body: unknown,
  opts: { cookie?: string; csrf?: string } = {},
): Request {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts.cookie) headers["Cookie"] = opts.cookie;
  if (opts.csrf) headers["X-CSRF-Token"] = opts.csrf;
  return new Request("https://example.com/api/ocr/recognize", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

async function callOcr(env: TestEnv, body: unknown, opts: { cookie?: string; csrf?: string } = {}) {
  const res = await worker.fetch(
    ocrRequest(body, opts),
    env as unknown as Parameters<typeof worker.fetch>[1],
  );
  const text = await res.text();
  let json: unknown = undefined;
  try {
    json = JSON.parse(text);
  } catch {
    // 本文がJSONでないテストケースは無い想定だが、失敗時はtextのまま扱う
  }
  return { res, text, json: json as Record<string, unknown> | undefined };
}

let fetchMock: ReturnType<typeof vi.fn>;
let consoleLogSpy: ReturnType<typeof vi.spyOn>;
let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** どのテストでも、コンソールに一切出力していないことを確認する共通アサーション。 */
function expectNoLogging(): void {
  expect(consoleLogSpy).not.toHaveBeenCalled();
  expect(consoleErrorSpy).not.toHaveBeenCalled();
  expect(consoleWarnSpy).not.toHaveBeenCalled();
}

describe("POST /api/ocr/recognize", () => {
  it("未ログイン(セッションCookieなし)だと401になり、Google Visionへは通信しない", async () => {
    const env = makeEnv();
    const { res, json } = await callOcr(env, { imageBase64: "abc" });
    expect(res.status).toBe(401);
    expect(json?.error).toBe("authentication required");
    expect(fetchMock).not.toHaveBeenCalled();
    expectNoLogging();
  });

  it("セッションはあるがCSRFトークンが無いと403になる", async () => {
    const env = makeEnv();
    const { cookie } = await login(env);
    const { res, json } = await callOcr(env, { imageBase64: "abc" }, { cookie });
    expect(res.status).toBe(403);
    expect(json?.error).toBe("invalid csrf token");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("CSRFトークンが一致しないと403になる", async () => {
    const env = makeEnv();
    const { cookie } = await login(env);
    const { res } = await callOcr(env, { imageBase64: "abc" }, { cookie, csrf: "wrong-token" });
    expect(res.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("画像サイズが上限(8,000,000文字)を超えると413になる", async () => {
    const env = makeEnv();
    const { cookie, csrfToken } = await login(env);
    const oversized = "a".repeat(8_000_001);
    const { res, json } = await callOcr(env, { imageBase64: oversized }, { cookie, csrf: csrfToken });
    expect(res.status).toBe(413);
    expect(json?.error).toBe("image is too large");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("直近1分間に10回呼び出し済みだとレート制限で429になる", async () => {
    const env = makeEnv({ OCR_MONTHLY_LIMIT: "900" });
    env.DB.seedRecentCalls(10);
    const { cookie, csrfToken } = await login(env);
    const { res, json } = await callOcr(env, { imageBase64: "abc" }, { cookie, csrf: csrfToken });
    expect(res.status).toBe(429);
    expect(json?.error).toBe("too many OCR requests, please wait a moment");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("Preview相当の月次上限(50回)に達していると429で止まり、Googleを呼ばない", async () => {
    const env = makeEnv({ OCR_MONTHLY_LIMIT: "50" });
    env.DB.seedMonthlyUsage(currentPeriod(), 50);
    const { cookie, csrfToken } = await login(env);
    const { res, json } = await callOcr(env, { imageBase64: "abc" }, { cookie, csrf: csrfToken });
    expect(res.status).toBe(429);
    expect(json?.error).toBe("monthly OCR limit reached");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("Production相当の月次上限(900回)に達していると429で止まり、Googleを呼ばない", async () => {
    const env = makeEnv({ OCR_MONTHLY_LIMIT: "900" });
    env.DB.seedMonthlyUsage(currentPeriod(), 900);
    const { cookie, csrfToken } = await login(env);
    const { res, json } = await callOcr(env, { imageBase64: "abc" }, { cookie, csrf: csrfToken });
    expect(res.status).toBe(429);
    expect(json?.error).toBe("monthly OCR limit reached");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("月次上限の1回手前(count=49/limit=50)なら通り、成功後にカウンタが50になる", async () => {
    const env = makeEnv({ OCR_MONTHLY_LIMIT: "50" });
    env.DB.seedMonthlyUsage(currentPeriod(), 49);
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ responses: [{ fullTextAnnotation: { text: "テスト", pages: [{ confidence: 0.9 }] } }] }), {
        status: 200,
      }),
    );
    const { cookie, csrfToken } = await login(env);
    const { res } = await callOcr(env, { imageBase64: "abc" }, { cookie, csrf: csrfToken });
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(env.DB.getMonthlyUsage(currentPeriod())).toBe(50);
  });

  it("Google Visionへの通信自体が失敗しても、画像・APIキー・生のエラーを返さずログにも出さない", async () => {
    const env = makeEnv();
    fetchMock.mockRejectedValue(new Error(`network down, leaked key=${API_KEY}, image bytes...`));
    const { cookie, csrfToken } = await login(env);
    const { res, text, json } = await callOcr(env, { imageBase64: "some-image-data" }, { cookie, csrf: csrfToken });
    expect(res.status).toBe(502);
    expect(json?.error).toBe("failed to reach Google Cloud Vision");
    expect(text).not.toContain(API_KEY);
    expect(text).not.toContain("some-image-data");
    expectNoLogging();
  });

  it("Google Visionがエラーステータスを返しても、本文を転送せず定型メッセージだけ返す", async () => {
    const env = makeEnv();
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: { message: `invalid key ${API_KEY}, raw google detail` } }), {
        status: 400,
      }),
    );
    const { cookie, csrfToken } = await login(env);
    const { res, text, json } = await callOcr(env, { imageBase64: "abc" }, { cookie, csrf: csrfToken });
    expect(res.status).toBe(502);
    expect(json?.error).toBe("Google Cloud Vision error (400)");
    expect(text).not.toContain(API_KEY);
    expect(text).not.toContain("raw google detail");
    expectNoLogging();
  });

  it("Googleが200を返してもresponses[0].errorが入っていれば、生のメッセージを転送しない", async () => {
    const env = makeEnv();
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({ responses: [{ error: { message: `secret leak ${API_KEY}` } }] }),
        { status: 200 },
      ),
    );
    const { cookie, csrfToken } = await login(env);
    const { res, text, json } = await callOcr(env, { imageBase64: "abc" }, { cookie, csrf: csrfToken });
    expect(res.status).toBe(502);
    expect(json?.error).toBe("Google Cloud Vision error");
    expect(text).not.toContain(API_KEY);
    expect(text).not.toContain("secret leak");
    expectNoLogging();
  });

  it("成功時は候補(text/confidence)だけを返し、APIキーは応答に含まれない", async () => {
    const env = makeEnv();
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          responses: [{ fullTextAnnotation: { text: "本文の候補です", pages: [{ confidence: 0.87 }] } }],
        }),
        { status: 200 },
      ),
    );
    const { cookie, csrfToken } = await login(env);
    const { res, text, json } = await callOcr(
      env,
      { imageBase64: "abc", orientation: "vertical" },
      { cookie, csrf: csrfToken },
    );
    expect(res.status).toBe(200);
    expect(json).toEqual({ text: "本文の候補です", confidence: 0.87, orientation: "vertical" });
    expect(text).not.toContain(API_KEY);
    expect(env.DB.getMonthlyUsage(currentPeriod())).toBe(1);

    // Google側に送るリクエストにはAPIキーが載るが、これはWorker→Google間の
    // サーバー間通信でありブラウザには一切見えない。fetchの呼び先が
    // Googleのドメインであることも確認する(ブラウザから直接Googleへ
    // 送信しないという要件は、クライアント側の実装で保証している——
    // src/lib/fieldnote/ocr.tsは常にWorker経由の相対パスしか呼ばない)。
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [calledUrl] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(String(calledUrl)).toContain("vision.googleapis.com");
  });

  it("GOOGLE_VISION_API_KEY未設定の環境では、Googleを呼ばずに500で拒否する(fail closed)", async () => {
    const env = makeEnv({ GOOGLE_VISION_API_KEY: undefined });
    const { cookie, csrfToken } = await login(env);
    const { res, json } = await callOcr(env, { imageBase64: "abc" }, { cookie, csrf: csrfToken });
    expect(res.status).toBe(500);
    expect(json?.error).toBe("server misconfigured: OCR is not configured");
    expect(json?.missing).toEqual(["GOOGLE_VISION_API_KEY"]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
