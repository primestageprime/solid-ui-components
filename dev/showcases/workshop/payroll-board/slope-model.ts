// Payroll board — the SLOPE RAIL: savings goal over the Gain/Loss Slope gauge
// over runway (Element 5, Peter 2026-09-24).
//
// The fixture, the gauge's wording, and the PROPORTIONS observation: for a
// rail card of a given height and width, how tall the gauge's box is once the
// two stat cards and the title have taken theirs, how big a ring RateGauge
// draws in it, whether that ring is bound by the height (what Peter asked
// for) or by the width, and whether the callouts get the column they want.
// Every number comes from RateGauge's own pure `metricsFor` — the same
// function the canvas calls with its measured box — so this table is the
// gauge's own arithmetic, not a model of it.
import { join, map } from "../../../../src/fn";
import {
  type Box,
  type CalloutMode,
  CORNER_BLOCKS,
  type CornerLabels,
  calloutModeFor,
  cornerRingFor,
  gaugeGeometry,
  metricsFor,
  minLeadersWidth,
  NATURAL_GAUGE_WIDTH,
  widestCornerLabels,
} from "../../../../src/components/RateGauge/geometry";
import { DEFAULT_SPAN, PAY_DOMAIN } from "./events-model";
import { type RunwayInput, type SavingsGoalInput, dollars } from "./savings-model";

const MS_PER_DAY = 86_400_000;

/** The projection horizon the savings card is judged against: the bench's
 *  own chart window (events-model's default span, 6m from 2026-08-01). */
export const HORIZON = {
  days: Math.round((Number(PAY_DOMAIN[1]) - Number(PAY_DOMAIN[0])) / MS_PER_DAY),
  label: DEFAULT_SPAN,
};

/** The scenario's net gain per month — the gauge's solid needle AND the
 *  savings card's rate. One number, read by both. */
const SCENARIO_PER_MONTH = 35_057;

export const SLOPE_FIXTURE = {
  /** The dashed needle: the baseline's net gain per month. */
  baseline: 37_978,
  scenario: SCENARIO_PER_MONTH,
  /** Symmetric about zero, in the $10k steps thorcasting's ring grows by. */
  domain: [-40_000, 40_000] as const,
  savings: {
    target: 100_000,
    saved: 0,
    monthlyGain: SCENARIO_PER_MONTH,
  } satisfies SavingsGoalInput,
  /** Thorcasting computes this (`runwayStatus`); the bench states it. */
  runway: { value: "Solvent", color: "success" as const },
  /** Peter's red line (2026-09-24): a runway shorter than this is danger.
   *  Three months — the bench's choice, stated for Peter to move. */
  minRunwayDays: 90,
};

// ── the status galleries: one fixed example per card state ─────────────────

/** One savings card per format Peter listed, plus the two ends. Target
 *  $100k throughout; only saved and the monthly gain move. */
export const SAVINGS_GALLERY: readonly { readonly name: string; readonly input: SavingsGoalInput }[] = [
  { name: "met", input: { target: 100_000, saved: 100_000, monthlyGain: 35_057 } },
  { name: "days", input: { target: 100_000, saved: 95_000, monthlyGain: 30_000 } },
  { name: "weeks", input: { target: 100_000, saved: 80_000, monthlyGain: 30_000 } },
  { name: "months, inside horizon", input: { target: 100_000, saved: 0, monthlyGain: 35_057 } },
  { name: "months, beyond horizon", input: { target: 100_000, saved: 0, monthlyGain: 12_000 } },
  { name: "years", input: { target: 100_000, saved: 0, monthlyGain: 2_000 } },
  { name: "never", input: { target: 100_000, saved: 0, monthlyGain: -2_921 } },
];

/** One runway card per state thorcasting's `runwayStatus` can say, with the
 *  crossing shown both sides of the minimum. */
export const RUNWAY_GALLERY: readonly { readonly name: string; readonly input: RunwayInput }[] = [
  { name: "bankrupt", input: { startBalance: 0, floor: 0, crossingDays: null, slopePerMonth: -5_000, windowLabel: HORIZON.label } },
  { name: "runs out, days", input: { startBalance: 20_000, floor: 0, crossingDays: 10, slopePerMonth: -60_000, windowLabel: HORIZON.label } },
  { name: "runs out, < minimum", input: { startBalance: 60_000, floor: 0, crossingDays: 50, slopePerMonth: -36_000, windowLabel: HORIZON.label } },
  { name: "runs out, ≥ minimum", input: { startBalance: 120_000, floor: 0, crossingDays: 120, slopePerMonth: -30_000, windowLabel: HORIZON.label } },
  { name: "solvent", input: { startBalance: 200_000, floor: 0, crossingDays: null, slopePerMonth: 35_057, windowLabel: HORIZON.label } },
  { name: "beyond the window", input: { startBalance: 400_000, floor: 0, crossingDays: null, slopePerMonth: -2_921, windowLabel: HORIZON.label } },
];

export const SCENARIO_LABEL = "Scenario";
export const BASELINE_LABEL = "Baseline";

