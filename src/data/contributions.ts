/**
 * contributions.ts
 * ------------------------------------------------------------
 * 「持ち寄られたもの」(/participate)のcanonical data(2026-09-11、
 * Decision Log 0128)。
 *
 * 運用方法: 「何かを持ち寄る」フォーム(Formspree)に投稿が届いたら、
 * 1. 「この内容を、サイト上でみんなにも共有してよい」がチェックされて
 *    いるか(`public_ok = yes`)を確認する
 * 2. 内容が公開に適切か(誹謗中傷・スパム等でないか)を運営側で確認する
 * 3. 問題なければ、この配列に新しいエントリを追加する(`visible: true`)
 *
 * Formspreeからの自動取得・自動公開は行わない。公開はすべてこの
 * ファイルへの手動追加によって行う(型定義は`src/types/contributions.ts`
 * を参照)。個人情報(投稿者名・メールアドレス等)は、公開可であっても
 * ここには一切含めないこと。
 * ------------------------------------------------------------
 */
import type { Contribution } from "@/types/contributions";

export const contributions: Contribution[] = [];
