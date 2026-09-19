/**
 * License Board bench — Peter's sketch of 2026-09-18, composed.
 *
 * A CASH FORECAST for a business that sells licences, read four ways at once.
 * This bench builds NOTHING: the running balance is `CashflowScrubChart` under a
 * `createHighWaterMark` ceiling, the cash mix is `StackedTimelineChart`, the
 * header is `MutationToolbar`, the dials are one curried
 * `GroupedMutationSliders` and the card on the right is `RateGauge`. What it
 * adds is the ARRANGEMENT and the WIRING.
 *
 * Component per region, so the reuse is checkable:
 *
 *   Cash Flow    — `CashflowScrubChart` + `createHighWaterMark`
 *   License Mix  — `createStackedTimelineChart`, one band per SOURCE
 *                  (product × billing variant), valued in dollars of CASH
 *   Changes      — `createMutationToolbar` (title, the chips with their ×, and
 *                  the `undo` Reset — no Add, no Save, no Delete) + ONE
 *                  `createGroupedMutationSliders` (which owns the + itself)
 *                  + `Modal` + `ThemedInput` + `ThemedNumberInput`
 *   Board Save   — one `PrimaryButton` beside the board's own title, enabled
 *                  by `dirty()`. A board is one scenario and saves once.
 *   Rate gauge   — `createRateGauge`, revenue-side sentences in $/mo
 *
 * Frame: `ViewportColumn` / `HalfFillColumn` / `FillWrapRow` / `MajorPaneBox` /
 * `GrowFillBox` / `FillCardSurface` / `GrowCenterColumn`, reusing the Scenario
 * Board's `.scenario-board-frame` and `.scenario-board-gauge` — so this bench
 * adds no CSS at all.
 *
 * Every number comes from a named pure function in `license-board-model.ts`,
 * each printed as a table on mount behind `DEBUG`, so the board can be read and
 * argued with from a terminal before anyone opens a browser.
 *
 * ── ONE ROW, NEVER TWO (Peter, 2026-09-18) ─────────────────────────────────
 *
 * "I'd like the changes to still be one row." So the Changes card holds exactly
 * ONE horizontal row of product cards: six dials side by side per card, the two
 * captioned groups beside each other, and when the pane cannot hold every card
 * the row PAGES with ‹ › rather than wrapping. That is
 * `GroupedMutationSliders`' own behaviour — it never wraps, and it pages by a
 * whole card (`slotFor(6)`), never splitting a product's `mo` group from its
 * `yr` one.
 *
 * MEASURED at 1400×1300: the Changes pane is 646px wide and a six-dial card is
 * 516px, so ONE whole card fits with the chevrons and the `+`, and the two
 * products page. Two cards would need ~1,100px of pane, which is a ~1,900px
 * window. The dial column is `MarkedSlider`'s own width and narrowing it would
 * be a change to a published component for a bench's benefit, so the row pages
 * instead — which is the behaviour Peter asked for and the reason the component
 * has it.
 *
 * ── THE FRAME IS THE PLAIN 50/50 ───────────────────────────────────────────
 *
 * Charts above, controls below, as on the Hourly and Scenario boards. An earlier
 * pass had to give the charts a stated height because it drew TWO paired rows
 * needing ~700px; one grouped row is ~325px, so the halves are back and the
 * License Mix chart has its height back with them.
 */
import {
  batch,
  createMemo,
  createSignal,
  onMount,
  type Component,
} from "solid-js";
import { find, map } from "../../../src/fn";

