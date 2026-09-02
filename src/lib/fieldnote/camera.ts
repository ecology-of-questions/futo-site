/**
 * camera.ts
 * ------------------------------------------------------------
 * カメラプレビューの開始/停止と、プレビューを止めずに現在のフレームを
 * 静止画として取り出す処理。getUserMedia回りをUI(app.ts)から分離する。
 * 撮影後に確認画面を挟まない仕様のため、capture()は静止画を返すだけで
 * プレビューには一切手を触れない(呼び出し側は続けてプレビューを
 * 見せ続けられる)。
 * ------------------------------------------------------------
 */

export class FieldnoteCameraError extends Error {}

export class FieldnoteCamera {
  private stream: MediaStream | null = null;
  private videoEl: HTMLVideoElement | null = null;

  async start(videoEl: HTMLVideoElement): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new FieldnoteCameraError("このブラウザはカメラに対応していません");
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
    } catch {
      throw new FieldnoteCameraError("カメラを起動できませんでした。カメラへのアクセスを許可してください。");
    }

    this.stream = stream;
    this.videoEl = videoEl;
    videoEl.srcObject = stream;
    await videoEl.play();
  }

  stop(): void {
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    if (this.videoEl) {
      this.videoEl.srcObject = null;
    }
    this.videoEl = null;
  }

  async capture(): Promise<Blob> {
    const video = this.videoEl;
    if (!video) {
      throw new FieldnoteCameraError("カメラが起動していません");
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new FieldnoteCameraError("撮影に失敗しました");
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new FieldnoteCameraError("撮影に失敗しました"))),
        "image/jpeg",
        0.9,
      );
    });
  }
}
