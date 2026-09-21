/**
 * ocr.test.ts
 * ------------------------------------------------------------
 * `recognizeExcerpt()`(2026-09-21、Decision Log 0198)が、ログイン
 * 済み(csrfTokenあり)の場合でも常にWorker経由の同一オリジン相対パス
 * (`/api/ocr/recognize`)だけを呼び、ブラウザからGoogle Cloud Vision
 * (`vision.googleapis.com`)へ直接通信しないことを確認する。
 *
 * `createImageBitmap`/`FileReader`はNode(vitestのnode環境)に存在しない
 * ブラウザAPIのため、この2つだけをテスト内で最小限のフェイクに差し替える。
 * `cropRect`を省略し、フェイクの画像サイズをOCR_INPUT_MAX_DIMENSION以下
 * にすることで、`document`(canvas)には一切触れない経路だけを通す
 * (cropForOcr/resizeForOcrはどちらも早期リターンする)。
 * ------------------------------------------------------------
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

class FakeFileReader {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  result: string | null = null;

  readAsDataURL(blob: Blob): void {
    void blob
      .arrayBuffer()
      .then((buf) => {
        const base64 = Buffer.from(buf).toString("base64");
        this.result = `data:application/octet-stream;base64,${base64}`;
        this.onload?.();
      })
      .catch(() => this.onerror?.());
  }
}

beforeEach(() => {
  vi.stubGlobal(
    "createImageBitmap",
    vi.fn(async () => ({ width: 10, height: 10, close: () => {} })),
  );
  vi.stubGlobal("FileReader", FakeFileReader);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("recognizeExcerpt", () => {
  it("常に同一オリジンの/api/ocr/recognizeだけを呼び、Googleへ直接通信しない", async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) =>
      new Response(JSON.stringify({ text: "OK", confidence: 0.5 }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { recognizeExcerpt } = await import("./ocr");
    const image = new Blob(["fake-image-bytes"], { type: "image/jpeg" });
    await recognizeExcerpt(image, "horizontal", undefined, "csrf-token-value");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/ocr/recognize");
    expect(url).not.toMatch(/google/i);
    expect((init?.headers as Record<string, string>)["X-CSRF-Token"]).toBe("csrf-token-value");
  });

  it("画像原本(Blob)ではなく、CSRFトークン付きのJSONだけを送信する(原本を別送しない)", async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) =>
      new Response(JSON.stringify({ text: "OK", confidence: 0.5 }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { recognizeExcerpt } = await import("./ocr");
    const image = new Blob(["fake-image-bytes"], { type: "image/jpeg" });
    await recognizeExcerpt(image, "horizontal", undefined, "csrf-token-value");

    const [, init] = fetchMock.mock.calls[0];
    expect(typeof init?.body).toBe("string");
    const parsed = JSON.parse(init?.body as string) as Record<string, unknown>;
    expect(typeof parsed.imageBase64).toBe("string");
    expect(parsed.orientation).toBe("horizontal");
  });
});
