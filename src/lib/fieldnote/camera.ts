/**
 * camera.ts
 * ------------------------------------------------------------
 * カメラプレビューの開始/停止と、プレビューを止めずに現在のフレームを
 * 静止画として取り出す処理。getUserMedia回りをUI(app.ts)から分離する。
 * 撮影後に確認画面を挟まない仕様のため、capture()は静止画を返すだけで
 * プレビューには一切手を触れない(呼び出し側は続けてプレビューを
 * 見せ続けられる)。
 *
 * start()がstream取得後のどの段階で失敗しても(video.play()の拒否等)、
 * 取得済みのtrackを必ずstopしてから例外を投げる
 * (2026-09-02, PRセルフレビューで修正。Decision Log 0058参照)。
 * ------------------------------------------------------------
 */

/** 撮影画像の長辺の上限(px)。OCRでの可読性を保ちつつ、IndexedDBの
 *  容量・メモリ消費を抑えるための上限(2026-09-02、PRセルフレビュー
 *  で追加)。
 *
 *  【2026-09-20、Decision Log 0193で1600→2600に変更】実機(iPhone)での
 *  縦書きOCR精度不足の調査で、この上限が原因の一つと判明した。
 *  iPhoneのカメラは通常この値よりはるかに高い解像度で撮影できるため、
 *  1600pxへの縮小は密な縦書き(1ページに数十列)の各文字の画素数を
 *  過度に減らし、複雑な字画を持つ漢字の認識を妨げていた可能性が高い。
 *  数値を上げるとIndexedDBの保存容量・OCRの所要時間も増えるため、
 *  無制限に上げず段階的な値とした(実機での再検証が必要)。 */
const MAX_CAPTURE_DIMENSION = 2600;
const CAPTURE_JPEG_QUALITY = 0.85;

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
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: MAX_CAPTURE_DIMENSION },
          height: { ideal: MAX_CAPTURE_DIMENSION },
        },
        audio: false,
      });
    } catch {
      throw new FieldnoteCameraError("カメラを起動できませんでした。カメラへのアクセスを許可してください。");
    }

    this.stream = stream;
    this.videoEl = videoEl;
    videoEl.srcObject = stream;

    try {
      await videoEl.play();
    } catch {
      // video.play()が失敗した場合(自動再生ブロック等)、取得済みの
      // trackを起動したままにしない。
      this.stop();
      throw new FieldnoteCameraError("カメラの映像を開始できませんでした。");
    }
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

    // videoの実解像度がMAX_CAPTURE_DIMENSIONを超える場合は縮小する
    // (getUserMediaのwidth/height制約はブラウザ側で無視されることが
    // あるため、ここでも上限をかけて保険とする)。
    const scale = Math.min(1, MAX_CAPTURE_DIMENSION / Math.max(video.videoWidth, video.videoHeight));
    const width = Math.round(video.videoWidth * scale);
    const height = Math.round(video.videoHeight * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new FieldnoteCameraError("撮影に失敗しました");
    }
    ctx.drawImage(video, 0, 0, width, height);

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new FieldnoteCameraError("撮影に失敗しました"))),
        "image/jpeg",
        CAPTURE_JPEG_QUALITY,
      );
    });
  }
}
