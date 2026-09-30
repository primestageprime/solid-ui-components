// Payroll board — the reactive Y-axis strategy: `chart-strategy.ts`'s pure
// step, wired to a water-mark hold and a lock dialog. The ONLY place a
// `reset` intent calls `marks.reset()` or a dialog opens.
//
//   const marks = createAxisWaterMarks(fit);          // the hold, injected
//   const axis = createYAxisStrategy(fit, marks);
//   <LevelsTimeline valueDomain={axis.domain() ?? undefined} … />
import { type Accessor, createSignal } from "solid-js";
import {
  INITIAL_Y_AXIS,
  type YAxisEvent,
  type YAxisMode,
  type YAxisState,
  type YDomain,
  displayedDomain,
  stepYAxis,
} from "./chart-strategy";
import type { AxisWaterMarks, FitDomain } from "./chart-watermarks";
import {
  type ChartYAxisModeInfo,
  chartYAxisModeInfo,
} from "../../../../src/components/ChartFrame";

export interface YAxisStrategy {
  readonly mode: Accessor<YAxisMode>;
  readonly info: Accessor<ChartYAxisModeInfo>;
  /** The domain to draw; null until anything has been fitted. */
  readonly domain: Accessor<YDomain | null>;
  /** The current lock (what the dialog edits). */
  readonly lock: Accessor<YDomain | null>;
  readonly dialogOpen: Accessor<boolean>;
  readonly closeDialog: () => void;
  /** The split button's main face. */
  readonly press: () => void;
  /** The split button's menu. */
  readonly setMode: (mode: YAxisMode) => void;
  /** The dialog's confirm. */
  readonly setLock: (lock: YDomain) => void;
}

const asDomain = (fit: FitDomain | null): YDomain | null =>
  fit === null ? null : [fit.min, fit.max];

export function createYAxisStrategy(
  fitted: Accessor<FitDomain | null>,
  marks: AxisWaterMarks,
): YAxisStrategy {
  const [state, setState] = createSignal<YAxisState>(INITIAL_Y_AXIS);
  const [dialogOpen, setDialogOpen] = createSignal(false);
  const domain = (): YDomain | null =>
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
