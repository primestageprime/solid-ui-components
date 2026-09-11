// lastReviewedAt: 2026-09-11
// lastReviewedBy: adlai.arnold
// ============================================
// ScrubChart — label-to-line hover emphasis, pure core.
//
// A drawn label NAMES one line, and a chart ships no legend, so the only way
// to read the pairing is to point at the label. While the pointer rests on
// one id, that id keeps full strength and every other id steps back. This
// module decides ONLY that: given the hovered id and a candidate id, which of
// three states applies. It reads no context, touches no DOM, and knows no
// chart vocabulary — a caller's id string can name anything: a series, a
// primary line, a marker.
//
// `CashflowScrubChart` is the first caller. Its id vocabulary — `"primary"`,
// `series:<id>`, `marker:<index>` — is ITS OWN choice, not this module's.
// ============================================

/** One id's emphasis state while some id is hovered. */
export type EmphasisState = "highlighted" | "muted";

/**
 * The emphasis state `id` takes while `hoveredId` is hovered.
 *
 * @param hoveredId The id the pointer currently rests on, or `null` while it
 *   rests on none.
 * @param id The candidate id to classify, or `null` for an element no id
 *   names — an unlabelled element, which can only ever step back.
 * @returns `null` while nothing is hovered (every id sits at rest);
 *   `"highlighted"` for the hovered id itself; `"muted"` for every other id,
 *   `null` id included.
 */
export function emphasisStateFor(
  hoveredId: string | null,
  id: string | null,
): EmphasisState | null {
  if (hoveredId === null) return null;
  if (id === null) return "muted";
  return id === hoveredId ? "highlighted" : "muted";
}

/**
 * The emphasis modifier class `id` takes while `hoveredId` is hovered.
 *
 * @param block CSS block the modifier hangs off, e.g. `"my-chart__line"`.
 * @param hoveredId The id the pointer currently rests on, or `null`.
 * @param id The element's own id, or `null` for an element no id names.
 * @returns A leading-space class string (`" my-chart__line--muted"`), or
 *   `""` while nothing is hovered.
 */
export function emphasisClassName(
  block: string,
  hoveredId: string | null,
  id: string | null,
): string {
  const state = emphasisStateFor(hoveredId, id);
  return state === null ? "" : ` ${block}--${state}`;
}

/**
 * The emphasis state every id in `ids` takes while `hoveredId` is hovered.
 *
 * A convenience over calling {@link emphasisStateFor} per id — useful when a
 * caller wants to classify a whole id list in one pass, e.g. to decide
 * whether ANY id is muted before painting a shared underlay.
 *
 * @param hoveredId The id the pointer currently rests on, or `null`.
 * @param ids Every id to classify.
 * @returns A map from each id in `ids` to its state, `null` included.
 */
export function emphasisStates(
  hoveredId: string | null,
  ids: readonly string[],
): ReadonlyMap<string, EmphasisState | null> {
  const out = new Map<string, EmphasisState | null>();
  for (const id of ids) out.set(id, emphasisStateFor(hoveredId, id));
  return out;
}
