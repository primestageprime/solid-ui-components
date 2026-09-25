// ============================================
// createYAxisStrategy — the Y-AXIS STRATEGY a ChartFrame's split button
// drives (Peter's chart visual language, 2026-09-24). Promoted from the
// payroll-board bench (chart-strategy.ts + chart-y-axis.ts).
//
// Pure and headless first: `stepYAxis` is the whole model, and
// `observeYAxis` + `formatYAxisRows` print a scripted run as a table — how the
// three modes are read without a browser.
//
// Mode names are ChartFrame's (= ScrubChart's `ScrubChartYAxisMode`):
//
//   auto       auto-grow | manual shrink: the axis grows with the data at
//              once and shrinks only on the button. The HOLD is
//              `createAxisWaterMarks`' — this model never re-implements it,
//              it asks for a `reset`.
//   autoscale  full auto: the axis is the fit, both ways. The button has
//              nothing to do, so ChartFrame DISABLES it.
//   fixed      locked: the axis is the reader's [min, max]. The button opens
//              the lock dialog (`YAxisLockDialog`).
//
// Transitions return an INTENT alongside the next state, so the reactive
// wrapper is the one place that calls `marks.reset()` or opens the dialog:
//
//   * entering auto → `reset`: the marks kept ratcheting while another mode
//     was showing, so without a reset the axis would come back holding a
//     stale peak.
//   * entering fixed → the lock is SEEDED with the domain on screen, so the
//     axis does not jump, and the dialog opens to edit it.
//
//   const marks = createAxisWaterMarks(fit);
//   const axis = createYAxisStrategy(fit, marks);
//   <ChartFrame yAxisMode={axis.mode()} onYAxisModeChange={axis.setMode}
//               onYAxisPress={axis.press} …>
//     <Chart valueDomain={axis.domain() ?? undefined} … />
//   </ChartFrame>
//   <YAxisLockDialog open={axis.dialogOpen()} lock={axis.lock()}
//                    onLock={axis.setLock} onClose={axis.closeDialog} />
// ============================================
import { type Accessor, createSignal } from "solid-js";
import {
  type ChartYAxisMode,
  type ChartYAxisModeInfo,
  chartYAxisModeInfo,
} from "../components/ChartFrame/yAxisModes";
import { join, map } from "../fn";
import {
  type AxisWaterMarks,
  type FitDomain,
  type HeldDomain,
  NO_HELD_DOMAIN,
  heldDomainOf,
  holdFitDomain,
} from "./createAxisWaterMarks";

/** A y extent, `[min, max]`, in the chart's own unit. */
export type YAxisDomain = readonly [number, number];

/** ChartFrame's (= ScrubChart's) mode names. */
export type YAxisMode = ChartYAxisMode;

export interface YAxisState {
  readonly mode: YAxisMode;
  /** The reader's lock. Kept across mode changes; re-seeded on entry. */
  readonly lock: YAxisDomain | null;
}

export const INITIAL_Y_AXIS: YAxisState = { mode: "auto", lock: null };

export type YAxisEvent =
  | { readonly type: "press" }
  | { readonly type: "setMode"; readonly mode: YAxisMode }
  | { readonly type: "setLock"; readonly lock: YAxisDomain };

/** What the wrapper must do after a step, besides store the state. */
export type YAxisIntent = "reset" | "openLockDialog" | null;

export interface YAxisStep {
  readonly state: YAxisState;
  readonly intent: YAxisIntent;
}

const PRESS_INTENT: Record<YAxisMode, YAxisIntent> = {
  auto: "reset",
  autoscale: null,
  fixed: "openLockDialog",
};

/**
 * THE PURE STEP. `shown` is the domain on screen right now — what a lock is
 * seeded with when the reader switches to locked.
 */
