/**
 * Contract Scheduler bench — Peter's contract-job sketches of 2026-09-29,
 * composed. The working prototype of ADR 0028 and its addendum
 * (thorcasting-qbo `docs/adr/0028-…`).
 *
 * A roofer's season: a job LIST that opens into one job's DIALS, and a
 * TIMELINE of phased bars (solid = work, hashed = waiting for a crew) that
 * reflows in FULL AUTO or holds still in MANUAL, around LOCKED jobs.
 *
 * Component per region, so the reuse is checkable:
 *
 *   Work calendar — `TruthToggle` × (weekends + each holiday)
 *   Timeline      — `ChartFrame` (title + actions slot) holding the bench-local
 *                   `JobTimeline` draft; the mode control is ChartFrame's own
 *                   split-button composition, `IconOnlyButton` + `RightPopoverMenu`
 *   Job list      — `CompactTable` (onRowHover = the cross-highlight),
 *                   `TruthToggle`, `IconOnlyButton` + `Icon lock`, `TextButton`,
 *                   `SmStatusBadge`
 *   Job detail    — `GhostButton` back, `GroupedMutationSliders` (one entity,
 *                   one measure per line, grouped by crew), `SmallGhostButton`
 *                   per line opening a `createYAxisLockDialog` range editor
 *
 * BENCH-LOCAL, pending `/sui-build`: `JobTimeline`
 * (`contract-scheduler-kit/timeline.tsx`) — see its header for the four things
 * `TimelineBar` would need to absorb it.
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

import {
  GhostButton,
  IconOnlyButton,
  SmallGhostButton,
  TextButton,
} from "../../../src/components/Button";
import { SmStatusBadge } from "../../../src/components/Badge";
import {
  ChartFrame,
  createYAxisLockDialog,
} from "../../../src/components/ChartFrame";
import { GroupedMutationSliders } from "../../../src/components/GroupedMutationSliders";
import type {
  GroupedMeasureAxes,
  GroupedMutationEntity,
} from "../../../src/components/GroupedMutationSliders";
import { createIcon } from "../../../src/components/Icon";
import {
  ClusterRow,
  ContentStack,
  SpreadRow,
  TightStack,
  WrapRow,
} from "../../../src/components/Layout";
import { RightPopoverMenu } from "../../../src/components/PopoverMenu";
import { CardSurface } from "../../../src/components/Surface";
import { CompactTable } from "../../../src/components/Table";
import type { TableColumn } from "../../../src/components/Table";
import {
  createText,
  MutedBody,
  NoteText,
  SectionTitle,
  SteadyMonoValue,
  TextSublabel,
  TextTitle,
} from "../../../src/components/Text";
import { TruthToggle } from "../../../src/components/Toggle";

import {
  DEFAULT_ROLES,
  type Job,
  type Line,
  type Mode,
  type SchedulerState,
  type WorkCalendar,
  barOf,
  dragTo,
  endOf,
  estimate,
  flowOnce,
  isoOf,
  makeAxis,
  overFlags,
  pack,
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
  JobTimeline,
  type TimelineItem,
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

const ButtonIcon = createIcon({ variant: "outline", size: "sm" });
const SolidIcon = createIcon({ variant: "solid", size: "sm" });
const ScreenReaderLabel = createText({ as: "span", class: "sui-sr-only" });

const TONE: Readonly<Record<Job["status"], Tone>> = {
  DOING: "doing",
  TODO: "todo",
  PENDING: "pending",
};
const BADGE: Readonly<Record<Job["status"], "info" | "compliant" | "warning">> =
  {
    DOING: "info",
    TODO: "compliant",
    PENDING: "warning",
  };

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
const roleLabel = (id: string): string =>
  ROLES.find((r) => r.id === id)?.label ?? id;
const fmtLine =
  (l: Line) =>
  (v: number): string =>
    l.unit === "$" ? k(v) : `${v} h`;

/** Dials read in phase order, materials last: the order the job is worked, then the money. */
const dialOrder = (job: Job): readonly Line[] => [
  ...job.lines.filter((l) => l.unit === "h"),
  ...job.lines.filter((l) => l.unit === "$"),
];

