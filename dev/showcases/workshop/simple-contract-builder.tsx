/**
 * Simple Contract Builder bench (Peter, 2026-10-08) — Contract Builder's model
 * on the builder board every scenario builder uses: SUI `BuilderBoard`, the
 * four panels of the Hourly Board bench.
 *
 *   A  Cash flow — `CashflowScrubChart` + `createHighWaterMark` (the board
 *      kit's own pairing): the running balance from payment DATES, from an
 *      opening balance, less the fixed weekly cost paid every day (the Hourly
 *      Board's cost model); solid to NOW (invoiced), dashed after (signed +
 *      included contracts + the hope not yet filled).
 *   B  Running divergence — Contract Builder's `CumulativeDivergence` on the
 *      same plan, with the grow-only axis (`createAxisWaterMarks`) and a fit
 *      button.
 *   C  Changes: `UnderlineTabs` over two views. Contracts = `CompactTable`
 *      like the Contract Scheduler's Jobs list (lock, include `TruthToggle`,
 *      #/name, Type, `PendingBadge` Planned / `CompliantBadge` Confirmed,
 *      start, est $); every row's toggle works, Confirmed included. Hopes = Contract Builder's `PeriodBars` with its `ValueHandle`
 *      grips; double-click opens `Modal` + `ThemedNumberInput`.
 *   D  The Hourly Board's dial, unchanged in meaning (a constant across
 *      builders): "Rate, right now" — the year's expected revenue per week less
 *      the fixed weekly cost, against breakeven; the dashed needle is the board
 *      as it opened. Its words are the Hourly Board's own (`againstBreakeven`,
 *      `revenueShift`) and so is its comfortable threshold.
 *
 * Every number comes from `simple-contract-builder.model.ts` on top of
 * `contract-builder-model.ts`; the data is `simple-contract-builder.fixtures.ts`.
 */
import {
  type Component,
  Show,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
} from "solid-js";
import { observeSize } from "../../../src/internal/dom/observeSize";
import {
  AnchorFillBox,
  BuilderBoard,
  ContentChartFrame,
  CurrencyInput,
  FillChartFrame,
  DatePicker,
  GhostButton,
  PrimaryButton,
  TightStack,
  ClusterRow,
  CompactTable,
  CompliantBadge,
  Modal,
  NoteText,
  PendingBadge,
  type TableColumn,
  TextSublabel,
  ThemedNumberInput,
  TruthToggle,
  UnderlineTabs,
  GrowCenterColumn,
  SegmentedInput,
  createIcon,
  type BuilderBoardPanelBox,
  calloutModeFor,
  createRateGauge,
  rateGaugeCalloutLabels,
  CashflowScrubChart,
  type CashflowCell,
  GrowFillBox,
  Icon,
  IconOnlyButton,
  SpreadRow,
  TextTitle,
  createAxisWaterMarks,
  createHighWaterMark,
  dailyCells,
  fn,
} from "../../../src";
import {
  CONTRACTS,
  FIXED_WEEKLY_COST,
  OPENING_BALANCE,
  RATE_DOMAIN,
  TODAY,
  TYPES,
} from "./simple-contract-builder.fixtures";
import { againstBreakeven, revenueShift } from "./hourly-board-money";
import { COMFORTABLE } from "./hourly.config";
import {
  type Contract,
  type DayFlow,
  asPlan,
  dailyFlows,
  type ContractEdit,
  applyEdit,
  ratePerWeek,
  valueOf,
} from "./simple-contract-builder.model";
import {
  type JobType,
  monthLabel,
  type TypeId,
  cumulativeFit,
  money,
  tallest,
  withCount,
} from "./contract-builder-model";
import { CumulativeDivergence } from "./contract-builder-kit/cumulative";
import { PeriodBars } from "./contract-builder-kit/period-bars";

const { map } = fn;

export const meta = { label: "Simple Contract Builder" };

const ButtonIcon = createIcon({ variant: "outline", size: "sm" });

const TYPE_NAME: Readonly<Record<TypeId, string>> = {
  O: "Exterior",
  I: "Interior",
  F: "Furniture",
};

/** The Edit form's status choice. */
const STATUSES = [
  { id: "Confirmed", label: "Confirmed" },
  { id: "Planned", label: "Planned" },
];

