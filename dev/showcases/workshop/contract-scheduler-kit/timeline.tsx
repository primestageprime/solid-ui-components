// ============================================
// JobTimeline — Primitive (Depth 1) DRAFT, bench-local. Owns timeline.css.
//
// The one mark this bench needs that no SUI component draws. It is a
// CANDIDATE for `/sui-build`, most likely as an extension of
// `Chart/TimelineBar` rather than a new component: TimelineBar already lays
// coloured segments in lanes as SVG, and lacks exactly four things this draws —
//
//   1. a LEADING and a TRAILING label per bar (`#3` … `$33.8k`), the trailing
//      one dropped when the bar is too short to hold it;
//   2. a HATCHED fill for a segment (a wait), in the bar's own tone;
//   3. horizontal DRAG with start/end guide lines and their dates, reporting
//      the drop position (the caller decides what a drop means);
//   4. an OVER flag: a red outline and a `!` badge.
//
// SVG, like TimelineBar: every position is an attribute computed here from the
// caller's percentages and the measured width; colour, hatch and type live in
// timeline.css over SUI tokens. No inline styles (the health ratchet counts
// them in benches). Everything it shows is computed by the caller
// (`contract-scheduler-model.ts`); it computes no schedule and no money.
// ============================================
import {
  type Component,
  For,
  Index,
  Show,
  createEffect,
  createSignal,
  onCleanup,
  onMount,
} from "solid-js";
import { observeSize } from "../../../../src/internal/dom/observeSize";
import type { Bar } from "../contract-scheduler-model";
import "./timeline.css";

export type Tone = "doing" | "todo" | "pending";

export interface TimelineItem {
  readonly id: number;
  readonly lead: string;
  readonly trail: string;
  readonly name: string;
  readonly tone: Tone;
  readonly locked: boolean;
  readonly over: string | null;
  readonly row: number;
  readonly bar: Bar;
  /** Parked in the TBD band rather than on the calendar. */
  readonly parked?: boolean;
}

export interface JobTimelineProps {
  readonly items: readonly TimelineItem[];
  readonly rows: number;
  readonly parkedRows: number;
  readonly ticks: readonly { readonly left: number; readonly label: string }[];
  readonly hoverId: number | null;
  readonly roleLabel: (role: string) => string;
  /** The date at a position, for the drag guides. */
  readonly dateAt: (pct: number) => string;
  readonly onHover: (id: number | null) => void;
  readonly onOpen: (id: number) => void;
  /** A bar was dropped with its left edge at `leftPct`. */
  readonly onDrop: (id: number, leftPct: number) => void;
}

const ROW = 34;
const PAD = 10;
const BAR_H = 26;
const TOP = 22; // room above the plot for the drag guides' date labels
const AXIS = 24;
const MONO_CH = 7; // rough glyph advance at the label size, for fitting text

const TONES: readonly Tone[] = ["doing", "todo", "pending"];
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

interface Tip {
  readonly x: number;
  readonly y: number;
  readonly lines: readonly string[];
  readonly warn: string | null;
}

