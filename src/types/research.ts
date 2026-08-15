/**
 * research.ts
 * ------------------------------------------------------------
 * 「研究状態モデル(Research State Model)」
 *
 * ResearchStatus は単なるUnion型ではなく、どの状態からどの状態へ
 * 遷移できるかを含めた状態機械(State Machine)として設計している
 * (2026-08-04 フィードバックより。Decision Log 0006参照)。
 *
 * ResearchCard は「出版状態(公開されているかどうか)」ではなく、
 * 「研究状態(今どの段階にあるか)」を表すことにした
 * (Decision Log 0005)。
 *
 * Research Review に限らず、Research Fragment / Fieldnote など
 * 将来増える研究成果全般で共通して使うことを想定し、コンポーネントから
 * 独立した型としてここに置く。
 *
 * 現時点で実際に使うのは "preparing" のみ。他のステータス・遷移は
 * 将来の拡張を見込んで型・遷移だけ先に用意しておく(概念が先、
 * 事例が後、という研究のプロセスと同じ考え方)。
 *
 * 【2026-08-15追記】このステータスを表示していたResearchCardは、
 * 「研究断面01が管理画面のように見える」という指摘を受けて廃止した
 * (Decision Log 0033)。現時点でこのファイルのコードを直接使う
 * コンポーネントは無いが、Research Fragment / Logs等、今後別の形で
 * 研究状態を表示する機会に備えて型自体は残している。長期間未使用の
 * ままであれば削除を検討すること。
 * ------------------------------------------------------------
 */

export type ResearchStatus =
  | "preparing" // 準備中。まだ何も定まっていない段階
  | "reading" // 観察・収集の段階
  | "writing" // 言語化を進めている段階
  | "reviewing" // 見直し・推敲の段階
  | "published" // 公開済み
  | "archived"; // 過去のものとして残す段階

export const researchStatusLabel: Record<ResearchStatus, string> = {
  preparing: "Preparing",
  reading: "Reading",
  writing: "Writing",
  reviewing: "Reviewing",
  published: "Published",
  archived: "Archived",
};

/**
 * State Transition
 *
 * Preparing → Reading → Writing → Reviewing → Published → Archived
 * が基本の流れ。加えて Writing ⇄ Reading の行き来を許可している
 * (書きながらまた観察に戻ることがあるため)。
 *
 * 【要確認】"レビューでまた文献を読み直す" という話もあったため、
 * Reviewing → Reading の遷移も必要になる可能性がある。今回は
 * いただいた遷移図(Writing ⇄ Reading のループ)を優先して実装した。
 * 実際の運用でReviewingからReadingへ戻るケースが多いようであれば、
 * Decision Logに追記のうえ遷移を追加する。
 */
export const researchStatusTransitions: Record<ResearchStatus, ResearchStatus[]> = {
  preparing: ["reading"],
  reading: ["writing"],
  writing: ["reading", "reviewing"],
  reviewing: ["published"],
  published: ["archived"],
  archived: [],
};

/** ある状態から別の状態へ遷移可能かどうかを判定する */
export function canTransitionResearchStatus(
  from: ResearchStatus,
  to: ResearchStatus,
): boolean {
  return researchStatusTransitions[from].includes(to);
}

