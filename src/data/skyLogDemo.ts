/**
 * skyLogDemo.ts
 * ------------------------------------------------------------
 * 「きょうの空」ノートページに埋め込む体験デモ用の架空データ
 * (2026-11-11、同日中に拡張)。WalkingScorePlayer・FieldnoteMemoDemoと
 * 同様、実際のバックエンドを持たない静的なデモで、ページを離れると
 * 記録は消える。
 *
 * `skyHourColors`(時刻ごとの空の色、24色)は、プロジェクトオーナーが
 * 共有したClaude Artifactの試作(claude.ai/artifact、リポジトリには
 * コミットしていない参考ファイル)で使われていた値をそのまま採用した。
 * 色を独自に決め打ちしない(CLAUDE.mdの方針)というルールは主にUIの
 * アクセント色に向けたものだが、ここでの24色は「1日の空の色」という
 * 試作段階からの構想そのもの(データ)であり、tokens.cssが管理する
 * 一般的なUIトークンとは別の扱いとしている。
 *
 * 【語彙を試作アーティファクトに近づけた(2026-11-11、同日2回目の拡張)】
 * プロジェクトオーナーが共有した、より作り込まれた試作
 * (claude.ai/artifact/8kp6DFkD9nv7DKC3pDpuf9、家族共有・市区町村・
 * 地図・ふりかえり画面まで持つ本格的なプロトタイプ)を踏まえ、記録の
 * 項目を「種類」「うるささ」の2つから、「空のようす(天気)」
 * 「どこで聞いたか」「機数」「メモ」まで拡張した。試作にある
 * 家族共有・市区町村・地図機能は、実際のバックエンド(claude.aiの
 * db/user capability)に依存するため、このサイト単体の静的デモには
 * 持ち込んでいない(Decision Log 0215参照)。
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

export interface SkyLogEntry {
  hour: number;
  minute: number;
  kind: SkyLogKind;
  loudness: SkyLogLoudness;
  /** 空のようす。任意(選ばなくても記録できる) */
  weather?: SkyLogWeather;
  /** どこで聞いたか。任意 */
  place?: SkyLogPlace;
  /** 機数。任意(既定は1機扱い) */
  count?: SkyLogCount;
  /** ひとことメモ。任意 */
  note?: string;
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

/** デモ用に最初から並べておく「きょうの記録」。実際の記録ではない。 */
export const demoEntries: SkyLogEntry[] = [
  { hour: 7, minute: 12, kind: "plane", loudness: "heard", weather: "sun", place: "outdoor", count: 1 },
  { hour: 12, minute: 48, kind: "heli", loudness: "loud", weather: "cloud", place: "outdoor", count: 1, note: "低めの高さで、同じ場所を2周していた。" },
  { hour: 18, minute: 3, kind: "plane", loudness: "very-loud", weather: "sun", place: "indoor", count: 2 },
];