/** A bare magnitude per month: "$35,057/mo". The building block — never a
 *  value's own line, because it drops the sign. */
export const perMonth = (amount: number): string => `${dollars(amount)}/mo`;

/**
 * A value's second line: "$35,057/mo", and "-$40,000/mo" below zero.
 *
 * Signed only when NEGATIVE. Thorcasting's `formatRateMagnitudeCents` (which
 * this bench first copied) prints the magnitude alone, so a scenario losing
 * $40k a month read "$40,000/mo" — the same as one making it. That formatter
 * is thorcasting's to change; this is the wording it can adopt.
 */
export const amountPerMonth = (amount: number): string =>
  `${amount < 0 ? "-" : ""}${perMonth(amount)}`;

/** The brace line: "-$2,921/mo", signed with a hyphen as thorcasting does. */
export const signedPerMonth = (delta: number): string =>
  `${delta < 0 ? "-" : "+"}${perMonth(delta)}`;

/** Exactly the strings RateGauge passes the canvas as `labels` (its
 *  `columnTexts`), for these two needles — the words the column is cut to. */
export const columnTextsFor = (baseline: number, value: number): readonly string[] => [
  SCENARIO_LABEL,
  signedPerMonth(value - baseline),
  BASELINE_LABEL,
  amountPerMonth(value),
  amountPerMonth(baseline),
];

// ── the rail's vertical budget ──────────────────────────────────────────────
// MEASURED in the gallery (2026-09-24, SUI browser, payroll-board bench):
// the rest of the rail card's height is what the gauge gets.

/** FillCardSurface: `sm` padding + a 1px border, top and bottom. */
const CARD_CHROME = 2 * (8 + 1);
/** FillCardSurface's `xs` gap between its children. */
const CARD_GAP = 4;
/** TextTitle, one line. */
const TITLE_H = 17;
/** One MetricCard: 16px padding, label, 1.5rem value, 1px border. */
const METRIC_CARD_H = 79;

/** The gauge's box inside a rail card of this outer height: the card's
 *  chrome, the title, two stat cards and the three gaps between four
 *  children come off the top. */
export const gaugeBoxHeight = (railHeight: number): number =>
  railHeight - CARD_CHROME - TITLE_H - 2 * METRIC_CARD_H - 3 * CARD_GAP;

/** The rail's content width: the card's chrome comes off the sides. */
export const gaugeBoxWidth = (railWidth: number): number => railWidth - CARD_CHROME;

/** What one gauge box resolves to when the layout picks a gauge by the
 *  breakpoint (`calloutModeFor`) — every figure
 *  read off RateGauge's own geometry, so this table is the gauge's
 *  arithmetic, not a model of it. */
export interface BoxProportions {
  readonly box: Box;
  /** The leader layout's ring in this box (what `callouts: "leaders"` draws). */
  readonly ringOuter: number;
  readonly bound: "height" | "width";
  /** The column the words want vs the column they get. */
  readonly wantedLabel: number;
  readonly labelWidth: number;
  /** The narrowest box at which the leader layout is height-bound. */
  readonly minLeadersWidth: number;
  /** Which gauge the layout's breakpoint picks for this box. */
  readonly calloutMode: CalloutMode;
  /** The ring the picked gauge draws, and what bounds it. */
  readonly fitRing: number;
  readonly fitBound: "height" | "width";
}

export interface ProportionsRow extends BoxProportions {
  readonly railHeight: number;
  readonly railWidth: number;
  /** The narrowest rail at which this height is height-bound. */
  readonly minRailWidth: number;
}

/** A box wide enough that width can never bind — for the unclamped figures. */
const UNBOUNDED_WIDTH = 100_000;

/** The corner blocks' words, exactly as RateGauge builds them under `corners`
 *  with this bench's wording (its default `formatCornerDelta`). */
export const cornerBlocks = (baseline: number, value: number): CornerLabels =>
  value === baseline
    ? { value: [`${SCENARIO_LABEL} = ${BASELINE_LABEL}`, amountPerMonth(value)], baseline: [] }
    : {
        value: [SCENARIO_LABEL, amountPerMonth(value), cornerDelta(baseline, value)],
        baseline: [BASELINE_LABEL, amountPerMonth(baseline)],
      };

/** What RateGauge SIZES the corner layout to: the widest words anywhere on
 *  the scale (both ends, the collapse, the reading) — one radius per box. */
export const cornerSizingFor = (baseline: number, value: number): CornerLabels =>
  widestCornerLabels(
    map((v: number) => cornerBlocks(baseline, v), [
      SLOPE_FIXTURE.domain[0],
      SLOPE_FIXTURE.domain[1],
      baseline,
      value,
    ]),
  );

/** "-$2,921/mo (-8%)": RateGauge's default corner diff over this wording. */
export const cornerDelta = (baseline: number, value: number): string =>
  `${signedPerMonth(value - baseline)} (${Math.round(((value - baseline) / Math.abs(baseline)) * 100)}%)`;

