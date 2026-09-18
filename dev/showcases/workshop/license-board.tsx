/**
 * License Board bench — Peter's sketch of 2026-09-18, composed.
 *
 * A business that sells LICENCES, read four ways at once. This bench builds
 * NOTHING: the running balance is `CashflowScrubChart` under a
 * `createHighWaterMark` ceiling, the product mix is `StackedTimelineChart`, the
 * header is `MutationToolbar`, the dials are two curried
 * `PairedMutationSliders` rows and the card on the right is `RateGauge`. What it
 * adds is the ARRANGEMENT and the WIRING — whether four pieces say the same
 * thing when they are looking at one scenario.
 *
 * Component per region, so the reuse is checkable:
 *
 *   Cash Flow     — `CashflowScrubChart` (cells, scrub={false},
 *                   chartHeight="fill", balanceSeries fan) + `createHighWaterMark`
 *                   — the same call the Hourly Board now makes
 *   License Mix   — `createStackedTimelineChart` (one band per PRODUCT, valued
 *                   in $/mo, breakeven rule, numbered event rules, hover, pick)
 *   Changes       — `createMutationToolbar` + TWO `createPairedMutationSliders`
 *                   rows + `Modal` + `ThemedInput` + `ThemedNumberInput`
 *   Rate gauge    — `createRateGauge` with revenue-side sentences in $/mo
 *
 * Frame and rows: `ViewportColumn` / `HalfFillColumn` / `FillWrapRow` /
 * `MajorPaneBox` / `GrowFillBox` / `FillCardSurface` / `GrowCenterColumn`, and
 * the Scenario Board's own `.scenario-board-frame` and `.scenario-board-gauge`
 * classes — reused rather than copied, so this bench adds no CSS at all.
 *
 * Every number comes from a named pure function in `license-board-model.ts`,
 * each printed as a table on mount behind `DEBUG`, so the board can be read and
 * argued with from a terminal before anyone opens a browser.
 *
 * ── FOUR DIALS, TWO ROWS ────────────────────────────────────────────────────
 *
 * Peter's sketch gives one product FOUR dials in two captioned groups — `mo`
 * (#, $) and `yr` (#, %), where an annual licence costs `fee × 12 × pct` a year.
 * `PairedMutationSliders` is a PAIR by TYPE (`measures: [PairedMeasure,
 * PairedMeasure]`, `MeasureIndex = 0 | 1`), so four dials under one name is not
 * expressible on it, and this bench draws TWO ROWS instead: a Monthly row and an
 * Annual one, listing the SAME products by the SAME ids.
 *
 * KEEPING THEM IN SYNC IS NOT THE BENCH'S JOB, and that is the only reason two
 * rows work at all. Both are derived from ONE walk of the history
 * (`monthlyPairs` / `annualPairs` over the same `soldAcross`), so a product
 * discontinued in one row vanishes from the other in the same frame by
 * construction rather than by two call sites agreeing. Selection is the
 * exception and is held HERE, in one signal both rows read and write, because
 * that state belongs to neither of them.
 *
 * WHAT IT COSTS, stated plainly: one product draws two name buttons, two footer
 * slots and two `+`s, so it reads as two things on screen that share a word, and
 * a narrow window can page the two rows to different products. A single control
 * with four dials in captioned groups is the follow-up
 * (`GroupedMutationSliders`, on its own branch); this bench is the version built
 * entirely from what already ships, which is what makes it a fair test of
 * whether the existing lego reaches.
 *
 * ── A ROW'S MEASURE INDEX IS MEANINGLESS ON ITS OWN ─────────────────────────
 *
 * Measure 1 is a FEE on the Monthly row and a PERCENTAGE on the Annual one, so
 * `(id, 1, value)` says nothing until you know which row it came from. The two
 * handlers below resolve it into a PLAN FIELD before anything else sees it, and
 * `withChange` takes that field rather than an index — so the model has no way
 * to write a percentage into a fee.
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
import { monthlyCells } from "../../../src/components/DateAxis";
// THE PACKAGE BARREL, for everything that has been promoted — imported the way
// a client would rather than reaching into component folders.
import {
  createHighWaterMark,
  createMutationToolbar,
  createPairedMutationSliders,
  createRateGauge,
  createStackedTimelineChart,
  timeOf,
} from "../../../src";
import type { Mutation, TimeValue } from "../../../src";
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
import type {
  MeasureIndex,
  PairedMutationEntity,
} from "../../../src/components/PairedMutationSliders";

import {
  ANNUAL_FIELDS,
  BREAKEVEN_MRR,
  COMFORTABLE,
  COMMITTED_RATE,
  DEFAULT_MRR_CAP,
  DOMAIN_END,
  DOMAIN_START,
  EMPTY_DRAFT,
  FEE_DOMAIN,
  FIXED_MONTHLY_COST,
  LICENSE_DOMAIN,
  MIN_MRR_CAP,
  MONTHLY_FIELDS,
  MONTHLY_NET,
  OPENING_BALANCE,
  PCT_DOMAIN,
  PRODUCTS,
  RATE_DOMAIN,
  SEED_MUTATIONS,
  TIME_DOMAIN,
  addMutation,
  addProduct,
  annualPairs,
  annualPriceOf,
  averageRate,
  bandOfRate,
  billingTable,
  canAdd,
  drawnRate,
  ensureMutation,
  hasAnyChange,
  isDirty,
  isOffDial,
  maxReachableRate,
  momentsOf,
  monthOfPick,
  monthRangeOf,
  monthStarts,
  monthlyOf,
  monthlyPairs,
  mrrAt,
  peakMonth,
  pinnedCeiling,
  projectedBalances,
  projectionTable,
  quarterLabelOf,
  quarterTicks,
  rateAt,
  rateBandTable,
  removeMutation,
  runningBalances,
  scenarioDigest,
  segmentLabelsOf,
  shownPlanOf,
  stackOrderTable,
  licenseMixSeries,
  withChange,
  withDiscontinue,
  withoutChange,
  type PlanField,
  type MonthRow,
  type Plan,
  type Product,
  type ProductDraft,
  type RateSampling,
  type SegmentLabel,
} from "./license-board-model";
import {
  abbreviateDollars,
  againstBreakeven,
  dollarsPerMonth,
  formatFee,
  formatLicenses,
  revenueShift,
  signedDollarsPerMonth,
} from "./license-board-money";

export const meta = { label: "License Board" };

/** Flip to print every derived table to the console on mount. */
const DEBUG = false;

