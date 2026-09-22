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

/**
 * iOS Safari実機で観測された事象(2026-09-22、Decision Log 0198追記):
 * `createImageBitmap(photoBlob)`が「InvalidStateError: An error
 * occurred reading the Blob argument to createImageBitmap」を投げ、
 * Google Vision・Workerに到達する前にOCRが失敗する。`createImageBitmap`
 * が例外を投げる状況をここで再現し、Blob→`FileReader.readAsDataURL()`
 * →`data:`URLを持つ`<img>`の`load`完了→Canvasという、Safari互換の
 * フォールバック経路(`ocr.ts`の`loadImageSourceViaDataUrl`)へ自動的に
 * 切り替わることを検証する。
 *
 * 【object URLベースのフォールバックは廃止した】当初`URL.
 * createObjectURL`+`<img>`によるフォールバックを実装したが、実機の
 * iOS Safariではこちらも「failed to load image via <img> fallback」で
 * 失敗した(プロジェクトオーナーからの報告)。そのため、Blobの中身を
 * Base64のData URLとして直接`<img src>`に渡す、現在の実装に作り直した。
 *
 * このフォールバック経路自体は、実機のiOS Safariでは確認できていない
 * (このセッションに実機が無いため)。
 */
describe("recognizeExcerpt: createImageBitmapが失敗した場合のフォールバック", () => {
  class FakeImage {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    naturalWidth = 10;
    naturalHeight = 10;
    private _src = "";
    set src(value: string) {
      this._src = value;
      // <img>の非同期load完了を模す。
      queueMicrotask(() => this.onload?.());
    }
    get src(): string {
      return this._src;
    }
  }

  beforeEach(() => {
    // createImageBitmap自体は「使える」が、実行すると必ず失敗する
    // (iOS Safariの実際の事象を再現)。
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => {
        throw new DOMException(
          "An error occurred reading the Blob argument to createImageBitmap",
          "InvalidStateError",
        );
      }),
    );
    vi.stubGlobal("Image", FakeImage);
    // FileReaderは、ファイル冒頭のbeforeEachで既にFakeFileReaderへ
    // 差し替え済み(readAsDataURLが実際にBase64のdata:URLを返す)。
  });

  it("cropRect省略時(resizeForOcrだけが画像を読み込む経路)でも、Data URLフォールバックでOCRを完了できる", async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) =>
      new Response(JSON.stringify({ text: "OK", confidence: 0.5 }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const createImageBitmapSpy = createImageBitmap as unknown as ReturnType<typeof vi.fn>;

    const { recognizeExcerpt } = await import("./ocr");
    const image = new Blob(["fake-image-bytes"], { type: "image/jpeg" });
    const result = await recognizeExcerpt(image, "horizontal", undefined, "csrf-token-value");

    expect(result.text).toBe("OK");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    // createImageBitmapは試みた上で失敗し、Data URLベースの経路へ切り替わっている。
    expect(createImageBitmapSpy).toHaveBeenCalledTimes(1);
  });

  it("読み取り範囲・回転を指定した場合(cropForOcrも画像を読み込む経路)でも、Data URLフォールバックで切り抜き済みJPEGを送信できる", async () => {
    // cropForOcr/resizeForOcrが使うcanvas APIの最小限のフェイク。
    const fakeCtx = { translate: vi.fn(), rotate: vi.fn(), drawImage: vi.fn() };
    const fakeCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => fakeCtx),
      toBlob: vi.fn((cb: (blob: Blob | null) => void) => cb(new Blob(["fake-cropped-jpeg"], { type: "image/jpeg" }))),
    };
    vi.stubGlobal("document", { createElement: vi.fn(() => fakeCanvas) });

    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) =>
      new Response(JSON.stringify({ text: "縦書きの候補", confidence: 0.7 }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { recognizeExcerpt } = await import("./ocr");
    const image = new Blob(["fake-image-bytes"], { type: "image/jpeg" });
    const result = await recognizeExcerpt(
      image,
      "vertical",
      { x: 0.1, y: 0.2, width: 0.5, height: 0.6, rotationDeg: 5 },
      "csrf-token-value",
    );

    expect(result.text).toBe("縦書きの候補");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    const parsed = JSON.parse(init?.body as string) as Record<string, unknown>;
    expect(parsed.orientation).toBe("vertical");
    // 回転(translate/rotate)・切り抜き(drawImage)が実際に呼ばれている
    // (読み取り範囲・回転の指定がフォールバック経路でも効いていることの確認)。
    expect(fakeCtx.translate).toHaveBeenCalled();
    expect(fakeCtx.rotate).toHaveBeenCalled();
    expect(fakeCtx.drawImage).toHaveBeenCalled();
  });

  it("createImageBitmap・Data URLフォールバックの両方が失敗しても、利用者向けメッセージに実装詳細を含めない", async () => {
    class FailingImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      private _src = "";
      set src(value: string) {
        this._src = value;
        queueMicrotask(() => this.onerror?.());
      }
      get src(): string {
        return this._src;
      }
    }
    vi.stubGlobal("Image", FailingImage);

    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { recognizeExcerpt, OcrError } = await import("./ocr");
    const image = new Blob(["fake-image-bytes"], { type: "image/jpeg" });

    await expect(recognizeExcerpt(image, "horizontal", undefined, "csrf-token-value")).rejects.toSatisfy(
      (error: unknown) => {
        expect(error).toBeInstanceOf(OcrError);
        const ocrError = error as InstanceType<typeof OcrError>;
        expect(ocrError.stage).toBe("image_read");
        expect(ocrError.message).toBe("写真を読み込めませんでした。もう一度試すか、撮り直してください。");
        // createImageBitmap/<img>/InvalidStateErrorといった実装詳細を、
        // 利用者向けメッセージには一切含めない。
        expect(ocrError.message).not.toMatch(/createImageBitmap|<img>|InvalidStateError/);
        return true;
      },
    );
    // 画像を読み込めなかった時点でGoogle Vision(Worker)へは送信しない。
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("recognizeExcerpt: 撮影直後のBlobがおかしい場合(OCR実行前の検証)", () => {
  it("Blobのtypeがimage/jpegでない場合、Googleへ送らずに定型メッセージのOcrErrorを投げる", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const createImageBitmapSpy = createImageBitmap as unknown as ReturnType<typeof vi.fn>;

    const { recognizeExcerpt, OcrError } = await import("./ocr");
    const image = new Blob(["not actually a jpeg"], { type: "image/heic" });

    await expect(recognizeExcerpt(image, "horizontal", undefined, "csrf-token-value")).rejects.toSatisfy(
      (error: unknown) => {
        expect(error).toBeInstanceOf(OcrError);
        const ocrError = error as InstanceType<typeof OcrError>;
        expect(ocrError.stage).toBe("image_read");
        expect(ocrError.message).toBe("写真を読み込めませんでした。もう一度試すか、撮り直してください。");
        return true;
      },
    );
    expect(fetchMock).not.toHaveBeenCalled();
    // typeの時点で弾くため、画像を読み込む処理自体も一切試みない。
    expect(createImageBitmapSpy).not.toHaveBeenCalled();
  });

  it("Blobのsizeが0の場合も、Googleへ送らずに定型メッセージのOcrErrorを投げる", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { recognizeExcerpt, OcrError } = await import("./ocr");
    const image = new Blob([], { type: "image/jpeg" });

    await expect(recognizeExcerpt(image, "horizontal", undefined, "csrf-token-value")).rejects.toSatisfy(
      (error: unknown) => {
        expect(error).toBeInstanceOf(OcrError);
        expect((error as InstanceType<typeof OcrError>).stage).toBe("image_read");
        return true;
      },
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
