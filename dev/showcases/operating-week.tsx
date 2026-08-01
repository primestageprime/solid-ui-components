// Operating week — the same jobs, seen as a schedule and as money.
//
// WeekCalendar and WeeklyCashflowChart are the two views a marine-services
// contractor has of one job list. The calendar is where a week is BUILT: seven
// columns, an hour grid, blocks the crew reads at a glance. The chart is what
// that week is WORTH once it is aggregated with the fifteen around it — the
// same jobs, summed per week, against the costs they incur and the balance
// they leave behind.
//
// So there is one dataset here and two projections of it. Change a job and
// both views move, which is the point: a calendar demo with invented blocks
// and a chart demo with invented bars would never show that they are the same
// data.
import { type Component, createMemo, createSignal } from "solid-js";
import { WeekCalendar, type WeekCalendarBlock } from "../../src/components/WeekCalendar";
import {
  WeeklyCashflowChart,
  type WeeklyChartBar,
} from "../../src/components/CashflowChart";
import { CompactSurface } from "../../src/components/Surface";
import { SegmentedInput } from "../../src/components/SegmentedInput";
import {
  ContentStack,
  NarrowStack,
  ClusterRow,
  TightStack,
} from "../../src/components/Layout";
import {
  SubsectionTitle,
  TextSublabel,
  MutedBody,
  NoWrapSublabel,
  FadedNowrapSublabel,
} from "../../src/components/Text";
import "./operating-week.css";

// ── One job list ─────────────────────────────────────────────────────────────
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type Kind = "survey" | "tow" | "bunker" | "maintenance";

interface Job {
  week: number; // 0..15, index into the Mondays below
  day: string;
  /** WeekCalendar's dside convention: 1..8 mean PM. */
  startAt: string;
  hours: number;
  kind: Kind;
  crew: string;
  /** Billed per hour, in cents. */
  rateCents: number;
}

const CREWS = ["Renner", "Okonjo", "Vance", "Duarte"];
const KINDS: Kind[] = ["survey", "tow", "bunker", "maintenance"];
// What each kind bills per hour, and what its consumables cost per hour. Tows
// earn most and burn most; maintenance is cheap to run and cheap to sell.
const RATE_CENTS: Record<Kind, number> = {
  survey: 41_000,
  tow: 88_000,
  bunker: 62_000,
  maintenance: 29_000,
};
const CONSUMABLE_CENTS: Record<Kind, number> = {
  survey: 6_500,
  tow: 38_000,
  bunker: 21_000,
  maintenance: 9_000,
};

const WEEK_COUNT = 16;
// The week the calendar shows — far enough in that the chart has real history
// behind it and projections ahead of it.
const SHOWN_WEEK = 5;
const FIRST_MONDAY = new Date("2026-03-02T00:00:00");

const mondayOf = (week: number): Date => {
  const d = new Date(FIRST_MONDAY);
  d.setDate(d.getDate() + week * 7);
  return d;
};
const iso = (d: Date): string => d.toISOString().slice(0, 10);

// Deterministic job generation — a seeded walk, not a hand-written list, so
// sixteen weeks of uneven load exist without sixteen weeks of literals.
const JOBS: Job[] = (() => {
  let s = 19;
  const rand = () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const out: Job[] = [];
  for (let week = 0; week < WEEK_COUNT; week++) {
    // Load climbs into the summer and dips over the two-week yard period.
    const yard = week === 9 || week === 10;
    const count = yard ? 3 : 6 + Math.floor(rand() * 6);
    for (let j = 0; j < count; j++) {
      const kind = KINDS[Math.floor(rand() * KINDS.length)];
      // Starts on the hour between 07:00 and 15:00 — expressed in the
      // component's convention, where 1..8 read as PM.
      const startHour = 7 + Math.floor(rand() * 9);
      const startAt = startHour > 12 ? String(startHour - 12) : String(startHour);
      out.push({
        week,
        day: DAYS[Math.floor(rand() * (kind === "maintenance" ? 7 : 5))],
        startAt,
        hours: 1 + Math.floor(rand() * 3),
        kind,
        crew: CREWS[Math.floor(rand() * CREWS.length)],
        rateCents: RATE_CENTS[kind],
      });
    }
  }
  return out;
})();

const jobsInWeek = (week: number): Job[] => JOBS.filter((j) => j.week === week);

// ── Projection 1: the week as a schedule ─────────────────────────────────────
const blocksFor = (week: number): WeekCalendarBlock[] =>
  jobsInWeek(week).map((job, i) => ({
    day: job.day,
    startAt: job.startAt,
    durationInHrs: job.hours,
    key: `w${week}-${i}`,
  }));

