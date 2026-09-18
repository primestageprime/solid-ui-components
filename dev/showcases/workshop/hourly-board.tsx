/**
 * Hourly Board bench — Peter's sketch of 2026-09-17, composed.
 *
 * A business that sells HOURS, read four ways at once. This bench builds
 * NOTHING: the running balance is `CashflowScrubChart`, the work mix is `Chart`
 * + `StackedAreaSeries` + `ReferenceLine`, the as-of picker is
 * `SegmentedControl`, the dials are `PairedMutationSliders` and the card on the
 * right is `RateGauge`. What it adds is the ARRANGEMENT and the WIRING — whether
 * four pieces say the same thing when they are looking at one scenario.
 *
 * Component per region, so the reuse is checkable:
 *
 *   Cash Flow  — `CashflowScrubChart`  (cells, scrub={false}, chartHeight="fill",
 *                                       balanceSeries fan; the same call the
 *                                       Scenario Board makes)
 *   Work Mix   — `Chart` + `Grid` + `YAxis` + `XAxis` (tickValues) +
 *                `StackedAreaSeries` + `ReferenceLine` ×(1 + one per change)
 *   Changes    — `SpreadRow` + `TextTitle` + `SegmentedControl` + `ClusterRow` +
 *                `PrimaryButton` / `GhostButton` / `DangerButton` +
 *                `PairedMutationSliders` + `Modal` + `ThemedInput` +
 *                `ThemedNumberInput`
 *   Rate gauge — `createRateGauge` with revenue-side sentences
 *
 * Frame and rows: `ViewportColumn` / `HalfFillColumn` / `FillWrapRow` /
 * `MajorPaneBox` / `GrowFillBox` / `FillCardSurface` / `GrowCenterColumn`, and
 * the Scenario Board's own `.scenario-board-frame` and `.scenario-board-gauge`
 * classes — reused rather than copied, so this bench adds no CSS at all.
 *
 * Every number comes from a named pure function in `hourly-board-model.ts`,
 * each printed as a table on mount behind `DEBUG`, so the board can be read and
 * argued with from a terminal before anyone opens a browser.
 *
 * TWO FINDINGS, one of them now closed:
 *
 *   • `Chart` EXPOSED NO CLICK — `ChartProps` had no `onClick` and the context
 *     published `hoverX`, `drag` and `emphasis` but no click dispatch, so
 *     click-to-add on the Work Mix plot was unreachable and a change could only
 *     be made by moving a dial. (`drag.committed` would fire on any drag and is
 *     not a click; using it would have been inventing a gesture.) Peter,
 *     2026-09-17: "you should still have clicks on the chart at a weekly
 *     granularity. That allows for weekly seasonality in projections." So
 *     `Chart` grew `onPick`, and this board snaps the picked date to the start
 *     of its ISO WEEK. Snapping is HERE and not in `Chart` because the grid is
 *     this board's: a chart root that snapped to weeks would be wrong for every
 *     consumer counting in something else.
 *   • THE FULL-TIME RULE IS A `ReferenceLine`, not a `LineSeries`.
 *     `LineSeriesProps` has no `label`, and `ReferenceLineStyleProps` does —
 *     with a documented seat for `orientation="horizontal"` (right plot edge,
 *     just above the rule). It is the same dashed rule at 40 with the caption
 *     Peter asked for, and it is the mark the library provides for a captioned
 *     rule. The per-change rules are the same mark, `orientation="vertical"`,
 *     which seats its caption at the top of the plot — so the flags ARE
 *     numbered, as the Scenario Board's are.
 */
import {
  Index,
  Show,
  batch,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
  type Component,
} from "solid-js";
import { find, map } from "../../../src/fn";
import { observeSize } from "../../../src/internal/dom/observeSize";

