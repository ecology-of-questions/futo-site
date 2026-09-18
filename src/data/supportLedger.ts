/**
 * supportLedger.ts
 * ------------------------------------------------------------
 * 「支援と使いみち」の月次収支データ(2026-09-18、Decision Log 0182)。
 * 対象は「ふ、とに寄せられた支援金」のみで、家計・活動全体の会計とは
 * 別。金額はJPY整数。
 *
 * `published: true`の月だけを公開する(`getPublishedLedgerMonths`)。
 * 未公開・未登録の月は本番の描画対象にしない(fail-closed)。
 *
 * 【収支式の検証】closingBalance = openingBalance + contributions -
 * fees - sum(expenses)。`validateLedgerMonth`がこの式と一致するかを
 * 検証し、一致しなければエラーを投げる。`assertLedgerIntegrity`は
 * モジュール読み込み時に全件検証し、連続月の繰越(前月のclosingBalance
 * = 当月のopeningBalance)も確認する。不一致はビルド時に検出される。
 * ------------------------------------------------------------
 */

export interface LedgerExpense {
  category: string;
  amount: number;
}

export interface LedgerMonth {
  /** "2026-09"形式 */
  month: string;
  openingBalance: number;
  contributions: number;
  fees: number;
  expenses: LedgerExpense[];
  closingBalance: number;
  /** 「支援で続けられたこと」の短い記録 */
  note: string;
  updatedAt: string;
  published: boolean;
}

/** 現時点では実データ未登録のため空。公開する月が確定次第、ここに追加する。 */
export const supportLedgerMonths: LedgerMonth[] = [];

function computeClosingBalance(entry: LedgerMonth): number {
  const expenseTotal = entry.expenses.reduce((sum, expense) => sum + expense.amount, 0);
  return entry.openingBalance + entry.contributions - entry.fees - expenseTotal;
}

/** 収支式が一致しない月のmonthを返す(空配列なら全件一致)。 */
export function validateLedgerMonth(entry: LedgerMonth): boolean {
  return computeClosingBalance(entry) === entry.closingBalance;
}

/**
 * 全件の収支式・連続月の繰越を検証し、不一致があればビルドを失敗させる
 * (指示書「入力の残高と計算が違えば公開前チェックで検出」への対応)。
 * モジュール読み込み時に即実行する。
 */
function assertLedgerIntegrity(months: LedgerMonth[]): void {
  const sorted = [...months].sort((a, b) => a.month.localeCompare(b.month));
  for (const entry of sorted) {
    if (!validateLedgerMonth(entry)) {
      throw new Error(
        `supportLedgerMonths: ${entry.month}の収支式が一致しません(openingBalance + contributions - fees - expenses合計 ≠ closingBalance)`,
      );
    }
  }
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].openingBalance !== sorted[i - 1].closingBalance) {
      throw new Error(
        `supportLedgerMonths: ${sorted[i].month}のopeningBalanceが前月(${sorted[i - 1].month})のclosingBalanceと一致しません`,
      );
    }
  }
}

assertLedgerIntegrity(supportLedgerMonths);

/** 公開対象(published: true)の月のみ、月の新しい順で返す。 */
export function getPublishedLedgerMonths(): LedgerMonth[] {
  return [...supportLedgerMonths].filter((entry) => entry.published).sort((a, b) => b.month.localeCompare(a.month));
}
