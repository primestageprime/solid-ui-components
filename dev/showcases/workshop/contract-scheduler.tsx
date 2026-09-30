/**
 * Contract Scheduler bench — Peter's contract-job sketches of 2026-09-29,
 * composed. The working prototype of ADR 0028 and its addendum
 * (thorcasting-qbo `docs/adr/0028-…`), and the REFERENCE COMPOSITION for
 * `docs/handoffs/thorcasting-contract-scheduler.md`.
 *
 * A roofer's season: a job LIST that opens into one job's DIALS, and a
 * TIMELINE of phased bars (solid = work, hashed = waiting for a crew) that
 * reflows in FULL AUTO or holds still in MANUAL, around LOCKED jobs.
 *
 * Every component comes through the package barrel (`../../../src`), as a
 * client would import it. Component per region:
 *
 *   Work calendar — `PopoverTooltip` (tap-open, stays open while toggling)
 *                   over a `SmallGhostButton` "4 holidays ▾", holding a
 *                   `CompactTable`: day, date, `TruthToggle` "off" per row
 *                   (weekends + each holiday)
 *   Timeline      — `ContentChartFrame` (sized to the packed rows) with a
 *                   `ModeSplitButton` in a `ButtonGroup` in its actions (Full
 *                   auto / Manual; the manual face is "Flow once", the auto face
 *                   disabled), holding `JobTimeline`
 *                   (`contract-scheduler-kit/timeline.tsx`): `Chart` (time x) +
 *                   `XAxis` + `HatchPattern` + `SpanLanes` with
 *                   `createSpanEndLabels` / `createSpanBadge` / `createSpanRing`,
 *                   `ReferenceLine` drag guides, `ChartTooltip`
 *   Job list      — `CompactTable` (`onRowHover` + `highlighted` = the
 *                   cross-highlight with the timeline), `TruthToggle`,
 *                   `IconOnlyButton` + `Icon lock` / `lock-open`, `TextButton`,
 *                   `DoingBadge` / `TodoBadge` / `PendingBadge`
 *   Job detail    — `SmallGhostButton` back, `GroupedMutationSliders` (one
 *                   entity, `showNames={false}`, a `createFormulaCaption` under
 *                   each hours dial: `× $95 = $1,330`), `SmallGhostButton` per
 *                   line opening a `createRangeDialog` range editor
 *
 * BENCH-LOCAL, on purpose (Peter did not approve extracting them): the DRAG
 * (shifted data + `onSpanPointerDown`) and the GLIDE (a FLIP over SpanLanes'
 * `[data-span-id]` groups), both in `contract-scheduler-kit/timeline.tsx`.
 *
 * DEVIATION FROM THE SKETCH, on purpose: a dial's min/max are edited from a
 * small range button under the dials, not by clicking the dial's ends —
 * clickable ends are a change to the published `MarkedSlider` (Peter agreed
 * 2026-09-29 that on-dial resizing is too complex).
 *
 * Every number is a pure function in `contract-scheduler-model.ts`, pinned by
 * `contract-scheduler-model.test.ts` (the ADR's four laws among them).
 */
import { type Component, For, Show, createMemo, createSignal } from "solid-js";
import { Dynamic } from "solid-js/web";

import {
  ButtonGroup,
  CardSurface,
  ClusterRow,
  CompactTable,
  ContentChartFrame,
  ContentStack,
  DoingBadge,
  type GroupedMeasureAxes,
  type GroupedMutationEntity,
  GroupedMutationSliders,
  IconOnlyButton,
  type ModeInfo,
  ModeSplitButton,
  MutedBody,
  NoteText,
  PendingBadge,
  PopoverTooltip,
  SectionTitle,
  SmallGhostButton,
  SpreadRow,
  SteadyMonoValue,
  type TableColumn,
  TextButton,
  TextSublabel,
  TextTitle,
  TightStack,
  TodoBadge,
  TruthToggle,
  WrapRow,
  createFormulaCaption,
  createIcon,
  createRangeDialog,
  modeInfo,
} from "../../../src";

