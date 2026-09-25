// ============================================
// OverflowNav's fold decision — pure (Depth 0). No Solid, no DOM.
//
// How many leading items stay inline, given the container's width and each
// item's NATURAL width (G16, thorcasting prod). The component only measures
// and feeds this; every rule lives here, where a printed table tests it:
//
//   • Everything fits (with the kebab's reserve when an explicit overflow list
//     forces the kebab) → all inline.
//   • Otherwise as many leading items as fit beside the kebab's reserve.
//   • A container of 0px (or narrower than the reserve) folds EVERYTHING into
//     the kebab. It used to bail on `containerWidth <= 0` and leave every
//     item inline, so a nav squeezed to nothing never folded.
//   • No layout at all — every item measures 0 (jsdom, SSR, a display:none
//     ancestor) — is `null`: nothing is known, so the caller keeps what it
//     has rather than folding on no evidence.
// ============================================
import { every } from "../../fn";

export interface OverflowNavFoldInput {
  /** The nav row's clientWidth, px. */
  containerWidth: number;
  /** Each item's natural width, px, in item order. */
  itemWidths: readonly number[];
  /** The gap between inline items, px. */
  gapPx: number;
  /** Width held back for the kebab trigger, px. */
  kebabReservePx: number;
  /** The kebab is shown regardless (an explicit overflow list). */
  kebabForced: boolean;
}

const unmeasured = (width: number): boolean => width <= 0;

/** Leading items to keep inline, or `null` when there is no layout to decide on. */
export function overflowNavVisibleCount(
  input: OverflowNavFoldInput,
): number | null {
  const { containerWidth, itemWidths, gapPx, kebabReservePx, kebabForced } =
    input;
  const total = itemWidths.length;
  if (total === 0) return 0;
  if (every(unmeasured, itemWidths)) return null;

  // Running right edge of item i when items 0..i sit inline.
  const edges: number[] = [];
  let acc = 0;
  for (let i = 0; i < total; i++) {
    acc += itemWidths[i] + (i > 0 ? gapPx : 0);
    edges.push(acc);
  }

  const allFit =
    edges[total - 1] <= containerWidth - (kebabForced ? kebabReservePx : 0);
  if (allFit) return total;

  const budget = containerWidth - kebabReservePx;
  let count = 0;
  while (count < total && edges[count] <= budget) count++;
  return count;
}
