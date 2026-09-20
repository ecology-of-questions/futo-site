/**
 * publicReadingNotes.ts (src/data)
 * ------------------------------------------------------------
 * 「研究の本棚」で公開する読書メモの唯一のデータソース(2026-09-20、
 * Decision Log 0186)。個人用Fieldnote Reading(`/fieldnote/`)で書いた
 * メモを自動で公開することはしない。本人が「これは公開してよい」と
 * 判断した内容だけを、この配列に手動で追加する
 * (`src/data/labNotebooks.ts`の訪問者投稿と同じ手動運用)。
 *
 * 初期状態は空。空でも`/bookshelf`のビルド・表示は正常に行われ、
 * 公開メモが無い本には何も表示しない(ダミー・0件バッジを置かない)。
 *
 * 【将来、公開メモを追加する方法】このファイルの配列に
 * `PublicReadingNote`を1件追加する(`bookId`は`src/data/bookshelf.ts`の
 * 既存IDと一致させる)。それ以外の変更(ビルド・ルーティング等)は
 * 不要。将来、投稿フォーム等から追加する仕組みを作る場合は、承認後に
 * この配列に反映する手動の確認ステップを維持すること
 * (Decision Log 0186)。
 * ------------------------------------------------------------
 */
import type { PublicReadingNote } from "@/types/publicReadingNote";

export const publicReadingNotes: PublicReadingNote[] = [];

/** 指定した本の公開メモを、新しい順で返す。無ければ空配列(呼び出し側でUIごと出し分ける)。 */
export function getPublicReadingNotesForBook(bookId: string): PublicReadingNote[] {
  return publicReadingNotes
    .filter((note) => note.bookId === bookId)
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
}
