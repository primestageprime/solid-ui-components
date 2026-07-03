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