// ── The curried components ───────────────────────────────────────────────────

/**
 * THE MONTHLY ROW'S DIALS, curried ONCE at module level.
 *
 * `axes` is mandatory at the curry and carries every per-measure presentational
 * decision there is — the unit, the name, the grid and the scale — and all four
 * are properties of THIS BOARD rather than of any one render. So the call site
 * passes data and callbacks only.
 *
 * The labels are `#` and `$`, single characters, because the ROW is titled
 * "Monthly" and a dial under it labelled "Monthly licences" would say it twice
 * in a column the width of a dial.
 */
const MonthlySliders = createPairedMutationSliders({
  axes: [
    { label: "#", domain: LICENSE_DOMAIN, snap: 1, format: formatLicenses },
    { label: "$", domain: FEE_DOMAIN, snap: 1, format: formatFee },
  ],
  labels: {
    remove: "Discontinue",
    restore: "Relaunch",
    new: "new product",
  },
});

/**
 * THE ANNUAL ROW'S DIALS. The same two positions, a different pair of meanings:
 * `#` is annual licences and `%` is what an annual licence is sold for as a
 * percentage of twelve monthly ones.
 *
 * The percentage track runs 50–100 rather than 0–100 — see `PCT_DOMAIN` for
 * why — so the figures a business would actually offer get the whole length of
 * the dial instead of its top half.
 */
const AnnualSliders = createPairedMutationSliders({
  axes: [
    { label: "#", domain: LICENSE_DOMAIN, snap: 1, format: formatLicenses },
    { label: "%", domain: PCT_DOMAIN, snap: 1, format: (n) => `${n}%` },
  ],
  labels: {
    remove: "Discontinue",
    restore: "Relaunch",
    new: "new product",
  },
});

