// ============================================
// PLOT LOCK — two or more time charts drawn as ONE time axis.
//
// Peter, 2026-11-06, on a payroll board with the Cash Flow chart above the Pay
// levels timeline: "the markers in the middle chart don't line up with the
// date/times in the cashflow chart. Can we figure out how to make the
// alignment and scale of those two locked together so they appear to agree?"
//
// Each chart sized its own plot. The left inset came from its own y labels,
// the right inset from its own legend gutter (or a fixed edge), and the two
// charts even mapped a date to x by different rules. So the same date sat at
// different x on each chart. Three things have to agree for a date to sit at
// one x on every chart in a stack, and this file owns all three:
//
//   1. THE PLOT BOX. Each member REPORTS the insets it needs on its own (its
//      natural insets, computed WITHOUT the lock, so a member can never read
//      its own answer back and feed a loop), plus where its box starts on the
//      page. The lock answers with the one plot span every member's natural
//      box fits inside (`lockedInsets`), and each member draws its plot there.
//   2. THE DATE → X RULE. One rule, day cells: a domain of `n` whole days is
//      `n` cells across the plot and a day sits at its cell's CENTRE
//      (`dayCellX`). That is the rule ScrubChart has always drawn by
//      (`plotLeft + (i + 0.5) · pitch`); a member drawn by any other rule maps
//      its domain onto `dayCellEnds` instead of onto the plot's edges.
//   3. THE TICKS. One member (the first to publish) publishes its x ticks as
//      dates and labels; the others draw those, so the two axes say the same
//      thing at the same places.
//
// PURE FIRST. Everything numeric here is a plain function with a printed-table
// test (`plotLock.test.ts`); `createPlotLock` is a few signals around them.
// A chart with no lock draws exactly as it did — every member prop is optional.
// ============================================
import { createSignal, type Accessor } from "solid-js";

const DAY_MS = 86_400_000;

/** A plot's horizontal insets inside its own box, in CSS px. */
export interface PlotInsets {
  /** From the box's left edge to the plot's left edge (the y-label gutter). */
  readonly left: number;
  /** From the plot's right edge to the box's right edge (the legend gutter). */
  readonly right: number;
}

/**
 * What one member tells the lock: its natural insets and its box.
 *
 * `origin` is the box's left edge in viewport px (`getBoundingClientRect().left`)
 * and `width` its width. Two charts in one column share both and the lock
 * reduces to "the widest inset wins" at each end. Where they differ — a frame
 * with chrome on one side only — the lock still lines the PLOTS up on the page.
 * A member that cannot measure (no layout, a test) reports `origin: 0`.
 */
export interface PlotLockReport {
  readonly natural: PlotInsets;
  readonly origin: number;
  readonly width: number;
}

/** One x tick, as a date and the words under it. */
export interface PlotTick {
  /** The tick's day, ms at UTC midnight. */
  readonly at: number;
  readonly label: string;
}

/**
 * The insets each member draws with, so every member's plot spans the same
 * page x range: the RIGHTMOST natural plot-left and the LEFTMOST natural
 * plot-right across members. Each member's answer is never narrower than its
 * own natural inset, so a member never draws a label into its plot.
 *
 * With every member at one origin and width this is the max of each inset.
 */
export const lockedInsets = (
  reports: readonly PlotLockReport[],
): readonly PlotInsets[] => {
  if (reports.length === 0) return [];
  let left = Number.NEGATIVE_INFINITY;
  let right = Number.POSITIVE_INFINITY;
  for (const report of reports) {
    left = Math.max(left, report.origin + report.natural.left);
    right = Math.min(
      right,
      report.origin + report.width - report.natural.right,
    );
  }
  const out: PlotInsets[] = [];
  for (const report of reports)
    out.push({
      left: left - report.origin,
      right: report.origin + report.width - right,
    });
  return out;
};

/** The whole days a domain of UTC-midnight ends spans, both ends included. */
export const dayCount = (first: number, last: number): number =>
  Math.max(1, Math.round((last - first) / DAY_MS) + 1);

/**
 * Day `at` → x under the day-cell rule: `n` cells from `plotLeft` to
 * `plotRight`, the day at its cell's centre. `first` is the domain's first day
 * (UTC midnight) and `days` the cell count. Not clamped: a caller clamps if it
 * wants to, as ScrubChart never needed to.
 */
export const dayCellX = (
  at: number,
  first: number,
  days: number,
  plotLeft: number,
  plotRight: number,
): number =>
  plotLeft +
  ((at - first) / DAY_MS + 0.5) * ((plotRight - plotLeft) / Math.max(1, days));

