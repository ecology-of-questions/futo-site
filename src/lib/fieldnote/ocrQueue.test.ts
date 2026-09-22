/**
 * ocrQueue.test.ts
 * ------------------------------------------------------------
 * OcrQueue(2026-09-21、Decision Log 0198)の実際の挙動テスト。
 *
 * 検証観点(プロジェクトオーナーの指示):
 * - 未ログイン(csrfTokenが取得できない)時は、recognizeExcerpt
 *   (Worker `/api/ocr/recognize` を呼ぶ唯一の関数)を一切呼ばない
 *   ため、ブラウザからGoogle Visionへ直接どころか、Workerへも通信が
 *   発生しない。
 * - OCR結果は`ocrCandidateText`/`ocrCandidatePage`という「候補」に
 *   しか反映されず、`updateCapture`(抜粋・ページ本体を書き換える方の
 *   メソッド)は一切呼ばれない。既存の抜粋・ページラベルは、キューの
 *   処理を通しても変化しない。
 * ------------------------------------------------------------
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FieldnoteCapture } from "../../types/fieldnote";
import type { FieldnoteOcrStateUpdate, FieldnoteStore } from "./store";

const { recognizeExcerptMock, OcrErrorMock } = vi.hoisted(() => {
  class OcrErrorMock extends Error {
    stage: string;
    constructor(message: string, stage: string) {
      super(message);
      this.stage = stage;
    }
  }
  return { recognizeExcerptMock: vi.fn(), OcrErrorMock };
});

vi.mock("./ocr", () => ({
  recognizeExcerpt: recognizeExcerptMock,
  OcrError: OcrErrorMock,
}));

const { OcrQueue } = await import("./ocrQueue");

function makeCapture(overrides: Partial<FieldnoteCapture> = {}): FieldnoteCapture {
  return {
    id: "capture-1",
    sessionId: "session-1",
    createdAt: Date.now(),
    kind: "photo",
    image: new Blob(["fake-image-bytes"]),
    excerptText: "元々の抜粋(これは変わらないはず)",
    pageLabel: "42",
    ...overrides,
  } as FieldnoteCapture;
}

/** テストに必要なメソッドだけを実装するフェイクストア。呼ばれるべきでないメソッドは呼ばれたら失敗させる。 */
class FakeStore implements Partial<FieldnoteStore> {
  capture: FieldnoteCapture;
  updateOcrStateCalls: FieldnoteOcrStateUpdate[] = [];

  constructor(capture: FieldnoteCapture) {
    this.capture = capture;
  }

  async getCapture(captureId: string): Promise<FieldnoteCapture | undefined> {
    return captureId === this.capture.id ? this.capture : undefined;
  }

  async updateOcrState(captureId: string, patch: FieldnoteOcrStateUpdate): Promise<FieldnoteCapture> {
    expect(captureId).toBe(this.capture.id);
    this.updateOcrStateCalls.push(patch);
    this.capture = {
      ...this.capture,
      ...(patch.ocrStatus !== undefined ? { ocrStatus: patch.ocrStatus } : {}),
      ocrOrientation: patch.ocrOrientation,
      ocrCropRect: patch.ocrCropRect,
      ocrCandidateText: patch.ocrCandidateText,
      ocrCandidatePage: patch.ocrCandidatePage,
      ocrError: patch.ocrError,
    };
    return this.capture;
  }

  async updateCapture(): Promise<FieldnoteCapture> {
    throw new Error("updateCapture must not be called by OcrQueue: it would overwrite excerptText/pageLabel directly");
  }
}

function waitForEvent(queue: InstanceType<typeof OcrQueue>): Promise<void> {
  return new Promise((resolve) => {
    const unsubscribe = queue.onEvent((event) => {
      if (event.status === "done" || event.status === "failed") {
        unsubscribe();
        resolve();
      }
    });
  });
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("OcrQueue", () => {
  it("csrfTokenが無い(未ログイン)場合、recognizeExcerptを一切呼ばずfailedにする", async () => {
    const capture = makeCapture();
    const store = new FakeStore(capture);
    const queue = new OcrQueue(store as unknown as FieldnoteStore, () => null);

    const done = waitForEvent(queue);
    queue.enqueue(capture.id);
    await done;

    expect(recognizeExcerptMock).not.toHaveBeenCalled();
    expect(store.capture.ocrStatus).toBe("failed");
    expect(store.capture.ocrError).toContain("管理者ログイン");
    // 既存の抜粋・ページは一切変化しない。
    expect(store.capture.excerptText).toBe("元々の抜粋(これは変わらないはず)");
    expect(store.capture.pageLabel).toBe("42");
  });

  it("csrfTokenがある場合はrecognizeExcerptを呼び、結果を候補としてだけ反映する(既存の抜粋・ページは書き換えない)", async () => {
    recognizeExcerptMock.mockResolvedValue({
      text: "読み取り候補のテキスト",
      pageCandidate: "99",
      confidence: 0.8,
    });
    const capture = makeCapture();
    const store = new FakeStore(capture);
    const queue = new OcrQueue(store as unknown as FieldnoteStore, () => "csrf-token-value");

    const done = waitForEvent(queue);
    queue.enqueue(capture.id);
    await done;

    expect(recognizeExcerptMock).toHaveBeenCalledTimes(1);
    expect(store.capture.ocrStatus).toBe("done");
    expect(store.capture.ocrCandidateText).toBe("読み取り候補のテキスト");
    expect(store.capture.ocrCandidatePage).toBe("99");
    // 候補が入っても、本体の抜粋・ページラベルは「使う」を押すまで変わらない。
    expect(store.capture.excerptText).toBe("元々の抜粋(これは変わらないはず)");
    expect(store.capture.pageLabel).toBe("42");
  });

  it("recognizeExcerptが失敗した場合も、既存の抜粋・ページは変化しない", async () => {
    recognizeExcerptMock.mockRejectedValue(new OcrErrorMock("読み取りに失敗しました。\n詳細: network", "network"));
    const capture = makeCapture();
    const store = new FakeStore(capture);
    const queue = new OcrQueue(store as unknown as FieldnoteStore, () => "csrf-token-value");

    const done = waitForEvent(queue);
    queue.enqueue(capture.id);
    await done;

    expect(store.capture.ocrStatus).toBe("failed");
    expect(store.capture.excerptText).toBe("元々の抜粋(これは変わらないはず)");
    expect(store.capture.pageLabel).toBe("42");
  });
});
