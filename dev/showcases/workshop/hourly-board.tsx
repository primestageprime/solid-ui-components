/**
 * Hourly Board bench — the WIRING, and nothing else.
 *
 * A business that sells HOURS, read four ways at once. The ARRANGEMENT moved to
 * `board-kit/BoardView.tsx`, which draws whichever board it is handed; the
 * NUMBERS moved to `hourly.config.ts`, which is this board stated as a
 * `BoardConfig` over `board-kit`. What is left here is the state the reader
 * moves and the handlers that move it.
 *
 * The regions the view composes, so the reuse stays checkable:
 *
 *   Cash Flow  — `CashflowScrubChart` + `createHighWaterMark`
 *   Work Mix   — `StackedTimelineChart` (`config.mix === "stacked"`)
 *   Changes    — `MutationToolbar` + `PairedMutationSliders` (two axes, one row)
 *   Rate gauge — `createRateGauge` with `config.sentences`
 *
 * Two of Peter's rulings of 2026-09-18 live in the CONFIG, not here, and they
 * are what every figure on this bench reads in:
 *
 *   • EVERY MONEY FIGURE IS $/WK — `unit: "wk"`. "Hourly people tend to think
 *     of it that way." There is no ×52 in any sentence; the projection
 *     integrates $/wk × weeks.
 *   • A SERVICE IS A SEGMENT OR A RAY, and its year is CHANGE EVENTS. That is
 *     `BoardEntity`'s rule now, shared with every board: what a service bills
 *     in any week is the last change at or before it, and a season is composed
 *     from changes rather than from a formula.
 */
import {
  type Component,
  batch,
  createMemo,
  createSignal,
  onMount,
} from "solid-js";
import { find, map } from "../../../src/fn";

import type { CashflowCell } from "../../../src/components/CashflowScrubChart";
import { monthlyCells } from "../../../src/components/DateAxis";
import { timeOf } from "../../../src";
import type { Mutation, TimeValue } from "../../../src";
import { ThemedInput } from "../../../src/components/Inputs";
import { ThemedNumberInput } from "../../../src/components/ThemedNumberInput";
import { ClusterRow, NarrowStack } from "../../../src/components/Layout";
import { NoteText } from "../../../src/components/Text";
import type { PairedMutationEntity } from "../../../src/components/PairedMutationSliders";
import type { GroupedMutationEntity } from "../../../src/components/GroupedMutationSliders";

import { BoardView } from "./board-kit/BoardView";
import {
  CONFIG,
  DEFAULT_WORK_CAP,
  DOMAIN_END,
  DOMAIN_START,
  EMPTY_DRAFT,
  FULL_TIME_HOURS,
  HOURS_DOMAIN,
  MIN_WORK_CAP,
  MONTHLY_NET,
  OPENING_BALANCE,
  RATE_DOMAIN_PER_HOUR,
  SEED_MUTATIONS,
  SERVICES,
  TIME_DOMAIN,
  addMutation,
  addService,
  averageRate,
  canAdd,
  COMMITTED_RATE,
  dollarsPerWeek,
  ensureMutation,
  fanAt,
  isDirty,
  momentsOf,
  monthStarts,
  quarterLabelOf,
  quarterTicks,
  rateAt,
  removeMutation,
  runningBalances,
  scenarioDigest,
  segmentLabelsOf,
  weekOfPick,
  weekRangeOf,
  weeklyOfPair,
  withChange,
  withDrop,
  withoutChange,
  workMixSeries,
  pairsForMutation,
  pairsWithoutMutation,
  projectedBalances,
  type RateSampling,
  type SegmentLabel,
  type Service,
  type ServiceDraft,
} from "./hourly.config";
import { formatHours } from "./hourly-board-money";

export const meta = { label: "Hourly Board" };

// ── Constants the layout needs ──────────────────────────────────────────────

/** The chart's months, as cells. One per month across the span. */
const CELLS = monthlyCells(DOMAIN_START, DOMAIN_END);

/** The COMMITTED balance — what the fixture's flows have already produced. */
const COMMITTED = runningBalances(MONTHLY_NET, OPENING_BALANCE);

/** The chart's cell edges, as numbers. Agrees with `CELLS` by construction. */
const BOUNDARIES = monthStarts(DOMAIN_START, COMMITTED.length);