import { CashflowScrubChart } from "../../../src/components/CashflowScrubChart";
import type { CashflowCell } from "../../../src/components/CashflowScrubChart";
import { monthlyCells } from "../../../src/components/DateAxis";
import {
  Chart,
  Grid,
  ReferenceLine,
  StackedAreaSeries,
  XAxis,
  YAxis,
} from "../../../src/components/Chart";
// THE PACKAGE BARREL, for everything that has been promoted. Both factories
// this board curries came out of the workshop this week, so it imports them the
// way a client would rather than reaching into their folders.
import {
  createPairedMutationSliders,
  createRateGauge,
  timeOf,
} from "../../../src";
import type { Mutation, TimeValue } from "../../../src";
import { SegmentedControl } from "../../../src/components/SegmentedControl";
import type { SegmentOption } from "../../../src/components/SegmentedControl";
import {
  DangerButton,
  GhostButton,
  PrimaryButton,
} from "../../../src/components/Button";
import { Icon } from "../../../src/components/Icon";
import { ThemedInput } from "../../../src/components/Inputs";
import { ThemedNumberInput } from "../../../src/components/ThemedNumberInput";
import { Modal } from "../../../src/components/Modal";
import {
  ClusterRow,
  EndWrapRow,
  FillWrapRow,
  GrowCenterColumn,
  GrowFillBox,
  HalfFillColumn,
  MajorPaneBox,
  NarrowStack,
  SpreadRow,
  ViewportColumn,
} from "../../../src/components/Layout";
import { FillCardSurface } from "../../../src/components/Surface";
import {
  NoteText,
  SectionTitle,
  TextTitle,
} from "../../../src/components/Text";

import {
  COMFORTABLE,
  COMMITTED_RATE,
  DEFAULT_WORK_CAP,
  DOMAIN_END,
  DOMAIN_START,
  EMPTY_DRAFT,
  FULL_TIME_HOURS,
  HOURS_DOMAIN,
  MIN_WORK_CAP,
  MONTHLY_NET,
  OPENING_BALANCE,
  RATE_DOMAIN,
  RATE_DOMAIN_PER_HOUR,
  SEED_MUTATIONS,
  SERVICES,
  TIME_DOMAIN,
  addMutation,
  addService,
  annualOfPair,
  averageRate,
  bandOfRate,
  canAdd,
  drawnRate,
  ensureMutation,
  fanAt,
  hasAnyChange,
  isDirty,
  isOffDial,
  maxReachableRate,
  monthlyFrom,
  pairsForMutation,
  pairsWithoutMutation,
  pinnedCeiling,
  projectedBalances,
  quarterLabelOf,
  quarterTicks,
  rateAt,
  rateBandTable,
  removeMutation,
  runningBalances,
  scenarioDigest,
  segmentLabelsOf,
  totalHoursAt,
  weekLabel,
  weekOfPick,
  withChange,
  withDrop,
  withoutChange,
  workMixSeries,
  type SegmentLabel,
  type Service,
  type ServiceDraft,
} from "./hourly-board-model";
import type { MeasureIndex } from "../../../src/components/PairedMutationSliders";
import type { PairedMutationEntity } from "../../../src/components/PairedMutationSliders";
import {
  againstBreakeven,
  dollarsPerYear,
  formatHours,
  formatRate,
  revenueShift,
  signedDollarsPerYear,
} from "./hourly-board-money";

export const meta = { label: "Hourly Board" };

/** Flip to print every derived table to the console on mount. */
const DEBUG = false;

// ── The curried components ───────────────────────────────────────────────────

/**
 * THE BOARD'S OWN DIALS, curried ONCE at module level.
 *
 * `axes` is mandatory at the curry and carries every per-measure presentational
 * decision there is — the unit, the name, the grid and the scale — and all four
 * are properties of THIS BOARD rather than of any one render. So the call site
 * below passes data and callbacks only, which is the whole point of the factory:
 * `PairedMutationSliders` ships no curried variant on purpose, because
 * `"Hrs/wk"` 0–80 snap 1 × `"$/hr"` 0–300 snap 5 is an hourly board's axes, not
 * a library's.
 *
 * The vocabulary is the board's too: a service is DROPPED and REINSTATED, not
 * removed and restored, and a measure with no prior amount reads "new service".
 */
const HourlySliders = createPairedMutationSliders({
  axes: [
    {
      label: "Hrs/wk",
      domain: HOURS_DOMAIN,
      snap: 1,
      format: formatHours,
    },
    {
      label: "$/hr",
      domain: RATE_DOMAIN_PER_HOUR,
      snap: 5,
      format: formatRate,
    },
  ],
  labels: { remove: "Drop", restore: "Reinstate", new: "new service" },
});

/**
 * THE BOARD'S OWN GAUGE, curried the same way.
 *
 * Both formatters are SENTENCE builders — the gauge supplies no words of its own
 * around them — so what the callouts say is this board's wording, written and
 * tested in `hourly-board-money` rather than inline here. They are REVENUE-side:
 * up is over breakeven and up is more revenue, with no sign flip anywhere, which
 * is the one thing that differs from the payroll board's gauge.
 */
const RevenueRateGauge = createRateGauge({
  baselineLabel: "Baseline",
  formatAgainst: againstBreakeven,
  formatDelta: revenueShift,
});

