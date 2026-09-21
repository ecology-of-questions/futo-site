/**
 * ocrQueue.ts
 * ------------------------------------------------------------
 * 撮影を止めずに複数ページを連続撮影できるようにするための、OCRの
 * 背後キュー処理(2026-09-20、Decision Log 0192)。
 *
 * 【撮影とOCRを分離する】撮影(`store.addCapture`)は即座に完了し、
 * 呼び出し側(`app.ts`)はすぐ次の撮影に進める。OCRはこのキューに
 * 積むだけで、実際の認識は裏で1件ずつ進む(同時実行数は常に1、
 * `processing`フラグで直列化する)。
 *
 * 【状態はIndexedDBに永続化、キュー自体はメモリのみ】キュー配列は
 * ページを離れると消えるが、各記録の進行状況(`ocrStatus`)は
 * IndexedDBに書いてあるため、次にアプリを開いたときに
 * `resumeUnfinished()`で"pending"/"processing"のまま止まっている
 * 記録を再キューイングできる。"processing"のまま見つかった記録は、
 * 実際に処理が続いているとは仮定せず(タブを閉じれば処理は止まる)、
 * 最初からやり直す——同じ記録IDに対して行うのは「読み取り直し」であり、
 * 新しいレコードを作るわけではないので、二重処理をしても記録が
 * 重複することはない。
 *
 * 【読み取り結果は候補のまま】ここでは`excerptText`/`pageLabel`を
 * 一切書き換えない。`ocrCandidateText`/`ocrCandidatePage`に置くだけ
 * で、採用するかどうかはUI側(本人の操作)に委ねる。
 * ------------------------------------------------------------
 */
import { recognizeExcerpt, OcrError, type OcrOrientation, type OcrProgress, type OcrCropRect } from "./ocr";
import type { FieldnoteStore } from "./store";

export interface OcrQueueEvent {
  captureId: string;
  status: "processing" | "done" | "failed";
  progress?: OcrProgress;
}

type Listener = (event: OcrQueueEvent) => void;

export class OcrQueue {
  private readonly store: FieldnoteStore;
  private readonly queue: string[] = [];
  private readonly queued = new Set<string>();
  private running = false;
  private readonly listeners = new Set<Listener>();

  constructor(store: FieldnoteStore) {
    this.store = store;
  }

  /** 進行状況の通知を受け取る。戻り値を呼ぶと購読を解除する。 */
  onEvent(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: OcrQueueEvent): void {
    this.listeners.forEach((listener) => listener(event));
  }

  /** 記録IDをキューに積む。既に列にある/処理中なら何もしない(二重投入防止)。 */
  enqueue(captureId: string): void {
    if (this.queued.has(captureId)) return;
    this.queued.add(captureId);
    this.queue.push(captureId);
    void this.runLoop();
  }

  /** アプリ起動時に1回呼ぶ。前回止まったままの記録を再開する。 */
  async resumeUnfinished(): Promise<void> {
    const unfinished = await this.store.listUnfinishedOcrCaptures();
    unfinished.forEach((capture) => this.enqueue(capture.id));
  }

  private async runLoop(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      while (this.queue.length > 0) {
        const captureId = this.queue.shift();
        if (!captureId) continue;
        this.queued.delete(captureId);
        await this.processOne(captureId);
      }
    } finally {
      this.running = false;
    }
  }

  private async processOne(captureId: string): Promise<void> {
    const capture = await this.store.getCapture(captureId);
    if (!capture || capture.kind !== "photo" || !capture.image) return;
    // 既に完了済みなら再処理しない(resumeUnfinishedとの二重処理防止)。
    if (capture.ocrStatus === "done") return;

    const orientation: OcrOrientation = capture.ocrOrientation ?? "horizontal";
    const cropRect: OcrCropRect | undefined = capture.ocrCropRect;
    await this.store.updateOcrState(captureId, {
      ocrStatus: "processing",
      ocrOrientation: orientation,
      ocrCropRect: cropRect,
    });
    this.emit({ captureId, status: "processing" });

    try {
      const result = await recognizeExcerpt(capture.image, orientation, cropRect, (progress) => {
        this.emit({ captureId, status: "processing", progress });
      });
      await this.store.updateOcrState(captureId, {
        ocrStatus: "done",
        ocrOrientation: orientation,
        ocrCropRect: cropRect,
        ocrCandidateText: result.text || undefined,
        ocrCandidatePage: result.pageCandidate,
      });
      this.emit({ captureId, status: "done" });
    } catch (error) {
      const message = error instanceof OcrError ? error.message : `読み取りに失敗しました。\n詳細: ${String(error)}`;
      await this.store.updateOcrState(captureId, {
        ocrStatus: "failed",
        ocrOrientation: orientation,
        ocrCropRect: cropRect,
        ocrError: message,
      });
      this.emit({ captureId, status: "failed" });
    }
  }
}
