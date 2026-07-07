// ============================================
// ActionList selection helper — pure range math for shift-click.
// The contiguous slice of `list` between `anchor` and `target`, inclusive, in
// list order. Returns null when either end isn't in the list (the caller falls
// back to a single-row toggle). Extracted so the range semantics stay pure and
// unit-testable, independent of the reactive component. Mirrors dside's original
// `idRange` (dside-ui commit 39860ad) so the behaviour ActionList now owns
// matches what the consumer had before it adopted the list.
// ============================================
export const idRange = (
  list: readonly string[],
  anchor: string | null,
  target: string,
): string[] | null => {
  const ai = anchor == null ? -1 : list.indexOf(anchor);
  const ti = list.indexOf(target);
  if (ai < 0 || ti < 0) return null;
  return list.slice(Math.min(ai, ti), Math.max(ai, ti) + 1);
};

/** How a shift-click range folds into the current selection.
 *  - `"extend"` (default): apply the anchor row's current selected state across
 *    the whole span, merging with (or subtracting from) the existing selection —
 *    ids outside the span are untouched.
 *  - `"replace"`: the selection becomes exactly the span, discarding everything
 *    outside it (dside's original shift-click semantics). */
export type RangeSelectMode = "extend" | "replace";

/** Fold a shift-click `range` (a contiguous, list-ordered slice from `idRange`)
 *  into `current`, per `mode`. Pure so the two range semantics stay unit-testable
 *  independent of the reactive component.
 *  - `order` is the full id order (used to keep the extend merge in list order).
 *  - `anchor` is the last plain-toggled row; in `"extend"` mode its current
 *    selected state decides whether the span is added or removed. */
export const foldRange = (
  order: readonly string[],
  current: readonly string[],
  range: readonly string[],
  anchor: string | null,
  mode: RangeSelectMode,
): string[] => {
  if (mode === "replace") return [...range];
  const anchorSelected = anchor != null && current.includes(anchor);
  if (anchorSelected) {
    const merged = new Set([...current, ...range]);
    return order.filter((x) => merged.has(x));
  }
  const drop = new Set(range);
  return current.filter((x) => !drop.has(x));
};
