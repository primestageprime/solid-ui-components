// Payroll board — the VALUE SWEEP (Peter, 2026-09-24): one slider drives the
// scenario value across the gauge's whole scale, bottom of the arc to the
// top, into the leader gauge and the corner gauge side by side. Baseline is
// held fixed, so the diff line moves with the needle.
//
// The headless half: for any value, every label box each gauge would draw
// (RateGauge's own geometry for where; this bench's wording for what, and
// RateGauge's 7.3px/char estimate for how wide), and every overlap — label
// on label, label outside the gauge's box, corner label on the dial.
// Reported, not fixed (Peter asked for the list first).
import { filter, flatMap, join, map } from "../../../../src/fn";
import {
  type Box,
  type Callout,
  type CornerBlock,
  gaugeGeometry,
  LABEL_LINE_HEIGHT,
  leaderConflicts,
} from "../../../../src/components/RateGauge/geometry";
import {
  BASELINE_LABEL,
  SCENARIO_LABEL,
  SLOPE_FIXTURE,
  columnTextsFor,
  cornerBlocks,
  cornerSizingFor,
  amountPerMonth,
  signedPerMonth,
} from "./slope-model";

/** The slider's range: the gauge's own scale, the most negative value it
 *  can draw to the most positive. Whole dollars, so the baseline (a whole
 *  dollar) is a reachable stop — that is where the rows collapse. */
export const SWEEP_MIN = SLOPE_FIXTURE.domain[0];
export const SWEEP_MAX = SLOPE_FIXTURE.domain[1];

/** Fixed gauge boxes, so each gauge renders whatever the breakpoint says:
 *  the leader box is wider than `minLeadersWidth(300)` (242), the corner box
 *  narrower than `minLeadersWidth(395)` (290). */
export const LEADER_BOX: Box = { width: 320, height: 300 };
export const CORNER_BOX: Box = { width: 240, height: 395 };

/** RateGauge's advance estimate for its 11px label text. */
const CHAR = 7.3;

