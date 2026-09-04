/**
 * pager.ts
 * ------------------------------------------------------------
 * 長文ページ(Research Statement全文・研究断面詳細)を「1画面ずつ
 * 切り替える」ためのvanilla JS(2026-09-04、Decision Log 0092)。
 * URLは変えず、同じページ内で表示するブロックを差し替える。
 *
 * マークアップの前提:
 * - data-pager属性を持つ要素の中に、data-pager-page属性を持つ
 *   「1画面ぶん」の要素が複数並んでいる。
 * - 兄弟要素(または同じdata-pager内)に、data-pager-controls
 *   (操作UI全体のコンテナ、初期状態はhidden)・data-pager-prev/
 *   data-pager-next(ボタン)・data-pager-status(「1 / 5」等の
 *   表示)を置く。
 *
 * JSが無効な環境では、data-pager-page要素はどれも隠されないため、
 * 全文がそのまま読める(progressive enhancement。Contactフォームの
 * fetch送信と同じ考え方)。data-pager-controls側はJSでのみ表示する
 * (JSなしでは動作しないボタンを見せないため)。
 * ------------------------------------------------------------
 */

function initPager(root: HTMLElement) {
  const pages = Array.from(root.querySelectorAll<HTMLElement>("[data-pager-page]"));
  if (pages.length <= 1) return;

  const controls = root.querySelector<HTMLElement>("[data-pager-controls]");
  const prevButton = root.querySelector<HTMLButtonElement>("[data-pager-prev]");
  const nextButton = root.querySelector<HTMLButtonElement>("[data-pager-next]");
  const status = root.querySelector<HTMLElement>("[data-pager-status]");

  let current = 0;

  const render = () => {
    pages.forEach((page, i) => {
      page.hidden = i !== current;
    });
    if (prevButton) prevButton.disabled = current === 0;
    if (nextButton) nextButton.disabled = current === pages.length - 1;
    if (status) status.textContent = `${current + 1} / ${pages.length}`;
  };

  prevButton?.addEventListener("click", () => {
    if (current === 0) return;
    current -= 1;
    render();
    pages[current].focus();
  });

  nextButton?.addEventListener("click", () => {
    if (current === pages.length - 1) return;
    current += 1;
    render();
    pages[current].focus();
  });

  controls?.removeAttribute("hidden");
  render();
}

document.querySelectorAll<HTMLElement>("[data-pager]").forEach((root) => initPager(root));
