/**
 * fieldnoteMemoDemo.ts
 * ------------------------------------------------------------
 * `/participate/fieldnote`に埋め込む体験デモの中身(2026-09-19、
 * Decision Log 0184)。プロジェクトオーナーがClaudeの「Design」
 * キャンバスで作った「Fieldnote デューイ読書」モックアップ
 * (claude.ai/artifact/QSx1PF2fTRXEEpqAzqAXwL)の内容をそのまま
 * 引き継いでいる(架空の内容を新しく足していない)。
 *
 * 6セッションのうち「デューイ読書」だけ、概要・自分のまとめ・
 * 「育つ」の内容が詳しい。他5セッションは記録(entries)のみで、
 * 概要・まとめは未記入、「育つ」は「まだ見つかっていません」の
 * 状態のまま(元のモックアップの非対称をそのまま再現)。
 * ------------------------------------------------------------
 */
import type { FieldnoteSession } from "@/types/fieldnoteMemo";

const NO_TEXT_FOUND = "テキストは見つかりませんでした";
const UNREADABLE = "[判読できない箇所あり]";

export const fieldnoteMemoSessions: FieldnoteSession[] = [
  {
    id: "dewey",
    title: "デューイ読書",
    icon: "book",
    updatedLabel: "今日 9:31",
    overview: "『経験と教育』を読みながら、子どもの遊びの観察とつなげて考える。",
    notes: [
      "経験の連続性というのは、前の経験が次の経験の土台になる、ということだと思う。",
      "ただし、どんな経験でもいいわけではなくて、次につながる経験かどうかが大事。ここが自分の中でまだ曖昧。",
      "子どもの遊びを見ていても、夢中なのに次につながらない場面がある。あれは何が足りないのか。",
      "次に読むところ：相互作用の節",
    ],
    notesUpdatedLabel: "更新 今日 8:40",
    growingQuestions: [
      {
        text: "子どもの興味は、学びの出発点にどこまでなれるのか",
        growing: true,
        since: "3週間前から",
        fromSessionsLabel: "デューイ読書、子どもの遊び観察",
      },
      {
        text: "「経験」と「体験」は同じことなのか",
        growing: false,
        since: "",
        fromSessionsLabel: "デューイ読書",
      },
    ],
    connectedRecord: {
      tags: ["手書き 9:20", "音声 9:12"],
      text: "この手書きは、同じ日の音声の内容を図にして整理しているようです。",
    },
    crossSessionInsight: {
      sessionsLabel: "デューイ読書 × 展示めぐり",
      text: "どちらでも、「前の経験が次の見方を変える」という話が出てきています。",
    },
    growUpdatedLabel: "最終更新 今日 9:35",
    entries: [
      {
        id: "d1",
        type: "photo",
        day: "今日・9月19日",
        time: "9:31",
        memo: "第3章 該当ページ",
        count: 13,
        reading: ["経験の連続性（continuity）", "相互作用（interaction）", "教育的経験の基準 ― " + UNREADABLE],
        readingMeta: "仮説です・Claude Vision・v2・今日 9:33",
        note: "「相互作用」は、子どもと環境の両方向の話。自分で補足。判読できない箇所は「基準」の続き。",
      },
      {
        id: "d2",
        type: "hand",
        day: "今日・9月19日",
        time: "9:20",
        memo: "連続性と相互作用を図にした",
        reading: ["図：連続性 → 相互作用", UNREADABLE],
        readingMeta: "仮説です・Claude Vision・v1・今日 9:22",
        note: "",
      },
      {
        id: "d3",
        type: "audio",
        day: "今日・9月19日",
        time: "9:12",
        duration: "0:48",
        text: "前の経験が次の経験の質を決める、という話を、子どもの興味とつなげて考えたい。",
      },
      {
        id: "d4",
        type: "url",
        day: "昨日・9月18日",
        time: "18:05",
        title: "経験と教育 ― 本書の要点ノート",
        domain: "example.org",
      },
      {
        id: "d5",
        type: "text",
        day: "昨日・9月18日",
        time: "12:40",
        text: "図書館で借りた版は訳が古い。「経験」の訳語が章ごとに揺れているので、原文と見比べる。",
      },
    ],
  },
  {
    id: "exhibit",
    title: "展示めぐり",
    icon: "frame",
    updatedLabel: "昨日 16:20",
    overview: "",
    notes: [],
    notesUpdatedLabel: "まだ書いていません",
    growingQuestions: [],
    growUpdatedLabel: "まだ更新していません",
    entries: [
      {
        id: "x1",
        type: "photo",
        day: "昨日・9月18日",
        time: "16:20",
        memo: "入口の解説パネル",
        count: 6,
        reading: ["展示解説パネル", "制作の過程を見せる構成", UNREADABLE],
        readingMeta: "仮説です・Claude Vision・v1・昨日 16:22",
        note: "",
      },
      {
        id: "x2",
        type: "audio",
        day: "昨日・9月18日",
        time: "16:05",
        duration: "0:31",
        text: "入口の作品の前で、制作の途中が見えるのが面白いと思った。",
      },
    ],
  },
  {
    id: "kids",
    title: "子どもの遊び観察",
    icon: "smile",
    updatedLabel: "9月17日",
    overview: "",
    notes: [],
    notesUpdatedLabel: "まだ書いていません",
    growingQuestions: [],
    growUpdatedLabel: "まだ更新していません",
    entries: [
      {
        id: "k1",
        type: "hand",
        day: "9月17日",
        time: "15:30",
        memo: "遊びの流れをメモ",
        reading: ["積み木 → 崩す → 作り直す", UNREADABLE],
        readingMeta: "仮説です・Claude Vision・v1・9月17日 15:32",
        note: "",
      },
      {
        id: "k2",
        type: "audio",
        day: "9月17日",
        time: "15:10",
        duration: "0:19",
        text: "積み木を崩してから、また同じ形を作り直していた。",
      },
    ],
  },
  {
    id: "plants",
    title: "植物の観察",
    icon: "leaf",
    updatedLabel: "9月12日",
    overview: "",
    notes: [],
    notesUpdatedLabel: "まだ書いていません",
    growingQuestions: [],
    growUpdatedLabel: "まだ更新していません",
    entries: [
      {
        id: "p1",
        type: "photo",
        day: "9月12日",
        time: "8:25",
        memo: "ベランダの芽",
        count: 3,
        reading: [NO_TEXT_FOUND],
        readingMeta: "仮説です・Claude Vision・v1・9月12日 8:26",
        note: "",
      },
      {
        id: "p2",
        type: "text",
        day: "9月12日",
        time: "8:20",
        text: "双葉が出た。水やりは朝だけにする。",
      },
    ],
  },
  {
    id: "words",
    title: "ことばの採集",
    icon: "chat",
    updatedLabel: "9月8日",
    overview: "",
    notes: [],
    notesUpdatedLabel: "まだ書いていません",
    growingQuestions: [],
    growUpdatedLabel: "まだ更新していません",
    entries: [
      {
        id: "w1",
        type: "audio",
        day: "9月8日",
        time: "19:10",
        duration: "0:12",
        text: "電車で聞いた「あとで効いてくる」という言い方。",
      },
      {
        id: "w2",
        type: "text",
        day: "9月8日",
        time: "19:02",
        text: "言い回しは、その場でメモしておく。",
      },
    ],
  },
  {
    id: "walk",
    title: "散歩ノート",
    icon: "pin",
    updatedLabel: "8月30日",
    overview: "",
    notes: [],
    notesUpdatedLabel: "まだ書いていません",
    growingQuestions: [],
    growUpdatedLabel: "まだ更新していません",
    entries: [
      {
        id: "l1",
        type: "audio",
        day: "8月30日",
        time: "17:45",
        duration: "0:22",
        text: "橋の下で風向きが変わった。",
      },
      {
        id: "l2",
        type: "photo",
        day: "8月30日",
        time: "17:40",
        memo: "川沿いの道",
        count: 4,
        reading: [NO_TEXT_FOUND],
        readingMeta: "仮説です・Claude Vision・v1・8月30日 17:41",
        note: "",
      },
    ],
  },
];
