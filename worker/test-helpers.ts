/**
 * test-helpers.ts
 * ------------------------------------------------------------
 * `worker/index.ts`の実際の挙動テスト(2026-09-21、Decision Log 0198)
 * で共通して使うフィクスチャ。`worker/index.ts`がD1等を自前の最小限の
 * 型で書いている設計のおかげで、Cloudflareの実行環境を持ち込まず、
 * プレーンなNode上のvitestで直接テストできる(`worker/*.test.ts`
 * それぞれの冒頭コメント参照)。
 * ------------------------------------------------------------
 */
import { expect } from "vitest";
import { createHash } from "node:crypto";
import worker from "./index";

// --- worker/index.tsが直接importできない、テスト用の最小限のEnv型 ----
export interface TestEnv {
  DB: FakeD1;
  ASSETS: { fetch(request: Request): Promise<Response> };
  IP_HASH_SECRET?: string;
  ADMIN_PASSWORD_HASH?: string;
  ADMIN_PASSWORD_PEPPER?: string;
  ADMIN_SESSION_SECRET?: string;
  GOOGLE_VISION_API_KEY?: string;
  OCR_MONTHLY_LIMIT?: string;
}

/** admin_login_attempts / ocr_recent_calls / ocr_usage_monthly だけを解釈する最小限のフェイクD1。 */
export class FakeD1 {
  private loginAttempts: Array<{ ip_hash: string; attempted_at: number }> = [];
  private recentCalls: Array<{ called_at: number }> = [];
  private monthly = new Map<string, number>();

  seedMonthlyUsage(period: string, count: number): void {
    this.monthly.set(period, count);
  }
  seedRecentCalls(count: number): void {
    const now = this.nowSec();
    for (let i = 0; i < count; i += 1) this.recentCalls.push({ called_at: now });
  }
  getMonthlyUsage(period: string): number {
    return this.monthly.get(period) ?? 0;
  }

  private nowSec(): number {
    return Math.floor(Date.now() / 1000);
  }

  prepare(query: string) {
    let bound: unknown[] = [];
    const self = this;
    return {
      bind(...values: unknown[]) {
        bound = values;
        return this;
      },
      async first<T>(): Promise<T | null> {
        return self.execFirst(query, bound) as T | null;
      },
      async run() {
        self.execRun(query, bound);
        return { success: true, results: [] };
      },
      async all<T>() {
        return { success: true, results: self.execAll(query, bound) as T[] };
      },
    };
  }

  private execFirst(query: string, values: unknown[]): unknown {
    if (query.includes("FROM admin_login_attempts")) {
      const ipHash = String(values[0]);
      const windowSec = Number(values[1]);
      const cutoff = this.nowSec() - windowSec;
      const count = this.loginAttempts.filter((a) => a.ip_hash === ipHash && a.attempted_at > cutoff).length;
      return { count };
    }
    if (query.includes("FROM ocr_recent_calls")) {
      const windowSec = Number(values[0]);
      const cutoff = this.nowSec() - windowSec;
      const count = this.recentCalls.filter((c) => c.called_at > cutoff).length;
      return { count };
    }
    if (query.includes("FROM ocr_usage_monthly")) {
      const period = String(values[0]);
      const count = this.monthly.get(period);
      return count === undefined ? null : { count };
    }
    throw new Error(`FakeD1: unhandled first() query: ${query}`);
  }

  private execRun(query: string, values: unknown[]): void {
    if (query.includes("INSERT INTO admin_login_attempts")) {
      this.loginAttempts.push({ ip_hash: String(values[0]), attempted_at: this.nowSec() });
      return;
    }
    if (query.includes("DELETE FROM ocr_recent_calls")) {
      const cutoff = this.nowSec() - 3600;
      this.recentCalls = this.recentCalls.filter((c) => c.called_at >= cutoff);
      return;
    }
    if (query.includes("INSERT INTO ocr_recent_calls")) {
      this.recentCalls.push({ called_at: this.nowSec() });
      return;
    }
    if (query.includes("INSERT INTO ocr_usage_monthly")) {
      const period = String(values[0]);
      this.monthly.set(period, (this.monthly.get(period) ?? 0) + 1);
      return;
    }
    throw new Error(`FakeD1: unhandled run() query: ${query}`);
  }

  private execAll(query: string, _values: unknown[]): unknown[] {
    throw new Error(`FakeD1: unhandled all() query: ${query}`);
  }
}

export const PASSWORD = "correct horse battery staple";
export const PEPPER = "test-pepper";
export const API_KEY = "TEST-GOOGLE-VISION-API-KEY-SECRET-VALUE";

export function passwordHash(password: string, pepper: string): string {
  return createHash("sha256").update(`${password}:${pepper}`).digest("hex");
}

/** すべての必須secretが揃った、ログイン・OCRとも通る既定のテスト環境。個別のテストでoverridesを使って一部を欠けさせる。 */
export function makeEnv(overrides: Partial<TestEnv> = {}): TestEnv {
  return {
    DB: new FakeD1(),
    ASSETS: { fetch: async () => new Response("not found", { status: 404 }) },
    IP_HASH_SECRET: "test-ip-hash-secret",
    ADMIN_PASSWORD_HASH: passwordHash(PASSWORD, PEPPER),
    ADMIN_PASSWORD_PEPPER: PEPPER,
    ADMIN_SESSION_SECRET: "test-session-secret",
    GOOGLE_VISION_API_KEY: API_KEY,
    ...overrides,
  };
}

export async function login(env: TestEnv): Promise<{ cookie: string; csrfToken: string }> {
  const res = await worker.fetch(
    new Request("https://example.com/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", "CF-Connecting-IP": "203.0.113.1" },
      body: JSON.stringify({ password: PASSWORD }),
    }),
    env as unknown as Parameters<typeof worker.fetch>[1],
  );
  expect(res.status).toBe(200);
  const setCookie = res.headers.get("Set-Cookie");
  if (!setCookie) throw new Error("login did not set a session cookie");
  const cookie = setCookie.split(";")[0];
  const body = (await res.json()) as { csrfToken: string };
  return { cookie, csrfToken: body.csrfToken };
}

export function currentPeriod(): string {
  return new Date().toISOString().slice(0, 7);
}