/**
 * THE BOARD'S OWN GAUGE.
 *
 * Both formatters are SENTENCE builders — the gauge supplies no words of its own
 * around them — so what the callouts say is this board's wording, written and
 * tested in `license-board-money` rather than inline here. They are
 * REVENUE-side: up is over breakeven and up is more revenue, with no sign flip
 * anywhere.
 */
const RevenueRateGauge = createRateGauge({
  baselineLabel: "Baseline",
  formatAgainst: againstBreakeven,
  formatDelta: revenueShift,
});

/** The plot inset. Wide enough on the left for abbreviated dollar labels. */
const LICENSE_MIX_MARGIN = { top: 20, right: 16, bottom: 28, left: 46 } as const;

/**
 * THE LICENSE MIX CHART, curried once: the inset and the tick text are this
 * board's (dollars a month on y, quarters on x), so the call site passes data
 * only. `StackedTimelineChart` measures its own box, so the board does not.
 */
const LicenseMixChart = createStackedTimelineChart({
  margin: LICENSE_MIX_MARGIN,
  yTickFormat: (value: number) => abbreviateDollars(value),
  xTickFormat: quarterLabelOf,
});

/**
 * THE CHANGES HEADER. The default words are this board's words already, so the
 * curry states nothing — it exists so the call site is data-only, the same as
 * every other piece here.
 */
const ChangesToolbar = createMutationToolbar({});

// ── Constants the layout needs ──────────────────────────────────────────────

/** The chart's months, as cells. One per month across the span. */
const CELLS = monthlyCells(DOMAIN_START, DOMAIN_END);

/** The COMMITTED balance — what the fixture's flows have already produced. */
const COMMITTED = runningBalances(MONTHLY_NET, OPENING_BALANCE);

/**
 * The ceiling a PINNED balance domain would need, in dollars — and the reason
 * the chart is left unpinned.
 *
 * MEASURED on this fixture: the dials can reach $24,258/mo, thirteen months of
 * which is $315k of projection, so a pinned domain has to run past $350k — and
 * the committed line, which ends at $64k, is squashed into the bottom fifth of
 * the plot and reads flat. The chart uses a HIGH-WATER MARK instead: the peak
 * the reader has actually SEEN, which rises when a change pushes the line above
 * it and never falls, so a drag down moves the LINE and leaves the axis alone.
 *
 * The number is still computed and printed in the DEBUG table, which is exactly
 * what the Scenario and Hourly Boards do with their own.
 */
const PINNED_CEILING = pinnedCeiling(
  COMMITTED,
  maxReachableRate(PRODUCTS),
  (months) => fanOf(months, 0),
);

/**
 * The change the board opens on. The fixture seeds NONE, so this is `null` and
 * the first interaction makes its own at the first free month — which for this
 * span is January, and so is in force for the whole year.
 */
const OPENING_SELECTION: string | null = SEED_MUTATIONS[0]?.id ?? null;

/** The License Mix x-axis's four ticks, and the vocabulary they read in. */
const QUARTER_TICKS = quarterTicks();

/** The chart's cell edges, as numbers. Agrees with `CELLS` by construction. */
const BOUNDARIES = monthStarts(DOMAIN_START, COMMITTED.length);

// ── Derivations the LAYOUT owns ─────────────────────────────────────────────

/** The fan's half-width, re-exported through a local name so `PINNED_CEILING`
 *  above can be declared before the import order would otherwise allow. */
function fanOf(index: number, nowIndex: number): number {
  const months = index - nowIndex;
  return months <= 0 ? 0 : 150 * months * months;
}