// The block payload the calendar hands back to renderBlock is deliberately
// thin (day/startAt/duration/key), so the demo keeps its own lookup rather
// than smuggling domain fields through the component.
const jobByKey = new Map<string, Job>();
for (let week = 0; week < WEEK_COUNT; week++) {
  jobsInWeek(week).forEach((job, i) => jobByKey.set(`w${week}-${i}`, job));
}

// ── Projection 2: the same jobs as money ─────────────────────────────────────
// Weekly overhead the contractor carries whether or not a boat moves.
const OVERHEAD_CENTS = 9_000_00;
const RETAINER_CENTS = 900_00;
const OPENING_BALANCE_CENTS = 9_000_00;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const BARS: WeeklyChartBar[] = (() => {
  let balance = OPENING_BALANCE_CENTS;
  const out: WeeklyChartBar[] = [];
  for (let week = 0; week < WEEK_COUNT; week++) {
    const monday = mondayOf(week);
    const jobs = jobsInWeek(week);

    const jobRevenue = jobs.reduce((a, j) => a + j.hours * j.rateCents, 0);
    const consumables = jobs.reduce(
      (a, j) => a + j.hours * CONSUMABLE_CENTS[j.kind],
      0,
    );
    const revenue = jobRevenue + RETAINER_CENTS;
    const expense = consumables + OVERHEAD_CENTS;
    balance += revenue - expense;

    // One line item per kind, which is how the hover popover reads: the
    // breakdown a scheduler recognises, not one row per job.
    const byKind = (of: Kind) => jobs.filter((j) => j.kind === of);
    const revenueItems = KINDS.map((kind) => ({
      name: `${kind} (${byKind(kind).length})`,
      amount_cents: byKind(kind).reduce((a, j) => a + j.hours * j.rateCents, 0),
    })).filter((item) => item.amount_cents > 0);
    const consumableItems = KINDS.map((kind) => ({
      name: `${kind} consumables`,
      amount_cents: byKind(kind).reduce(
        (a, j) => a + j.hours * CONSUMABLE_CENTS[j.kind],
        0,
      ),
    })).filter((item) => item.amount_cents > 0);
    // These three ARE the overhead — they sum to OVERHEAD_CENTS, so the
    // popover's line items add up to the segment the reader clicked on.
    const overheadItems = [
      { name: "Moorage", amount_cents: 2_600_00 },
      { name: "Insurance", amount_cents: 1_900_00 },
      { name: "Payroll (salaried)", amount_cents: 4_500_00 },
    ];

    out.push({
      week_start: iso(monday),
      // Only the first week of each month carries a label, so the axis reads
      // as months without repeating itself sixteen times.
      month_label:
        monday.getDate() <= 7 ? `${MONTHS[monday.getMonth()]} '26` : "",
      revenue_cents: revenue,
      recurring_revenue_cents: RETAINER_CENTS,
      project_revenue_cents: jobRevenue,
      product_revenue_cents: 0,
      expense_cents: expense,
      recurring_expense_cents: OVERHEAD_CENTS,
      onetime_expense_cents: consumables,
      balance_cents: balance,
      revenue_items: [
        { name: "Retainer", amount_cents: RETAINER_CENTS },
        ...revenueItems,
      ],
      expense_items: [...overheadItems, ...consumableItems],
      recurring_expense_items: overheadItems,
      onetime_expense_items: consumableItems,
      // Everything after the shown week is a forecast, not a settled ledger.
      isProjected: week > SHOWN_WEEK,
    });
  }
  return out;
})();

// The chart annotates the week the balance first goes under, if it ever does —
// derived from the bars rather than asserted, so it can't drift out of sync
// with the numbers it points at.
const BANKRUPT = BARS.find((bar) => bar.balance_cents < 0) ?? null;

const KIND_TONE: Record<Kind, string> = {
  survey: "week-demo-block--survey",
  tow: "week-demo-block--tow",
  bunker: "week-demo-block--bunker",
  maintenance: "week-demo-block--maintenance",
};

const money = (cents: number): string =>
  `$${Math.round(cents / 100).toLocaleString()}`;

