// ============================================
// JobTimeline — the bench's timeline, COMPOSED from SUI (no CSS of its own).
//
//   Chart (time xDomain) + XAxis        the calendar
//   HatchPattern × tone                 the fill for a wait, in the bar's tone
//   SpanLanes                           the phased bars, packed into the fewest rows
//     createSpanRing / createSpanBadge  red outline + ! on the over-capacity job,
//     createSpanEndLabels               `#3 … $33.8k`, trail dropped when it won't fit
//     createSpanBadge                   the padlock on a locked job
//   ReferenceLine × 2                   the drag guides, captioned with their dates
//   ReferenceLine (horizontal)          the rule over the TBD band (manual mode)
//   ChartTooltip                        the hovered job's name, phases and warning
//
// What stays HERE, deliberately (Peter did not approve extracting them):
//
//   DRAG — SpanLanes reports `onSpanPointerDown`; this file captures the
//   pointer, draws the dragged job from SHIFTED DATA (its segments moved by
//   the drag's milliseconds) and reports the drop's start instant. What a drop
//   MEANS (reorder in auto, exact days in manual) is the caller's.
//
//   GLIDE — a FLIP over the `[data-span-id]` groups SpanLanes marks: where
//   each bar was laid (the same pure `layoutSpans` the slot draws with), and
//   when a render moves it, `el.animate` the translate from there. Not while
//   dragging, and not under reduced motion.
//
// Everything it shows is computed by the caller from the model
// (`contract-scheduler-model.ts`); it computes no schedule and no money.
// ============================================
import {
  type Component,
  For,
  Show,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
} from "solid-js";
import {
  Chart,
  ChartTooltip,
  HatchPattern,
  ReferenceLine,
  type SpanSegment,
  SpanLanes,
  TextSublabel,
  TightStack,
  DangerBody,
  XAxis,
  createSpanBadge,
  createSpanEndLabels,
  createSpanRing,
  layoutSpans,
  packSpans,
  spanRowCount,
} from "../../../../src";

export type Tone = "doing" | "todo" | "pending";

/** One stretch of a job's bar: a phase worked, or a wait for a crew. */
export interface JobSegment extends SpanSegment {
  readonly kind: "work" | "wait";
  readonly title: string;
  readonly role: string;
  readonly days: number;
  /** For a wait: the jobs holding the crew. */
  readonly by: readonly number[];
}

/** One job on the timeline — a `SpanDatum` in the chart's time domain (epoch ms). */
export interface JobSpan {
  readonly id: number;
  readonly lead: string;
  readonly trail: string;
  readonly name: string;
  readonly tone: Tone;
  readonly locked: boolean;
  /** Why it is flagged over capacity, or null. */
  readonly over: string | null;
  readonly segments: readonly JobSegment[];
}

export interface JobTimelineProps {
  /** Jobs on the calendar. */
  readonly spans: readonly JobSpan[];
  /** Manual mode's unplaced jobs, parked in a TBD band below the calendar. */
  readonly parked: readonly JobSpan[];
  /** The calendar window, epoch ms: first day's midnight to the day after the last. */
  readonly window: readonly [number, number];
  readonly ticks: readonly number[];
  readonly tickFormat: (ms: number) => string;
  readonly hoverId: number | null;
  readonly roleLabel: (role: string) => string;
  /** The working-day date a guide stands on: `edge` "start" or "end" of a span at `ms`. */
  readonly dateAt: (ms: number, edge: "start" | "end") => string;
  readonly onHover: (id: number | null) => void;
  readonly onOpen: (id: number) => void;
  /** A job was dropped with its first instant at `startMs`. */
  readonly onDrop: (id: number, startMs: number) => void;
}

const ROW = 34;
/** Room above the bars for the drag guides' captions. */
const TOP = 22;
/** Gap between the calendar rows and the TBD band. */
const GAP = 22;
const MARGIN = { top: 4, right: 12, bottom: 26, left: 8 };
const DRAG_SLOP = 4;

const FILL: Readonly<Record<Tone, string>> = {
  doing: "var(--sui-accent)",
  todo: "var(--sui-success)",
  pending: "var(--sui-warning)",
};
const INK: Readonly<Record<Tone, string>> = {
  doing: "var(--sui-text-primary)",
  todo: "var(--sui-bg-deep)",
  pending: "var(--sui-bg-deep)",
};
const TONES: readonly Tone[] = ["doing", "todo", "pending"];
const hatchId = (tone: Tone) => `job-timeline-hatch-${tone}`;
const paint = (s: SpanSegment, j: JobSpan) =>
  s.kind === "wait" ? `url(#${hatchId(j.tone)})` : FILL[j.tone];