/** The as-of chips: one per change, labelled by MONTH. */
const chipsOf = (
  mutations: readonly Mutation[],
): { id: string; label: string }[] =>
  map(
    (segment: SegmentLabel) => ({ id: segment.id, label: segment.label }),
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

/**
 * HOW THE PROJECTION READS THE RATE: sampled at every change, integrated in
 * MONTHS.
 *
 * Months and nothing else, because a licence bills monthly and the cash chart's
 * cells ARE months — so the rate is $/mo, the stretches are months and the
 * integral is `months × $/mo` with no conversion factor at all. (The Hourly
 * Board carries a unit parameter because its rate is weekly and its cells are
 * not.) `momentsOf` samples EVERY month rather than only the flags, so a product
 * that launches or is discontinued between two flags still reaches the line in
 * the month it happens.
 */
const samplingFor = (
  mutations: readonly Mutation[],
  products: readonly Product[],
): RateSampling => ({
  boundaries: BOUNDARIES,
  rate: (time: number) => rateAt(time, mutations, products),
  moments: momentsOf(mutations),
});

/** The chart's cells. Cents, because the chart's y IS cents. */
const balanceCells = (
  sampling: RateSampling,
  nowIndex: number,
): CashflowCell[] => {
  const balances = projectedBalances(COMMITTED, sampling, nowIndex);
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
    cell.balanceCents + sign * fanOf(index, nowIndex) * 100,
});

/** The highest point anything on the Cash Flow chart reaches, in cents: the
 *  projection or the upper edge of its fan, whichever is higher. */
const peakBalanceCents = (
  cells: readonly CashflowCell[],
  nowIndex: number,
): number => {
  let peak = 0;
  for (const [index, cell] of cells.entries()) {
    const top = cell.balanceCents + Math.abs(fanOf(index, nowIndex)) * 100;
    if (top > peak) peak = top;
  }
  return peak;
};

// ── The Add form ────────────────────────────────────────────────────────────

/**
 * The body of the Add modal.
 *
 * A COMPONENT rather than a block of JSX inside the board because of the focus:
 * `Modal` has no initial-focus mechanism of its own and its children are created
 * lazily inside its `Show`, so an `onMount` in here fires on every OPEN — which
 * is exactly when the name field wants the caret. An `onMount` in the board
 * would have fired once, at page load, while the form did not exist.
 *
 * FOUR FIGURES, because a product is four figures. The two counts and the fee
 * are what it sells; the percentage is what an annual licence costs against
 * twelve monthly ones, and it defaults to 85 rather than 100 because a prepay
 * discount is the normal case and a form whose default is "no discount" would
 * make the normal case the one that needs typing.
 */
const ProductForm: Component<{
  draft: ProductDraft;
  onDraft: (draft: ProductDraft) => void;
  onSubmit: () => void;
}> = (props) => {
  let nameField: HTMLInputElement | undefined;
  onMount(() => nameField?.focus());

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
      <ThemedNumberInput
        name="monthly-licenses"
        label="Monthly licences"
        size="sm"
        min={LICENSE_DOMAIN[0]}
        max={LICENSE_DOMAIN[1]}
        step={1}
        value={() => props.draft.monthlyLicenses}
        onChange={(monthlyLicenses) => {
          props.onDraft({ ...props.draft, monthlyLicenses });
        }}
      />
      <ThemedNumberInput
        name="fee"
        label="$ / month"
        size="sm"
        min={FEE_DOMAIN[0]}
        max={FEE_DOMAIN[1]}
        step={1}
        value={() => props.draft.fee}
        onChange={(fee) => {
          props.onDraft({ ...props.draft, fee });
        }}
      />
      <ThemedNumberInput
        name="annual-licenses"
        label="Annual licences"
        size="sm"
        min={LICENSE_DOMAIN[0]}
        max={LICENSE_DOMAIN[1]}
        step={1}
        value={() => props.draft.annualLicenses}
        onChange={(annualLicenses) => {
          props.onDraft({ ...props.draft, annualLicenses });
        }}
      />
      <ThemedNumberInput
        name="annual-pct"
        label="% of 12 months"
        size="sm"
        min={PCT_DOMAIN[0]}
        max={PCT_DOMAIN[1]}
        step={1}
        value={() => props.draft.annualPct}
        onChange={(annualPct) => {
          props.onDraft({ ...props.draft, annualPct });
        }}
      />
    </NarrowStack>
  );
};

// ── The board ───────────────────────────────────────────────────────────────

