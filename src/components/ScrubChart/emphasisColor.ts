// lastReviewedAt: 2026-09-11
// lastReviewedBy: adlai.arnold
// ============================================
// ScrubChart — label colour, read back from the drawn line.
//
// A label names one line, so it reads best in that line's own colour. A
// consumer states that colour as a `stroke` on its OWN CSS class — a class
// this library never sees the contents of, because the whole point of
// letting a consumer style a series is that its `stroke` can be anything a
// browser resolves: a literal hex, a design token through `var()` with a
// fallback chain, `currentColor`, even a gradient reference. There is no data
// this library could ask the consumer to hand down instead that covers all
// of those, short of asking every consumer to add a SECOND, redundant colour
// prop that must always agree with the first — the two would drift.
//
// So this module reads the RESOLVED stroke back off the DOM after each
// render and hands it to the label layer as a `fill`. That is the fragile
// design decision this ticket asks to re-examine — see the reasoning below
// for why the two DOM-free options were rejected.
//
// ---- Why not option 1: one CSS custom property, read by both ----
// `stroke` and `fill` could share one custom property — a line sets
// `stroke: var(--sui-series-color)`, a label sets `fill: var(--sui-series-color)`
// — with NO colour crossing JS. This repo already ships that pattern for its
// OWN default colours (`--sui-cashflow-line-stroke`, `--sui-cashflow-series-stroke`
// — see `CashflowScrubChart.css`). It fails for a CONSUMER's own series class,
// which is the common case: `CashflowScrubChart.test.tsx` and every
// `balanceSeries` example in `dev/showcases/cashflow-scrub-chart.tsx` set
// `stroke` directly (`stroke: #c084fc;`, `stroke: var(--sui-cashflow-positive, …)`)
// on a class of their own choosing. Migrating that to a shared custom
// property would be a breaking change to every existing consumer's CSS, not
// a change inside this library — and until every consumer migrated, its
// labels would silently stop resolving a colour. Rejected.
//
// ---- Why not option 2: hand the colour down as data ----
// `CashflowBalanceSeries` could grow a `color` field, and the label could
// read it directly. Two problems. First, it duplicates a value the CSS class
// already carries — `class` and `color` could disagree, and nothing catches
// that but a human. Second, and worse: most series carry NO literal colour
// at all today. The default comes from a THEME token resolved through a
// `var()` fallback chain (`stroke: var(--sui-cashflow-series-stroke, var(--sui-text-muted, …))`),
// which this library would have to duplicate in JS — reimplementing the CSS
// cascade — to produce the same string a browser already computes for free.
// Rejected.
//
// ---- Option 3: keep the read-back, generalised ----
// The read-back itself already asked for NOTHING cashflow-specific: it took
// an `attribute` name and an `idOf` mapping as parameters. Only the CALL
// SITES — which attribute name, which id prefix — carried cashflow
// vocabulary. So the convention below is the whole read-back, moved here
// unchanged; `CashflowScrubChart` supplies its own attribute names
// (`data-primary-line`, `data-series-id`, `data-marker-index`) and id
// prefixes (`"primary"`, `series:`, `marker:`) as `EmphasisColorSource`
// values.
// ============================================

/**
 * One kind of paintable element this convention reads colour from.
 *
 * A chart tags a paintable element with a `data-*` attribute carrying a raw
 * value — a series id, a marker index, a literal like `"primary"` — and
 * supplies `idOf` to turn that raw value into the id space `hoveredId`
 * compares against (see `emphasis.ts`). `root` is the SVG the tagged
 * elements live under; a chart that splits its marks across more than one
 * `<svg>` supplies one source per attribute PER root.
 */
export interface EmphasisColorSource {
  /** The SVG the tagged elements live under, or `undefined` before mount. */
  readonly root: SVGSVGElement | undefined;
  /** The tag, e.g. `"data-series-id"`. */
  readonly attribute: string;
  /** Raw attribute value → the id space `hoveredId` compares against. */
  readonly idOf: (value: string) => string;
}

/** Whether a resolved `stroke` names a colour a label can take. */
export function isPaintedStroke(stroke: string): boolean {
  return stroke !== "" && stroke !== "none" && stroke !== "rgba(0, 0, 0, 0)";
}

/**
 * Reads one source's tagged elements into `into`, keyed by the id `idOf`
 * resolves. An id already present in `into` is left alone — the first
 * matching element for an id wins, so a later, duplicate tag never
 * overwrites an earlier read for the same id.
 */
function collectOneSource(
  { root, attribute, idOf }: EmphasisColorSource,
  into: Record<string, string>,
): void {
  if (!root) return;
  for (const el of Array.from(root.querySelectorAll(`[${attribute}]`))) {
    const value = el.getAttribute(attribute);
    if (value === null) continue;
    const id = idOf(value);
    if (into[id] !== undefined) continue;
    const stroke = window.getComputedStyle(el).stroke;
    if (isPaintedStroke(stroke)) into[id] = stroke;
  }
}

/**
 * Reads every source's tagged elements' resolved `stroke` into one id →
 * colour map.
 *
 * Returns `{}` on the server — there is no DOM there, so there is no
 * computed style to read (`window` is undefined).
 *
 * @param sources Every attribute/root pair this chart tags a paintable
 *   element with.
 */
export function readEmphasisColors(
  sources: readonly EmphasisColorSource[],
): Record<string, string> {
  const into: Record<string, string> = {};
  if (typeof window === "undefined") return into;
  for (const source of sources) collectOneSource(source, into);
  return into;
}

/** Whether two colour maps hold the same keys and the same colours. */
export function sameColorMap(
  a: Record<string, string>,
  b: Record<string, string>,
): boolean {
  const aKeys = Object.keys(a);
  if (aKeys.length !== Object.keys(b).length) return false;
  for (const key of aKeys) {
    if (a[key] !== b[key]) return false;
  }
  return true;
}
