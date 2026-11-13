/**
 * skyLog.ts
 * ------------------------------------------------------------
 * 「そらのようす」(/sora-no-yousu/)の記録に関する型・語彙(2026-11-11、
 * 体験デモとして新設。2026-11-13、Decision Log 0216で本番に切り替えた
 * 際に`skyLogDemo.ts`からリネームし、架空の`demoEntries`を削除した。
 * 実際の記録は`SkyLog.astro`がCloudflare Worker API
 * (`/api/sora-log/entries`)から取得する)。
 *
 * `skyHourColors`(時刻ごとの空の色、24色)は、プロジェクトオーナーが
 * 共有したClaude Artifactの試作(claude.ai/artifact、リポジトリには
 * コミットしていない参考ファイル)で使われていた値をそのまま採用した。
 * 色を独自に決め打ちしない(CLAUDE.mdの方針)というルールは主にUIの
 * アクセント色に向けたものだが、ここでの24色は「1日の空の色」という
 * 試作段階からの構想そのもの(データ)であり、tokens.cssが管理する
 * 一般的なUIトークンとは別の扱いとしている。
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
export type SkyLogWeather = "sun" | "cloud" | "rain";
export type SkyLogPlace = "indoor" | "outdoor";
export type SkyLogCount = 1 | 2 | 3;

/** サーバー(worker/index.ts)に保存されている公開記録。時刻はサーバーの
    受信時刻(`createdAt`)のみで、投稿者が指定・修正することはできない。 */
export interface SkyLogEntry {
  id: string;
  kind: SkyLogKind;
  loudness: SkyLogLoudness;
  weather?: SkyLogWeather;
  place?: SkyLogPlace;
  count?: SkyLogCount;
  note?: string;
  createdAt: string;
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

export const weatherLabels: Record<SkyLogWeather, string> = {
  sun: "はれ",
  cloud: "くもり",
  rain: "あめ",
};

export const placeLabels: Record<SkyLogPlace, string> = {
  indoor: "いえのなか",
  outdoor: "そと",
};

export const countLabels: Record<SkyLogCount, string> = {
  1: "1機",
  2: "2機",
  3: "3機以上",
};