const LicenseBoardBench: Component = () => {
  const [products, setProducts] = createSignal<readonly Product[]>(PRODUCTS);
  const [mutations, setMutations] =
    createSignal<readonly Mutation[]>(SEED_MUTATIONS);
  /**
   * WHICH CHANGE THE DIALS ARE EDITING, or `null` when there is none. The board
   * OPENS on `null` — the fixture seeds no changes — and every reading below
   * asks for it rather than assuming a change exists.
   */
  const [editing, setEditing] = createSignal<string | null>(OPENING_SELECTION);
  /** The y-axis cap, in dollars a month. Peter's "settings", in the card
   *  header. */
  const [cap, setCap] = createSignal(DEFAULT_MRR_CAP);
  const [adding, setAdding] = createSignal(false);
  const [draft, setDraft] = createSignal<ProductDraft>(EMPTY_DRAFT);
  /**
   * WHICH PRODUCTS ARE PINNED, held HERE rather than inside either row.
   *
   * The two rows are one product list drawn twice, so a selection that lived in
   * one of them would mean a product could read as pinned above and unpinned
   * below. It is the one piece of row state that genuinely belongs to neither,
   * which is why it is the one piece this board holds.
   */
  const [selected, setSelected] = createSignal<readonly string[]>([]);
  /** The digest of whatever was last saved. The board opens clean. */
  const [saved, setSaved] = createSignal(
    scenarioDigest(PRODUCTS, SEED_MUTATIONS),
  );

  const dirty = () => isDirty(products(), mutations(), saved());

  /** THE GAUGE'S READING: the whole year, averaged. */
  const rate = () => averageRate(TIME_DOMAIN, mutations(), products());

  /** THE PROJECTION'S SAMPLING. Not a slope: the projection has no one scalar
   *  slope once a change exists. */
  const sampling = () => samplingFor(mutations(), products());

  const monthlyRow = () => monthlyPairs(products(), editing(), mutations());
  const annualRow = () => annualPairs(products(), editing(), mutations());

  /**
   * The month the projection pivots on. With NO change the pivot is month zero,
   * so the whole line is projection running at the committed rate — there is no
   * committed stretch to draw, because nothing has been decided.
   */
  const nowIndex = () => {
    const at = editing();
    const chosen =
      at === null ? undefined : find((m: Mutation) => m.id === at, mutations());
    return chosen === undefined ? 0 : monthIndexOf(chosen.at);
  };

  const cells = createMemo(() => balanceCells(sampling(), nowIndex()));

  /**
   * THE CASH FLOW CEILING IS A HIGH-WATER MARK (Peter, 2026-09-18: an axis that
   * re-fits on every drag jitters). It rises when a change pushes the line above
   * it and never falls, so a drag down moves the LINE and leaves the axis alone;
   * the shrink button resets it to the current peak, eased.
   */
  const ceiling = createHighWaterMark(() =>
    peakBalanceCents(cells(), nowIndex()),
  );

  /** The plan BOTH rows' summaries are computed from — all four numbers, looked
   *  up by the entity's id. See `shownPlanOf` for why the entity itself cannot
   *  answer it. */
  const shown = (id: string): Plan | null =>
    shownPlanOf(products(), id, editing(), mutations());

  /**
   * The Monthly row's summary: what this product bills a month, ALL IN —
   * monthly seats at the fee plus annual seats at the discounted fee. `$5.9k/mo`.
   *
   * It is the total and not the monthly half, because the total is the number
   * every other region of the board is drawn from: it is this product's band in
   * the stack and its share of the gauge. A line that showed only the monthly
   * part would be the one figure on the board that agreed with nothing else.
   */
  const monthlySummary = (entity: PairedMutationEntity): string => {
    const plan = shown(entity.id);
    return plan === null ? "" : dollarsPerMonth(monthlyOf(plan));
  };

  /** The Annual row's summary: what ONE annual licence costs a year — the figure
   *  on the invoice, which is the thing the `%` dial is actually setting. */
  const annualSummary = (entity: PairedMutationEntity): string => {
    const plan = shown(entity.id);
    return plan === null ? "" : `${abbreviateDollars(annualPriceOf(plan))}/yr each`;
  };

  onMount(() => {
    if (DEBUG) printTables(products(), mutations(), editing(), cap());
  });

  /**
   * THE FIRST INTERACTION MAKES ITS OWN CHANGE.
   *
   * The board opens with no changes at all, so dragging a dial would otherwise
   * be a no-op and the opening state a place the reader can get stuck. Now the
   * gesture means what it obviously means — a change, at the first free MONTH,
   * which for this span is January — and the drag lands on it. `batch`, because
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
   * A CLICK ON THE LICENSE MIX PLOT proposes a change in that MONTH, or selects
   * the one already there.
   *
   * `addMutation` does both and says which, so there is no branch here on
   * whether anything was added — and dedupe needs no tolerance window, because
   * the date arrives already snapped to the month slot and two picks in one
   * month are the same timestamp.
   */
  const pickMonth = (at: Date): void => {
    const next = addMutation(mutations(), at);
    batch(() => {
      setMutations(next.mutations);
      setEditing(next.selected);
    });
  };

  /**
   * A drag edits the selected change — making one first if there is none.
   *
   * The row's measure index is resolved into a PLAN FIELD here and nowhere
   * else, because index 1 is a fee on one row and a percentage on the other and
   * the model must never be handed a number that could mean either.
   */
  const setField = (id: string, field: PlanField, value: number): void => {
    const at = editingOrFirst();
    if (at === null) return;
    setProducts((current) =>
      withChange(current, id, at, field, value, mutations()),
    );
  };

  const setMonthly = (id: string, measure: MeasureIndex, value: number): void =>
    setField(id, MONTHLY_FIELDS[measure], value);

  const setAnnual = (id: string, measure: MeasureIndex, value: number): void =>
    setField(id, ANNUAL_FIELDS[measure], value);

  /** ⊗ Discontinue: this product is off the books from the selected change on.
   *  ALL FOUR measures go at once, so it leaves BOTH rows together. */
  const discontinue = (id: string): void => {
    const at = editingOrFirst();
    if (at === null) return;
    setProducts((current) => withDiscontinue(current, id, at));
  };

  /**
   * ↺ Relaunch: drop the change entirely rather than invent a plan. The product
   * carries whatever the previous change left it on. It needs no guard — it is
   * only ever drawn for something already discontinued, which takes a change to
   * have happened.
   */
  const relaunch = (id: string): void => {
    const at = editing();
    if (at === null) return;
    setProducts((current) => withoutChange(current, id, at));
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
    setProducts(
      (existing) => addProduct(existing, current, at, mutations()).products,
    );
    setAdding(false);
  };

  /**
   * DELETE THE SELECTED CHANGE, and everything that only existed because of it.
   * One pure function the test pins, and one `batch` so the three signals move
   * together.
   */
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
      setCap(DEFAULT_MRR_CAP);
      setSelected([]);
      setSaved(scenarioDigest(PRODUCTS, SEED_MUTATIONS));
    });
  };

  /**
   * SAVE. On a bench there is nothing to save TO, so it prints the scenario as
   * tables and marks the board clean — which is the honest bench behaviour and
   * also the observation a real Save would owe anyway (headless first). The
   * button disables itself until something has moved.
   */
  const save = (): void => {
    printTables(products(), mutations(), editing(), cap());
    setSaved(scenarioDigest(products(), mutations()));
  };

  return (
    <div class="component-section component-section--full scenario-board-frame">
      <ViewportColumn>
        <SectionTitle>License Board</SectionTitle>

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
              {/* THE CALL BOTH OTHER BOARDS MAKE, unchanged: `cells`,
                  `scrub={false}`, `chartHeight="fill"`, `showGridlines` and the
                  fan as two `balanceSeries`. The y-domain's top is the
                  high-water mark, not the all-dials-at-max `PINNED_CEILING` —
                  see that constant for why. */}
              <GrowFillBox>
                <CashflowScrubChart
                  cells={cells()}
                  yMax={ceiling.ceiling()}
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
                  height that makes them readable. `min` is the breakeven rule —
                  a cap below it would put the rule off the plot. */}
              <SpreadRow>
                <TextTitle>License Mix</TextTitle>
                <ClusterRow>
                  <NoteText>Cap</NoteText>
                  <ThemedNumberInput
                    name="mrr-cap"
                    label=""
                    size="sm"
                    min={MIN_MRR_CAP}
                    max={DEFAULT_MRR_CAP * 4}
                    step={1_000}
                    value={cap}
                    onChange={(next) => {
                      setCap(next ?? DEFAULT_MRR_CAP);
                    }}
                  />
                </ClusterRow>
              </SpreadRow>
              {/* One band per PRODUCT, valued in $/mo, so the stack's top edge
                  IS total MRR and the dashed rule at the fixed monthly cost is
                  literally the breakeven line. `onPick` reports the RAW date;
                  `monthOfPick` is this board's grid — the first of the month at
                  or before it, clamped to the span's start. */}
              <LicenseMixChart
                series={licenseMixSeries(products(), mutations())}
                xDomain={[DOMAIN_START, DOMAIN_END]}
                yDomain={[0, cap()]}
                xTickValues={QUARTER_TICKS}
                rule={{ value: BREAKEVEN_MRR, label: "breakeven" }}
                events={mutations()}
                hoverLabel={(at) => monthRangeOf(at).label}
                onPick={(at) => pickMonth(monthOfPick(at))}
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
                <ChangesToolbar
                  title="Changes"
                  changes={chipsOf(mutations())}
                  selected={editing()}
                  onSelect={setEditing}
                  emptyNote="Click a month, or move a dial, to propose a change — it holds until the next one."
                  onAdd={openAdd}
                  onReset={reset}
                  onSave={save}
                  saveDisabled={!dirty()}
                  onDelete={deleteChange}
                />
                {/* TWO ROWS, ONE PRODUCT LIST. Both halve the space left under
                    the toolbar, so neither is the senior one — a licence
                    business's annual book is not a footnote to its monthly one.
                    The SELECTION is this board's signal, passed to both, which
                    is the one thing that would otherwise let a product read as
                    pinned above and unpinned below. */}
                <HalfFillColumn>
                  <NoteText>Monthly · # licences, $ per month</NoteText>
                  <GrowFillBox>
                    <MonthlySliders
                      entities={monthlyRow()}
                      summary={monthlySummary}
                      selected={selected()}
                      onSelectionChange={setSelected}
                      onChange={setMonthly}
                      onRemove={discontinue}
                      onRestore={relaunch}
                      onAdd={openAdd}
                    />
                  </GrowFillBox>
                </HalfFillColumn>
                <HalfFillColumn>
                  <NoteText>Annual · # licences, % of twelve months</NoteText>
                  <GrowFillBox>
                    <AnnualSliders
                      entities={annualRow()}
                      summary={annualSummary}
                      selected={selected()}
                      onSelectionChange={setSelected}
                      onChange={setAnnual}
                      onRemove={discontinue}
                      onRestore={relaunch}
                      onAdd={openAdd}
                    />
                  </GrowFillBox>
                </HalfFillColumn>
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
  cap: number,
): void => {
  /* eslint-disable no-console */
  // THE TWO ROWS, side by side — every product's four dials as one row of a
  // table, which is the reading the two separate controls make hard.
  const monthly = monthlyPairs(products, mutationId, mutations);
  const annual = annualPairs(products, mutationId, mutations);
  console.table(
    map((pair: PairedMutationEntity, index: number) => {
      const plan = shownPlanOf(products, pair.id, mutationId, mutations);
      const yearly = annual[index];
      return {
        product: pair.label,
        moLicences: pair.measures[0].value ?? "— (discontinued)",
        fee: pair.measures[1].value ?? "— (discontinued)",
        yrLicences: yearly?.measures[0].value ?? "— (discontinued)",
        pct: yearly?.measures[1].value ?? "— (discontinued)",
        annualPrice: plan === null ? "" : abbreviateDollars(annualPriceOf(plan)),
        mrr: plan === null ? "" : dollarsPerMonth(monthlyOf(plan)),
      };
    }, monthly),
  );
  // THE BILLING SCHEDULE, month by month. The stack above it is a picture of
  // these twelve rows, and a stepped history is exactly the kind of thing that
  // looks plausible in a picture and wrong in a column of numbers.
  console.table(
    map(
      (row: MonthRow) => ({
        month: row.label,
        licences: map(
          (product: Product, index: number) =>
            `${product.label} ${row.monthly[index] ?? 0}mo+${row.annual[index] ?? 0}yr`,
          products,
        ).join(" · "),
        mrr: dollarsPerMonth(row.mrr),
        breakeven: row.breakeven,
        cap,
      }),
      billingTable(products, mutations),
    ),
  );
  console.table(
    map(
      (segment: SegmentLabel) => ({
        flag: find((m: Mutation) => m.id === segment.id, mutations)?.label ?? "",
        chip: segment.label,
        month: segment.month,
        editing: segment.id === mutationId ? "◀ editing" : "",
      }),
      segmentLabelsOf(mutations),
    ),
  );
  // THE STACK ORDER: each product's variability (std dev of its twelve monthly
  // MRR figures) beside where that put it — position 0 is the bottom band, and
  // the highest std dev lands last, which is the TOP band. Measured in MRR and
  // not in licence count, because the band's value IS its MRR.
  console.table(stackOrderTable(products, mutations));
  console.table(
    map(
      (series: { id: string; label?: string; points: readonly unknown[] }) => ({
        band: series.label ?? series.id,
        points: map(
          (point) =>
            `${new Date(timeOf((point as { at: Date }).at)).toISOString().slice(0, 10)}=${dollarsPerMonth((point as { value: number }).value)}`,
          series.points as readonly { at: Date; value: number }[],
        ).join(" "),
      }),
      licenseMixSeries(products, mutations),
    ),
  );
  console.table(rateBandTable(products));
  // THE BALANCE LINE, per cell — the PROJECTED RATE the integral sampled for
  // each month alongside what it accrued.
  console.table(
    projectionTable(
      COMMITTED,
      samplingFor(mutations, products),
      mutationId === null
        ? 0
        : monthIndexOf(
            find((m: Mutation) => m.id === mutationId, mutations)?.at ??
              DOMAIN_START,
          ),
    ),
  );
  const at =
    mutationId === null
      ? DOMAIN_START.getTime()
      : timeOf(
          find((m: Mutation) => m.id === mutationId, mutations)?.at ??
            DOMAIN_START,
        );
  const average = averageRate(TIME_DOMAIN, mutations, products);
  // THE DRAWN FIGURE, not only the computed one. `RateGauge` clamps `value` to
  // its domain and announces the clamped number, and the domain is sized against
  // the FIXTURE — a launched product carries the whole track, so an exploratory
  // scenario can run off the top. Printing both is what keeps the terminal and
  // the dial in agreement instead of promising they never differ.
  const drawn = drawnRate(average);
  console.log(
    "MRR now",
    dollarsPerMonth(mrrAt(products, at, mutations)),
    "· fixed",
    dollarsPerMonth(FIXED_MONTHLY_COST),
    "· baseline",
    signedDollarsPerMonth(COMMITTED_RATE),
    "· rate from here",
    signedDollarsPerMonth(rateAt(at, mutations, products)),
    "· gauge (year average)",
    signedDollarsPerMonth(average),
    "· AS DRAWN",
    signedDollarsPerMonth(drawn),
    isOffDial(average)
      ? "(CLAMPED — off the end of the dial)"
      : "(on the dial)",
    "·",
    bandOfRate(drawn),
    "·",
    againstBreakeven(drawn),
    "·",
    revenueShift(drawn - COMMITTED_RATE),
    "· any change?",
    hasAnyChange(products),
    "· peak",
    `${dollarsPerMonth(peakMonth(products, mutations).mrr)} in ${peakMonth(products, mutations).label}`,
    "· a pinned balance ceiling would need",
    abbreviateDollars(PINNED_CEILING),
    "(see PINNED_CEILING for why the chart is unpinned)",
  );
  /* eslint-enable no-console */
};

export default LicenseBoardBench;