export const stepYAxis = (
  state: YAxisState,
  event: YAxisEvent,
  shown: YAxisDomain | null,
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

/**
 * The domain to DRAW. `held` is the water marks' domain (null until they
 * have seen a fit); `fitted` is the data's own extent.
 */
export const displayedDomain = (
  state: YAxisState,
  fitted: YAxisDomain | null,
  held: YAxisDomain | null,
): YAxisDomain | null => {
  if (state.mode === "fixed") return state.lock ?? fitted;
  if (state.mode === "autoscale") return fitted;
  return held ?? fitted;
};

// ── The lock dialog's validation ────────────────────────────────────────────

/** Which rule a lock broke, per field. The words are the dialog's labels. */
export type YAxisLockError = "notANumber" | "notAboveMin";

export type YAxisLockCheck =
  | { readonly ok: true; readonly lock: YAxisDomain }
  | {
      readonly ok: false;
      readonly minError?: YAxisLockError;
      readonly maxError?: YAxisLockError;
    };

const isNumber = (value: number | undefined): value is number =>
  value !== undefined && Number.isFinite(value);

/** Both are numbers, and min < max. Errors are per field. */
export const checkLock = (
  min: number | undefined,
  max: number | undefined,
): YAxisLockCheck => {
  const minError = isNumber(min) ? undefined : "notANumber";
  const maxError = isNumber(max) ? undefined : "notANumber";
  if (minError !== undefined || maxError !== undefined)
    return { ok: false, minError, maxError };
  if ((min as number) >= (max as number))
    return { ok: false, maxError: "notAboveMin" };
  return { ok: true, lock: [min as number, max as number] };
};

// ── The reactive wrapper ────────────────────────────────────────────────────

export interface YAxisStrategy {
  readonly mode: Accessor<YAxisMode>;
  /** ChartFrame's words and icon for the mode (`info().disabled` in autoscale). */
  readonly info: Accessor<ChartYAxisModeInfo>;
  /** The domain to draw; null until anything has been fitted. */
  readonly domain: Accessor<YAxisDomain | null>;
  /** The current lock (what the dialog edits). */
  readonly lock: Accessor<YAxisDomain | null>;
  readonly dialogOpen: Accessor<boolean>;
  readonly closeDialog: () => void;
  /** The split button's main face — ChartFrame's `onYAxisPress`. */
  readonly press: () => void;
  /** The split button's menu — ChartFrame's `onYAxisModeChange`. */
  readonly setMode: (mode: YAxisMode) => void;
  /** The dialog's confirm: locks the axis and closes the dialog. */
  readonly setLock: (lock: YAxisDomain) => void;
}

const asDomain = (fit: FitDomain | null): YAxisDomain | null =>
  fit === null ? null : [fit.min, fit.max];

/**
 * The strategy over a fitted domain and its water marks (injected, so one
 * hold serves both). `lock()` is already seeded when `dialogOpen()` turns
 * true, so a dialog reading it on open never shows stale numbers.
 */
export function createYAxisStrategy(
  fitted: Accessor<FitDomain | null>,
  marks: AxisWaterMarks,
): YAxisStrategy {
  const [state, setState] = createSignal<YAxisState>(INITIAL_Y_AXIS);
  const [dialogOpen, setDialogOpen] = createSignal(false);
  const domain = (): YAxisDomain | null =>
    displayedDomain(state(), asDomain(fitted()), marks.domain());

  const dispatch = (event: YAxisEvent): void => {
    const next = stepYAxis(state(), event, domain());
    setState(next.state);
    if (next.intent === "reset") marks.reset();
    if (next.intent === "openLockDialog") setDialogOpen(true);
  };

  return {
    mode: () => state().mode,
    info: () => chartYAxisModeInfo(state().mode),
    domain,
    lock: () => state().lock,
    dialogOpen,
    closeDialog: () => setDialogOpen(false),
    press: () => dispatch({ type: "press" }),
    setMode: (mode) => dispatch({ type: "setMode", mode }),
    setLock: (lock) => {
      dispatch({ type: "setLock", lock });
      setDialogOpen(false);
    },
  };
}

// ── The headless observation ────────────────────────────────────────────────

/**
 * The water-mark step this model composes with, flattened to domains.
 * Injected so the hold is never re-implemented here.
 */
export interface YAxisHoldStep<H> {
  readonly initial: H;
  readonly step: (held: H, epoch: number, fitted: YAxisDomain | null) => H;
  readonly domainOf: (held: H) => YAxisDomain | null;
}

/** `createAxisWaterMarks`' own pure step (`holdFitDomain`) as a hold step. */
export const AXIS_WATER_MARK_HOLD: YAxisHoldStep<HeldDomain> = {
  initial: NO_HELD_DOMAIN,
  step: (held, epoch, fitted) =>
    holdFitDomain(
      held,
      epoch,
      fitted === null ? null : { min: fitted[0], max: fitted[1] },
    ),
  domainOf: heldDomainOf,
};

/** One scripted frame: a fit, and optionally one reader event before it. */
export interface YAxisFrame {
  readonly fitted: YAxisDomain | null;
  readonly event?: YAxisEvent;
}

export interface YAxisRow {
  readonly frame: number;
  readonly event: string;
  readonly mode: YAxisMode;
  readonly intent: YAxisIntent;
  readonly fitted: YAxisDomain | null;
  readonly shown: YAxisDomain | null;
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
export function observeYAxis<H = HeldDomain>(
  frames: readonly YAxisFrame[],
  hold: YAxisHoldStep<H> = AXIS_WATER_MARK_HOLD as unknown as YAxisHoldStep<H>,
  initial: YAxisState = INITIAL_Y_AXIS,
): readonly YAxisRow[] {
  let state = initial;
  let held = hold.initial;
  let epoch = 0;
  let shown: YAxisDomain | null = null;
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

const cell = (domain: YAxisDomain | null): string =>
  domain === null ? "—" : `${domain[0]}..${domain[1]}`;

/** The rows as a fixed-width text table. */
export const formatYAxisRows = (rows: readonly YAxisRow[]): string =>
  join("\n", [
    "frame | event            | mode       | intent         | fitted   | shown",
    ...map(
      (row: YAxisRow) =>
        `${String(row.frame).padStart(5)} | ${row.event.padEnd(16)} | ${row.mode.padEnd(10)} | ${String(row.intent ?? "").padEnd(14)} | ${cell(row.fitted).padEnd(8)} | ${cell(row.shown)}`,
      rows,
    ),
  ]);
