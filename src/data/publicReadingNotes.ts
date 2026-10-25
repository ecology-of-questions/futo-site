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
 * 【追加する方法(2026-09-20、Decision Log 0187で更新)】`/fieldnote/`の
 * 「公開プレビュー」画面で内容を確認し、「この内容をコピーする」で
 * コピーしたJSONの`id`を`REPLACE-ME`から一意のIDに差し替えたうえで、
 * このファイルの配列に`PublicReadingNote`として1件追加する(`bookId`は
 * `src/data/bookshelf.ts`の既存IDと一致させる)。それ以外の変更
 * (ビルド・ルーティング等)は不要。自動で本棚に反映する仕組みは
 * まだ無く、運営による確認・手動反映を経由する(本人認証を伴う
 * サーバー側の公開APIはDecision Log 0187で設計のみ記録し、次回以降の
 * 実装とした)。将来、その仕組みを作る場合も、承認後にこの配列へ反映
 * する手動の確認ステップは維持すること(Decision Log 0186)。
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