// ── Constants the layout needs ──────────────────────────────────────────────

/** The chart's months, as cells. One per month across the span. */
const CELLS = monthlyCells(DOMAIN_START, DOMAIN_END);

/** The COMMITTED balance — what the fixture's flows have already produced. */
const COMMITTED = runningBalances(MONTHLY_NET, OPENING_BALANCE);

/**
 * The ceiling a PINNED balance domain would need, in dollars — and the reason
 * the chart is left unpinned.
 *
 * Peter's rule on the Scenario Board was "if all sliders are down the line would
 * still be on the chart … that way the y axis doesn't shift when we change the
 * amounts", and `CashflowScrubChart` takes `yMin` / `yMax` in cents to do
 * exactly that. MEASURED at 1400×1300 with both pinned, it is the wrong trade on
 * THIS fixture: the dials can reach $340k/yr, twelve months of which is $340k of
 * projection, so the domain has to run to $450k — and the committed line, which
 * ends at $134k, is squashed into the bottom fifth of the plot and reads flat.
 *
 * The two fixtures are simply not in proportion: the monthly flows are
 * hand-written (the business as already committed) while the dials price a whole
 * year of billable work, and a domain wide enough for the second makes the first
 * unreadable. Pinning is the right call once they share a scale; it is not right
 * yet, and a squashed line is worse than an axis that moves. So the number is
 * computed, printed in the DEBUG table and left out of the chart — which is also
 * exactly what the Scenario Board does with its own `PINNED_CEILING`.
 */
const PINNED_CEILING = pinnedCeiling(
  COMMITTED,
  maxReachableRate(SERVICES),
  (months) => fanAt(months, 0),
);

/** The Work Mix x-axis's four ticks, and the vocabulary they read in. */
const QUARTER_TICKS = quarterTicks();

/**
 * The Work Mix chart's own frame, until it has been measured.
 *
 * An UNMEASURED chart is a correct chart, not a blank one (AGENT_GUIDE, the
 * 2026-09-16 layout rules), so the fallback is a plausible card rather than
 * zero — and a zero reading is never stored, because under jsdom and in a
 * hidden tab every rect is zero.
 */
const FALLBACK_PLOT = { width: 640, height: 220 } as const;

/** The plot inset. Wide enough on the left for `$/hr`-free hour labels. */
const WORK_MIX_MARGIN = { top: 20, right: 16, bottom: 28, left: 34 } as const;

// ── Derivations the LAYOUT owns ─────────────────────────────────────────────

/** The as-of control's options: one per change, labelled by QUARTER. */
const segmentOptionsOf = (mutations: readonly Mutation[]): SegmentOption[] =>
  map(
    (segment: SegmentLabel) => ({ value: segment.id, label: segment.label }),
    segmentLabelsOf(mutations),
  );

/** Which month "now" falls in — the change the reader is editing. */
const monthIndexOf = (at: TimeValue): number => {
  const when = timeOf(at);
  let index = 0;
  for (const [i, cell] of CELLS.entries()) {
    if (cell.start.getTime() <= when) index = i;
  }
  return index;
};

/** The chart's cells. Cents, because the chart's y IS cents. */
const balanceCells = (rate: number, nowIndex: number): CashflowCell[] => {
  const balances = projectedBalances(COMMITTED, rate, nowIndex);
  return map(
    (cell: { start: Date; end: Date }, index: number) => ({
      ...cell,
      cashflowCents: (MONTHLY_NET[index] ?? 0) * 100,
      balanceCents: (balances[index] ?? 0) * 100,
    }),
    CELLS,
  );
};

/** One faint alternative in the fan, above or below the projection. */
const fanSeries = (id: string, sign: number, nowIndex: number) => ({
  id,
  class: "scenario-board-demo__fan",
  balanceCents: (cell: CashflowCell, index: number): number =>
    cell.balanceCents + sign * fanAt(index, nowIndex) * 100,
});

/** The summary under each pair of dials: what that service bills in a year. */
const summaryOf = (entity: PairedMutationEntity): string =>
  entity.measures[0].value === null ? "" : dollarsPerYear(annualOfPair(entity));

