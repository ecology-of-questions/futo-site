/**
 * cer.mjs
 * ------------------------------------------------------------
 * 文字誤り率(Character Error Rate)の計算(2026-09-21〜、
 * Decision Log 0196)。指示書どおり「置換・削除・挿入数÷正解文字数」
 * (編集距離÷正解文字数)として実装する。confidenceは精度の代用に
 * しない——この関数は必ず人が確認した正解文(ground truth)との
 * 比較でのみ使うこと。
 * ------------------------------------------------------------
 */

/** レーベンシュタイン距離(置換・削除・挿入の合計回数)を計算する。 */
function editDistance(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  return dp[m][n];
}

/**
 * @param {string} recognized OCRの認識結果
 * @param {string} groundTruth 人が確認した正解文
 * @param {{ normalizeWhitespace?: boolean }} [options] trueの場合、
 *   改行・空白を除去してから比較する(縦書きOCR特有の、語の区切りに
 *   起因する余分な空白の影響を分けて見るためのオプション)。
 * @returns {{ editDistance: number, groundTruthLength: number, cer: number, normalizeWhitespace: boolean }}
 */
export function characterErrorRate(recognized, groundTruth, options = {}) {
  const normalizeWhitespace = options.normalizeWhitespace ?? false;
  const a = normalizeWhitespace ? recognized.replace(/\s/g, "") : recognized;
  const b = normalizeWhitespace ? groundTruth.replace(/\s/g, "") : groundTruth;
  const distance = editDistance(a, b);
  const groundTruthLength = b.length;
  return {
    editDistance: distance,
    groundTruthLength,
    cer: groundTruthLength > 0 ? distance / groundTruthLength : null,
    normalizeWhitespace,
  };
}
