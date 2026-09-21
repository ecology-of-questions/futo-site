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

/**
 * 撮影画像(=保存され、「元の写真を見る」・共有/ダウンロードで
 * 利用者が取り出せる原本)の長辺の上限(px)。
 *
 * 【2026-09-02、PRセルフレビューで追加】当初はOCRの可読性とIndexedDB
 * 容量の両方を考慮した値(1600px)だった。
 * 【2026-09-20、Decision Log 0193で1600→2600に変更】実機(iPhone)での
 * 縦書きOCR精度不足の調査で、この上限自体がOCR側の精度不足の一因と
 * 判明した。
 * 【2026-09-21、Decision Log 0194で「原本」と「OCR入力」を分離】
 * 「撮影した元の写真ファイルを取り出せない」という指摘を受け、原本
 * (この定数が上限をかける画像。IndexedDBに保存され、共有/ダウンロード
 * の対象になる)とOCR入力(recognizeExcerpt内で原本から都度縮小生成
 * する、保存しない一時画像。`src/lib/fieldnote/ocr.ts`の
 * `OCR_INPUT_MAX_DIMENSION`)を別の上限に分離した。原本は「利用者が
 * 後で取り出せる記録」としての役割を優先し、OCRの都合で縮小しない。
 * この上限は、getUserMediaが実際に提供する解像度を超えて画質を
 * 作り出すことはできないため、実質的な安全上限(暴走防止)として機能する
 * (iPhoneの`environment`カメラの映像ストリームは、静止画撮影機能の
 * センサー解像度よりかなり低いことが一般的)。
 */
const MAX_CAPTURE_DIMENSION = 4000;
const CAPTURE_JPEG_QUALITY = 0.9;

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
