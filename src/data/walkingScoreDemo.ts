/**
 * walkingScoreDemo.ts
 * ------------------------------------------------------------
 * 「散歩譜」身体譜プレイヤーv0が表示する架空デモデータ
 * (2026-09-18、Decision Log 0182)。実際の散歩・録音・センサーからの
 * データではない。左右は交互に割り当てた表示例で、実測ではない。
 * ------------------------------------------------------------
 */
import type { WalkingScore } from "@/types/walkingScore";

/** 秒単位のステップ時刻(架空データ、指示書同梱UI参考と同じ並び)。 */
const demoStepSeconds = [
  0.8, 1.5, 2.3, 3, 3.7, 4.5, 5.3, 6, 6.8, 7.6, 8.4, 9.2, 15.8, 16.7, 17.6, 18.3, 19, 19.7, 20.6, 21.6, 22.5, 23.3,
];

export const walkingScoreDemo: WalkingScore = {
  id: "sanpo-demo-001",
  kind: "demo",
  durationMs: 24_000,
  steps: demoStepSeconds.map((seconds, index) => ({
    atMs: Math.round(seconds * 1000),
    side: index % 2 === 0 ? "left" : "right",
  })),
  caption: "点の間隔は、一歩ごとの時間。空白は、歩かずにいた時間。",
  publicationApproved: false,
};