export const OperatingWeekShowcase: Component = () => {
  const [week, setWeek] = createSignal(SHOWN_WEEK);

  const weekOptions = createMemo(() =>
    BARS.map((bar, i) => ({ id: String(i), label: bar.week_start.slice(5) })),
  );

  const shownBar = createMemo(() => BARS[week()]);
  const shownJobs = createMemo(() => jobsInWeek(week()));

  // Earliest start and latest finish in the shown week, so the grid covers the
  // day the crew actually works rather than a hardcoded 9-to-5.
  const bounds = createMemo(() => {
    const jobs = shownJobs();
    if (jobs.length === 0) return { start: 8, end: 17 };
    const starts = jobs.map((j) => (Number(j.startAt) <= 8 ? Number(j.startAt) + 12 : Number(j.startAt)));
    const ends = jobs.map((j, i) => starts[i] + j.hours);
    return {
      start: Math.floor(Math.min(...starts)),
      end: Math.ceil(Math.max(...ends)),
    };
  });

  return (
    <div class="component-section component-section--full">
      <h2>Operating week — WeekCalendar and WeeklyCashflowChart</h2>
      <p class="text-meta">
        One job list, two projections. Sixteen weeks of a marine-services
        contractor's work: the calendar shows a single week as the crew sees
        it, the cashflow chart shows every week as the office sees it. Step
        through the weeks and both views follow the same jobs — a light week in
        the calendar is a short bar in the chart, and the two-week yard period
        is visible in both.
      </p>

      <ContentStack>
        <SubsectionTitle>The week being shown</SubsectionTitle>
        <TextSublabel>
          Stepping this changes the calendar below and moves the marker on the
          chart. Weeks after this one are drawn as projections.
        </TextSublabel>
        <ClusterRow>
          <SegmentedInput
            options={weekOptions()}
            value={String(week())}
            onChange={(id) => setWeek(Number(id))}
            compact
          />
          <MutedBody>
            week of {shownBar().week_start} · {shownJobs().length} jobs ·{" "}
            {money(shownBar().revenue_cents)} in,{" "}
            {money(shownBar().expense_cents)} out
          </MutedBody>
        </ClusterRow>
      </ContentStack>

      <ContentStack>
        <SubsectionTitle>WeekCalendar</SubsectionTitle>
        <TextSublabel>
          A time grid, not a scheduler: seven day columns, an hour gutter, and
          absolutely-positioned blocks whose contents the caller renders. It
          owns no notion of a job — it takes a day, a start time and a
          duration, and hands each block back to <code>renderBlock</code>. The
          hour range is derived from the week's earliest start and latest
          finish, so a quiet week doesn't render six empty hours. Times follow
          the component's convention where 1..8 read as PM.
        </TextSublabel>
        <div class="week-demo-calendar">
          <WeekCalendar
            days={DAYS}
            startHour={bounds().start}
            endHour={bounds().end}
            pxPerHour={54}
            blocks={blocksFor(week())}
            dayLabel={(day, index) => {
              const d = mondayOf(week());
              d.setDate(d.getDate() + index);
              return `${day} ${d.getDate()}`;
            }}
            renderBlock={(block) => {
              const job = jobByKey.get(block.key ?? "");
              if (!job) return null;
              return (
                <CompactSurface
                  class={`week-demo-block ${KIND_TONE[job.kind]}`}
                >
                  <TightStack>
                    <NoWrapSublabel>{job.kind}</NoWrapSublabel>
                    <FadedNowrapSublabel>
                      {`${job.crew} · ${job.hours}h`}
                    </FadedNowrapSublabel>
                  </TightStack>
                </CompactSurface>
              );
            }}
          />
        </div>
      </ContentStack>

      <ContentStack>
        <SubsectionTitle>WeeklyCashflowChart</SubsectionTitle>
        <TextSublabel>
          The same sixteen weeks as revenue and expense bars with the running
          balance drawn over them. Revenue splits into the retainer and the
          job billing; expense splits into the overhead carried whether or not
          a boat moves and the consumables each job burns — so hovering a
          segment gives the breakdown the scheduler recognises rather than a
          single number. The dotted marker is the shown week; the two short
          bars are the yard period, the same fortnight that empties the
          calendar. Because this operator is running near break-even, two idle
          weeks are enough to put the balance under, and the chart annotates
          the week it happens — derived from the bars, not asserted, so the
          label can't drift from the numbers it points at. The chart fills the
          height its box allots it; the gallery supplies the box.
        </TextSublabel>
        <div class="week-demo-chart">
          <WeeklyCashflowChart
            data={{
              bars: BARS,
              todayWeek: shownBar().week_start,
              bankruptcyWeek: BANKRUPT?.week_start ?? null,
              bankruptcyDate: BANKRUPT?.week_start ?? null,
            }}
          />
        </div>
        <NarrowStack>
          <MutedBody>
            Opening balance {money(OPENING_BALANCE_CENTS)}; closing{" "}
            {money(BARS[BARS.length - 1].balance_cents)}. Weeks after{" "}
            {BARS[SHOWN_WEEK].week_start} are projections
            {BANKRUPT ? `, and the balance crosses zero in the week of ${BANKRUPT.week_start}` : ""}.
          </MutedBody>
        </NarrowStack>
      </ContentStack>
    </div>
  );
};