/** The change the board opens on: the first seeded one, so the as-of chips
 *  show from the first frame and the dials read a real step. */
const OPENING_SELECTION: string | null = SEED_MUTATIONS[0]?.id ?? null;

/** The Work Mix x-axis's four ticks, and the vocabulary they read in. */
const QUARTER_TICKS = quarterTicks();

/** The plot inset. Wide enough on the left for `$/hr`-free hour labels. */
const WORK_MIX_MARGIN = { top: 20, right: 16, bottom: 28, left: 34 } as const;

/** The as-of chips: one per change, labelled by WEEK. */
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
 * WEEKS — the same argument `averageRate` makes for the gauge, made for the
 * line beside it. `momentsOf` samples EVERY week rather than only the flags, so
 * each stretch of the history carries its own slope instead of the year's mean.
 */
const samplingFor = (
  mutations: readonly Mutation[],
  services: readonly Service[],
): RateSampling => ({
  boundaries: BOUNDARIES,
  rate: (time: number) => rateAt(time, mutations, services),
  moments: momentsOf(mutations),
  unit: "week",
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

/**
 * The summary under each pair of dials: what that service bills in the WEEK
 * being edited — `$3k/wk` is twenty hours at $150, with no year in it.
 *
 * It takes the WIDE entity (measures as a readonly list) because that is the
 * shape `BoardView` asks for — see `BoardViewProps.summary` — and narrows to
 * this board's pair itself. A dropped service has no hours and says nothing.
 */
const summaryOf = (entity: GroupedMutationEntity): string =>
  entity.measures[0]?.value === null || entity.measures[0] === undefined
    ? ""
    : dollarsPerWeek(weeklyOfPair(entity as PairedMutationEntity));

// ── The Add form ────────────────────────────────────────────────────────────

/**
 * The body of the Add modal.
 *
 * A COMPONENT rather than a block of JSX inside the board because of the focus:
 * `Modal` has no initial-focus mechanism of its own and its children are created
 * lazily inside its `Show`, so an `onMount` in here fires on every OPEN — which
 * is exactly when the name field wants the caret.
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

// ── The board ───────────────────────────────────────────────────────────────

const HourlyBoardBench: Component = () => {
  const [services, setServices] = createSignal<readonly Service[]>(SERVICES);
  const [mutations, setMutations] =
    createSignal<readonly Mutation[]>(SEED_MUTATIONS);
  /** WHICH CHANGE THE DIALS ARE EDITING, or `null` when there is none. */
  const [editing, setEditing] = createSignal<string | null>(OPENING_SELECTION);
  /** The y-axis cap, in hours a week. Peter's "settings", in the card header. */
  const [cap, setCap] = createSignal(DEFAULT_WORK_CAP);
  const [adding, setAdding] = createSignal(false);
  const [draft, setDraft] = createSignal<ServiceDraft>(EMPTY_DRAFT);
  /** The digest of whatever was last saved. The board opens clean. */
  const [saved, setSaved] = createSignal(
    scenarioDigest(SERVICES, SEED_MUTATIONS),
  );

  /** THE GAUGE'S READING: the whole year, averaged. */
  const rate = () => averageRate(TIME_DOMAIN, mutations(), services());

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

  const cells = createMemo(() =>
    balanceCells(samplingFor(mutations(), services()), nowIndex()),
  );

  /**
   * THE FIRST INTERACTION MAKES ITS OWN CHANGE. Dragging a dial with nothing
   * selected would otherwise be a no-op, which makes the opening state a place
   * the reader can get stuck. `batch`, because the change list and the
   * selection describe ONE scenario and a render between the two writes would
   * draw a board disagreeing with itself.
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

  /** A CLICK ON THE WORK MIX PLOT proposes a change in that WEEK, or selects
   *  the one already there. `addMutation` does both and says which, so there is
   *  no branch here on whether anything was added. */
  const pickWeek = (at: Date): void => {
    const next = addMutation(mutations(), weekOfPick(at));
    batch(() => {
      setMutations(next.mutations);
      setEditing(next.selected);
    });
  };

  /** A drag edits the selected change — making one first if there is none. The
   *  measure INDEX is what stops an hours figure being written into a rate. */
  const setMeasure = (id: string, measure: number, value: number): void => {
    const at = editingOrFirst();
    if (at === null) return;
    setServices((current) =>
      withChange(current, id, at, measure as 0 | 1, value, mutations()),
    );
  };

  /** ⊗ Drop: this service is off the books from the selected change onward. */
  const drop = (id: string): void => {
    const at = editingOrFirst();
    if (at === null) return;
    setServices((current) => withDrop(current, id, at));
  };

  /** ↺ Reinstate: drop the change entirely rather than invent an offer. It
   *  needs no guard — it is only ever drawn for something already dropped. */
  const reinstate = (id: string): void => {
    const at = editing();
    if (at === null) return;
    setServices((current) => withoutChange(current, id, at));
  };

  /** The `+` opens the form; nothing changes until Add is pressed. The draft is
   *  RESET on open rather than on close, so a cancelled form cannot leave a
   *  half-typed name inside the next one. */
  const openAdd = (): void => {
    editingOrFirst();
    setDraft(EMPTY_DRAFT);
    setAdding(true);
  };

  /** Confirm. The guard is not redundant beside the disabled button: Enter in
   *  the name field reaches here too. */
  const confirmAdd = (): void => {
    const current = draft();
    const at = editing();
    if (at === null || !canAdd(current)) return;
    setServices(
      (existing) => addService(existing, current, at, mutations()).services,
    );
    setAdding(false);
  };

  /** DELETE THE SELECTED CHANGE, and everything that only existed because of
   *  it. One pure function the test pins, one `batch` so the three signals
   *  move together. */
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
      setEditing(OPENING_SELECTION);
      setCap(DEFAULT_WORK_CAP);
      setSaved(scenarioDigest(SERVICES, SEED_MUTATIONS));
    });
  };

  /** SAVE. On a bench there is nothing to save TO, so it marks the board clean
   *  — the honest bench behaviour. The button disables itself until something
   *  has moved. */
  const save = (): void => {
    setSaved(scenarioDigest(services(), mutations()));
  };

  return (
    <BoardView
      config={CONFIG}
      entities={pairs()}
      summary={summaryOf}
      labels={{ remove: "Drop", restore: "Reinstate", new: "new service" }}
      cashflowTitle="Cash Flow"
      mixTitle="Work Mix"
      gaugeTitle="Rate, right now"
      cashflow={{
        cells: cells(),
        fanOf: fanAt,
        nowIndex: nowIndex(),
        lineLabel: "Committed",
      }}
      mixSeries={workMixSeries(services(), mutations())}
      mix={{
        yDomain: [0, cap()],
        xTickValues: QUARTER_TICKS,
        xTickFormat: quarterLabelOf,
        yTickFormat: formatHours,
        rule: { value: FULL_TIME_HOURS, label: "full-time" },
        hoverLabel: (at: number) => weekRangeOf(at).label,
        margin: WORK_MIX_MARGIN,
        // The cap lives in the card's HEADER rather than in a settings strip of
        // its own: it is one number, it belongs to this chart alone, and a row
        // of its own would cost the two charts the height that makes them
        // readable. `min` is the full-time rule — a cap below it would put the
        // rule off the plot.
        header: () => (
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
        ),
      }}
      changes={chipsOf(mutations())}
      selected={editing()}
      mutations={mutations()}
      emptyNote="Click a week, or move a dial, to propose a change — it holds until the next one."
      baseline={COMMITTED_RATE}
      value={rate()}
      onSelect={setEditing}
      onMeasure={setMeasure}
      onRemove={drop}
      onRestore={reinstate}
      onAdd={openAdd}
      onReset={reset}
      onSave={save}
      saveDisabled={!isDirty(services(), mutations(), saved())}
      onDelete={deleteChange}
      onPick={pickWeek}
      form={{
        open: adding(),
        title: "Add a service",
        subtitle:
          "It starts at the change being edited, on the figures you give it.",
        confirmLabel: "Add",
        canConfirm: canAdd(draft()),
        onConfirm: confirmAdd,
        onClose: () => setAdding(false),
        body: () => (
          <ServiceForm
            draft={draft()}
            onDraft={setDraft}
            onSubmit={confirmAdd}
          />
        ),
      }}
    />
  );
};

export default HourlyBoardBench;
