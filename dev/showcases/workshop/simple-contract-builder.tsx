/**
 * Simple Contract Builder bench (Peter, 2026-10-08) — Contract Builder's model
 * on the builder board every scenario builder uses: SUI `BuilderBoard`, the
 * four panels of the Hourly Board bench.
 *
 *   A  Cash flow — `CashflowScrubChart` + `createHighWaterMark` (the board
 *      kit's own pairing): the running balance from payment DATES; solid to
 *      NOW (invoiced), dashed after (signed + included estimates + the hope
 *      not yet filled).
 *   B  Running divergence — Contract Builder's `CumulativeDivergence` on the
 *      same plan, with the grow-only axis (`createAxisWaterMarks`) and a fit
 *      button.
 *   C  Changes: `UnderlineTabs` over two views. Contracts = `CompactTable`
 *      like the Contract Scheduler's Jobs list (lock, include `TruthToggle`,
 *      #/name, Type, `PendingBadge` Estimate / `CompliantBadge` Confirmed,
 *      start, est $); a Confirmed row's toggle is on and disabled — it always
 *      counts. Hopes = Contract Builder's `PeriodBars` with its `ValueHandle`
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
import { type Component, Show, createMemo, createSignal } from "solid-js";
import {
  BuilderBoard,
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
  createIcon,
  createRateGauge,
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
  ratePerWeek,
} from "./simple-contract-builder.model";
import {
  type JobType,
  MONTHS,
  type TypeId,
  cumulativeFit,
  money,
  withCount,
} from "./contract-builder-model";
import { CumulativeDivergence } from "./contract-builder-kit/cumulative";
import { PeriodBars } from "./contract-builder-kit/period-bars";

const { map } = fn;

export const meta = { label: "Simple Contract Builder" };

const ButtonIcon = createIcon({ variant: "outline", size: "sm" });
const SolidIcon = createIcon({ variant: "solid", size: "sm" });

const TYPE_NAME: Readonly<Record<TypeId, string>> = {
  O: "Exterior",
  I: "Interior",
  F: "Furniture",
};

/** A contract's value: the sum of its payments. */
const valueOf = (c: Contract): number => c.payments.reduce((a, p) => a + p.amount, 0);

/** The Hourly Board's dial, word for word: rate against breakeven, in $/wk. */
const RateDial = createRateGauge({
  baselineLabel: "Baseline",
  formatAgainst: againstBreakeven,
  formatDelta: revenueShift,
});

type Tab = "contracts" | "hopes";
const TABS = [
  { id: "contracts", label: "Contracts" },
  { id: "hopes", label: "Hopes" },
];

const DAYS = dailyCells(new Date("2026-01-01T00:00:00Z"), new Date("2026-12-31T00:00:00Z"));
const NOW_DAY = Math.round(
  (Date.parse(`${TODAY}T00:00:00Z`) - Date.UTC(2026, 0, 1)) / 86_400_000,
);