import { CashflowScrubChart } from "../../../src/components/CashflowScrubChart";
import type { CashflowCell } from "../../../src/components/CashflowScrubChart";
import {
  createHighWaterMark,
  createMutationToolbar,
  createRateGauge,
  createStackedTimelineChart,
  timeOf,
} from "../../../src";
import type { Mutation } from "../../../src";
// NOT ON THE PACKAGE BARREL YET — imported by relative path, which says "this is
// not published" at the call site. `/promote` turns that around.
import {
  createGroupedMutationSliders,
  type GroupedMeasureIndex,
  type GroupedMutationEntity,
} from "../../../src/components/GroupedMutationSliders";
import {
  GhostButton,
  IconOnlyButton,
  PrimaryButton,
} from "../../../src/components/Button";
import { Icon } from "../../../src/components/Icon";
import { ThemedInput } from "../../../src/components/Inputs";
import { ThemedNumberInput } from "../../../src/components/ThemedNumberInput";
import { Modal } from "../../../src/components/Modal";
import {
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
import { SectionTitle, TextTitle } from "../../../src/components/Text";

import {
  COMFORTABLE,
  COMMITTED_RATE,
  COUNT_DOMAIN,
  DELTA_DOMAIN,
  EMPTY_DRAFT,
  FIELDS,
  FIXED_MONTHLY_COST,
  FIXTURE,
  MONTHLY_FEE_DOMAIN,
  PCT_DOMAIN,
  MONTH_COUNT,
  OPENING_BALANCE,
  PRODUCTS,
  RATE_DOMAIN,
  SEED_MUTATIONS,
  addMutation,
  addProduct,
  annualLumpOfEntity,
  annualPriceOfEntity,
  annualPayments,
  averageNetCash,
  balancesByMonth,
  bandOfRate,
  canAdd,
  cashByMonth,
  cashSources,
  cashTable,
  domainEndOf,
  drawnRate,
  ensureMutation,
  entitiesFor,
  fanAt,
  hasAnyChange,
  isDirty,
  isOffDial,
  licenseMixSeries,
  monthIndexOf,
  monthOfPick,
  monthRangeOf,
  monthSlotsOf,
  monthStartOf,
  monthlyCashOfEntity,
  netCashByMonth,
  quarterLabelOf,
  quarterTicks,
  rateBandTable,
  removeMutation,
  scenarioDigest,
  segmentLabelsOf,
  timeDomainOf,
  withChange,
  withDiscontinue,
  withoutChange,
  type CashRow,
  type CashSource,
  type PlanField,
  type Product,
  type ProductDraft,
  type SegmentLabel,
} from "./license-board-model";
import {
  abbreviateDollars,
  againstBreakeven,
  dollarsPerMonth,
  formatDelta,
  formatFee,
  formatLicenses,
  revenueShift,
  signedDollarsPerMonth,
} from "./license-board-money";

export const meta = { label: "License Board" };

/** Flip to print every derived table to the console on mount. */
const DEBUG = false;

/**
 * THE TIMELINE STARTS TODAY — at the MONTH-START OF TODAY (Peter, 2026-09-18:
 * "start the cashflow timeline today"). Licences bill monthly, so the month is
 * the unit the span can open on; the board is a forecast from the month we are
 * in, and the running balance opens at the balance NOW.
 *
 * ⚠ THE CLOCK IS READ EXACTLY ONCE, HERE, AND THREADED. Every model function
 * takes `start` and calls no `new Date()` of its own, so the model stays pure
 * and its tests stay deterministic on a fixed start. Reading the clock once at
 * module load also means the board cannot re-base itself under the reader if it
 * is left open across midnight on the first of a month.
 */
const START = monthStartOf(Date.now());

/** The span's own month grid — the slots a click snaps to, from `START`. */
const MONTH_SLOTS = monthSlotsOf(START);

/** The span as the two Dates the License Mix chart's `xDomain` wants. */
const TIME_DOMAIN = timeDomainOf(START);

// ── The curried components ───────────────────────────────────────────────────

/**
 * THE BOARD'S DIALS: ONE CARD PER PRODUCT, SIX DIALS, curried once.
 *
 * Peter's sketch asks each billing variant the same three questions, so the card
 * is two captioned groups of three:
 *
 *     mo:  #  licences now   Δ  net change a month   $  the monthly fee
 *     yr:  #  licences now   Δ  net change a month   %  of twelve monthly
 *
 * THE COUNTS AND THE DELTAS ARE RAW NUMBERS on both sides; only the annual price
 * is a percentage. An annual licence costs `monthly $ × 12 × % / 100` a year, so
 * the MONTHLY `$` DIAL PRICES BOTH VARIANTS — raising it raises every annual
 * renewal too, with no second dial to keep in step.
 *
 * `axes` carries every per-measure presentational decision there is — the unit,
 * the name, the grid, the scale and the CAPTION — and all five are properties of
 * THIS BOARD rather than of any one render, so the call site passes data and
 * callbacks only.
 *
 * THE POSITIONS ARE THE MODEL'S `FIELDS`, in order. `setMeasure` translates an
 * index back through that same tuple, so the two cannot drift.
 *
 * THE LABELS ARE ONE CHARACTER EACH and the CAPTION disambiguates them: `#`
 * appears twice and `$` twice, and `mo` or `yr` above the trio says which is
 * which — in the drawing and in every dial's accessible name (`Amygdala yr $`).
 * Six long labels would cost each column the width that makes a dial aimable.
 *
 * Δ IS THE ONLY TRACK THAT CROSSES ZERO, because it is the only measure whose
 * SIGN is the reading: the same dial says growing, stable and dying depending
 * which side of the middle it sits on. `formatDelta` keeps the sign on the
 * readout for the same reason.
 *
 * The `%` track runs the WHOLE 0–100 — see `PCT_DOMAIN`. JTF's annual licence
 * costs 20% of twelve monthly fees, which a floored track could not express at
 * all.
 */
const LicenseSliders = createGroupedMutationSliders({
  axes: [
    {
      label: "#",
      group: "mo",
      domain: COUNT_DOMAIN,
      snap: 1,
      format: formatLicenses,
    },
    {
      label: "Δ",
      group: "mo",
      domain: DELTA_DOMAIN,
      snap: 1,
      format: formatDelta,
      // The READOUT is signed (`+2`, `−1`) because which side of zero Δ sits on
      // is the whole reading. The CHANGE label must not be: `deltaLabelOf`
      // writes its own sign, and a signed formatter there printed `++1`.
      deltaFormat: (value: number) => String(Math.round(value)),
    },
    {
      label: "$",
      group: "mo",
      domain: MONTHLY_FEE_DOMAIN,
      // FIFTIES. The track runs to $6,000 — JTF's monthly licence alone is
      // $5,000 — and a one-dollar step across that range is a precision the
      // pointer does not have.
      snap: 50,
      format: formatFee,
    },
    {
      label: "#",
      group: "yr",
      domain: COUNT_DOMAIN,
      snap: 1,
      format: formatLicenses,
    },
    {
      label: "Δ",
      group: "yr",
      domain: DELTA_DOMAIN,
      snap: 1,
      format: formatDelta,
      // The READOUT is signed (`+2`, `−1`) because which side of zero Δ sits on
      // is the whole reading. The CHANGE label must not be: `deltaLabelOf`
      // writes its own sign, and a signed formatter there printed `++1`.
      deltaFormat: (value: number) => String(Math.round(value)),
    },
    {
      label: "%",
      group: "yr",
      domain: PCT_DOMAIN,
      snap: 1,
      format: (value: number) => `${Math.round(value)}%`,
    },
  ],
  labels: {
    remove: "Discontinue",
    restore: "Relaunch",
    new: "new product",
  },
});

/**
 * THE BOARD'S OWN GAUGE. Both formatters are SENTENCE builders — the gauge
 * supplies no words of its own around them — so the callouts are this board's
 * wording, written and tested in `license-board-money`. Revenue-side: up is over
 * breakeven and up is more cash, with no sign flip anywhere.
 */
const RevenueRateGauge = createRateGauge({
  baselineLabel: "Baseline",
  formatAgainst: againstBreakeven,
  formatDelta: revenueShift,
});

/** The plot inset. Wide enough on the left for abbreviated dollar labels. */
const LICENSE_MIX_MARGIN = {
  top: 20,
  right: 16,
  bottom: 28,
  left: 46,
} as const;

/**
 * THE LICENSE MIX CHART, curried once.
 *
 * NO `rule`. It carried a breakeven line while every band was a smooth MRR, and
 * a horizontal rule across a stack whose top edge jumps from $2.9k to $16.1k in
 * one month is a line the reader has to ignore eleven months in twelve.
 * Breakeven is still drawn where it reads — on the gauge, where zero IS
 * breakeven, and in the Cash Flow line, which is already net of it.
 */
const LicenseMixChart = createStackedTimelineChart({
  margin: LICENSE_MIX_MARGIN,
  yTickFormat: (value: number) => abbreviateDollars(value),
  xTickFormat: quarterLabelOf,
});

/** How much room the License Mix stack keeps above its tallest month. A spike
 *  flush against the top of the plot reads as clipped even when it is not. */
const MIX_HEADROOM = 1.15;

/** THE CHANGES HEADER. The default words are this board's already. */
const ChangesToolbar = createMutationToolbar({});

// ── Constants the layout needs ──────────────────────────────────────────────

/**
 * The chart's months, as cells — ONE PER MONTH THE MODEL FORECASTS, built from
 * `MONTH_SLOTS` rather than from `monthlyCells`.
 *
 * ⚠ THAT IS A BUG FIX, not a preference. `monthlyCells(start, end)` is
 * INCLUSIVE of the end month, so `monthlyCells` across a two-year span returns
 * TWENTY-FIVE cells while the forecast has twenty-four. The twenty-fifth read
 * `balances[24]`, found `undefined`, fell back to zero, and the Cash Flow line
 * dropped off a cliff at the right-hand edge — with the fan dragging it below
 * the axis. Nothing threw; the chart just drew a lie.
 *
 * Deriving the cells from the model's own slot grid makes the two agree BY
 * CONSTRUCTION, which is the same discipline the other boards apply to their
 * cell edges. `MONTH_SLOTS` is the grid a click snaps to, so the cells, the
 * forecast and the pick are now one calendar rather than three that happen to
 * line up.
 */
const CELLS = map(
  (slot: number) => ({
    start: new Date(slot),
    end: new Date(
      Date.UTC(
        new Date(slot).getUTCFullYear(),
        new Date(slot).getUTCMonth() + 1,
        1,
      ),
    ),
  }),
  MONTH_SLOTS,
);

/** The x-axis's tick values, and the vocabulary they read in. A span opening
 *  mid-quarter draws its first tick at the NEXT quarter start. */
const QUARTER_TICKS = quarterTicks(START);

/** The board opens with NO changes; the first interaction makes its own. */
const OPENING_SELECTION: string | null = SEED_MUTATIONS[0]?.id ?? null;

// ── Derivations the LAYOUT owns ─────────────────────────────────────────────

/** The as-of chips: one per change, labelled by MONTH. */
const chipsOf = (
  mutations: readonly Mutation[],
): { id: string; label: string }[] =>
  map(
    (segment: SegmentLabel) => ({ id: segment.id, label: segment.label }),
    segmentLabelsOf(mutations),
  );

/**
 * The chart's cells. Cents, because the chart's y IS cents.
 *
 * NO PROJECTION ARITHMETIC. The balance is `balancesByMonth` — a plain running
 * sum of each month's cash less the fixed cost — because cash is already
 * explicit per month. The rate boards this one descends from had to integrate a
 * sampled slope; a forecast made of actual monthly figures just adds them up,
 * and the line STEPS at every annual anniversary instead of sloping.
 */
const balanceCells = (
  products: readonly Product[],
  mutations: readonly Mutation[],
): CashflowCell[] => {
  const balances = balancesByMonth(
    products,
    mutations,
    OPENING_BALANCE,
    FIXED_MONTHLY_COST,
    START,
  );
  const net = netCashByMonth(products, mutations, FIXED_MONTHLY_COST, START);
  return map(
    (cell: { start: Date; end: Date }, index: number) => ({
      ...cell,
      cashflowCents: (net[index] ?? 0) * 100,
      balanceCents: (balances[index] ?? 0) * 100,
    }),
    CELLS,
  );
};

/** One faint alternative in the fan, above or below the forecast. */
const fanSeries = (id: string, sign: number, nowIndex: number) => ({
  id,
  class: "scenario-board-demo__fan",
  balanceCents: (cell: CashflowCell, index: number): number =>
    cell.balanceCents + sign * fanAt(index, nowIndex) * 100,
});

/** The highest point anything on the Cash Flow chart reaches, in cents. */
const peakBalanceCents = (
  cells: readonly CashflowCell[],
  nowIndex: number,
): number => {
  let peak = 0;
  for (const [index, cell] of cells.entries()) {
    const top = cell.balanceCents + Math.abs(fanAt(index, nowIndex)) * 100;
    if (top > peak) peak = top;
  }
  return peak;
};

// ── The Add form ────────────────────────────────────────────────────────────

/**
 * The body of the Add modal — SIX figures, because a product is six figures.
 *
 * A COMPONENT rather than JSX inside the board because of the focus: `Modal` has
 * no initial-focus mechanism and its children are created lazily inside its
 * `Show`, so an `onMount` here fires on every OPEN, which is when the name field
 * wants the caret.
 */
const ProductForm: Component<{
  draft: ProductDraft;
  onDraft: (draft: ProductDraft) => void;
  onSubmit: () => void;
}> = (props) => {
  let nameField: HTMLInputElement | undefined;
  onMount(() => nameField?.focus());

  const number = (
    name: string,
    label: string,
    range: readonly [number, number],
    step: number,
    value: number | undefined,
    set: (next: number | undefined) => void,
  ) => (
    <ThemedNumberInput
      name={name}
      label={label}
      size="sm"
      min={range[0]}
      max={range[1]}
      step={step}
      value={() => value}
      onChange={set}
    />
  );

  return (
    <NarrowStack>
      <ThemedInput
        ref={nameField}
        label="Product"
        placeholder="What are you licensing?"
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
      {number(
        "mo-count",
        "Monthly licences",
        COUNT_DOMAIN,
        1,
        props.draft.monthlyCount,
        (monthlyCount) => props.onDraft({ ...props.draft, monthlyCount }),
      )}
      {number(
        "mo-delta",
        "Monthly Δ a month",
        DELTA_DOMAIN,
        1,
        props.draft.monthlyDelta,
        (monthlyDelta) => props.onDraft({ ...props.draft, monthlyDelta }),
      )}
      {number(
        "mo-fee",
        "$ a month",
        MONTHLY_FEE_DOMAIN,
        1,
        props.draft.monthlyFee,
        (monthlyFee) => props.onDraft({ ...props.draft, monthlyFee }),
      )}
      {number(
        "yr-count",
        "Annual licences",
        COUNT_DOMAIN,
        1,
        props.draft.annualCount,
        (annualCount) => props.onDraft({ ...props.draft, annualCount }),
      )}
      {number(
        "yr-delta",
        "Annual Δ a month",
        DELTA_DOMAIN,
        1,
        props.draft.annualDelta,
        (annualDelta) => props.onDraft({ ...props.draft, annualDelta }),
      )}
      {number(
        "yr-pct",
        "% of twelve months",
        PCT_DOMAIN,
        1,
        props.draft.annualPct,
        (annualPct) => props.onDraft({ ...props.draft, annualPct }),
      )}
    </NarrowStack>
  );
};

// ── The board ───────────────────────────────────────────────────────────────

const LicenseBoardBench: Component = () => {
  const [products, setProducts] = createSignal<readonly Product[]>(PRODUCTS);
  const [mutations, setMutations] =
    createSignal<readonly Mutation[]>(SEED_MUTATIONS);
  const [editing, setEditing] = createSignal<string | null>(OPENING_SELECTION);
  const [adding, setAdding] = createSignal(false);
  const [draft, setDraft] = createSignal<ProductDraft>(EMPTY_DRAFT);
  /** Which products are PINNED. A scenario-level idea — two products raised
   *  together — so the board holds it rather than the row. */
  const [selected, setSelected] = createSignal<readonly string[]>([]);
  const [saved, setSaved] = createSignal(
    scenarioDigest(PRODUCTS, SEED_MUTATIONS),
  );

  const dirty = () => isDirty(products(), mutations(), saved());

  /** THE GAUGE'S READING: average net cash a month across the whole span. */
  const rate = () =>
    averageNetCash(products(), mutations(), FIXED_MONTHLY_COST, START);

  /** ONE CARD PER PRODUCT on the books at the change being edited. */
  const cards = () => entitiesFor(products(), editing(), mutations());

  /**
   * The month the fan opens from — the change being edited, or MONTH ZERO.
   *
   * MONTH ZERO IS NOW, since the span opens at the month-start of today, so the
   * board that has no change selected fans from index 0 and THE WHOLE LINE IS
   * FORECAST. There is no committed history to draw differently: the chart's
   * only history/projection boundary is this index, and it starts at the
   * left-hand edge.
   */
  const nowIndex = () => {
    const at = editing();
    const chosen =
      at === null ? undefined : find((m: Mutation) => m.id === at, mutations());
    return chosen === undefined ? 0 : monthIndexOf(timeOf(chosen.at), START);
  };

  const cells = createMemo(() => balanceCells(products(), mutations()));

  /** THE CASH FLOW CEILING IS A HIGH-WATER MARK: it rises when a change pushes
   *  the line above it and never falls, so a drag down moves the LINE and
   *  leaves the axis alone. The shrink button refits it to the current peak. */
  const ceiling = createHighWaterMark(() =>
    peakBalanceCents(cells(), nowIndex()),
  );

  /**
   * THE LICENSE MIX CEILING, its own high-water mark.
   *
   * The peak the stack has reached — the highest total cash any month brings in
   * — with headroom so the tallest spike is not flush against the top of the
   * plot. `createHighWaterMark` does the rest: it never falls on its own, so a
   * drag that shrinks a band moves the BAND rather than re-scaling the axis
   * under it, and `reset()` eases it down to the current peak.
   *
   * `StackedTimelineChart` takes its ceiling as `yDomain`, which is a live prop,
   * so this needed no change to the component.
   */
  const mixCeiling = createHighWaterMark(() => {
    const cash = cashByMonth(products(), mutations(), START);
    return Math.max(...cash, 0) * MIX_HEADROOM;
  });

  /**
   * THE LINE UNDER A CARD — `$11.7k/mo · $0/yr`.
   *
   * Two readings, and they are the two the card is actually about: what this
   * product bills in a steady month, and what its annual base costs when it
   * pays. Folding the lump into a monthly figure would put the one
   * average-pretending-to-be-a-reading on a board whose whole point is that cash
   * is lumpy.
   *
   * IT WAS THREE and is now two, because the card is 516px wide and
   * `$11.7k/mo · $9.2k/yr each · $0 a year` did not fit it — the derived
   * per-licence price was the reading that could go, since the `%` dial's own
   * readout already shows what the reader set and the lump shows what it costs.
   * `annualPriceOfEntity` is still there, still tested, and still printed in the
   * DEBUG table for anyone checking the derivation.
   */
  const cardSummary = (entity: GroupedMutationEntity): string => {
    const monthly = monthlyCashOfEntity(entity);
    const lump = annualLumpOfEntity(entity);
    if (monthly === null || lump === null) return "";
    return `${dollarsPerMonth(monthly)} · ${abbreviateDollars(lump)}/yr`;
  };

  onMount(() => {
    if (DEBUG) printTables(products(), mutations(), editing());
  });

  /** THE FIRST INTERACTION MAKES ITS OWN CHANGE, at the first free month. */
  const editingOrFirst = (): string | null => {
    const already = editing();
    if (already !== null) return already;
    const ensured = ensureMutation(
      { mutations: mutations(), selected: null },
      START,
      domainEndOf(START),
    );
    batch(() => {
      setMutations(ensured.mutations);
      setEditing(ensured.selected);
    });
    return ensured.selected;
  };

  /** A CLICK ON THE LICENSE MIX PLOT proposes a change in that MONTH, or
   *  selects the one already there. */
  const pickMonth = (at: Date): void => {
    const next = addMutation(mutations(), at);
    batch(() => {
      setMutations(next.mutations);
      setEditing(next.selected);
    });
  };

  const setField = (id: string, field: PlanField, value: number): void => {
    const at = editingOrFirst();
    if (at === null) return;
    setProducts((current) =>
      withChange(current, id, at, field, value, mutations()),
    );
  };

  /**
   * A dial moved. The measure index names ONE of the six plan fields and
   * `FIELDS` is the single translation; a position the axes do not define
   * cannot have been dragged, so an out-of-range index is ignored.
   */
  const setMeasure = (
    id: string,
    measure: GroupedMeasureIndex,
    value: number,
  ): void => {
    const field = FIELDS[measure];
    if (field === undefined) return;
    setField(id, field, value);
  };

  /** ⊗ Discontinue: off the books from the selected change onward. */
  const discontinue = (id: string): void => {
    const at = editingOrFirst();
    if (at === null) return;
    setProducts((current) => withDiscontinue(current, id, at));
  };

  /** ↺ Relaunch: drop the change entirely rather than invent a plan. */
  const relaunch = (id: string): void => {
    const at = editing();
    if (at === null) return;
    setProducts((current) => withoutChange(current, id, at));
  };

  const openAdd = (): void => {
    editingOrFirst();
    setDraft(EMPTY_DRAFT);
    setAdding(true);
  };

  const closeAdd = (): void => {
    setAdding(false);
  };

  const confirmAdd = (): void => {
    const current = draft();
    const at = editing();
    if (at === null || !canAdd(current)) return;
    setProducts(
      (existing) => addProduct(existing, current, at, mutations()).products,
    );
    setAdding(false);
  };

  const deleteChange = (id: string): void => {
    const next = removeMutation(
      { mutations: mutations(), products: products() },
      id,
    );
    batch(() => {
      setMutations(next.mutations);
      setProducts(next.products);
      setEditing(next.selected);
    });
  };

  const reset = (): void => {
    batch(() => {
      setProducts(PRODUCTS);
      setMutations(SEED_MUTATIONS);
      setEditing(OPENING_SELECTION);
      setSelected([]);
      setSaved(scenarioDigest(PRODUCTS, SEED_MUTATIONS));
    });
  };

  const save = (): void => {
    printTables(products(), mutations(), editing());
    setSaved(scenarioDigest(products(), mutations()));
  };

  return (
    <div class="component-section component-section--full scenario-board-frame">
      <ViewportColumn>
        {/* ONE SAVE, FOR THE WHOLE BOARD (Peter, 2026-09-18: "the save will be
            global"). Same move as the Hourly Board: the Save left the Changes
            card's corner, which had implied the card was the unit being saved,
            and came to sit beside the board's own name. */}
        <SpreadRow>
          <SectionTitle>License Board</SectionTitle>
          <PrimaryButton disabled={!dirty()} onClick={save}>
            Save
          </PrimaryButton>
        </SpreadRow>

        {/* The top half, halved again: two charts stacked. Each card is a
            FillCardSurface — it takes its half of the band and lays out a
            column that fills it — so the title keeps its own height and the
            GrowFillBox hands the chart everything left. */}
        <HalfFillColumn>
          <HalfFillColumn>
            <FillCardSurface>
              <SpreadRow>
                <TextTitle>Cash Flow</TextTitle>
                <IconOnlyButton
                  onClick={ceiling.reset}
                  aria-label="Fit y-axis to current values"
                  title="Fit y-axis to current values"
                >
                  <Icon name="shrink" size="sm" />
                </IconOnlyButton>
              </SpreadRow>
              {/* THE WHOLE FOLD: cash in, fixed cost out, month by month. It
                  STEPS at every annual anniversary rather than sloping, which
                  is what a licence business's bank account actually does. */}
              <GrowFillBox>
                <CashflowScrubChart
                  cells={cells()}
                  yMax={ceiling.ceiling()}
                  scrub={false}
                  chartHeight="fill"
                  showGridlines
                  lineLabel="Balance"
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
              {/* THE SAME CONTROL AS CASH FLOW, for the same reason (Peter,
                  2026-09-18: "the license mix should use the same y-axis as the
                  cashflow. With the shrink icon"). A typed cap was a number the
                  reader had to maintain; a high-water mark maintains itself —
                  it rises when a change pushes the stack above it, HOLDS when
                  the stack falls so a drag moves the bands and not the axis,
                  and the ⤡ eases it back down to the current peak.

                  TWO INDEPENDENT MARKS, one per chart, not one shared: the two
                  charts measure different quantities (dollars of cash a month
                  against a running balance) and a shared ceiling would make one
                  of them unreadable the moment the other moved. */}
              <SpreadRow>
                <TextTitle>License Mix</TextTitle>
                <IconOnlyButton
                  onClick={mixCeiling.reset}
                  aria-label="Fit y-axis to current values"
                  title="Fit y-axis to current values"
                >
                  <Icon name="shrink" size="sm" />
                </IconOnlyButton>
              </SpreadRow>
              {/* One band per SOURCE — a product on one billing variant —
                  valued in dollars of CASH, so the annual bands are two spikes
                  twelve months apart and the monthly ones are smooth ramps.
                  Most variable on top, which puts the spikes there. */}
              <LicenseMixChart
                series={licenseMixSeries(products(), mutations(), START)}
                xDomain={TIME_DOMAIN}
                yDomain={[0, mixCeiling.ceiling()]}
                xTickValues={QUARTER_TICKS}
                events={mutations()}
                hoverLabel={(at) => monthRangeOf(at, START).label}
                onPick={(at) => pickMonth(monthOfPick(at, START))}
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
                    children out as a column that FILLS the card. */}
                <ChangesToolbar
                  title="Changes"
                  changes={chipsOf(mutations())}
                  selected={editing()}
                  onSelect={setEditing}
                  emptyNote="Click a month, or move a dial, to propose a change — it holds until the next one."
                  onReset={reset}
                  onRemove={deleteChange}
                />
                {/* ONE ROW, NEVER TWO (Peter, 2026-09-18). Six dials side by
                    side per card, the two captioned groups beside each other,
                    and when the pane cannot hold every card the row PAGES with
                    ‹ › rather than wrapping — by a WHOLE card, so a product's
                    `mo` group is never on screen with its `yr` group off it.
                    See the file header for the measured width. */}
                <GrowFillBox>
                  <LicenseSliders
                    entities={cards()}
                    summary={cardSummary}
                    selected={selected()}
                    onSelectionChange={setSelected}
                    onChange={setMeasure}
                    onRemove={discontinue}
                    onRestore={relaunch}
                    onAdd={openAdd}
                  />
                </GrowFillBox>
              </FillCardSurface>
            </MajorPaneBox>

            <GrowFillBox class="scenario-board-gauge">
              <FillCardSurface>
                <TextTitle>Cash, on average</TextTitle>
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
        title="Launch a product"
        subtitle="It starts at the change being edited, on the figures you give it."
        footer={
          <EndWrapRow>
            <GhostButton onClick={closeAdd}>Cancel</GhostButton>
            <PrimaryButton disabled={!canAdd(draft())} onClick={confirmAdd}>
              Launch
            </PrimaryButton>
          </EndWrapRow>
        }
      >
        <ProductForm draft={draft()} onDraft={setDraft} onSubmit={confirmAdd} />
      </Modal>
    </div>
  );
};

