// Payroll board — the Y-AXIS STRATEGY model (element 7, chart visual
// language). Pure and headless: every chart's top-right split button reads
// its state from here, and the printed table in `chart-strategy.test.ts` is
// how the three modes are read without a browser.
//
// Mode names are ChartFrame's (= ScrubChart's `ScrubChartYAxisMode`); the
// labels and icons live in ChartFrame's `CHART_Y_AXIS_MODES`, not here.
//
//   auto       ↗↙  auto-grow | manual shrink: the axis grows with the data at
//                  once and shrinks only on the button. The HOLD is
//                  createAxisWaterMarks' — this model never re-implements
//                  it, it asks for a `reset`.
//   autoscale  ↑↓  full auto: the axis is the fit, both ways. The button has
//                  nothing to do, so it is DISABLED and says why.
//   fixed      🔒  locked: the axis is the reader's [min, max]. The button
//                  opens the lock dialog.
//
// Transitions return an INTENT alongside the next state, so the reactive
// wrapper (`chart-y-axis.ts`) is the one place that calls `marks.reset()` or
// opens the dialog:
//
//   * entering auto → `reset`: the marks kept ratcheting while another
//     mode was showing, so without a reset the axis would come back holding
//     a stale peak.
//   * entering fixed → the lock is SEEDED with the domain on screen, so the
//     axis does not jump, and the dialog opens to edit it.
//
// Lives in the bench's subfolder, so it is a section helper, never a bench.
import { join, map } from "../../../../src/fn";
import type { ChartYAxisMode } from "../../../../src/components/ChartFrame";

/** A y extent, `[min, max]`, in the chart's own unit. */
export type YDomain = readonly [number, number];

/** ChartFrame's (= ScrubChart's) mode names: auto = auto-grow + manual
 *  shrink, autoscale = full auto, fixed = locked. */
export type YAxisMode = ChartYAxisMode;

export interface YAxisState {
  readonly mode: YAxisMode;
  /** The reader's lock. Kept across mode changes; re-seeded on entry. */
  readonly lock: YDomain | null;
}

export const INITIAL_Y_AXIS: YAxisState = { mode: "auto", lock: null };

export type YAxisEvent =
  | { readonly type: "press" }
  | { readonly type: "setMode"; readonly mode: YAxisMode }
  | { readonly type: "setLock"; readonly lock: YDomain };

/** What the wrapper must do after a step, besides store the state. */
export type YAxisIntent = "reset" | "openLockDialog" | null;

export interface YAxisStep {
  readonly state: YAxisState;
  readonly intent: YAxisIntent;
}

/**
 * THE PURE STEP. `shown` is the domain on screen right now — what a lock is
 * seeded with when the reader switches to locked.
 */
export const stepYAxis = (
  state: YAxisState,
  event: YAxisEvent,
  shown: YDomain | null,
): YAxisStep => {
  switch (event.type) {
    case "press":
      return { state, intent: PRESS_INTENT[state.mode] };
    case "setLock":
      return { state: { mode: "fixed", lock: event.lock }, intent: null };
    case "setMode":
      if (event.mode === state.mode) return { state, intent: null };
      if (event.mode === "fixed")
        return {
          state: { mode: "fixed", lock: shown ?? state.lock },
          intent: "openLockDialog",
        };
      return {
        state: { ...state, mode: event.mode },
        intent: event.mode === "auto" ? "reset" : null,
      };
  }
};

const PRESS_INTENT: Record<YAxisMode, YAxisIntent> = {
  auto: "reset",
  autoscale: null,
  fixed: "openLockDialog",
};

/**
 * The domain to DRAW. `held` is the water marks' domain (null until they
 * have seen a fit); `fitted` is the data's own extent.
 */
export const displayedDomain = (
  state: YAxisState,
  fitted: YDomain | null,
  held: YDomain | null,
): YDomain | null => {
  if (state.mode === "fixed") return state.lock ?? fitted;
  if (state.mode === "autoscale") return fitted;
  return held ?? fitted;
};