/** Running sums of a day series. */
const running = (values: readonly number[]): number[] => {
  let total = 0;
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
  const [entry, setEntry] = createSignal<{ type: TypeId; month: number } | null>(null);

  /** Replace one contract by id (UI state; the fold stays pure). */
  const edit = (id: string, change: (c: Contract) => Contract) =>
    setContracts((cs) => map((c: Contract) => (c.id === id ? change(c) : c), cs));
  /** One type's hope in one month, in whole jobs — only that month moves. */
  const setCount = (type: TypeId, month: number, count: number) => {
    const t = hopes().find((x) => x.id === type);
    if (!t || t.qty[month] === count) return;
    console.table([{ type, month: MONTHS[month], count, $: count * t.typical }]);
    setHopes((ts) => withCount({ types: ts, jobs: [] }, type, month, count).types);
  };
  const entryType = () => hopes().find((t) => t.id === entry()?.type);

  const flows = createMemo(() => dailyFlows(hopes(), contracts(), TODAY));
  /** Everything expected, actual and outlook together, as a running balance. */
  const expected = createMemo(() =>
    running(map((f: DayFlow) => f.actual + f.outlook, flows())),
  );
  const banked = createMemo(() => running(map((f: DayFlow) => f.actual, flows())));

  const cells = createMemo((): CashflowCell[] =>
    map(
      (cell, i: number) => ({
        ...cell,
        cashflowCents: Math.round((flows()[i].actual + flows()[i].outlook) * 100),
        balanceCents: Math.round(expected()[i] * 100),
      }),
      DAYS,
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
  const ceiling = createHighWaterMark(() => Math.max(0, ...map((v: number) => v * 100, expected())));

  /** The consumption fold's view of the board: hopes + the contracts that count. */
  const plan = createMemo(() => asPlan(hopes(), contracts()));
  /* Grow-only y-axis (Auto-grow | manual shrink), as on Contract Builder. */
  const divergenceAxis = createAxisWaterMarks(() => cumulativeFit(plan()));

  const panelB = (
    <>
      <SpreadRow>
        <TextTitle>How your contracts fulfil your hopes — running, all types</TextTitle>
        <IconOnlyButton
          onClick={divergenceAxis.reset}
          aria-label="Shrink y-axis to fit current values"
          title="Shrink y-axis to fit current values"
        >
          <Icon name="shrink" size="sm" />
        </IconOnlyButton>
      </SpreadRow>
      <GrowFillBox>
        <CumulativeDivergence config={plan()} today={TODAY} held={divergenceAxis.domain()} />
      </GrowFillBox>
    </>
  );

  const columns: TableColumn<Contract>[] = [
    {
      id: "lock",
      header: "",
      width: "48px",
      accessor: (c) => (
        <IconOnlyButton
          onClick={() => edit(c.id, (x) => ({ ...x, locked: !x.locked }))}
          aria-label={c.locked ? `Unlock ${c.name}` : `Lock ${c.name}`}
          title={c.locked ? "Locked. Click to unlock." : "Lock against automated changes"}
        >
          <Show when={c.locked} fallback={<ButtonIcon name="lock-open" />}>
            <SolidIcon name="lock" />
          </Show>
        </IconOnlyButton>
      ),
    },
    {
      id: "on",
      header: "",
      width: "64px",
      accessor: (c) => (
        <TruthToggle
          checked={c.status === "Confirmed" || c.use}
          disabled={c.status === "Confirmed"}
          aria-label={
            c.status === "Confirmed"
              ? `${c.name} is confirmed and always counts`
              : `Include ${c.name}`
          }
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
          <PendingBadge label="Estimate" />
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
              {`${contracts().filter((c) => c.status === "Confirmed").length} confirmed · ${contracts().filter((c) => c.status === "Estimate" && c.use).length} of ${contracts().filter((c) => c.status === "Estimate").length} estimates included · sorted by start`}
            </NoteText>
          </>
        }
      >
        <PeriodBars
          config={plan()}
          today={TODAY}
          onSetCount={(t, m, n) => setCount(t.id, m, n)}
          onEnterCount={(t, m) => setEntry({ type: t.id, month: m })}
        />
        <NoteText>
          Drag the top edge of an outline to set that month's hoped-for jobs
          (whole jobs, never below zero — only that month moves); double-click a
          bar to type it.
        </NoteText>
      </Show>
    </>
  );

  /** THE DIAL: this scenario's rate, against the board as it opened. */
  const rate = createMemo(() => ratePerWeek(hopes(), contracts(), TODAY, FIXED_WEEKLY_COST));
  const panelD = (
    <>
      <TextTitle>Rate, right now</TextTitle>
      <GrowCenterColumn>
        <RateDial
          domain={RATE_DOMAIN}
          baseline={OPENING_RATE}
          caution={COMFORTABLE}
          value={rate()}
          label="Scenario"
        />
      </GrowCenterColumn>
    </>
  );

  const panelA = (
    <>
      <SpreadRow>
        <TextTitle>Cash flow — banked to NOW, outlook after</TextTitle>
        <IconOnlyButton
          onClick={ceiling.reset}
          aria-label="Fit y-axis to current values"
          title="Fit y-axis to current values"
        >
          <Icon name="shrink" size="sm" />
        </IconOnlyButton>
      </SpreadRow>
      <GrowFillBox>
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
      </GrowFillBox>
    </>
  );

  return (
    <div class="component-section component-section--full scenario-board-frame">
      <BuilderBoard
        panelA={panelA}
        panelB={panelB}
        panelC={panelC}
        panelD={panelD}
      />
      <Show when={entry()}>
        {(e) => (
          <Modal
            open
            onClose={() => setEntry(null)}
            title={`${entryType()?.name ?? ""} · ${MONTHS[e().month]}`}
            subtitle={`Hoped-for jobs at $${(entryType()?.typical ?? 0).toLocaleString()} each`}
          >
            <ThemedNumberInput
              name="hoped-jobs"
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