/** The board, read as tables, with no browser in the room. */
const printTables = (
  services: readonly Service[],
  mutations: readonly Mutation[],
  mutationId: string | null,
  cap: number,
): void => {
  /* eslint-disable no-console */
  const pairs =
    mutationId === null
      ? pairsWithoutMutation(services)
      : pairsForMutation(services, mutationId, mutations);
  console.table(
    map(
      (pair: PairedMutationEntity) => ({
        service: pair.label,
        priorHours: pair.measures[0].prior ?? "— (new service)",
        hours: pair.measures[0].value ?? "— (dropped)",
        priorRate: pair.measures[1].prior ?? "— (new service)",
        rate: pair.measures[1].value ?? "— (dropped)",
        annual: summaryOf(pair),
      }),
      pairs,
    ),
  );
  console.table(
    map(
      (segment: SegmentLabel) => ({
        flag:
          find((m: Mutation) => m.id === segment.id, mutations)?.label ?? "",
        segment: segment.label,
        // The WEEK, unabridged, beside the month the chip is filed under: the
        // chip is an abbreviation and the terminal should not have to be.
        week: weekLabel(
          find((m: Mutation) => m.id === segment.id, mutations)?.at ??
            DOMAIN_START,
        ),
        month: segment.month,
        editing: segment.id === mutationId ? "◀ editing" : "",
      }),
      segmentLabelsOf(mutations),
    ),
  );
  console.table(
    map(
      (series: { id: string; label?: string; points: readonly unknown[] }) => ({
        band: series.label ?? series.id,
        points: map(
          (point) =>
            `${new Date(timeOf((point as { at: Date }).at)).toISOString().slice(0, 10)}=${(point as { value: number }).value}h`,
          series.points as readonly { at: Date; value: number }[],
        ).join(" "),
      }),
      workMixSeries(services, mutations),
    ),
  );
  console.table(
    map(
      (tick: number) => ({
        quarter: quarterLabelOf(tick),
        totalHours: totalHoursAt(services, tick, mutations),
        fullTime:
          totalHoursAt(services, tick, mutations) > FULL_TIME_HOURS
            ? "over"
            : "under",
        cap,
      }),
      QUARTER_TICKS,
    ),
  );
  console.table(rateBandTable(services));
  const at =
    mutationId === null
      ? DOMAIN_START.getTime()
      : timeOf(
          find((m: Mutation) => m.id === mutationId, mutations)?.at ??
            DOMAIN_START,
        );
  const average = averageRate(TIME_DOMAIN, mutations, services);
  // THE DRAWN FIGURE, not only the computed one. `RateGauge` clamps `value` to
  // its domain and announces the clamped number, and the domain is sized against
  // the FIXTURE — an added service carries the whole track, so an exploratory
  // scenario can run off the top. Printing both is what keeps the terminal and
  // the dial in agreement instead of promising they never differ.
  const drawn = drawnRate(average);
  console.log(
    "baseline",
    signedDollarsPerYear(COMMITTED_RATE),
    "· rate from here",
    signedDollarsPerYear(rateAt(at, mutations, services)),
    "· gauge (year average)",
    signedDollarsPerYear(average),
    "· AS DRAWN",
    signedDollarsPerYear(drawn),
    isOffDial(average)
      ? "(CLAMPED — off the end of the dial)"
      : "(on the dial)",
    "·",
    bandOfRate(drawn),
    "·",
    againstBreakeven(drawn),
    "·",
    revenueShift(drawn - COMMITTED_RATE),
    "· monthly slope",
    monthlyFrom(rateAt(at, mutations, services)).toFixed(0),
    "· any change?",
    hasAnyChange(services),
    "· a pinned balance ceiling would need",
    dollarsPerYear(PINNED_CEILING).replace("/yr", ""),
    "(see PINNED_CEILING for why the chart is unpinned)",
  );
  /* eslint-enable no-console */
};

// ── The Add form ────────────────────────────────────────────────────────────

/**
 * The body of the Add modal.
 *
 * A COMPONENT rather than a block of JSX inside the board because of the focus:
 * `Modal` has no initial-focus mechanism of its own and its children are created
 * lazily inside its `Show`, so an `onMount` in here fires on every OPEN — which
 * is exactly when the name field wants the caret. An `onMount` in the board would
 * have fired once, at page load, while the form did not exist. Lifted verbatim
 * from the Scenario Board's hire modal.
 */
