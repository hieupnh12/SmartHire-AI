const MM = 96 / 25.4;
export const PAGE_HEIGHT_MM = 297;
const PAGE_PX = PAGE_HEIGHT_MM * MM;
/** Blank band at the top of pages 2+ (page 1 keeps the layout's own padding). */
const TOP_PX = 12 * MM;
/** Bottom band reserved for the running footer. */
const BOTTOM_PX = 16 * MM;

/**
 * Pushes every `[data-cv-block]` that would cross a page boundary down to the next page (via margin-top), so the
 * single-flow canvas lays out like separate A4 sheets and prints/exports with identical breaks.
 * `data-cv-block="keep"` (section headings) stays on the same page as the next block.
 * Returns the page count.
 */
export function paginateCv(root: HTMLElement): number {
  const blocks = Array.from(root.querySelectorAll<HTMLElement>("[data-cv-block]"));
  for (const block of blocks) block.style.removeProperty("margin-top");
  const rootRect = root.getBoundingClientRect();
  const scale = root.offsetHeight ? rootRect.height / root.offsetHeight : 1;
  const box = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    return { top: (rect.top - rootRect.top) / scale, bottom: (rect.bottom - rootRect.top) / scale };
  };
  const visible = (element: HTMLElement) => element.getClientRects().length > 0;

  let contentBottom = 0;
  blocks.forEach((block, index) => {
    if (!visible(block)) return;
    const next = block.dataset.cvBlock === "keep" ? blocks.slice(index + 1).find(visible) : undefined;
    // Margins collapse with neighbours, so re-measure and top up until the block actually lands on target.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const { top, bottom } = box(block);
      const extentBottom = next ? Math.max(bottom, box(next).bottom) : bottom;
      const page = Math.max(0, Math.floor(top / PAGE_PX));
      const start = page === 0 ? 0 : page * PAGE_PX + TOP_PX;
      const end = (page + 1) * PAGE_PX - BOTTOM_PX;
      let target = top;
      if (top < start) target = start;
      else if (extentBottom > end && extentBottom - top <= PAGE_PX - TOP_PX - BOTTOM_PX) target = (page + 1) * PAGE_PX + TOP_PX;
      if (target - top < 0.5) break;
      const margin = parseFloat(getComputedStyle(block).marginTop) || 0;
      block.style.marginTop = `${margin + target - top}px`;
    }
    contentBottom = Math.max(contentBottom, box(block).bottom);
  });
  return Math.max(1, Math.ceil((contentBottom + BOTTOM_PX) / PAGE_PX));
}
