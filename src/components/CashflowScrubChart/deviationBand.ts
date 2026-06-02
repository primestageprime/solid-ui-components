// ============================================
// deviationBand — pure geometry for a deviation band between two lines.
//
// A deviation chart shades the gap between a `reference` line and a `series`
// line, coloured by the sign of the deviation: "positive" where the
// reference runs ABOVE the series, "negative" where it dips below. A vertex
// is inserted at every crossing so the colour flips exactly where the lines
// meet — no fill bleeds across a crossover. Either accessor returning `null`
// breaks the band: spans on each side are shaded independently, the gap is
// left empty.
//
// Pure and generic over the item type: same inputs → same polygons, no DOM,
// no Solid reactivity. Lives in its own module so the crossing-split logic
// can be unit-tested in isolation (see deviationBand.test.ts).
// ============================================

/** Which line is higher across a band run. "positive" = reference above series. */
export type BandSign = "positive" | "negative";

/** One filled region of the deviation band. */
export interface BandRun {
  /** "positive" where the reference line sits above the series. */
  sign: BandSign;
  /** SVG polygon points ("x,y x,y …"); `<polygon>` closes it automatically. */
  points: string;
}

/** One pixel-space sample where both lines are defined. */
interface Sample {
  x: number;
  seriesY: number;
  refY: number;
  /** reference value − series value, in data units; drives the colour. */
  diff: number;
}

/** Sign bucket including an explicit zero, so a flat-equal start doesn't get
 *  arbitrarily assigned a colour before the lines actually separate. */
type RawSign = "pos" | "neg" | "zero";

const fmt = (n: number): string => n.toFixed(1);

const rawSign = (diff: number): RawSign =>
  diff > 0 ? "pos" : diff < 0 ? "neg" : "zero";

// A run is closed by walking the reference edge forward then the series edge
// back, yielding a polygon hugging both lines.
const polygonPoints = (run: Sample[]): string =>
  [
    ...run.map((s) => `${fmt(s.x)},${fmt(s.refY)}`),
    ...[...run].reverse().map((s) => `${fmt(s.x)},${fmt(s.seriesY)}`),
  ].join(" ");

// Split one contiguous span (both lines defined throughout) into same-sign
// runs, inserting a crossing vertex wherever the deviation flips sign.
//
// The run's colour is taken from the first NON-zero sample it contains, not
// from sample[0] — otherwise a span that starts where the lines touch
// (diff == 0) would lock onto an arbitrary colour and never correct as the
// lines separate, since a 0 → negative slide is not a strict sign flip.
const runsForSpan = (span: Sample[]): BandRun[] => {
  if (span.length < 2) return [];
  const out: BandRun[] = [];
  let current: Sample[] = [span[0]];
  let runSign: RawSign = rawSign(span[0].diff);

  const flush = () => {
    const sign: BandSign = runSign === "neg" ? "negative" : "positive";
    if (current.length >= 2) out.push({ sign, points: polygonPoints(current) });
  };

  for (let i = 1; i < span.length; i += 1) {
    const prev = span[i - 1];
    const s = span[i];
    const ps = rawSign(prev.diff);
    const cs = rawSign(s.diff);
    const strictCross =
      (ps === "pos" && cs === "neg") || (ps === "neg" && cs === "pos");
    if (strictCross) {
      // Lines are straight between samples, so values meet at the same
      // parameter `t` where the pixel ys meet.
      const t = prev.diff / (prev.diff - s.diff); // ∈ (0, 1)
      const x = prev.x + (s.x - prev.x) * t;
      const y = prev.refY + (s.refY - prev.refY) * t; // == seriesY at crossing
      const cross: Sample = { x, seriesY: y, refY: y, diff: 0 };
      current.push(cross);
      if (runSign === "zero") runSign = ps; // resolve a still-flat run
      flush();
      current = [cross, s];
      runSign = cs;
    } else {
      current.push(s);
      if (runSign === "zero" && cs !== "zero") runSign = cs;
    }
  }
  flush();
  return out;
};

/**
 * Build the deviation band between a `series` line and a `reference` line.
 * Each returned run is "positive" where the reference runs above the series,
 * "negative" where it dips below.
 *
 * @param items      Ordered items (e.g. day cells).
 * @param cellToX    Item index → pixel x (centre of the cell).
 * @param yToPlot    Data value → pixel y.
 * @param series     Item → series value, or null to break the band.
 * @param reference  Item → reference value, or null to break the band.
 */
export const buildDeviationBand = <T>(
  items: readonly T[],
  cellToX: (index: number) => number,
  yToPlot: (value: number) => number,
  series: (item: T, index: number) => number | null,
  reference: (item: T, index: number) => number | null,
): BandRun[] => {
  // Partition into contiguous spans where BOTH lines are defined.
  const spans: Sample[][] = [];
  let span: Sample[] = [];
  items.forEach((item, i) => {
    const sVal = series(item, i);
    const rVal = reference(item, i);
    if (sVal == null || rVal == null) {
      if (span.length > 0) {
        spans.push(span);
        span = [];
      }
      return;
    }
    span.push({
      x: cellToX(i),
      seriesY: yToPlot(sVal),
      refY: yToPlot(rVal),
      diff: rVal - sVal,
    });
  });
  if (span.length > 0) spans.push(span);

  return spans.flatMap(runsForSpan);
};