import {
  DEFAULT_ROLES,
  type Job,
  type JobSchedule,
  type Line,
  type Mode,
  type SchedulerState,
  type WorkCalendar,
  dragTo,
  endOf,
  estimate,
  flowOnce,
  isoOf,
  overFlags,
  phasesOf,
  sampleJobs,
  schedule,
  setBound,
  setMode,
  setValue,
  startOf,
  toggleLock,
  toggleOn,
  workdays,
} from "./contract-scheduler-model";
import {
  type JobSegment,
  type JobSpan,
  JobTimeline,
  type Tone,
} from "./contract-scheduler-kit/timeline";

export const meta = { label: "Contract Scheduler" };

const FROM = "2026-10-01";
const TO = "2026-12-31";
const ROLES = DEFAULT_ROLES;

const HOLIDAYS: readonly { readonly iso: string; readonly label: string }[] = [
  { iso: "2026-11-26", label: "Thanksgiving" },
  { iso: "2026-11-27", label: "Day after" },
  { iso: "2026-12-24", label: "Christmas Eve" },
  { iso: "2026-12-25", label: "Christmas" },
];

/** One row of the work-calendar dropdown: the weekends, or a holiday by its ISO date. */
interface DayOff {
  readonly id: string;
  readonly label: string;
  readonly date: string;
}
const WEEKENDS = "weekends";

const DAY = 86_400_000;
const msOf = (iso: string): number => Date.parse(`${iso}T00:00:00Z`);
/** The calendar window in epoch ms: FROM's midnight to the day after TO. */
const WINDOW: readonly [number, number] = [msOf(FROM), msOf(TO) + DAY];
const TICKS: readonly number[] = [
  "2026-10-01",
  "2026-10-15",
  "2026-11-01",
  "2026-11-15",
  "2026-12-01",
  "2026-12-15",
].map(msOf);

const ButtonIcon = createIcon({ variant: "outline", size: "sm" });
const SolidIcon = createIcon({ variant: "solid", size: "sm" });

const TONE: Readonly<Record<Job["status"], Tone>> = {
  DOING: "doing",
  TODO: "todo",
  PENDING: "pending",
};
const STATUS_BADGE = {
  DOING: DoingBadge,
  TODO: TodoBadge,
  PENDING: PendingBadge,
} as const satisfies Readonly<Record<Job["status"], unknown>>;
const StatusOf: Component<{ status: Job["status"] }> = (p) => (
  <Dynamic component={STATUS_BADGE[p.status]} label={p.status} />
);

const MODES: readonly ModeInfo<Mode>[] = [
  {
    mode: "auto",
    label: "Full auto — unlocked jobs reflow by order",
    icon: "arrows-up-down",
    action: "Unlocked jobs flow automatically",
    disabled: true,
  },
  {
    mode: "manual",
    label: "Manual — drag sets exact dates",
    icon: "fit",
    action: "Flow once: pack unlocked jobs, keeping their order",
    disabled: false,
  },
];

const k = (n: number): string =>
  n >= 1000
    ? `$${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`
    : `$${Math.round(n)}`;
const money = (n: number): string =>
  `$${Math.round(n).toLocaleString("en-US")}`;
const short = (iso: string): string =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
const plural = (n: number, word: string): string =>
  `${n} ${word}${n === 1 ? "" : "s"}`;
const DAYS_OFF: readonly DayOff[] = [
  { id: WEEKENDS, label: "Weekends", date: "Sat & Sun" },
  ...HOLIDAYS.map((h) => ({ id: h.iso, label: h.label, date: short(h.iso) })),
];
const roleLabel = (id: string): string =>
  ROLES.find((r) => r.id === id)?.label ?? id;
const rateOf = (id: string | undefined): number | null =>
  ROLES.find((r) => r.id === id)?.rate ?? null;

/** `× $95 = $1,330` under an hours dial: the role's rate, and what the hours cost. */
const CostCaption = createFormulaCaption({
  formatFactor: money,
  formatResult: money,
});
const fmtLine =
  (l: Line) =>
  (v: number): string =>
    l.unit === "$" ? k(v) : `${v} h`;

/** Dials read in phase order, materials last: the order the job is worked, then the money. */
const dialOrder = (job: Job): readonly Line[] => [
  ...job.lines.filter((l) => l.unit === "h"),
  ...job.lines.filter((l) => l.unit === "$"),
];

