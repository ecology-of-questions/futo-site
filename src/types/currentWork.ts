/**
 * currentWork.ts
 * ------------------------------------------------------------
 * Homeの「いま、取り組んでいること」セクション(2026-08-17、
 * Decision Log 0057)が扱う項目の型。リンク先を持つ項目
 * (linkLabel/linkHref)と、まだリンク先を持たない制作中の項目
 * (statusLabel)の両方を1つの型で表現する。
 * ------------------------------------------------------------
 */

export interface CurrentWorkItem {
  /** 例: "Research" */
  label: string;
  /** 例: "問いの生態系" */
  title: string;
  body: string;
  /** 例: "Research Statementを読む" */
  linkLabel?: string;
  linkHref?: string;
  /** リンク先がまだない場合に表示する状態(例: "制作・検証中") */
  statusLabel?: string;
}