export interface LabelBox {
  readonly gauge: "leaders" | "corners";
  /** Which callout or corner block the line belongs to. */
  readonly row: string;
  readonly text: string;
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

const leaderLines = (id: Callout["id"], baseline: number, value: number): readonly string[] => {
  if (id === "delta") return [signedPerMonth(value - baseline)];
  if (id === "baseline") return [BASELINE_LABEL, amountPerMonth(baseline)];
  if (id === "valueAndBaseline") return [`${SCENARIO_LABEL} = ${BASELINE_LABEL}`, amountPerMonth(value)];
  return [SCENARIO_LABEL, amountPerMonth(value)];
};

const lineBox = (
  gauge: LabelBox["gauge"],
  row: string,
  text: string,
  left: number,
  y: number,
): LabelBox => ({
  gauge,
  row,
  text,
  left,
  right: left + text.length * CHAR,
  top: y - LABEL_LINE_HEIGHT / 2,
  bottom: y + LABEL_LINE_HEIGHT / 2,
});

export interface SweepReading {
  readonly value: number;
  readonly boxes: readonly LabelBox[];
  readonly collisions: readonly string[];
  readonly ring: { readonly leaders: number; readonly corners: number };
}

const overlaps = (a: LabelBox, b: LabelBox): boolean =>
  a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

const pairs = <T,>(items: readonly T[]): readonly (readonly [T, T])[] =>
  flatMap(
    (a: T, i: number) =>
      map((b: T) => [a, b] as const, filter((_: T, j: number) => j > i, items)),
    items,
  );

const outside = (label: LabelBox, box: Box): boolean =>
  label.top < 0 || label.bottom > box.height || label.left < 0 || label.right > box.width;

export const sweepReading = (
  value: number,
  baseline: number = SLOPE_FIXTURE.baseline,
): SweepReading => {
  const reading = { domain: SLOPE_FIXTURE.domain, baseline, value };
  const leaders = gaugeGeometry({
    ...reading,
    labels: columnTextsFor(baseline, value),
    box: LEADER_BOX,
  });
  const words = cornerBlocks(baseline, value);
  const corners = gaugeGeometry({
    ...reading,
    callouts: "corners",
    cornerLabels: cornerSizingFor(baseline, value),
    box: CORNER_BOX,
  });
  const leaderBoxes = flatMap(
    (callout: Callout) =>
      map(
        (text: string, i: number) =>
          lineBox("leaders", callout.id, text, callout.textX, callout.lineY[i]),
        [...leaderLines(callout.id, baseline, value)],
      ),
    leaders.callouts,
  );
  const cornerBoxes = flatMap(
    (block: CornerBlock) =>
      map(
        (text: string, i: number) =>
          lineBox("corners", block.id, text, block.x - text.length * CHAR, block.lineY[i]),
        [...words[block.id]],
      ),
    corners.corners ?? [],
  );
  // The dial's reach at a corner line: the brace's cusp circle, nearest the
  // pivot's height within the line's band.
  const extent = corners.metrics.brace + 6;
  const center = corners.metrics.center;
  const dialReach = (label: LabelBox): number => {
    const dy = Math.max(0, Math.max(center.cy - label.bottom, label.top - center.cy));
    return dy >= extent ? center.cx : center.cx + Math.sqrt(extent * extent - dy * dy);
  };
  const routing = map(
    (c: { kind: string; a: number; b: number }) =>
      `leaders:${leaders.callouts[c.a].id}/${leaders.callouts[c.b].id} leader ${c.kind === "cross" ? "CROSSING" : "runs < 2px apart"}`,
    leaderConflicts(map((c: Callout) => c.points, leaders.callouts)),
  );
  const labelPairs = [...pairs(leaderBoxes), ...pairs(cornerBoxes)];
  const describe = (l: LabelBox) => `${l.gauge}:${l.row}"${l.text}"`;
  const collisions = [
    ...routing,
    ...map(
      ([a, b]: readonly [LabelBox, LabelBox]) => `${describe(a)} × ${describe(b)}`,
      // Lines of ONE row are stacked a line-height apart by construction;
      // only lines of different rows can collide.
      filter(
        ([a, b]: readonly [LabelBox, LabelBox]) => a.row !== b.row && overlaps(a, b),
        labelPairs,
      ),
    ),
    ...map(
      (l: LabelBox) => `${describe(l)} outside box`,
      filter((l: LabelBox) => outside(l, l.gauge === "leaders" ? LEADER_BOX : CORNER_BOX), [
        ...leaderBoxes,
        ...cornerBoxes,
      ]),
    ),
    ...map(
      (l: LabelBox) => `${describe(l)} on the dial (reach ${Math.round(dialReach(l))} > ${Math.round(l.left)})`,
      filter((l: LabelBox) => dialReach(l) > l.left, cornerBoxes),
    ),
  ];
  return {
    value,
    boxes: [...leaderBoxes, ...cornerBoxes],
    collisions,
    ring: { leaders: leaders.metrics.ringOuter, corners: corners.metrics.ringOuter },
  };
};

/** The sweep stops the table prints: both poles, zero, the baseline (the
 *  collapse) and a dollar either side of it, and the fixture's own reading. */
export const SWEEP_STOPS: readonly number[] = [
  SWEEP_MIN,
  -30_000,
  -20_000,
  -10_000,
  0,
  10_000,
  20_000,
  SLOPE_FIXTURE.scenario,
  -17_016,
  SLOPE_FIXTURE.baseline - 1,
  SLOPE_FIXTURE.baseline,
  SLOPE_FIXTURE.baseline + 1,
  SWEEP_MAX,
];

const fmtBox = (l: LabelBox): string =>
  `${l.row}:${l.text}[${Math.round(l.left)}-${Math.round(l.right)},${Math.round(l.top)}-${Math.round(l.bottom)}]`;

/** THE HEADLESS OBSERVATION: value → every label box of each gauge → the
 *  overlaps. One block per stop. */
export const observeSweep = (
  stops: readonly number[] = SWEEP_STOPS,
  baseline: number = SLOPE_FIXTURE.baseline,
): string =>
  join(
    "\n",
    map((value: number) => {
      const r = sweepReading(value, baseline);
      const of = (gauge: LabelBox["gauge"]) =>
        join(" ", map(fmtBox, filter((l: LabelBox) => l.gauge === gauge, r.boxes)));
      return join("\n", [
        `value ${signedPerMonth(value)} vs baseline ${signedPerMonth(baseline)}  ring L=${r.ring.leaders.toFixed(1)} C=${r.ring.corners.toFixed(1)}  ${
          r.collisions.length === 0 ? "no collisions" : `${r.collisions.length} COLLISION(S)`
        }`,
        `  leaders ${LEADER_BOX.width}×${LEADER_BOX.height}: ${of("leaders")}`,
        `  corners ${CORNER_BOX.width}×${CORNER_BOX.height}: ${of("corners")}`,
        ...map((c: string) => `  ✗ ${c}`, r.collisions),
      ]);
    }, stops),
  );

/** The coarse 2-D stops: baseline × scenario, both across the whole scale. */
export const GRID_STOPS: readonly number[] = [-40_000, -20_000, -5_000, 0, 5_000, 20_000, 40_000];

/** The inversion, read off the geometry: which way the brace runs, the
 *  delta's sign, and which row sits on top. */
export const inversionOf = (value: number, baseline: number) => {
  const g = gaugeGeometry({
    domain: SLOPE_FIXTURE.domain,
    baseline,
    value,
    labels: columnTextsFor(baseline, value),
    box: LEADER_BOX,
  });
  const top = g.callouts[0]?.id;
  return {
    delta: g.delta,
    braceUp: g.valueAngle > g.baselineAngle,
    topRow: top,
    tone: g.tone,
  };
};

/** THE 2-D OBSERVATION: every baseline × scenario stop → collisions in
 *  either gauge, plus the inversion checks (delta sign, brace direction and
 *  top row all agree with value vs baseline). One cell per pair. */
export const observeSweepGrid = (stops: readonly number[] = GRID_STOPS): string => {
  const cell = (baseline: number, value: number): string => {
    const r = sweepReading(value, baseline);
    const inv = inversionOf(value, baseline);
    const expectedTop = value > baseline ? "value" : value < baseline ? "baseline" : "valueAndBaseline";
    const agrees =
      Math.sign(inv.delta) === Math.sign(value - baseline) &&
      (value === baseline || inv.braceUp === value > baseline) &&
      inv.topRow === expectedTop;
    return `${r.collisions.length === 0 ? "ok" : `${r.collisions.length}✗`}${agrees ? "" : "!inv"}`.padStart(7);
  };
  const header = `base\\scen ${join("", map((v: number) => `${v / 1000}k`.padStart(7), stops))}`;
  const rows = map(
    (baseline: number) =>
      `${`${baseline / 1000}k`.padStart(9)} ${join("", map((value: number) => cell(baseline, value), stops))}`,
    stops,
  );
  return join("\n", [header, ...rows]);
};
