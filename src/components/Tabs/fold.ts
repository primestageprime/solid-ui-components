// ============================================
// Tabs' fold decision — pure (Depth 0). No Solid, no DOM.
//
// Which tabs stay in the strip and which spill into the trailing kebab, given
// the strip's width and each tab's NATURAL width. The component only measures
// and feeds this; every rule lives here:
//
//   • Everything fits → every tab inline, no kebab.
//   • Otherwise the kebab's reserve is held back, the ACTIVE tab is placed
//     first (it is never folded away — you always see where you are), and the
//     leading inactive tabs fill what is left, in order, stopping at the first
//     that doesn't fit. No later, narrower tab jumps the queue.
//   • Both lists keep the original tab order. Nothing is ever reordered: the
//     active tab sits in its own slot among the leading tabs.
//   • An active tab too wide for the room still shows, alone.
//   • No layout at all — every tab measures 0 (jsdom, SSR, a display:none
//     ancestor) — is `null`: nothing is known, so the caller keeps what it has
//     rather than folding on no evidence.
// ============================================
import { every } from "../../fn";

export interface TabsFoldInput {
  /** The strip's available width, px. */
  containerWidth: number;
  /** Each tab's natural width, px, in tab order. */
  tabWidths: readonly number[];
  /** The gap between inline tabs, px. */
  gapPx: number;
  /** Width held back for the kebab trigger, px. */
  kebabReservePx: number;
  /** Index of the active tab, or -1 for none. Out of range reads as none. */
  activeIndex: number;
}

export interface TabsFold {
  /** Tabs shown in the strip, ascending. */
  inline: number[];
  /** Tabs listed in the kebab menu, ascending. */
  overflow: number[];
}

const unmeasured = (width: number): boolean => width <= 0;

const indices = (n: number): number[] => Array.from({ length: n }, (_, i) => i);

/** The split, or `null` when there is no layout to decide on. */
export function tabsFold(input: TabsFoldInput): TabsFold | null {
  const { containerWidth, tabWidths, gapPx, kebabReservePx } = input;
  const total = tabWidths.length;
  if (total === 0) return { inline: [], overflow: [] };
  if (every(unmeasured, tabWidths)) return null;

  const all = indices(total);
  let natural = gapPx * (total - 1);
  for (const w of tabWidths) natural += w;
  if (natural <= containerWidth) return { inline: all, overflow: [] };

  const active =
    input.activeIndex >= 0 && input.activeIndex < total
      ? input.activeIndex
      : -1;
  const budget = containerWidth - kebabReservePx;
  const kept = new Set<number>(active >= 0 ? [active] : []);
  let used = active >= 0 ? tabWidths[active] : 0;
  for (const i of all) {
    if (i === active) continue;
    const next = used + (kept.size > 0 ? gapPx : 0) + tabWidths[i];
    if (next > budget) break;
    used = next;
    kept.add(i);
  }

  const inline: number[] = [];
  const overflow: number[] = [];
  for (const i of all) (kept.has(i) ? inline : overflow).push(i);
  return { inline, overflow };
}