/** The board, read as tables, with no browser in the room. */
const printTables = (
  products: readonly Product[],
  mutations: readonly Mutation[],
  mutationId: string | null,
): void => {
  /* eslint-disable no-console */
  const gone = "— (discontinued)";
  // THE CARDS — every product's six dials as ONE row of a table, which is
  // exactly what one card shows.
  console.table(
    map(
      (card: GroupedMutationEntity) => {
        const monthly = monthlyCashOfEntity(card);
        const lump = annualLumpOfEntity(card);
        return {
          product: card.label,
          moCount: card.measures[0]?.value ?? gone,
          moDelta: card.measures[1]?.value ?? gone,
          moFee: card.measures[2]?.value ?? gone,
          yrCount: card.measures[3]?.value ?? gone,
          yrDelta: card.measures[4]?.value ?? gone,
          yrPct: card.measures[5]?.value ?? gone,
          yrPriceEach: annualPriceOfEntity(card) ?? gone,
          steadyMonth: monthly === null ? "" : dollarsPerMonth(monthly),
          annualLump: lump === null ? "" : abbreviateDollars(lump),
        };
      },
      entitiesFor(products, mutationId, mutations),
    ),
  );
  // THE FORECAST, month by month — every source's cash beside the total, the
  // net and the running balance. The two charts are pictures of these 24 rows,
  // and a lumpy forecast is exactly the kind of thing that looks plausible in a
  // picture and wrong in a column of numbers.
  const sources = cashSources(products, mutations, START);
  console.table(
    map(
      (row: CashRow) => ({
        month: row.label,
        ...Object.fromEntries(
          map(
            (source: CashSource, index: number) => [
              source.label,
              row.bySource[index] ?? 0,
            ],
            sources,
          ),
        ),
        cash: row.cash,
        net: row.net,
        balance: Math.round(row.balance),
      }),
      cashTable(products, mutations, FIXED_MONTHLY_COST, START),
    ),
  );
  // THE ANNUAL PAYMENTS, per product — the worked example, as data: which
  // months a cohort actually paid in and what it paid. This is where Peter's
  // "10 × fee at month 0 and 9 × fee at month 12" is visible.
  for (const product of products) {
    console.log(
      product.label,
      "annual payments:",
      map(
        (row: { month: number; amount: number }) =>
          `m${row.month}=${abbreviateDollars(row.amount)}`,
        annualPayments(product, mutations, START),
      ).join(" "),
    );
  }
  console.table(rateBandTable(FIXTURE, START));
  const average = averageNetCash(products, mutations, FIXED_MONTHLY_COST, START);
  const drawn = drawnRate(average);
  console.log(
    "fixture",
    FIXTURE.label,
    "· months",
    MONTH_COUNT,
    "· opening balance",
    abbreviateDollars(OPENING_BALANCE),
    "· fixed",
    dollarsPerMonth(FIXED_MONTHLY_COST),
    "· baseline",
    signedDollarsPerMonth(COMMITTED_RATE),
    "· gauge (span average)",
    signedDollarsPerMonth(average),
    "· AS DRAWN",
    signedDollarsPerMonth(drawn),
    isOffDial(average) ? "(CLAMPED — off the dial)" : "(on the dial)",
    "·",
    bandOfRate(drawn),
    "·",
    againstBreakeven(drawn),
    "·",
    revenueShift(drawn - COMMITTED_RATE),
    "· any change?",
    hasAnyChange(products),
  );
  /* eslint-enable no-console */
};

export default LicenseBoardBench;
