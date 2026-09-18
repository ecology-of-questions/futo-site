/**
 * walkingScore.ts
 * ------------------------------------------------------------
 * 「散歩譜」(旧「音の道」、/participate/oto-no-michi)が表示する
 * 身体譜(WalkingScore)v0の型(2026-09-18、Decision Log 0182)。
 *
 * 時刻はすべて区間開始からの相対値(ミリ秒)。GPS・方角・絶対日時・
 * 実経路・移動距離は扱わない(指示書「散歩譜＋支援」v2、位置情報は
 * 収集しない方針)。
 * ------------------------------------------------------------
 */

/**
 * ステップ(一歩)の左右。実記録で左右が不明な場合は"unknown"の
 * 共通レーンを使う(左右交互と仮定して実測扱いしない)。
 */
export type WalkingScoreStepSide = "left" | "right" | "unknown";

export interface WalkingScoreStep {
  /** 区間開始からの経過ミリ秒 */
  atMs: number;
  side: WalkingScoreStepSide;
}

export interface WalkingScore {
  id: string;
  /** "demo"は架空データ。"recorded"は将来、本人が公開を承認した実記録用 */
  kind: "demo" | "recorded";
  durationMs: number;
  steps: WalkingScoreStep[];
  /**
   * 将来の公開音声(本人が選んだ短い区間のみ)。今回は未設定。
   * 設定される場合、audio.currentTimeを譜のシークと同期させる
   * マスターにする(2つの別タイマーで音と譜を走らせない)。
   */
  publicAudioSrc?: string;
  /** プレイヤー付近に表示する短い説明 */
  caption: string;
  /** 本人が公開を承認したデータか。demoは常にtrueだが公開音声とは無関係 */
  publicationApproved: boolean;
}