export const JobTimeline: Component<JobTimelineProps> = (props) => {
  let host!: SVGSVGElement;
  const [width, setWidth] = createSignal(700);
  const [drag, setDrag] = createSignal<{ id: number; left: number } | null>(
    null,
  );
  const [tip, setTip] = createSignal<Tip | null>(null);

  onMount(() => {
    const w = host.getBoundingClientRect().width;
    if (w > 0) setWidth(w);
    onCleanup(
      observeSize(host, () => {
        const next = host.getBoundingClientRect().width;
        if (next > 0) setWidth(next);
      }),
    );
  });

  const schedH = () => PAD * 2 + Math.max(1, props.rows) * ROW;
  const parkH = () => (props.parkedRows ? PAD * 2 + props.parkedRows * ROW : 0);
  const plotH = () => schedH() + parkH();
  const px = (pct: number) => (pct / 100) * width();
  const leftPct = (it: TimelineItem) =>
    drag()?.id === it.id ? (drag() as { left: number }).left : it.bar.left;
  const xOf = (it: TimelineItem) => px(leftPct(it));
  const wOf = (it: TimelineItem) => Math.max(2, px(it.bar.width));
  const yOf = (it: TimelineItem) =>
    TOP + (it.parked ? schedH() : 0) + PAD + it.row * ROW + (ROW - BAR_H) / 2;
  const fits = (it: TimelineItem) =>
    wOf(it) >= (it.lead.length + it.trail.length) * MONO_CH + 26;

  const describe = (
    it: TimelineItem,
    segIndex: number | null,
  ): readonly string[] => {
    const s = segIndex === null ? undefined : it.bar.segments[segIndex];
    if (!s) return [`${it.lead} ${it.name}`, it.trail];
    return s.kind === "work"
      ? [
          `${it.lead} ${it.name} · ${s.title}`,
          `${props.roleLabel(s.role)} · ${plural(s.days, "working day")}`,
        ]
      : [
          `${it.lead} ${it.name} · waiting for ${props.roleLabel(s.role)}`,
          `${s.by.length ? `busy on ${s.by.map((b) => `#${b}`).join(", ")}` : "a gap you set"} · ${plural(s.days, "day")}`,
        ];
  };

  const onMove = (it: TimelineItem, e: PointerEvent) => {
    if (drag()) return;
    const r = host.getBoundingClientRect();
    const seg = (e.target as Element).getAttribute("data-seg");
    setTip({
      x: e.clientX - r.left,
      y: e.clientY - r.top,
      lines: describe(it, seg === null ? null : Number(seg)),
      warn: it.over,
    });
    if (props.hoverId !== it.id) props.onHover(it.id);
  };

  const onDown = (it: TimelineItem, e: PointerEvent) => {
    const el = e.currentTarget as SVGGElement;
    el.setPointerCapture(e.pointerId);
    const x0 = e.clientX;
    let moved = false;
    const move = (ev: PointerEvent) => {
      if (it.locked) return;
      const dx = ev.clientX - x0;
      if (!moved && Math.abs(dx) < 4) return;
      moved = true;
      setTip(null);
      setDrag({
        id: it.id,
        left: Math.min(
          100 - it.bar.width,
          Math.max(0, it.bar.left + (dx / width()) * 100),
        ),
      });
    };
    const up = () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      const d = drag();
      if (!moved || !d) {
        setDrag(null);
        props.onOpen(it.id);
        return;
      }
      // drop first, then release: the glide starts from where the bar was let go
      props.onDrop(it.id, d.left);
      setDrag(null);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
  };

  // Bars GLIDE to a new place (Peter, 2026-09-29): remember where each bar was
  // drawn, and when a render moves it, animate the translate from there. Not
  // while a bar is being dragged (it follows the pointer), and not for a reader
  // who asked for reduced motion.
  let last = new Map<number, { x: number; y: number }>();
  createEffect(() => {
    const next = new Map(
      props.items.map((it) => [it.id, { x: xOf(it), y: yOf(it) }]),
    );
    const still =
      typeof matchMedia === "function" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!drag() && !still) {
      for (const [id, at] of next) {
        const was = last.get(id);
        if (!was || (was.x === at.x && was.y === at.y)) continue;
        host
          ?.querySelector(`[data-job="${id}"]`)
          ?.animate(
            [
              { transform: `translate(${was.x}px, ${was.y}px)` },
              { transform: `translate(${at.x}px, ${at.y}px)` },
            ],
            {
              duration: 260,
              easing: "cubic-bezier(.2,.7,.2,1)",
            },
          );
      }
    }
    last = next;
  });

  const tipBox = (t: Tip) => {
    const lines = [
      ...t.lines,
      ...(t.warn ? [`! ${t.warn} with this stacking`] : []),
    ];
    const w = Math.max(...lines.map((l) => l.length)) * 6.4 + 16;
    const h = lines.length * 15 + 8;
    const x = Math.max(0, Math.min(t.x + 12, width() - w));
    const y = Math.max(0, t.y - h - 10);
    return { lines, w, h, x, y };
  };

  return (
    <svg
      ref={host}
      class="job-timeline"
      height={TOP + plotH() + AXIS}
      role="group"
      aria-label="Job timeline"
      onPointerLeave={() => {
        setTip(null);
        props.onHover(null);
      }}
    >
      <defs>
        <For each={TONES}>
          {(tone) => (
            <pattern
              id={`job-timeline-hatch-${tone}`}
              width="7"
              height="7"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <rect
                class={`job-timeline__hatch-ground--${tone}`}
                width="7"
                height="7"
              />
              <rect
                class={`job-timeline__hatch-stripe--${tone}`}
                width="3"
                height="7"
              />
            </pattern>
          )}
        </For>
        <Index each={props.items}>
          {(it) => (
            <clipPath id={`job-timeline-clip-${it().id}`}>
              <rect width={wOf(it())} height={BAR_H} rx="4" />
            </clipPath>
          )}
        </Index>
      </defs>

      <line
        class="job-timeline__baseline"
        x1="0.5"
        x2="0.5"
        y1={TOP}
        y2={TOP + plotH()}
      />
      <Show when={props.parkedRows > 0}>
        <line
          class="job-timeline__tbd-rule"
          x1="0"
          x2={width()}
          y1={TOP + schedH()}
          y2={TOP + schedH()}
        />
        <text class="job-timeline__tbd-label" x="8" y={TOP + schedH() + 16}>
          TBD
        </text>
      </Show>

      <Index each={props.items}>
        {(it) => (
          <g
            class={`job-timeline__bar${it().locked ? " job-timeline__bar--locked" : ""}${drag()?.id === it().id ? " job-timeline__bar--dragging" : ""}`}
            transform={`translate(${xOf(it())},${yOf(it())})`}
            data-job={it().id}
            role="button"
            tabIndex={0}
            aria-label={`${it().lead} ${it().name}, ${it().trail}${it().locked ? ", locked" : ""}${it().over ? `, ${it().over}` : ""}`}
            onPointerMove={(e) => onMove(it(), e)}
            onPointerDown={(e) => onDown(it(), e)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                props.onOpen(it().id);
              }
            }}
          >
            <Show when={it().over}>
              <rect
                class="job-timeline__over"
                x="-3"
                y="-3"
                width={wOf(it()) + 6}
                height={BAR_H + 6}
                rx="6"
              />
            </Show>
            <g clip-path={`url(#job-timeline-clip-${it().id})`}>
              <Index each={it().bar.segments}>
                {(s, i) => (
                  <rect
                    data-seg={i}
                    class={`job-timeline__${s().kind}--${it().tone}`}
                    x={(s().left / 100) * wOf(it())}
                    width={Math.max(1, (s().width / 100) * wOf(it()))}
                    height={BAR_H}
                  />
                )}
              </Index>
              <Index each={it().bar.segments}>
                {(s) => (
                  <Show when={s().kind === "work" && s().left > 0.01}>
                    <line
                      class="job-timeline__seam"
                      x1={(s().left / 100) * wOf(it())}
                      x2={(s().left / 100) * wOf(it())}
                      y1="0"
                      y2={BAR_H}
                    />
                  </Show>
                )}
              </Index>
            </g>
            <Show when={props.hoverId === it().id}>
              <rect
                class="job-timeline__hover"
                x="-1"
                y="-1"
                width={wOf(it()) + 2}
                height={BAR_H + 2}
                rx="5"
              />
            </Show>
            <text
              class={`job-timeline__lead job-timeline__ink--${it().tone}`}
              x="7"
              y={BAR_H / 2 + 4}
            >
              {it().lead}
            </text>
            <Show when={fits(it())}>
              <text
                class={`job-timeline__trail job-timeline__ink--${it().tone}`}
                x={wOf(it()) - 8}
                y={BAR_H / 2 + 4}
                text-anchor="end"
              >
                {it().trail}
              </text>
            </Show>
            <Show when={it().locked}>
              <circle class="job-timeline__pin-disc" cx="0" cy="0" r="7.5" />
              <rect
                class="job-timeline__pin-glyph"
                x="-3.5"
                y="-1"
                width="7"
                height="5"
                rx="1"
              />
              <path
                class="job-timeline__pin-glyph"
                d="M-2 -1 V-2.6 a2 2 0 0 1 4 0 V-1"
              />
            </Show>
            <Show when={it().over}>
              <circle
                class="job-timeline__bang-disc"
                cx={wOf(it()) + 2}
                cy="-1"
                r="8.5"
              />
              <text
                class="job-timeline__bang-mark"
                x={wOf(it()) + 2}
                y="3"
                text-anchor="middle"
              >
                !
              </text>
            </Show>
          </g>
        )}
      </Index>

      <Show when={drag()}>
        {(d) => {
          const item = () => props.items.find((x) => x.id === d().id);
          const edges = () => {
            const it = item();
            return it ? [d().left, d().left + it.bar.width] : [];
          };
          return (
            <Index each={edges()}>
              {(pct, i) => {
                const label = () => props.dateAt(pct());
                const boxW = () => label().length * 6.6 + 10;
                const x = () => px(pct());
                const bx = () => (i === 0 ? x() + 2 : x() - boxW() - 2);
                return (
                  <g>
                    <line
                      class="job-timeline__guide"
                      x1={x()}
                      x2={x()}
                      y1={TOP - 4}
                      y2={TOP + plotH()}
                    />
                    <rect
                      class="job-timeline__guide-box"
                      x={bx()}
                      y="2"
                      width={boxW()}
                      height="16"
                      rx="3"
                    />
                    <text class="job-timeline__guide-text" x={bx() + 5} y="14">
                      {label()}
                    </text>
                  </g>
                );
              }}
            </Index>
          );
        }}
      </Show>

      <line
        class="job-timeline__axis"
        x1="0"
        x2={width()}
        y1={TOP + plotH()}
        y2={TOP + plotH()}
      />
      <For each={props.ticks}>
        {(t) => (
          <text
            class="job-timeline__tick"
            x={px(t.left)}
            y={TOP + plotH() + 15}
            text-anchor={t.left < 3 ? "start" : "middle"}
          >
            {t.label}
          </text>
        )}
      </For>

      <Show when={tip()}>
        {(t) => {
          const b = () => tipBox(t());
          return (
            <g
              class="job-timeline__tip"
              transform={`translate(${b().x},${b().y})`}
            >
              <rect
                class="job-timeline__tip-box"
                width={b().w}
                height={b().h}
                rx="4"
              />
              <Index each={b().lines}>
                {(line, i) => (
                  <text
                    class={
                      i === 0
                        ? "job-timeline__tip-title"
                        : line().startsWith("! ")
                          ? "job-timeline__tip-warn"
                          : "job-timeline__tip-detail"
                    }
                    x="8"
                    y={16 + i * 15}
                  >
                    {line()}
                  </text>
                )}
              </Index>
            </g>
          );
        }}
      </Show>
    </svg>
  );
};
