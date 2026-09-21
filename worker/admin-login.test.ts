/**
 * admin-login.test.ts
 * ------------------------------------------------------------
 * `/api/admin/login`(Decision Log 0189)のfail closed判定と、その
 * 診断情報(`missing`)の実際の挙動テスト(2026-09-21、Decision Log
 * 0198への追記)。
 *
 * きっかけ: Previewの実機確認で「サーバー側の設定が未完了です
 * (本番未配線)。」が表示された。`GOOGLE_VISION_API_KEY`・
 * `ADMIN_PASSWORD_HASH`・`ADMIN_PASSWORD_PEPPER`・`ADMIN_SESSION_SECRET`
 * は設定済みとの報告だったが、ログインに必要な4つのsecret
 * (`ADMIN_PASSWORD_HASH`/`ADMIN_PASSWORD_PEPPER`/`ADMIN_SESSION_SECRET`/
 * `IP_HASH_SECRET`)のうち`IP_HASH_SECRET`だけが報告に含まれていなかった。
 * `handleAdminLogin`のfail closedチェックはこの4つ**すべて**を要求する
 * (`worker/index.ts`の`missingAdminLoginSecrets()`参照)。値を一切含まない
 * 「未設定の変数名の配列」をエラー応答に含めることで、Dashboardを
 * 見比べなくても本人がこの場で原因を特定できるようにした。
 * ------------------------------------------------------------
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import worker from "./index";
import { PASSWORD, makeEnv, type TestEnv } from "./test-helpers";

function loginRequest(password: string): Request {
  return new Request("https://example.com/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", "CF-Connecting-IP": "203.0.113.1" },
    body: JSON.stringify({ password }),
  });
}

async function callLogin(env: TestEnv, password: string) {
  const res = await worker.fetch(loginRequest(password), env as unknown as Parameters<typeof worker.fetch>[1]);
  const text = await res.text();
  let json: Record<string, unknown> | undefined;
  try {
    json = JSON.parse(text);
  } catch {
    // ボディなし/非JSONは想定していないが、失敗時のデバッグ用にtextのまま残す
  }
  return { res, text, json };
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("POST /api/admin/login", () => {
  it("4つのsecretがすべて未設定だと、missingに4つとも列挙される", async () => {
    const env = makeEnv({
      ADMIN_PASSWORD_HASH: undefined,
      ADMIN_PASSWORD_PEPPER: undefined,
      ADMIN_SESSION_SECRET: undefined,
      IP_HASH_SECRET: undefined,
    });
    const { res, json } = await callLogin(env, PASSWORD);
    expect(res.status).toBe(500);
    expect(json?.error).toBe("server misconfigured");
    expect(json?.missing).toEqual([
      "ADMIN_PASSWORD_HASH",
      "ADMIN_PASSWORD_PEPPER",
      "ADMIN_SESSION_SECRET",
      "IP_HASH_SECRET",
    ]);
  });

  it("IP_HASH_SECRETだけが未設定だと、missingにはIP_HASH_SECRETだけが入る(今回の実機確認で起きた事象の再現)", async () => {
    const env = makeEnv({ IP_HASH_SECRET: undefined });
    const { res, json } = await callLogin(env, PASSWORD);
    expect(res.status).toBe(500);
    expect(json?.error).toBe("server misconfigured");
    expect(json?.missing).toEqual(["IP_HASH_SECRET"]);
  });

  it("ADMIN_PASSWORD_PEPPERだけが未設定だと、missingにはADMIN_PASSWORD_PEPPERだけが入る", async () => {
    const env = makeEnv({ ADMIN_PASSWORD_PEPPER: undefined });
    const { res, json } = await callLogin(env, PASSWORD);
    expect(res.status).toBe(500);
    expect(json?.missing).toEqual(["ADMIN_PASSWORD_PEPPER"]);
  });

  it("missingの応答本文に、secretの値そのものは一切含まれない", async () => {
    const env = makeEnv({ IP_HASH_SECRET: undefined });
    const { text } = await callLogin(env, PASSWORD);
    expect(text).not.toContain(env.ADMIN_PASSWORD_HASH);
    expect(text).not.toContain(env.ADMIN_PASSWORD_PEPPER);
    expect(text).not.toContain(env.ADMIN_SESSION_SECRET);
    expect(text).not.toContain(env.GOOGLE_VISION_API_KEY as string);
  });

  it("4つとも設定済みで、パスワードが正しければ200・Set-Cookie・csrfTokenを返す", async () => {
    const env = makeEnv();
    const { res, json } = await callLogin(env, PASSWORD);
    expect(res.status).toBe(200);
    expect(typeof json?.csrfToken).toBe("string");
    expect(res.headers.get("Set-Cookie")).toContain("futo_admin_session=");
  });

  it("4つとも設定済みでも、パスワードが間違っていれば401(missingは無い)", async () => {
    const env = makeEnv();
    const { res, json } = await callLogin(env, "wrong-password");
    expect(res.status).toBe(401);
    expect(json?.error).toBe("invalid password");
    expect(json?.missing).toBeUndefined();
  });

  it("secretは4つとも揃っているのにD1クエリ自体が失敗する場合、クラッシュせずJSONの500を返す(未配線ではない別の例外の再現)", async () => {
    const env = makeEnv();
    // admin_login_attemptsのレート制限チェック(secretチェックの直後、
    // 最初のD1呼び出し)を失敗させる。D1バインディングの設定ミスや、
    // migrations/0002_reading_notes.sqlが未適用でテーブルが無い場合に
    // 実際に起こり得るエラーを模している。
    env.DB.failNextOperation("D1_ERROR: no such table: admin_login_attempts");
    const { res, json } = await callLogin(env, PASSWORD);
    expect(res.status).toBe(500);
    expect(json?.error).toBe("internal error");
    expect(json?.detail).toContain("no such table: admin_login_attempts");
    // secretは一切ログ・応答に出ない。
    expect(json?.detail).not.toContain(env.ADMIN_SESSION_SECRET);
  });
});

describe("GET /api/admin/diagnostics", () => {
  async function callDiagnostics(env: TestEnv) {
    const res = await worker.fetch(
      new Request("https://example.com/api/admin/diagnostics"),
      env as unknown as Parameters<typeof worker.fetch>[1],
    );
    const text = await res.text();
    return { res, json: JSON.parse(text) as Record<string, unknown>, text };
  }

  it("secretは真偽値だけを返し、値は一切含まない", async () => {
    const env = makeEnv({ IP_HASH_SECRET: undefined });
    const { res, json, text } = await callDiagnostics(env);
    expect(res.status).toBe(200);
    expect(json.secretsPresent).toEqual({
      ADMIN_PASSWORD_HASH: true,
      ADMIN_PASSWORD_PEPPER: true,
      ADMIN_SESSION_SECRET: true,
      IP_HASH_SECRET: false,
      GOOGLE_VISION_API_KEY: true,
    });
    expect(text).not.toContain(env.ADMIN_PASSWORD_HASH as string);
    expect(text).not.toContain(env.ADMIN_SESSION_SECRET as string);
    expect(text).not.toContain(env.GOOGLE_VISION_API_KEY as string);
  });

  it("D1に接続でき、想定するテーブルが揃っていればdb.okがtrueになる", async () => {
    const env = makeEnv();
    const { json } = await callDiagnostics(env);
    const db = json.db as { ok: boolean; error: string | null; tables: string[] };
    expect(db.ok).toBe(true);
    expect(db.tables).toEqual(
      expect.arrayContaining(["admin_login_attempts", "ocr_usage_monthly", "ocr_recent_calls"]),
    );
  });

  it("migrationが未適用でテーブルが無い状態を、tablesの欠落として検出できる", async () => {
    const env = makeEnv();
    env.DB.setTables(["entries"]); // 0002/0003のmigrationが未適用の状態を模す
    const { json } = await callDiagnostics(env);
    const db = json.db as { ok: boolean; tables: string[] };
    expect(db.ok).toBe(true);
    expect(db.tables).not.toContain("admin_login_attempts");
  });

  it("D1バインディング自体が壊れている場合は、クラッシュせずdb.okをfalse・db.errorにメッセージを入れて返す", async () => {
    const env = makeEnv();
    env.DB.failNextOperation("D1_ERROR: database_id not found");
    const { res, json } = await callDiagnostics(env);
    expect(res.status).toBe(200);
    const db = json.db as { ok: boolean; error: string | null };
    expect(db.ok).toBe(false);
    expect(db.error).toContain("database_id not found");
  });
});