const RangeDialogHours = createRangeDialog({
  field: "number",
  labels: {
    title: "Line range",
    description:
      "The fewest and the most hours this could take. The dial moves between them; the min and max forecasts use them.",
    confirm: "Save range",
    max: "Most hours",
    min: "Fewest hours",
    notANumber: "Enter a number",
    notAboveMin: "Most must be more than fewest",
  },
});
const RangeDialogMoney = createRangeDialog({
  field: "currency",
  labels: {
    title: "Line range",
    description:
      "The least and the most this could cost. The dial moves between them; the min and max forecasts use them.",
    confirm: "Save range",
    max: "Most",
    min: "Least",
    notANumber: "Enter an amount",
    notAboveMin: "Most must be more than least",
  },
});

const ContractScheduler: Component = () => {
  const [cal, setCal] = createSignal<WorkCalendar>({
    weekends: false,
    holidays: HOLIDAYS.map((h) => h.iso),
  });
  const days = createMemo(() => workdays(FROM, TO, cal()));
  /** The first working day at or after an instant (a drop, a guide's start). */
  const dayAt = (ms: number): number => {
    const i = days().findIndex((d) => d >= ms - 1);
    return i < 0 ? days().length - 1 : i;
  };
  /** Where a run ending on working day `w` stops: the next working day's start. */
  const edgeOf = (w: number): number => {
    const ds = days();
    const last = ds.length - 1;
    return w + 1 <= last ? ds[w + 1] : ds[last] + DAY;
  };
  const dayMs = (w: number): number =>
    days()[Math.max(0, Math.min(days().length - 1, w))];

  const firstDayOf = (iso: string): number => {
    const t = Date.parse(`${iso}T00:00:00Z`);
    const i = days().findIndex((d) => d >= t);
    return i < 0 ? days().length - 1 : i;
  };

  const initialJobs = sampleJobs(firstDayOf);
  const [base, setBase] = createSignal<Omit<SchedulerState, "horizon">>({
    jobs: initialJobs,
    mode: "auto",
    order: initialJobs
      .filter((j) => !j.locked)
      .sort(
        (a, b) =>
          (a.placement?.[0]?.[0] ?? 1e9) - (b.placement?.[0]?.[0] ?? 1e9) ||
          a.id - b.id,
      )
      .map((j) => j.id),
  });
  const st = createMemo<SchedulerState>(() => ({
    ...base(),
    horizon: days().length,
  }));
  const update = (f: (s: SchedulerState) => SchedulerState) => {
    const { horizon: _h, ...next } = f(st());
    setBase(next);
  };

  const sch = createMemo(() => schedule(st(), ROLES));
  const flags = createMemo(() => overFlags(sch(), ROLES));
  const dateOfDay = (w: number | undefined): string | undefined =>
    w === undefined ? undefined : isoOf(days()[w]);

  const [hover, setHover] = createSignal<number | null>(null);
  const [openId, setOpenId] = createSignal<number | null>(null);
  const [range, setRange] = createSignal<{ id: number; key: string } | null>(
    null,
  );
  const job = (id: number | null) => st().jobs.find((j) => j.id === id);

  // ── work calendar: a dropdown of the days the crews take off ─────────
  // Every row's switch means "off": weekends off is `!weekends`.
  const isOff = (d: DayOff): boolean =>
    d.id === WEEKENDS ? !cal().weekends : cal().holidays.includes(d.id);
  const setOff = (d: DayOff, off: boolean) =>
    setCal((c) =>
      d.id === WEEKENDS
        ? { ...c, weekends: !off }
        : {
            ...c,
            holidays: off
              ? [...c.holidays, d.id]
              : c.holidays.filter((x) => x !== d.id),
          },
    );
  const dayOffColumns: TableColumn<DayOff>[] = [
    { id: "day", header: "Day", accessor: (d) => d.label },
    { id: "date", header: "Date", accessor: (d) => d.date },
    {
      id: "off",
      header: "Off",
      width: "64px",
      accessor: (d) => (
        <TruthToggle
          checked={isOff(d)}
          aria-label={`${d.label} off`}
          onCheckedChange={(on) => setOff(d, on)}
        />
      ),
    },
  ];

  // ── timeline spans ──────────────────────────────────────────────────────
  // The model lays each job's phases and waits on WORKING-DAY indices; the
  // chart is time, so each becomes an instant: a day's midnight, and a run's
  // end at the next working day's (so a Friday finish covers the weekend).
  const segmentsOf = (js: JobSchedule): readonly JobSegment[] => [
    ...js.phases.map(
      (p): JobSegment => ({
        kind: "work",
        start: dayMs(p.s),
        end: edgeOf(p.e),
        title: p.label,
        role: p.role,
        days: p.days.length,
        by: [],
      }),
    ),
    ...js.waits.map(
      (w): JobSegment => ({
        kind: "wait",
        start: dayMs(w.s),
        end: edgeOf(w.e),
        title: "Waiting",
        role: w.role,
        days: w.e - w.s + 1,
        by: w.by,
      }),
    ),
  ];

  const timeline = createMemo(() => {
    const overText = (id: number): string | null => {
      const f = flags()[id];
      if (!f) return null;
      return Object.entries(f)
        .map(([r, ws]) => {
          const a = short(isoOf(days()[Math.min(...ws)]));
          const b = short(isoOf(days()[Math.max(...ws)]));
          return `${roleLabel(r)} over capacity ${a === b ? a : `${a}–${b}`}`;
        })
        .join("; ");
    };
    const spanOf = (j: Job, js: JobSchedule, parked: boolean): JobSpan => ({
      id: j.id,
      lead: `#${j.id}`,
      trail: k(estimate(j, ROLES).value),
      name: j.name,
      tone: TONE[j.status],
      locked: j.locked,
      over: parked ? null : overText(j.id),
      segments: segmentsOf(js),
    });
    const spans = st()
      .jobs.filter((j) => j.on && sch().byJob[j.id])
      .map((j) => spanOf(j, sch().byJob[j.id], false));
    // manual only: unplaced jobs wait in TBD at their natural length, parked at the right edge
    const unplaced =
      st().mode === "manual"
        ? st().jobs.filter(
            (j) => j.on && !sch().byJob[j.id] && phasesOf(j).length,
          )
        : [];
    const n = days().length;
    const parked = unplaced.map((j) => {
      const len = phasesOf(j).reduce((a, p) => a + p.days, 0);
      let w = Math.max(0, n - 1 - len);
      const phases = phasesOf(j).map((p) => {
        const ds = Array.from({ length: p.days }, () => w++);
        return { ...p, days: ds, s: ds[0], e: ds[ds.length - 1] };
      });
      return spanOf(j, { phases, waits: [] }, true);
    });
    return { spans, parked };
  });

  /** A guide's date: the first working day of a start, the last one before an end. */
  const guideDate = (ms: number, edge: "start" | "end"): string => {
    const w = dayAt(ms);
    return short(isoOf(days()[edge === "start" ? w : Math.max(0, w - 1)]));
  };

  // ── mode control: ModeSplitButton, the manual face = Flow once ──────────
  const modeActions = () => (
    <ClusterRow>
      <TextSublabel>
        {st().mode === "auto" ? "Full auto" : "Manual"}
      </TextSublabel>
      <ButtonGroup>
        <ModeSplitButton<Mode>
          modes={MODES}
          mode={st().mode}
          onModeChange={(m) => update((s) => setMode(s, m, ROLES))}
          onPress={() => {
            if (!modeInfo(MODES, st().mode).disabled)
              update((s) => flowOnce(s, ROLES));
          }}
          menuLabel="Schedule mode"
        />
      </ButtonGroup>
    </ClusterRow>
  );

  // ── list ────────────────────────────────────────────────────────────────
  const lockButton = (j: Job) => (
    <IconOnlyButton
      onClick={() => update((s) => toggleLock(s, j.id, ROLES))}
      aria-label={j.locked ? `Unlock ${j.name}` : `Lock ${j.name}`}
      title={
        j.locked
          ? "Locked: automation won't move it. Click to unlock."
          : "Lock against automated changes"
      }
    >
      <Show when={j.locked} fallback={<ButtonIcon name="lock-open" />}>
        <SolidIcon name="lock" />
      </Show>
    </IconOnlyButton>
  );

  const rowsSorted = createMemo(() =>
    [...st().jobs].sort(
      (a, b) =>
        (startOf(sch(), a.id) ?? Number.POSITIVE_INFINITY) -
          (startOf(sch(), b.id) ?? Number.POSITIVE_INFINITY) || a.id - b.id,
    ),
  );

  const columns: TableColumn<Job>[] = [
    { id: "lock", header: "", width: "48px", accessor: (j) => lockButton(j) },
    {
      id: "on",
      header: "",
      width: "64px",
      accessor: (j) => (
        <TruthToggle
          checked={j.on}
          aria-label={`Include ${j.name}`}
          onCheckedChange={() => update((s) => toggleOn(s, j.id))}
        />
      ),
    },
    {
      id: "job",
      header: "Job",
      accessor: (j) => (
        <ClusterRow>
          <TextSublabel>{`#${j.id}`}</TextSublabel>
          <TextButton onClick={() => setOpenId(j.id)}>{j.name}</TextButton>
        </ClusterRow>
      ),
    },
    {
      id: "status",
      header: "Status",
      accessor: (j) => <StatusOf status={j.status} />,
    },
    {
      id: "start",
      header: "Start",
      accessor: (j) => dateOfDay(startOf(sch(), j.id)) ?? "TBD",
    },
    {
      id: "est",
      header: "Est",
      align: "right",
      accessor: (j) => k(estimate(j, ROLES).value),
    },
  ];

  const total = () =>
    st()
      .jobs.filter((j) => j.on)
      .reduce((a, j) => a + estimate(j, ROLES).value, 0);

  // ── detail ──────────────────────────────────────────────────────────────
  // The detail READS THE JOB THROUGH AN ACCESSOR: `Show` calls its child once,
  // so a job passed as a value freezes the dials on the job as it was opened —
  // they snap back after every drag and nothing reaches the timeline.
  const detail = (j: () => Job) => {
    const lines = () => dialOrder(j());
    const axes = (): GroupedMeasureAxes =>
      lines().map((l) => ({
        label: l.label,
        group:
          l.unit === "$"
            ? "dollars"
            : `${roleLabel(l.role ?? "").toLowerCase()} hours`,
        format: fmtLine(l),
        snap: l.unit === "$" ? 100 : 1,
        // hours × the role's rate; a money line is already its own cost
        caption:
          l.unit === "h"
            ? (c) => <CostCaption operand={c.value} factor={rateOf(l.role)} />
            : undefined,
      }));
    const entity = (): GroupedMutationEntity => ({
      id: String(j().id),
      label: j().name,
      measures: lines().map((l) => ({
        prior: l.prior,
        value: l.value,
        range: [l.min, l.max] as const,
      })),
    });
    const est = () => estimate(j(), ROLES);
    const start = () => dateOfDay(startOf(sch(), j().id));
    const end = () => dateOfDay(endOf(sch(), j().id));
    return (
      <TightStack>
        <SpreadRow>
          <TightStack>
            <ClusterRow>
              <SmallGhostButton onClick={() => setOpenId(null)}>
                ‹ Back
              </SmallGhostButton>
            </ClusterRow>
            <ClusterRow>
              {lockButton(j())}
              <TextTitle>{`#${j().id} ${j().name}`}</TextTitle>
              <StatusOf status={j().status} />
            </ClusterRow>
          </TightStack>
          <ClusterRow>
            <TightStack>
              <TextSublabel>Start</TextSublabel>
              <SteadyMonoValue>{start() ?? "TBD"}</SteadyMonoValue>
              <TextSublabel>{end() ? `ends ${end()}` : " "}</TextSublabel>
            </TightStack>
            <TightStack>
              <TextSublabel>Est</TextSublabel>
              <SteadyMonoValue>{money(est().value)}</SteadyMonoValue>
              <TextSublabel>{`${k(est().min)} – ${k(est().max)}`}</TextSublabel>
            </TightStack>
          </ClusterRow>
        </SpreadRow>
        <GroupedMutationSliders
          entities={[entity()]}
          axes={axes()}
          showNames={false}
          onChange={(_id, m, v) =>
            update((s) => setValue(s, j().id, lines()[m].key, v))
          }
        />
        <NoteText>{`Crew-days: ${phasesOf(j())
          .map((p) => `${p.label} ${p.days}`)
          .join(" · ")}`}</NoteText>
        <WrapRow>
          <TextSublabel>Ranges</TextSublabel>
          <For each={lines()}>
            {(l) => (
              <SmallGhostButton
                onClick={() => setRange({ id: j().id, key: l.key })}
                title={`Edit the ${l.label} range`}
              >
                {`${l.label} ${fmtLine(l)(l.min)}–${fmtLine(l)(l.max)}`}
              </SmallGhostButton>
            )}
          </For>
        </WrapRow>
      </TightStack>
    );
  };

  const rangeLine = () => {
    const r = range();
    return r ? job(r.id)?.lines.find((l) => l.key === r.key) : undefined;
  };
  const saveRange = (lock: readonly [number, number]) => {
    const r = range();
    if (!r) return;
    update((s) =>
      setBound(
        setBound(s, r.id, r.key, "max", Math.max(lock[1], lock[0] + 1)),
        r.id,
        r.key,
        "min",
        lock[0],
      ),
    );
    setRange(null);
  };

  return (
    <ContentStack>
      <TightStack>
        <SectionTitle>Contract Scheduler</SectionTitle>
        <MutedBody>
          Ridgeline Roofing's season. Bars are jobs, drawn phase by phase: solid
          is work, hashed is waiting for a crew. Dragging a bar suggests its
          start. In Full auto it takes the slot of the nearest job starting at
          or before the drop, and the queue reflows behind it around locked
          jobs. In Manual it lands on exactly that day, nothing else moves,
          overbooking is allowed, and the latest-starting job in a pile-up is outlined red
          with a !. Click a bar or a job name to open it.
        </MutedBody>
      </TightStack>

      <ClusterRow>
        <TextSublabel>Work calendar</TextSublabel>
        <PopoverTooltip
          triggerAs="span"
          placement="bottom-start"
          content={
            <CompactTable
              data={[...DAYS_OFF]}
              columns={dayOffColumns}
              hoverable
            />
          }
        >
          <SmallGhostButton>
            <ClusterRow>
              {plural(cal().holidays.length, "holiday")}
              <ButtonIcon name="chevron-down" />
            </ClusterRow>
          </SmallGhostButton>
        </PopoverTooltip>
      </ClusterRow>

      <ContentChartFrame title="Timeline" actions={modeActions()}>
        <JobTimeline
          spans={timeline().spans}
          parked={timeline().parked}
          window={WINDOW}
          ticks={TICKS}
          tickFormat={(ms) => short(isoOf(ms))}
          hoverId={hover()}
          roleLabel={roleLabel}
          dateAt={guideDate}
          onHover={setHover}
          onOpen={setOpenId}
          onDrop={(id, startMs) =>
            update((s) => dragTo(s, id, dayAt(startMs), ROLES))
          }
        />
      </ContentChartFrame>

      <CardSurface>
        <Show
          when={job(openId())}
          fallback={
            <TightStack>
              <SpreadRow>
                <TextTitle>Jobs</TextTitle>
                <TightStack>
                  <TextSublabel>Est</TextSublabel>
                  <SteadyMonoValue>{money(total())}</SteadyMonoValue>
                </TightStack>
              </SpreadRow>
              <CompactTable
                data={rowsSorted()}
                columns={columns}
                hoverable
                onRowHover={(row) => setHover(row ? row.id : null)}
                highlighted={(row) => row.id === hover()}
              />
              <NoteText>{`Sorted by start · ${st().jobs.filter((j) => j.on).length} of ${st().jobs.length} in this scenario`}</NoteText>
            </TightStack>
          }
        >
          {(j) => detail(j)}
        </Show>
      </CardSurface>

      <Show when={rangeLine()}>
        {(l) => {
          const Dialog = l().unit === "$" ? RangeDialogMoney : RangeDialogHours;
          return (
            <Dialog
              open
              lock={[l().min, l().max]}
              onLock={saveRange}
              onClose={() => setRange(null)}
            />
          );
        }}
      </Show>
    </ContentStack>
  );
};

export default ContractScheduler;
