/**
 * productionNotes.ts
 * ------------------------------------------------------------
 * 「そらのようす 制作ノート」(/sora-no-yousu/、旧名「きょうの空」
 * 「頭上の記録」)のcanonical data。研究断面(researchReviews.ts)と
 * 同じ考え方で、`/sora-no-yousu/`(一覧)と`/sora-no-yousu/NN`(各回)の
 * 両方がこの配列を参照する想定(2026-11-11)。
 *
 * 第1回以降の本文は、プロジェクトオーナーからの依頼(骨子からの
 * 下書き作成の承認)を受けてから追加する。現時点では空配列のため、
 * `/sora-no-yousu/`は「まだ公開している回がない」旨を表示する
 * (ProductionNoteList.astro参照)。
 * ------------------------------------------------------------
 */
import type { ProductionNoteEntry } from "@/types/productionNote";

export const productionNotes: ProductionNoteEntry[] = [];
