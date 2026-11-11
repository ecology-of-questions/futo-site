/**
 * skyLogDemo.ts
 * ------------------------------------------------------------
 * 「きょうの空」ノートページに埋め込む体験デモ用の架空データ
 * (2026-11-11)。WalkingScorePlayer・FieldnoteMemoDemoと同様、実際の
 * バックエンドを持たない静的なデモで、ページを離れると記録は消える。
 *
 * `skyHourColors`(時刻ごとの空の色、24色)は、プロジェクトオーナーが
 * 共有したClaude Artifactの試作(reference/zujo-prototype.html、
 * リポジトリにはコミットしていない参考ファイル)で使われていた値を
 * そのまま採用した。色を独自に決め打ちしない(CLAUDE.mdの方針)という
 * ルールは主にUIのアクセント色に向けたものだが、ここでの24色は
 * 「1日の空の色」という試作段階からの構想そのもの(データ)であり、
 * tokens.cssが管理する一般的なUIトークンとは別の扱いとしている。
 * ------------------------------------------------------------
 */

/** 時刻(0〜23時)ごとの空の色。 */
export const skyHourColors: string[] = [
  "#1B2433", "#1B2433", "#1F2A3C", "#253247", "#34405A", "#6F6A86",
  "#C9A38F", "#E9C7A0", "#BFD7E8", "#A9CDE6", "#9CC6E4", "#94C1E2",
  "#91BFE1", "#94C1E2", "#9CC6E4", "#A9CDE6", "#C3D4DC", "#E7B57A",
  "#D9834F", "#8A5A78", "#4A3F66", "#2C3048", "#212A3B", "#1B2433",
];

export type SkyLogKind = "plane" | "heli" | "unknown";
export type SkyLogLoudness = "heard" | "loud" | "very-loud";

export interface SkyLogEntry {
  hour: number;
  minute: number;
  kind: SkyLogKind;
  loudness: SkyLogLoudness;
}

export const kindLabels: Record<SkyLogKind, string> = {
  plane: "ひこうき",
  heli: "ヘリコプター",
  unknown: "わからない",
};

export const loudnessLabels: Record<SkyLogLoudness, string> = {
  heard: "きこえた",
  loud: "うるさい",
  "very-loud": "とてもうるさい",
};

/** デモ用に最初から並べておく「きょうの記録」。実際の記録ではない。 */
export const demoEntries: SkyLogEntry[] = [
  { hour: 7, minute: 12, kind: "plane", loudness: "heard" },
  { hour: 12, minute: 48, kind: "heli", loudness: "loud" },
  { hour: 18, minute: 3, kind: "plane", loudness: "very-loud" },
];
