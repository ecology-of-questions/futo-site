/**
 * support.ts
 * ------------------------------------------------------------
 * 「試行錯誤を支える」(銀行振込での支援)の設定(2026-09-18、
 * Decision Log 0182)。支援先は特定のノートに限定せず「ふ、と」全体。
 *
 * 【fail-closedの方針】`enabled`をtrueにしても、口座情報
 * (bankName/branchName/accountType/accountNumber/accountHolder)が
 * 1つでも欠けていれば、`isSupportConfigured()`はfalseを返す。呼び出し側
 * (SupportSection.astro)はfalseの場合、支援ボタン・口座情報を一切
 * 描画しない(空欄や「未設定」というダミー表示もしない)。
 *
 * 実口座を登録する際は、`enabled: true`にしたうえで、口座名義も
 * 訪問者に見える情報であることを踏まえて値を設定する。ここに書く値は
 * 公開用として本人が指定したものに限る。
 * ------------------------------------------------------------
 */

export interface BankTransferInfo {
  bankName: string;
  branchName: string;
  accountType: string;
  accountNumber: string;
  accountHolder: string;
}

export interface SupportConfig {
  enabled: boolean;
  bank?: BankTransferInfo;
}

export const supportConfig: SupportConfig = {
  enabled: false,
  bank: undefined,
};

/**
 * 支援ボタン・口座情報を表示してよいか。`enabled`がtrueでも、必須項目が
 * 1つでも欠けていればfalse(fail-closed)。
 */
export function isSupportConfigured(config: SupportConfig): config is SupportConfig & { bank: BankTransferInfo } {
  if (!config.enabled || !config.bank) return false;
  const { bankName, branchName, accountType, accountNumber, accountHolder } = config.bank;
  return Boolean(bankName && branchName && accountType && accountNumber && accountHolder);
}