// ── The lock dialog's validation ────────────────────────────────────────────

export type LockCheck =
  | { readonly ok: true; readonly lock: YDomain }
  | { readonly ok: false; readonly minError?: string; readonly maxError?: string };

const isNumber = (value: number | undefined): value is number =>
  value !== undefined && Number.isFinite(value);

/** Both are numbers, and min < max. Errors are per field. */
export const checkLock = (
  min: number | undefined,
  max: number | undefined,
): LockCheck => {
  const minError = isNumber(min) ? undefined : "Enter a number";
  const maxError = isNumber(max) ? undefined : "Enter a number";
  if (minError !== undefined || maxError !== undefined)
    return { ok: false, minError, maxError };
  if ((min as number) >= (max as number))
    return { ok: false, maxError: "Max must be greater than min" };
  return { ok: true, lock: [min as number, max as number] };
};

// ── The headless observation ────────────────────────────────────────────────

/**
 * The water-mark step this model composes with — the signature of
 * createAxisWaterMarks' `holdFitDomain`, flattened to domains. Injected so the
 * hold is never re-implemented here.
 */
export interface HoldStep<H> {
  readonly initial: H;
  readonly step: (held: H, epoch: number, fitted: YDomain | null) => H;
  readonly domainOf: (held: H) => YDomain | null;
}

/** One scripted frame: a fit, and optionally one reader event before it. */
export interface YAxisFrame {
  readonly fitted: YDomain | null;
  readonly event?: YAxisEvent;
}

export interface YAxisRow {
  readonly frame: number;
  readonly event: string;
  readonly mode: YAxisMode;
  readonly intent: YAxisIntent;
  readonly fitted: YDomain | null;
  readonly shown: YDomain | null;
}

const describeEvent = (event: YAxisEvent | undefined): string => {
  if (event === undefined) return "";
  if (event.type === "press") return "press";
  if (event.type === "setMode") return `mode→${event.mode}`;
  return `lock ${event.lock[0]}..${event.lock[1]}`;
};

/**
 * Run frames through the strategy AND the injected hold, as the reactive
 * wrapper does: the marks see every fit in every mode, and a `reset` intent
 * starts a new epoch.
 */
export function observeYAxis<H>(
  frames: readonly YAxisFrame[],
  hold: HoldStep<H>,
  initial: YAxisState = INITIAL_Y_AXIS,
): readonly YAxisRow[] {
  let state = initial;
  let held = hold.initial;
  let epoch = 0;
  let shown: YDomain | null = null;
  return map((frame: YAxisFrame, index: number): YAxisRow => {
    let intent: YAxisIntent = null;
    if (frame.event !== undefined) {
      const next = stepYAxis(state, frame.event, shown);
      state = next.state;
      intent = next.intent;
      if (intent === "reset") epoch += 1;
    }
    held = hold.step(held, epoch, frame.fitted);
    shown = displayedDomain(state, frame.fitted, hold.domainOf(held));
    return {
      frame: index,
      event: describeEvent(frame.event),
      mode: state.mode,
      intent,
      fitted: frame.fitted,
      shown,
    };
  }, frames);
}

const cell = (domain: YDomain | null): string =>
  domain === null ? "—" : `${domain[0]}..${domain[1]}`;

/** The rows as a fixed-width text table. */
export const formatYAxisRows = (rows: readonly YAxisRow[]): string =>
  join(
    "\n",
    [
      "frame | event            | mode       | intent         | fitted   | shown",
      ...map(
        (row: YAxisRow) =>
          `${String(row.frame).padStart(5)} | ${row.event.padEnd(16)} | ${row.mode.padEnd(10)} | ${String(row.intent ?? "").padEnd(14)} | ${cell(row.fitted).padEnd(8)} | ${cell(row.shown)}`,
        rows,
      ),
    ],
  );