/** The padlock as one stroked path in GlyphBadge's 16-unit box. */
const LOCK_PATH = "M4 7.5h8v6H4z M5.5 7.5V5a2.5 2.5 0 0 1 5 0v2.5";

const ADORNMENTS = [
  createSpanRing<JobSpan>({
    when: (j) => j.over !== null,
    color: () => "var(--sui-danger)",
  }),
  createSpanEndLabels<JobSpan>({
    lead: (j) => j.lead,
    trail: (j) => j.trail,
    color: (j) => INK[j.tone],
  }),
  createSpanBadge<JobSpan>({
    when: (j) => j.locked,
    glyph: () => ({ path: LOCK_PATH }),
    color: () => "var(--sui-bg-deep)",
    glyphColor: () => "var(--sui-text-primary)",
    ringColor: "var(--sui-text-secondary)",
    corner: "top-left",
    size: 15,
  }),
  createSpanBadge<JobSpan>({
    when: (j) => j.over !== null,
    glyph: () => ({ text: "!" }),
    color: () => "var(--sui-danger)",
    glyphColor: () => "var(--sui-text-primary)",
    corner: "top-right",
    size: 17,
  }),
];

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
const extentOf = (j: JobSpan) => ({
  start: Math.min(...j.segments.map((s) => s.start)),
  end: Math.max(...j.segments.map((s) => s.end)),
});
const shifted = (j: JobSpan, dt: number): JobSpan => ({
  ...j,
  segments: j.segments.map((s) => ({
    ...s,
    start: s.start + dt,
    end: s.end + dt,
  })),
});

interface Drag {
  readonly id: number;
  readonly dt: number;
}