const ServiceForm: Component<{
  draft: ServiceDraft;
  onDraft: (draft: ServiceDraft) => void;
  onSubmit: () => void;
}> = (props) => {
  let nameField: HTMLInputElement | undefined;
  onMount(() => nameField?.focus());

  return (
    <NarrowStack>
      <ThemedInput
        ref={nameField}
        label="Service"
        placeholder="What are you selling?"
        value={props.draft.name}
        onInput={(event) =>
          props.onDraft({ ...props.draft, name: event.currentTarget.value })
        }
        onKeyDown={(event: KeyboardEvent) => {
          if (event.key !== "Enter") return;
          event.preventDefault();
          props.onSubmit();
        }}
      />
      <ThemedNumberInput
        name="hours"
        label="Hrs/wk"
        size="sm"
        min={HOURS_DOMAIN[0]}
        max={HOURS_DOMAIN[1]}
        step={1}
        value={() => props.draft.hours}
        onChange={(hours) => {
          props.onDraft({ ...props.draft, hours });
        }}
      />
      <ThemedNumberInput
        name="rate"
        label="$/hr"
        size="sm"
        min={RATE_DOMAIN_PER_HOUR[0]}
        max={RATE_DOMAIN_PER_HOUR[1]}
        step={5}
        value={() => props.draft.rate}
        onChange={(rate) => {
          props.onDraft({ ...props.draft, rate });
        }}
      />
    </NarrowStack>
  );
};

// ── The Work Mix card ───────────────────────────────────────────────────────

/**
 * The Work Mix plot.
 *
 * `Chart` takes width and height in PIXELS — it has no `"fill"` and no
 * measurement of its own, unlike `CashflowScrubChart` — so the box it sits in is
 * measured here and handed to it. That is the documented pattern rather than an
 * invention: the FIRST size is delivered synchronously in `onMount` via
 * `getBoundingClientRect` (a ref-time `clientHeight` is 0 and `observeSize`
 * defers through rAF, which a hidden tab never runs), and `observeSize` keeps it
 * current afterwards. A ZERO reading is never stored.
 *
 * `responsive` is not the answer here: it fills the container's WIDTH and derives
 * the height from the viewBox aspect, so in a box with a definite height it
 * would overflow the card rather than fill it.
 */
const WorkMixPlot: Component<{
  services: readonly Service[];
  mutations: readonly Mutation[];
  cap: number;
  /** A click on the plot, already snapped to the start of its ISO week. */
  onPickWeek: (at: Date) => void;
}> = (props) => {
  const [box, setBox] = createSignal<{ width: number; height: number }>(
    FALLBACK_PLOT,
  );
  let frame: HTMLDivElement | undefined;

  const take = (width: number, height: number): void => {
    if (width <= 0 || height <= 0) return;
    setBox({ width, height });
  };

  onMount(() => {
    if (frame === undefined) return;
    const rect = frame.getBoundingClientRect();
    take(Math.round(rect.width), Math.round(rect.height));
    onCleanup(observeSize(frame, (size) => take(size.width, size.height)));
  });

  const series = createMemo(() =>
    workMixSeries(props.services, props.mutations),
  );

  return (
    <GrowFillBox ref={frame}>
      <Chart
        width={box().width}
        height={box().height}
        xDomain={[DOMAIN_START, DOMAIN_END]}
        yDomain={[0, props.cap]}
        margin={WORK_MIX_MARGIN}
        /* `Chart.onPick` reports the RAW date under the pointer — it snaps
           nothing, because a chart root does not know whose grid it is on.
           `weekOfPick` is this board's grid: the ISO Monday at or before the
           pick, clamped to the span's start so a click in the truncated first
           week lands on the left edge rather than five days into the year. */
        onPick={(at) => props.onPickWeek(weekOfPick(at))}
      >
        <Grid />
        <YAxis tickFormat={formatHours} />
        <XAxis tickValues={QUARTER_TICKS} tickFormat={quarterLabelOf} />
        {/* One band per service, BOTTOM FIRST — array order is stacking order
            and palette order, and the top of the stack IS the total hours a
            week. Paint is not configurable, deliberately: a caller who could
            repaint one band could break the picture's only claim. */}
        <StackedAreaSeries series={series()} />
        {/* Peter: the chart "affords overtime, but lets you know when you're
            working more than full time". A rule ACROSS the stack, not a bound
            on it — the y-domain is fixed at the cap, which is higher. */}
        <ReferenceLine
          orientation="horizontal"
          value={FULL_TIME_HOURS}
          label="full-time"
          strokeDasharray="6 4"
        />
        {/* One numbered rule per change date. `Index`, not `For`: the mutation
            list is rebuilt wholesale on every edit, so position IS the
            identity and `For` would remount the whole group. */}
        <Index each={props.mutations}>
          {(mutation) => (
            <ReferenceLine
              orientation="vertical"
              value={new Date(timeOf(mutation().at))}
              label={mutation().label}
            />
          )}
        </Index>
      </Chart>
    </GrowFillBox>
  );
};

