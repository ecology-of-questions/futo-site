/**
 * currentWork.ts
 * ------------------------------------------------------------
 * Homeの「いま、取り組んでいること」セクション(2026-08-17、
 * Decision Log 0057)が扱う項目の型。リンク先を持つ項目
 * (linkLabel/linkHref)と、まだリンク先を持たない制作中の項目
 * (statusLabel)の両方を1つの型で表現する。
 *
 * 【2026-09-03改訂(Decision Log 0074)】bodyをstringから
 * string[]に変更した。「研究断面」項目の説明文が2段落になった
 * (プロジェクトオーナー指定の文言)ため、複数段落を表現できる
 * 配列にした。
 * ------------------------------------------------------------
 */

export interface CurrentWorkItem {
  /** 例: "Research" */
  label: string;
  /** 例: "問いの生態系" */
  title: string;
  /** 段落ごとに1要素。1段落のみの項目は要素数1の配列にする */
  body: string[];
  /** 例: "Research Statementを読む" */
  linkLabel?: string;
  linkHref?: string;
  /** リンク先がまだない場合に表示する状態(例: "制作・検証中") */
  statusLabel?: string;
}