/** The Hourly Board's dial, word for word: rate against breakeven, in $/wk. */
const DIAL_WORDING = {
  baselineLabel: "Baseline",
  formatAgainst: againstBreakeven,
  formatDelta: revenueShift,
};
/* One gauge of each layout (the gauge never picks its own): the LAYOUT picks,
   from D's measured box, with `calloutModeFor` (COMPONENTS.md, RateGauge). */
const LeaderDial = createRateGauge(DIAL_WORDING);
const CornerDial = createRateGauge({ ...DIAL_WORDING, callouts: "corners" });

/** How far past NOW the Hopes bars look — thorcasting's topnav options, its
 *  control (`SegmentedInput`). The hopes run to Dec 2027, so 1y reaches April
 *  2027; 2y is left out because NOW + 2y would run past the data. */
const HORIZONS = [
  { id: "91", label: "3m" },
  { id: "182", label: "6m" },
  { id: "365", label: "1y" },
];

type Tab = "contracts" | "hopes";
const TABS = [
  { id: "contracts", label: "Contracts" },
  { id: "hopes", label: "Projections" },
];

const DAYS = dailyCells(new Date("2026-01-01T00:00:00Z"), new Date("2027-12-31T00:00:00Z"));
const NOW_DAY = Math.round(
  (Date.parse(`${TODAY}T00:00:00Z`) - Date.UTC(2026, 0, 1)) / 86_400_000,
);

/** The fixed cost, paid every day of the week (the Hourly Board's cost model). */
const DAILY_COST = FIXED_WEEKLY_COST / 7;

/** Running sums of a day series, from the opening balance. */
const running = (values: readonly number[]): number[] => {
  let total = OPENING_BALANCE;
  return map((v: number) => {
    total += v;
    return total;
  }, values);
};

/** The baseline needle: the board's rate as it opened (the Hourly Board's committed rate). */
const OPENING_RATE = ratePerWeek(TYPES, CONTRACTS, TODAY, FIXED_WEEKLY_COST);

