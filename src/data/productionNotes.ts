/**
 * productionNotes.ts
 * ------------------------------------------------------------
 * 「きょうの空 制作ノート」(/kyou-no-sora/、旧名「頭上の記録」)の
 * canonical data。研究断面(researchReviews.ts)と同じ考え方で、
 * `/kyou-no-sora/`(一覧)と`/kyou-no-sora/NN`(各回)の両方がこの配列を
 * 参照する想定(2026-11-11)。
 *
 * 第1回以降の本文は、プロジェクトオーナーからの依頼(骨子からの
 * 下書き作成の承認)を受けてから追加する。現時点では空配列のため、
 * `/kyou-no-sora/`は「まだ公開している回がない」旨を表示する
 * (ProductionNoteList.astro参照)。
 * ------------------------------------------------------------
 */
import type { ProductionNoteEntry } from "@/types/productionNote";

export const productionNotes: ProductionNoteEntry[] = [];