export const boxProportions = (
  box: Box,
  labels: readonly string[],
  cornerLabels: CornerLabels,
): BoxProportions => {
  const reading = {
    domain: SLOPE_FIXTURE.domain,
    baseline: SLOPE_FIXTURE.baseline,
    value: SLOPE_FIXTURE.scenario,
    labels,
    cornerLabels,
  };
  const leaders = metricsFor(box, labels);
  const free = metricsFor({ width: UNBOUNDED_WIDTH, height: box.height }, labels);
  // What a layout does: pick by the breakpoint, then draw that gauge.
  const calloutMode = calloutModeFor(box, labels);
  const drawn = gaugeGeometry({ ...reading, box, callouts: calloutMode });
  const fillsHeight =
    calloutMode === "corners"
      ? cornerRingFor({ width: UNBOUNDED_WIDTH, height: box.height }, cornerLabels)
      : free.ringOuter;
  return {
    box,
    ringOuter: leaders.ringOuter,
    bound: leaders.ringOuter >= free.ringOuter - 0.01 ? "height" : "width",
    wantedLabel: free.labelWidth,
    labelWidth: leaders.labelWidth,
    minLeadersWidth: Math.ceil(minLeadersWidth(box.height, labels)),
    calloutMode,
    fitRing: drawn.metrics.ringOuter,
    fitBound: drawn.metrics.ringOuter >= fillsHeight - 0.01 ? "height" : "width",
  };
};

const fixtureLabels = (): readonly string[] =>
  columnTextsFor(SLOPE_FIXTURE.baseline, SLOPE_FIXTURE.scenario);
const fixtureCorners = (): CornerLabels =>
  cornerSizingFor(SLOPE_FIXTURE.baseline, SLOPE_FIXTURE.scenario);

export const proportionsRow = (
  railHeight: number,
  railWidth: number,
  labels: readonly string[] = fixtureLabels(),
): ProportionsRow => {
  const box = { width: gaugeBoxWidth(railWidth), height: gaugeBoxHeight(railHeight) };
  const row = boxProportions(box, labels, fixtureCorners());
  return {
    ...row,
    railHeight,
    railWidth,
    minRailWidth: row.minLeadersWidth + CARD_CHROME,
  };
};

/** The column holds every word, to the sub-pixel the layout rounds away. */
export const calloutsFit = (row: BoxProportions): boolean =>
  row.labelWidth >= row.wantedLabel - 0.5;

const RAIL_HEIGHTS = [360, 420, 480, 540, 600, 660, 720] as const;

const modeCell = (row: BoxProportions): string =>
  `${row.calloutMode} r=${row.fitRing.toFixed(1)} (${row.fitBound})`;

/** THE HEADLESS OBSERVATION: rail height → gauge box → leader ring → callout
 *  fit, and the gauge the breakpoint picks, at one rail width
 *  (default: BuilderBoard's NATURAL_GAUGE_WIDTH). */
export const observeProportions = (
  railWidth: number = NATURAL_GAUGE_WIDTH,
  labels: readonly string[] = fixtureLabels(),
): string => {
  const line = (row: ProportionsRow): string =>
    join("  ", [
      String(row.railHeight).padStart(6),
      `${Math.round(row.box.width)}×${Math.round(row.box.height)}`.padStart(9),
      row.ringOuter.toFixed(1).padStart(6),
      row.bound.padEnd(6),
      `${Math.round(row.labelWidth)}/${Math.round(row.wantedLabel)}`.padStart(7),
      calloutsFit(row) ? "fits " : "CLIPS",
      String(row.minRailWidth).padStart(8),
      modeCell(row),
    ]);
  return join("\n", [
    `rail width ${railWidth}px; callouts: ${join(" | ", labels)}`,
    "rail H  gauge box  leaders  bound   label  fit    min rail W  picked →",
    ...map((h: number) => line(proportionsRow(h, railWidth, labels)), [...RAIL_HEIGHTS]),
  ]);
};

const GAUGE_BOX_HEIGHTS = [300, 350, 400, 450, 500] as const;

/** The same, keyed on the GAUGE BOX's own height (what is left between the
 *  cards): the rail width leaders need to stay height-bound, and the gauge
 *  the breakpoint picks at each rail width asked about. */
export const observeGaugeBoxes = (
  railWidths: readonly number[] = [240, 286, NATURAL_GAUGE_WIDTH, 340],
): string => {
  const cell = (height: number, railWidth: number): string =>
    modeCell(
      boxProportions({ width: gaugeBoxWidth(railWidth), height }, fixtureLabels(), fixtureCorners()),
    ).padEnd(30);
  const line = (height: number): string =>
    join("  ", [
      String(height).padStart(5),
      String(Math.ceil(minLeadersWidth(height, fixtureLabels())) + CARD_CHROME).padStart(12),
      ...map((w: number) => cell(height, w), railWidths),
    ]);
  return join("\n", [
    `corners: top ${CORNER_BLOCKS.top}, bottom ${CORNER_BLOCKS.bottom}`,
    `box H  leaders need  ${join("  ", map((w: number) => `@${w}px rail`.padEnd(30), railWidths))}`,
    ...map(line, [...GAUGE_BOX_HEIGHTS]),
  ]);
};