export const JobTimeline: Component<JobTimelineProps> = (props) => {
  let host!: HTMLDivElement;
  const [width, setWidth] = createSignal(720);
  const [drag, setDrag] = createSignal<Drag | null>(null);
  /** The click that ends a drag is not an "open". */
  let swallowClick = false;

  onMount(() => {
    const measure = () => {
      const w = host.getBoundingClientRect().width;
      if (w > 0) setWidth(w);
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(host);
    onCleanup(() => ro.disconnect());
  });

  const innerWidth = () => width() - MARGIN.left - MARGIN.right;
  const msPerPx = () =>
    (props.window[1] - props.window[0]) / Math.max(1, innerWidth());
  const x = (ms: number) =>
    ((ms - props.window[0]) / (props.window[1] - props.window[0])) *
    innerWidth();

  /** The calendar's spans, the dragged one drawn where the pointer has it. */
  const shown = createMemo(() => {
    const d = drag();
    return d
      ? props.spans.map((j) => (j.id === d.id ? shifted(j, d.dt) : j))
      : props.spans;
  });
  const rows = () => spanRowCount(shown());
  const parkedTop = () => TOP + rows() * ROW + GAP;
  const plotHeight = () =>
    props.parked.length
      ? parkedTop() + props.parked.length * ROW
      : TOP + rows() * ROW;
  const height = () => plotHeight() + MARGIN.top + MARGIN.bottom;

  const dragged = () => {
    const d = drag();
    const j = d ? shown().find((s) => s.id === d.id) : undefined;
    return j ? extentOf(j) : null;
  };
  const hovered = () =>
    drag()
      ? undefined
      : [...props.spans, ...props.parked].find((j) => j.id === props.hoverId);

  const onPointerDown = (j: JobSpan, e: PointerEvent) => {
    if (j.locked || e.button !== 0) return;
    const el = e.currentTarget as Element;
    el.setPointerCapture?.(e.pointerId);
    const x0 = e.clientX;
    const { start, end } = extentOf(j);
    let moved = false;
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - x0;
      if (!moved && Math.abs(dx) < DRAG_SLOP) return;
      moved = true;
      const dt = Math.min(
        props.window[1] - end,
        Math.max(props.window[0] - start, dx * msPerPx()),
      );
      setDrag({ id: j.id, dt });
    };
    const up = () => {
      el.removeEventListener("pointermove", move as EventListener);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      const d = drag();
      if (moved && d) {
        swallowClick = true;
        // the glide starts from where the bar was let go, not where it began
        const at = boxes(shown(), TOP).find(([id]) => id === j.id);
        if (at) last.set(j.id, at[1]);
        props.onDrop(j.id, start + d.dt);
      }
      setDrag(null);
    };
    el.addEventListener("pointermove", move as EventListener);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
  };

  const onClick = (j: JobSpan) => {
    if (swallowClick) {
      swallowClick = false;
      return;
    }
    props.onOpen(j.id);
  };

  // GLIDE (Peter, 2026-09-29): remember where each bar was laid; when a render
  // moves one, animate its group from the old place to the new.
  const geo = { rowHeight: ROW, barHeight: 0.76 };
  const boxes = (spans: readonly JobSpan[], dy: number) =>
    layoutSpans(packSpans(spans), x, geo).map(
      (l) => [l.datum.id, { x: l.box.x, y: l.box.y + dy }] as const,
    );
  let last = new Map<number, { x: number; y: number }>();
  createEffect(() => {
    // While a bar follows the pointer, keep the places from before the drag:
    // the drop then glides every bar that moved, from where it was.
    if (drag()) return;
    const next = new Map([
      ...boxes(props.spans, TOP),
      ...boxes(props.parked, parkedTop()),
    ]);
    const still =
      typeof matchMedia === "function" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!still) {
      for (const [id, at] of next) {
        const was = last.get(id);
        if (!was || (was.x === at.x && was.y === at.y)) continue;
        host
          ?.querySelector(`[data-span-id="${id}"]`)
          ?.animate?.(
            [
              { transform: `translate(${was.x - at.x}px, ${was.y - at.y}px)` },
              { transform: "translate(0px, 0px)" },
            ],
            { duration: 260, easing: "cubic-bezier(.2,.7,.2,1)" },
          );
      }
    }
    last = next;
  });

  // DATA AS AN ACCESSOR: `{lanes(shown())}` would re-run the whole call —
  // a NEW SpanLanes — on every drag frame, tearing down the <g> holding the
  // pointer capture after the first move (2026-09-30: why drag was dead).
  const lanes = (data: () => readonly JobSpan[]) => (
    <SpanLanes<JobSpan>
      data={data()}
      paint={paint}
      adornments={ADORNMENTS}
      hoveredId={props.hoverId}
      rowHeight={ROW}
      describe={(j) =>
        `${j.lead} ${j.name}, ${j.trail}${j.locked ? ", locked" : ""}${j.over ? `, ${j.over}` : ""}`
      }
      onSpanHover={(j) => {
        if (!drag()) props.onHover(j ? j.id : null);
      }}
      onSpanPointerDown={onPointerDown}
      onSpanClick={onClick}
    />
  );

  return (
    <div ref={host}>
      <Chart
        width={width()}
        height={height()}
        xDomain={[new Date(props.window[0]), new Date(props.window[1])]}
        yDomain={[plotHeight(), 0]}
        margin={MARGIN}
      >
        <defs>
          <For each={TONES}>
            {(tone) => <HatchPattern id={hatchId(tone)} color={FILL[tone]} />}
          </For>
        </defs>
        <XAxis tickValues={props.ticks} tickFormat={props.tickFormat} />
        <g transform={`translate(0, ${TOP})`}>{lanes(shown)}</g>
        <Show when={props.parked.length > 0}>
          <ReferenceLine
            orientation="horizontal"
            value={parkedTop() - GAP / 2}
            label="TBD"
          />
          <g transform={`translate(0, ${parkedTop()})`}>
            {lanes(() => props.parked)}
          </g>
        </Show>
        <Show when={dragged()}>
          {(d) => (
            <>
              <ReferenceLine
                orientation="vertical"
                value={d().start}
                label={props.dateAt(d().start, "start")}
              />
              <ReferenceLine
                orientation="vertical"
                value={d().end}
                label={props.dateAt(d().end, "end")}
              />
            </>
          )}
        </Show>
        <ChartTooltip
          data={hovered() ? [hovered() as JobSpan] : []}
          x={(j) => extentOf(j).start}
          maxWidth={320}
        >
          {(j) => (
            <TightStack>
              <TextSublabel>{`${j.lead} ${j.name} · ${j.trail}`}</TextSublabel>
              <For each={j.segments}>
                {(s) => (
                  <TextSublabel>
                    {s.kind === "work"
                      ? `${s.title} · ${props.roleLabel(s.role)} · ${plural(s.days, "working day")}`
                      : `waiting for ${props.roleLabel(s.role)} · ${s.by.length ? `busy on ${s.by.map((b) => `#${b}`).join(", ")}` : "a gap you set"} · ${plural(s.days, "day")}`}
                  </TextSublabel>
                )}
              </For>
              <Show when={j.over}>
                {(w) => (
                  <DangerBody>{`! ${w()} with this stacking`}</DangerBody>
                )}
              </Show>
            </TightStack>
          )}
        </ChartTooltip>
      </Chart>
    </div>
  );
};