/**
 * Where a domain's two END DAYS sit under the day-cell rule: the centres of
 * the first and last cells, half a pitch in from the plot's edges. A chart
 * that maps `domain[0] → x0` and `domain[1] → x1` linearly (LevelsTimeline)
 * maps every day in between exactly as `dayCellX` does once x0 and x1 are
 * these.
 */
export const dayCellEnds = (
  first: number,
  last: number,
  plotLeft: number,
  plotRight: number,
): { readonly x0: number; readonly x1: number } => {
  const days = dayCount(first, last);
  return {
    x0: dayCellX(first, first, days, plotLeft, plotRight),
    x1: dayCellX(last, first, days, plotLeft, plotRight),
  };
};

/** A lock member's handle: what a chart holds while it is mounted. */
export interface PlotLockMember {
  /** Say what this member needs on its own. Call again whenever it changes. */
  report: (report: PlotLockReport) => void;
  /** The insets to draw with; undefined until any member has reported. */
  insets: Accessor<PlotInsets | undefined>;
  /** Publish this member's x ticks. The FIRST member to publish owns them. */
  publishTicks: (ticks: readonly PlotTick[]) => void;
  /** Leave the lock (on unmount). The others re-lock without it. */
  leave: () => void;
}

/** The lock a page creates once and hands to every chart in the stack. */
export interface PlotLock {
  join: () => PlotLockMember;
  /** The ticks every member draws: the first publisher's, or undefined. */
  ticks: Accessor<readonly PlotTick[] | undefined>;
  /** Every member's current insets, in join order — the headless observation. */
  observe: () => readonly { readonly id: number; readonly report: PlotLockReport | undefined; readonly insets: PlotInsets | undefined }[];
}

/**
 * Create a plot lock. Signals only, no memo, so it can be made at module scope
 * or in a component; hand the same lock to every chart that should agree.
 *
 * ```tsx
 * const lock = createPlotLock();
 * <FramedCashflowScrubChart plotLock={lock} … />
 * <LevelsTimeline plotLock={lock} … />
 * ```
 */
export const createPlotLock = (): PlotLock => {
  const [reports, setReports] = createSignal<
    ReadonlyMap<number, PlotLockReport | undefined>
  >(new Map());
  const [tickOwner, setTickOwner] = createSignal<number | undefined>(undefined);
  const [tickTable, setTickTable] = createSignal<
    ReadonlyMap<number, readonly PlotTick[]>
  >(new Map());
  let next = 0;

  const resolved = (): ReadonlyMap<number, PlotInsets> => {
    const ids: number[] = [];
    const given: PlotLockReport[] = [];
    for (const [id, report] of reports()) {
      if (report === undefined) continue;
      ids.push(id);
      given.push(report);
    }
    const answers = lockedInsets(given);
    const out = new Map<number, PlotInsets>();
    for (let i = 0; i < ids.length; i += 1) out.set(ids[i], answers[i]);
    return out;
  };

  const same = (a: PlotLockReport | undefined, b: PlotLockReport): boolean =>
    a !== undefined &&
    a.origin === b.origin &&
    a.width === b.width &&
    a.natural.left === b.natural.left &&
    a.natural.right === b.natural.right;

  const join = (): PlotLockMember => {
    const id = next;
    next += 1;
    setReports((prev) => new Map(prev).set(id, undefined));
    return {
      report: (report) => {
        if (same(reports().get(id), report)) return;
        setReports((prev) => new Map(prev).set(id, report));
      },
      insets: () => resolved().get(id),
      publishTicks: (ticks) => {
        if (tickOwner() === undefined) setTickOwner(id);
        setTickTable((prev) => new Map(prev).set(id, ticks));
      },
      leave: () => {
        setReports((prev) => {
          const out = new Map(prev);
          out.delete(id);
          return out;
        });
        setTickTable((prev) => {
          const out = new Map(prev);
          out.delete(id);
          return out;
        });
        if (tickOwner() === id) {
          const heirs = [...tickTable().keys()];
          setTickOwner(heirs[0]);
        }
      },
    };
  };

  const ticks = (): readonly PlotTick[] | undefined => {
    const owner = tickOwner();
    return owner === undefined ? undefined : tickTable().get(owner);
  };

  const observe = () => {
    const answers = resolved();
    const out: { id: number; report: PlotLockReport | undefined; insets: PlotInsets | undefined }[] = [];
    for (const [id, report] of reports())
      out.push({ id, report, insets: answers.get(id) });
    return out;
  };

  return { join, ticks, observe };
};