const RangeDialogHours = createYAxisLockDialog({
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
const RangeDialogMoney = createYAxisLockDialog({
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
  const axis = createMemo(() => makeAxis(FROM, TO, days()));

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

  // ── timeline items ──────────────────────────────────────────────────────
  const items = createMemo(() => {
    const placed = st()
      .jobs.filter((j) => j.on && sch().byJob[j.id])
      .map((j) => ({
        id: j.id,
        s: startOf(sch(), j.id) as number,
        e: endOf(sch(), j.id) as number,
      }));
    const rows = pack(placed);
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
    const item = (
      j: Job,
      row: number,
      bar: TimelineItem["bar"],
      parked = false,
    ): TimelineItem => ({
      id: j.id,
      lead: `#${j.id}`,
      trail: k(estimate(j, ROLES).value),
      name: j.name,
      tone: TONE[j.status],
      locked: j.locked,
      over: parked ? null : overText(j.id),
      row,
      bar,
      parked,
    });
    const onCal = rows.map((r) => {
      const j = job(r.id) as Job;
      const js = sch().byJob[r.id];
      return item(j, r.row, barOf(js.phases, js.waits, axis()));
    });
    // manual only: unplaced jobs wait in TBD at their natural length, parked at the right edge
    const parked =
      st().mode === "manual"
        ? st().jobs.filter(
            (j) => j.on && !sch().byJob[j.id] && phasesOf(j).length,
          )
        : [];
    const n = days().length;
    const tbd = parked.map((j, i) => {
      const len = phasesOf(j).reduce((a, p) => a + p.days, 0);
      const s0 = Math.max(0, n - 1 - len);
      let w = s0;
      const phases = phasesOf(j).map((p) => {
        const ds = Array.from({ length: p.days }, () => w++);
        return { ...p, days: ds, s: ds[0], e: ds[ds.length - 1] };
      });
      return item(j, i, barOf(phases, [], axis()), true);
    });
    return {
      list: [...onCal, ...tbd],
      rows: Math.max(1, ...rows.map((r) => r.row + 1)),
      parkedRows: tbd.length,
    };
  });

  const ticks = createMemo(() =>
    [
      "2026-10-01",
      "2026-10-15",
      "2026-11-01",
      "2026-11-15",
      "2026-12-01",
      "2026-12-15",
    ].map((iso) => ({
      left: axis().at(iso),
      label: short(iso),
    })),
  );

  // ── mode control: ChartFrame's split-button composition ─────────────────
  const modeActions = () => (
    <ClusterRow>
      <TextSublabel>
        {st().mode === "auto" ? "Full auto" : "Manual"}
      </TextSublabel>
      <Show
        when={st().mode === "manual"}
        fallback={
          <IconOnlyButton
            disabled
            aria-label="Unlocked jobs flow automatically"
            title="Unlocked jobs flow automatically"
          >
            <ButtonIcon name="arrows-up-down" />
          </IconOnlyButton>
        }
      >
        <IconOnlyButton
          onClick={() => update((s) => flowOnce(s, ROLES))}
          aria-label="Flow once: pack unlocked jobs, keeping their order"
          title="Flow once: pack unlocked jobs, keeping their order"
        >
          <ButtonIcon name="fit" />
        </IconOnlyButton>
      </Show>
      <RightPopoverMenu<Mode>
        trigger={<ScreenReaderLabel>Schedule mode</ScreenReaderLabel>}
        items={[
          {
            id: "auto",
            label: "Full auto — unlocked jobs reflow by order",
            icon: "arrows-up-down",
            active: st().mode === "auto",
          },
          {
            id: "manual",
            label: "Manual — drag sets exact dates",
            icon: "fit",
            active: st().mode === "manual",
          },
        ]}
        onSelect={(m) => update((s) => setMode(s, m, ROLES))}
      />
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
      <Show when={j.locked} fallback={<ButtonIcon name="lock" />}>
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
      accessor: (j) => (
        <SmStatusBadge variant={BADGE[j.status]} label={j.status} />
      ),
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
  const detail = (j: Job) => {
    const lines = dialOrder(j);
    const axes: GroupedMeasureAxes = lines.map((l) => ({
      label: l.label,
      group:
        l.unit === "$"
          ? "dollars"
          : `${roleLabel(l.role ?? "").toLowerCase()} hours`,
      format: fmtLine(l),
      snap: l.unit === "$" ? 100 : 1,
    }));
    const entity: GroupedMutationEntity = {
      id: String(j.id),
      label: "Hours & materials",
      measures: lines.map((l) => ({
        prior: l.prior,
        value: l.value,
        range: [l.min, l.max] as const,
      })),
    };
    const est = estimate(j, ROLES);
    const start = dateOfDay(startOf(sch(), j.id));
    const end = dateOfDay(endOf(sch(), j.id));
    return (
      <TightStack>
        <SpreadRow>
          <TightStack>
            <GhostButton onClick={() => setOpenId(null)}>‹ Back</GhostButton>
            <ClusterRow>
              {lockButton(j)}
              <TextTitle>{`#${j.id} ${j.name}`}</TextTitle>
              <SmStatusBadge variant={BADGE[j.status]} label={j.status} />
            </ClusterRow>
          </TightStack>
          <ClusterRow>
            <TightStack>
              <TextSublabel>Start</TextSublabel>
              <SteadyMonoValue>{start ?? "TBD"}</SteadyMonoValue>
              <TextSublabel>{end ? `ends ${end}` : " "}</TextSublabel>
            </TightStack>
            <TightStack>
              <TextSublabel>Est</TextSublabel>
              <SteadyMonoValue>{money(est.value)}</SteadyMonoValue>
              <TextSublabel>{`${k(est.min)} – ${k(est.max)}`}</TextSublabel>
            </TightStack>
          </ClusterRow>
        </SpreadRow>
        <GroupedMutationSliders
          entities={[entity]}
          axes={axes}
          onChange={(_id, m, v) =>
            update((s) => setValue(s, j.id, lines[m].key, v))
          }
        />
        <NoteText>{`Crew-days: ${phasesOf(j)
          .map((p) => `${p.label} ${p.days}`)
          .join(" · ")}`}</NoteText>
        <WrapRow>
          <TextSublabel>Ranges</TextSublabel>
          <For each={lines}>
            {(l) => (
              <SmallGhostButton
                onClick={() => setRange({ id: j.id, key: l.key })}
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
          is work, hashed is waiting for a crew. In Full auto, dragging an
          unlocked bar changes its place in the queue and everything reflows
          around locked jobs. In Manual, dragging sets exact dates, overbooking
          is allowed, and the latest-starting job in a pile-up is outlined red
          with a !. Click a bar or a job name to open it.
        </MutedBody>
      </TightStack>

      <WrapRow>
        <TextSublabel>Work calendar</TextSublabel>
        <ClusterRow>
          <TextSublabel>Work weekends</TextSublabel>
          <TruthToggle
            aria-label="Work weekends"
            checked={cal().weekends}
            onCheckedChange={(on) => setCal((c) => ({ ...c, weekends: on }))}
          />
        </ClusterRow>
        <For each={HOLIDAYS}>
          {(h) => (
            <ClusterRow>
              <TextSublabel>{`${h.label} off`}</TextSublabel>
              <TruthToggle
                aria-label={`${h.label} off`}
                checked={cal().holidays.includes(h.iso)}
                onCheckedChange={(on) =>
                  setCal((c) => ({
                    ...c,
                    holidays: on
                      ? [...c.holidays, h.iso]
                      : c.holidays.filter((x) => x !== h.iso),
                  }))
                }
              />
            </ClusterRow>
          )}
        </For>
      </WrapRow>

      <ChartFrame title="Timeline" actions={modeActions()}>
        <JobTimeline
          items={items().list}
          rows={items().rows}
          parkedRows={items().parkedRows}
          ticks={ticks()}
          hoverId={hover()}
          roleLabel={roleLabel}
          dateAt={(p) => short(isoOf(days()[axis().dayAt(p)]))}
          onHover={setHover}
          onOpen={setOpenId}
          onDrop={(id, left) =>
            update((s) => dragTo(s, id, axis().dayAt(left), ROLES))
          }
        />
      </ChartFrame>

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
                getRowClass={(row) =>
                  row.id === hover() ? "hud-table__row--selected" : ""
                }
              />
              <NoteText>{`Sorted by start · ${st().jobs.filter((j) => j.on).length} of ${st().jobs.length} in this scenario`}</NoteText>
            </TightStack>
          }
        >
          {(j) => detail(j())}
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
