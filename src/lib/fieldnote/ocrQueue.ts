/**
 * ocrQueue.ts
 * ------------------------------------------------------------
 * OCR(Google Cloud Vision経由)の実行キュー。
 *
 * 【手動トリガーに変更(2026-09-21、Decision Log 0198)】従来
 * (Decision Log 0192)は撮影直後に自動でキューへ積んでいたが、
 * 外部(Google)へ送信する機能に切り替えたことを受け、「文字を読み取る」
 * を押した記録だけをこのキューに積む方式に変えた。撮影自体は引き続き
 * 止めない(連続撮影は維持)。
 *
 * 【同時実行を1件に絞る】複数の記録に対してほぼ同時に「読み取る」を
 * 押しても、実際の呼び出しは1件ずつ順番に進む(`running`フラグで
 * 直列化)。Cloudflare Worker側のレート制限・月次上限とあわせて、
 * 費用の急な積み上がりを防ぐ一助にする。
 *
 * 【再訪時の自動再開はしない】Google呼び出しは通常数秒で終わるネット
 * ワーク処理であり、Tesseract版のような「数秒〜十数秒かかるローカル
 * 処理」の途中でページを閉じる、という状況とは性質が異なる。
 * ページを閉じた・再読み込みした場合、その時点の呼び出しは単に
 * 中断されるだけで、次に開いたときに自動で再送信はしない
 * (無駄な・意図しない再送信を避ける)。`processing`のまま止まって
 * 見える記録は、本人が改めて「読み取る」を押せばやり直せる。
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
  private readonly getCsrfToken: () => string | null;
  private readonly queue: string[] = [];
  private readonly queued = new Set<string>();
  private running = false;
  private readonly listeners = new Set<Listener>();

  constructor(store: FieldnoteStore, getCsrfToken: () => string | null) {
    this.store = store;
    this.getCsrfToken = getCsrfToken;
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

    const orientation: OcrOrientation = capture.ocrOrientation ?? "horizontal";
    const cropRect: OcrCropRect | undefined = capture.ocrCropRect;

    const csrfToken = this.getCsrfToken();
    if (!csrfToken) {
      await this.store.updateOcrState(captureId, {
        ocrStatus: "failed",
        ocrOrientation: orientation,
        ocrCropRect: cropRect,
        ocrError: "管理者ログインが必要です。ログインしてからお試しください。",
      });
      this.emit({ captureId, status: "failed" });
      return;
    }

    await this.store.updateOcrState(captureId, {
      ocrStatus: "processing",
      ocrOrientation: orientation,
      ocrCropRect: cropRect,
    });
    this.emit({ captureId, status: "processing" });

    try {
      const result = await recognizeExcerpt(capture.image, orientation, cropRect, csrfToken, (progress) => {
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