// ── The board ───────────────────────────────────────────────────────────────

const HourlyBoardBench: Component = () => {
  const [services, setServices] = createSignal<readonly Service[]>(SERVICES);
  const [mutations, setMutations] =
    createSignal<readonly Mutation[]>(SEED_MUTATIONS);
  /**
   * WHICH CHANGE THE DIALS ARE EDITING, or `null` when there is none — the state
   * the board OPENS in. `null` is not "nothing selected by accident": it is the
   * honest answer while nothing has been proposed, and every reading below asks
   * for it rather than assuming a change exists.
   */
  const [editing, setEditing] = createSignal<string | null>(null);
  /** The y-axis cap, in hours a week. Peter's "settings", in the card header. */
  const [cap, setCap] = createSignal(DEFAULT_WORK_CAP);
  const [adding, setAdding] = createSignal(false);
  const [draft, setDraft] = createSignal<ServiceDraft>(EMPTY_DRAFT);
  /** The digest of whatever was last saved. The board opens clean. */
  const [saved, setSaved] = createSignal(
    scenarioDigest(SERVICES, SEED_MUTATIONS),
  );

  const dirty = () => isDirty(services(), mutations(), saved());

  /** The segment the control shows, or `undefined` — the chart's own empty. */
  const selectedSegment = (): string | undefined => editing() ?? undefined;

  /** THE GAUGE'S READING: the whole year, averaged. */
  const rate = () => averageRate(TIME_DOMAIN, mutations(), services());

  /**
   * THE PROJECTION'S SLOPE: the instantaneous rate from the moment being
   * edited. A different question from the gauge's and it wants a different
   * answer — a line drawn forward from a point runs at the rate in force AT
   * that point, not at the year's average.
   */
  const projectedRate = () => {
    const at = editing();
    const chosen =
      at === null ? undefined : find((m: Mutation) => m.id === at, mutations());
    return rateAt(
      chosen === undefined ? DOMAIN_START.getTime() : timeOf(chosen.at),
      mutations(),
      services(),
    );
  };

  const pairs = () => {
    const at = editing();
    return at === null
      ? pairsWithoutMutation(services())
      : pairsForMutation(services(), at, mutations());
  };

  /**
   * The month the projection pivots on. With NO change the pivot is month zero,
   * so the whole line is projection running dead straight at the committed rate
   * — there is no committed stretch to draw, because nothing has been decided.
   */
  const nowIndex = () => {
    const at = editing();
    const chosen =
      at === null ? undefined : find((m: Mutation) => m.id === at, mutations());
    return chosen === undefined ? 0 : monthIndexOf(chosen.at);
  };

  onMount(() => {
    if (DEBUG) printTables(services(), mutations(), editing(), cap());
  });

  /**
   * THE FIRST INTERACTION MAKES ITS OWN CHANGE.
   *
   * Dragging a dial with nothing selected would otherwise be a no-op, which
   * makes the opening state a place the reader can get stuck. Now the gesture
   * means what it obviously means — a change, at the next free quarter, which
   * for this span is its left edge — and the drag lands on it. `batch`, because
   * the change list and the selection describe ONE scenario and a render between
   * the two writes would draw a board disagreeing with itself.
   */
  const editingOrFirst = (): string | null => {
    const already = editing();
    if (already !== null) return already;
    const ensured = ensureMutation(
      { mutations: mutations(), selected: null },
      DOMAIN_START.getTime(),
      DOMAIN_END.getTime(),
    );
    batch(() => {
      setMutations(ensured.mutations);
      setEditing(ensured.selected);
    });
    return ensured.selected;
  };

  /**
   * A CLICK ON THE WORK MIX PLOT proposes a change in that WEEK, or selects the
   * one already there.
   *
   * `addMutation` does both and says which, so there is no branch here on
   * whether anything was added — and dedupe needs no tolerance window, because
   * the date arrives already snapped to the week slot and two picks in one week
   * are the same timestamp. `batch`, for the reason every other write here
   * batches: the change list and the selection describe ONE scenario.
   */
  const pickWeek = (at: Date): void => {
    const next = addMutation(mutations(), at);
    batch(() => {
      setMutations(next.mutations);
      setEditing(next.selected);
    });
  };

  /**
   * A drag edits the selected change — making one first if there is none. The
   * measure INDEX is the whole difference between this component and a row of
   * single dials: ignoring it would write an hours figure into a rate.
   */
  const setMeasure = (id: string, measure: MeasureIndex, value: number) => {
    const at = editingOrFirst();
    if (at === null) return;
    setServices((current) =>
      withChange(current, id, at, measure, value, mutations()),
    );
  };

  /** ⊗ Drop: this service is off the books from the selected change onward. */
  const drop = (id: string): void => {
    const at = editingOrFirst();
    if (at === null) return;
    setServices((current) => withDrop(current, id, at));
  };

  /**
   * ↺ Reinstate: drop the change entirely rather than invent an offer. The
   * service carries whatever the previous change left it on. It needs no guard —
   * it is only ever drawn for something already dropped, which takes a change to
   * have happened.
   */
  const reinstate = (id: string): void => {
    const at = editing();
    if (at === null) return;
    setServices((current) => withoutChange(current, id, at));
  };

  /**
   * The `+` opens the form; nothing changes until Add is pressed. The draft is
   * RESET on open rather than on close, so a cancelled form cannot leave a
   * half-typed name inside the next one, and every path out of the modal —
   * Cancel, Escape, the overlay, the × — is the same single line.
   */
  const openAdd = (): void => {
    editingOrFirst();
    setDraft(EMPTY_DRAFT);
    setAdding(true);
  };

  const closeAdd = (): void => {
    setAdding(false);
  };

  /**
   * Confirm. The guard is not redundant beside the disabled button: Enter in the
   * name field reaches here too, and a keyboard path that skipped the check
   * would be a second, weaker rule.
   */
  const confirmAdd = (): void => {
    const current = draft();
    const at = editing();
    if (at === null || !canAdd(current)) return;
    setServices((existing) => addService(existing, current, at).services);
    setAdding(false);
  };

  /**
   * DELETE THE SELECTED CHANGE, and everything that only existed because of it.
   * One pure function the test pins, and one `batch` so the three signals move
   * together.
   */
  const deleteChange = (id: string): void => {
    const next = removeMutation(
      { mutations: mutations(), services: services() },
      id,
    );
    batch(() => {
      setMutations(next.mutations);
      setServices(next.services);
      setEditing(next.selected);
    });
  };

  const reset = (): void => {
    batch(() => {
      setServices(SERVICES);
      setMutations(SEED_MUTATIONS);
      setEditing(null);
      setCap(DEFAULT_WORK_CAP);
      setSaved(scenarioDigest(SERVICES, SEED_MUTATIONS));
    });
  };

  /**
   * SAVE. On a bench there is nothing to save TO, so it prints the scenario as
   * tables and marks the board clean — which is the honest bench behaviour and
   * also the observation a real Save would owe anyway (headless first). The
   * button disables itself until something has moved.
   */
  const save = (): void => {
    printTables(services(), mutations(), editing(), cap());
    setSaved(scenarioDigest(services(), mutations()));
  };

  return (
    <div class="component-section component-section--full scenario-board-frame">
      <ViewportColumn>
        <SectionTitle>Hourly Board</SectionTitle>

        {/* The top half, halved again: two charts stacked. Each card is a
            FillCardSurface — it takes its half of the band and lays out a
            column that fills it — so the title keeps its own height and the
            GrowFillBox hands the chart everything left. */}
        <HalfFillColumn>
          <HalfFillColumn>
            <FillCardSurface>
              <TextTitle>Cash Flow</TextTitle>
              {/* THE CALL THE SCENARIO BOARD MAKES, unchanged: `cells`,
                  `scrub={false}`, `chartHeight="fill"`, `showGridlines` and the
                  fan as two `balanceSeries`. The y-domain is NOT pinned, and
                  that is a MEASURED decision rather than an oversight — see
                  `PINNED_CEILING` below the fixture for the arithmetic. */}
              <GrowFillBox>
                <CashflowScrubChart
                  cells={balanceCells(projectedRate(), nowIndex())}
                  scrub={false}
                  chartHeight="fill"
                  showGridlines
                  lineLabel="Committed"
                  balanceSeries={[
                    fanSeries("optimistic", 1, nowIndex()),
                    fanSeries("pessimistic", -1, nowIndex()),
                  ]}
                />
              </GrowFillBox>
            </FillCardSurface>
          </HalfFillColumn>

          <HalfFillColumn>
            <FillCardSurface>
              {/* The cap lives in the card's HEADER rather than in a settings
                  strip of its own: it is one number, it belongs to this chart
                  alone, and a row of its own would cost the two charts the
                  height that makes them readable. `min` is the full-time rule —
                  a cap below it would put the rule off the plot. */}
              <SpreadRow>
                <TextTitle>Work Mix</TextTitle>
                <ClusterRow>
                  <NoteText>Cap</NoteText>
                  <ThemedNumberInput
                    name="work-cap"
                    label=""
                    size="sm"
                    min={MIN_WORK_CAP}
                    max={HOURS_DOMAIN[1] * 2}
                    step={5}
                    value={cap}
                    onChange={(next) => {
                      setCap(next ?? DEFAULT_WORK_CAP);
                    }}
                  />
                </ClusterRow>
              </SpreadRow>
              <WorkMixPlot
                services={services()}
                mutations={mutations()}
                cap={cap()}
                onPickWeek={pickWeek}
              />
            </FillCardSurface>
          </HalfFillColumn>
        </HalfFillColumn>

        {/* The bottom half: Changes wide-left, the gauge narrow-right. */}
        <HalfFillColumn>
          <FillWrapRow>
            <MajorPaneBox>
              <FillCardSurface>
                {/* NO extra Stack here. `FillCardSurface` already lays its
                    children out as a column that FILLS the card, so a second
                    column inside it would sit at its own content height and
                    leave the dials ending part-way down. */}
                <SpreadRow>
                  <TextTitle>Changes</TextTitle>
                  {/* The as-of control has NOTHING TO OFFER until a change
                      exists, and an empty segmented bar would be a control that
                      cannot be operated. A sentence takes its place — same
                      slot, same row — and says the one thing the reader needs
                      to get out of the empty state. Not `EmptyState`: the
                      content below is not absent, the dials still show what
                      every service bills today. */}
                  <Show
                    when={selectedSegment()}
                    fallback={
                      <NoteText>
                        Click the Work Mix chart, or move a dial, to propose a change
                      </NoteText>
                    }
                  >
                    {(selected) => (
                      <SegmentedControl
                        options={segmentOptionsOf(mutations())}
                        value={selected()}
                        onValueChange={setEditing}
                        aria-label="Change being edited"
                      />
                    )}
                  </Show>
                  <ClusterRow>
                    <GhostButton onClick={openAdd}>
                      <Icon name="plus" size="sm" /> Add
                    </GhostButton>
                    <GhostButton onClick={reset}>Reset</GhostButton>
                    <PrimaryButton disabled={!dirty()} onClick={save}>
                      Save
                    </PrimaryButton>
                    {/* Delete removes the SELECTED change, so it is only ever
                        offered when there is one — `Show` rather than a
                        disabled button, because with no changes at all the
                        sentence beside it already explains the whole state. */}
                    <Show when={editing()}>
                      {(selected) => (
                        <DangerButton onClick={() => deleteChange(selected())}>
                          <Icon name="trash" size="sm" /> Delete
                        </DangerButton>
                      )}
                    </Show>
                  </ClusterRow>
                </SpreadRow>
                <GrowFillBox>
                  <HourlySliders
                    entities={pairs()}
                    summary={summaryOf}
                    onChange={setMeasure}
                    onRemove={drop}
                    onRestore={reinstate}
                    onAdd={openAdd}
                  />
                </GrowFillBox>
              </FillCardSurface>
            </MajorPaneBox>

            <GrowFillBox class="scenario-board-gauge">
              <FillCardSurface>
                <TextTitle>Rate, right now</TextTitle>
                <GrowCenterColumn>
                  <RevenueRateGauge
                    domain={RATE_DOMAIN}
                    baseline={COMMITTED_RATE}
                    caution={COMFORTABLE}
                    value={rate()}
                    label="Scenario"
                  />
                </GrowCenterColumn>
              </FillCardSurface>
            </GrowFillBox>
          </FillWrapRow>
        </HalfFillColumn>
      </ViewportColumn>

      {/* The Add form. Rendered here rather than beside the dials because it
          PORTALS — where it sits in this tree decides nothing about where it
          draws, and the state it edits is the board's. */}
      <Modal
        open={adding()}
        onClose={closeAdd}
        title="Add a service"
        subtitle="It starts at the change being edited, on the figures you give it."
        footer={
          <EndWrapRow>
            <GhostButton onClick={closeAdd}>Cancel</GhostButton>
            <PrimaryButton disabled={!canAdd(draft())} onClick={confirmAdd}>
              Add
            </PrimaryButton>
          </EndWrapRow>
        }
      >
        <ServiceForm draft={draft()} onDraft={setDraft} onSubmit={confirmAdd} />
      </Modal>
    </div>
  );
};

export default HourlyBoardBench;