const SimpleContractBuilder: Component = () => {
  const [hopes, setHopes] = createSignal<readonly JobType[]>(TYPES);
  const [contracts, setContracts] = createSignal<readonly Contract[]>(CONTRACTS);
  const [tab, setTab] = createSignal<Tab>("contracts");
  const [horizon, setHorizon] = createSignal("365");
  /** A and B draw the whole year; the horizon scopes ONLY the Hopes bars. */
  const endDay = () => DAYS.length - 1;
  /** The Hopes bars' last day: NOW + the horizon, capped at the data's year end. */
  const hopesEndDay = () => Math.min(DAYS.length - 1, NOW_DAY + Number(horizon()));
  /** The last month drawn, for the month-axis charts. */
  const lastMonth = () => {
    const at = DAYS[hopesEndDay()].start;
    return (at.getUTCFullYear() - 2026) * 12 + at.getUTCMonth();
  };
  const [entry, setEntry] = createSignal<{ type: TypeId; month: number } | null>(null);

  /** Replace one contract by id (UI state; the fold stays pure). */
  const edit = (id: string, change: (c: Contract) => Contract) =>
    setContracts((cs) => map((c: Contract) => (c.id === id ? change(c) : c), cs));
  /** One type's hope in one month, in whole jobs — only that month moves. */
  const setCount = (type: TypeId, month: number, count: number) => {
    const t = hopes().find((x) => x.id === type);
    if (!t || t.qty[month] === count) return;
    console.table([{ type, month: monthLabel(month), count, $: count * t.typical }]);
    setHopes((ts) => withCount({ types: ts, jobs: [] }, type, month, count).types);
  };
  /* THE EDIT FORM — a draft, applied only on Save. */
  const [editing, setEditing] = createSignal<Contract | null>(null);
  const [draft, setDraft] = createSignal<ContractEdit | null>(null);
  const openEdit = (c: Contract) => {
    setEditing(c);
    setDraft({ locked: c.locked, start: c.start, status: c.status, est: valueOf(c) });
  };
  const closeEdit = () => {
    setEditing(null);
    setDraft(null);
  };
  const saveEdit = () => {
    const c = editing();
    const d = draft();
    if (c && d) edit(c.id, (x) => applyEdit(x, d, TODAY));
    closeEdit();
  };
  const patch = (change: Partial<ContractEdit>) =>
    setDraft((d) => (d ? { ...d, ...change } : d));

  const entryType = () => hopes().find((t) => t.id === entry()?.type);

  const flows = createMemo(() => dailyFlows(hopes(), contracts(), TODAY));
  /** Everything expected, actual and outlook together, less the fixed cost, as a running balance. */
  const expected = createMemo(() =>
    running(map((f: DayFlow) => f.actual + f.outlook - DAILY_COST, flows())),
  );
  /** What is actually in the bank: invoiced money less the cost paid. */
  const banked = createMemo(() => running(map((f: DayFlow) => f.actual - DAILY_COST, flows())));

  const cells = createMemo((): CashflowCell[] =>
    map(
      (cell, i: number) => ({
        ...cell,
        cashflowCents: Math.round((flows()[i].actual + flows()[i].outlook - DAILY_COST) * 100),
        balanceCents: Math.round(expected()[i] * 100),
      }),
      DAYS.slice(0, endDay() + 1),
    ),
  );
  /* The SOLID line: money actually banked, up to NOW, and no further — the
     primary line skips any cell past the end of `balanceLineCells`, so a
     shorter list is how it stops at NOW (a NaN balance would throw). */
  const bankedLine = createMemo((): CashflowCell[] =>
    map(
      (cell: CashflowCell, i: number) => ({
        ...cell,
        balanceCents: Math.round(banked()[i] * 100),
      }),
      cells().slice(0, NOW_DAY + 1),
    ),
  );
  const ceiling = createHighWaterMark(() =>
    Math.max(0, ...map((v: number) => v * 100, expected().slice(0, endDay() + 1))),
  );

  /** The consumption fold's view of the board: hopes + the contracts that count. */
  const plan = createMemo(() => asPlan(hopes(), contracts()));
  /* Grow-only y-axis (Auto-grow | manual shrink), as on Contract Builder. */
  const divergenceAxis = createAxisWaterMarks(() =>
    cumulativeFit(plan(), Number.POSITIVE_INFINITY, TODAY),
  );
  /* The Hopes bars hold their y-axis too (grow at once, shrink on the fit button). */
  const barsAxis = createAxisWaterMarks(() => ({ min: 0, max: tallest(plan()) }));

  /* B fills its panel at the size the panel actually is: measured (SUI's
     loop-safe `observeSize`), not a fixed aspect that grows taller with the
     window and spills out of the card on a wide screen. */
  const [bSize, setBSize] = createSignal<{ width: number; height: number } | null>(null);
  const measureB = (el: HTMLDivElement) => {
    onMount(() => {
      const box = el.getBoundingClientRect();
      if (box.width > 0 && box.height > 0) setBSize({ width: box.width, height: box.height });
      onCleanup(observeSize(el, (s) => s.width > 0 && s.height > 0 && setBSize(s)));
    });
  };
  /* The Projections chart is drawn 1:1 at its measured width (its tooltip
     positions in chart units, so it must not be viewBox-scaled). */
  const [hopesBox, setHopesBox] = createSignal<{ width: number; height: number } | null>(null);
  /* In fullscreen the chart takes the viewport's height; in its card it keeps
     its stated height (a content-height frame has no height to fill). The
     frame's fullscreen is controlled so the bench knows which. */
  const [hopesFull, setHopesFull] = createSignal(false);
  const measureHopes = (el: HTMLDivElement) => {
    onMount(() => {
      const box = el.getBoundingClientRect();
      if (box.width > 0) setHopesBox({ width: box.width, height: box.height });
      onCleanup(observeSize(el, (s) => s.width > 0 && setHopesBox(s)));
    });
  };

  const panelB = (
    <FillChartFrame
      title="How your contracts fulfil your projections — running, all types"
      yTitle="Booked − projection, cumulative ($)"
      actions={
        <IconOnlyButton
          onClick={divergenceAxis.reset}
          aria-label="Shrink y-axis to fit current values"
          title="Shrink y-axis to fit current values"
        >
          <Icon name="shrink" size="sm" />
        </IconOnlyButton>
      }
    >
      <AnchorFillBox ref={measureB}>
        <Show when={bSize()}>
          {(size) => (
            <CumulativeDivergence
              config={plan()}
              today={TODAY}
              held={divergenceAxis.domain()}
              size={size()}
            />
          )}
        </Show>
      </AnchorFillBox>
    </FillChartFrame>
  );

  const columns: TableColumn<Contract>[] = [
    {
      id: "edit",
      header: "",
      width: "48px",
      accessor: (c) => (
        <IconOnlyButton
          onClick={() => openEdit(c)}
          aria-label={`Edit ${c.name}`}
          title={c.locked ? `Edit ${c.name} (locked)` : `Edit ${c.name}`}
        >
          <ButtonIcon name="edit" />
        </IconOnlyButton>
      ),
    },
    {
      id: "on",
      header: "",
      width: "64px",
      accessor: (c) => (
        <TruthToggle
          checked={c.use}
          aria-label={`Include ${c.name}`}
          onCheckedChange={(on) => edit(c.id, (x) => ({ ...x, use: on }))}
        />
      ),
    },
    {
      id: "job",
      header: "Contract",
      accessor: (c) => (
        <ClusterRow>
          <TextSublabel>{`#${c.id}`}</TextSublabel>
          {c.name}
        </ClusterRow>
      ),
    },
    { id: "type", header: "Type", accessor: (c) => TYPE_NAME[c.type] },
    {
      id: "status",
      header: "Status",
      accessor: (c) =>
        c.status === "Confirmed" ? (
          <CompliantBadge label="Confirmed" />
        ) : (
          <PendingBadge label="Planned" />
        ),
    },
    { id: "start", header: "Start", accessor: (c) => c.start },
    { id: "est", header: "Est", align: "right", accessor: (c) => money(valueOf(c)) },
  ];
  const sorted = createMemo(() =>
    [...contracts()].sort((a, b) => a.start.localeCompare(b.start)),
  );

  const panelC = (
    <>
      <UnderlineTabs tabs={TABS} activeTab={tab()} onTabChange={(id) => setTab(id as Tab)} />
      <Show
        when={tab() === "hopes"}
        fallback={
          <>
            <CompactTable data={sorted()} columns={columns} hoverable />
            <NoteText>
              {`${contracts().filter((c) => c.use).length} of ${contracts().length} included · ${contracts().filter((c) => c.status === "Confirmed").length} confirmed, ${contracts().filter((c) => c.status === "Planned").length} planned · sorted by start. The scenario takes, per type per month, the larger of the projection and what is committed — so work switched on INSIDE a month's projection moves no money; only work beyond it does. Past months are banked money only.`}
            </NoteText>
          </>
        }
      >
        <ContentChartFrame
          title="Projections, month by month"
          yTitle="Revenue ($)"
          fullscreen={hopesFull()}
          onFullscreenChange={setHopesFull}
          actions={
            <ClusterRow>
              <SegmentedInput options={HORIZONS} value={horizon()} onChange={setHorizon} />
              <IconOnlyButton
                onClick={barsAxis.reset}
                aria-label="Shrink y-axis to fit current values"
                title="Shrink y-axis to fit current values"
              >
                <Icon name="shrink" size="sm" />
              </IconOnlyButton>
            </ClusterRow>
          }
        >
          <AnchorFillBox ref={measureHopes}>
            <PeriodBars
              config={plan()}
              lastMonth={lastMonth()}
              width={hopesBox()?.width}
              height={hopesFull() && (hopesBox()?.height ?? 0) > 0 ? hopesBox()?.height : undefined}
              tooltip
              ceiling={barsAxis.domain()?.[1]}
              today={TODAY}
              onSetCount={(t, m, n) => setCount(t.id, m, n)}
              onEnterCount={(t, m) => setEntry({ type: t.id, month: m })}
            />
          </AnchorFillBox>
        </ContentChartFrame>
        <NoteText>
          Inside an outline: solid = invoiced, translucent = a Confirmed
          contract not yet invoiced, lighter = a Planned one (it fills the projection
          last). The 3m / 6m / 1y control scopes only these bars. Drag the top edge of
          an outline to set that month's projected jobs
          (whole jobs, never below zero — only that month moves); double-click a
          bar to type it.
        </NoteText>
      </Show>
    </>
  );

  /** THE DIAL: this scenario's rate, against the board as it opened. */
  const rate = createMemo(() => ratePerWeek(hopes(), contracts(), TODAY, FIXED_WEEKLY_COST));
  const dial = () => ({
    domain: RATE_DOMAIN,
    baseline: OPENING_RATE,
    caution: COMFORTABLE,
    value: rate(),
    label: "Scenario",
  });
  /* D is a render function: BuilderBoard hands it the card's measured box, and
     the texts the leaders would draw decide whether they fit. */
  const panelD = (box: () => BuilderBoardPanelBox) => (
    <>
      <TextTitle>Rate, right now</TextTitle>
      <GrowCenterColumn>
        <Show
          when={calloutModeFor(box(), rateGaugeCalloutLabels({ ...dial(), ...DIAL_WORDING })) === "leaders"}
          fallback={<CornerDial {...dial()} />}
        >
          <LeaderDial {...dial()} />
        </Show>
      </GrowCenterColumn>
    </>
  );

  const panelA = (
    <FillChartFrame
      title="Cash flow — banked to NOW, outlook after"
      yTitle="Balance ($)"
      actions={
        <IconOnlyButton
          onClick={ceiling.reset}
          aria-label="Fit y-axis to current values"
          title="Fit y-axis to current values"
        >
          <Icon name="shrink" size="sm" />
        </IconOnlyButton>
      }
    >
      <AnchorFillBox>
        <CashflowScrubChart
          cells={cells()}
          balanceLineCells={bankedLine()}
          yMax={ceiling.ceiling()}
          scrub={false}
          chartHeight="fill"
          showGridlines
          today={new Date(`${TODAY}T00:00:00Z`)}
          lineLabel="Banked"
          balanceSeries={[
            {
              id: "outlook",
              label: "Outlook",
              class: "scenario-board-demo__fan",
              layer: "over",
              balanceCents: (_cell, i) =>
                i >= NOW_DAY ? Math.round(expected()[i] * 100) : null,
            },
          ]}
        />
      </AnchorFillBox>
    </FillChartFrame>
  );

  return (
    <div class="component-section component-section--full scenario-board-frame">
      <BuilderBoard
        panelA={panelA}
        panelB={panelB}
        panelC={panelC}
        panelD={panelD}
      />
      <Show when={editing()}>
        {(c) => (
          <Modal open onClose={closeEdit} title={`Edit ${c().name}`} subtitle={`#${c().id} · ${TYPE_NAME[c().type]}`}>
            <TightStack>
              <TruthToggle
                label="Locked"
                checked={draft()?.locked ?? false}
                onCheckedChange={(on) => patch({ locked: on })}
              />
              <TextSublabel>Start date</TextSublabel>
              <DatePicker value={draft()?.start ?? ""} onChange={(iso) => iso && patch({ start: iso })} />
              <TextSublabel>Status</TextSublabel>
              <SegmentedInput
                options={STATUSES}
                value={draft()?.status ?? "Planned"}
                onChange={(id) => patch({ status: id as ContractEdit["status"] })}
              />
              <CurrencyInput
                name="est"
                label="Est"
                min={0}
                step={100}
                value={() => draft()?.est}
                onChange={(v) => {
                  if (v !== undefined) patch({ est: Math.max(0, v) });
                }}
              />
              <NoteText>
                A new start moves every payment by the same number of days; a
                new est scales every payment, keeping each one's share.
              </NoteText>
              <ClusterRow>
                <PrimaryButton onClick={saveEdit}>Save</PrimaryButton>
                <GhostButton onClick={closeEdit}>Cancel</GhostButton>
              </ClusterRow>
            </TightStack>
          </Modal>
        )}
      </Show>
      <Show when={entry()}>
        {(e) => (
          <Modal
            open
            onClose={() => setEntry(null)}
            title={`${entryType()?.name ?? ""} · ${monthLabel(e().month)}`}
            subtitle={`Projected jobs at $${(entryType()?.typical ?? 0).toLocaleString()} each`}
          >
            <ThemedNumberInput
              name="projected-jobs"
              label="Jobs"
              min={0}
              step={1}
              value={() => entryType()?.qty[e().month]}
              onChange={(v) => {
                if (v !== undefined) setCount(e().type, e().month, Math.max(0, Math.round(v)));
              }}
            />
          </Modal>
        )}
      </Show>
    </div>
  );
};

export default SimpleContractBuilder;
