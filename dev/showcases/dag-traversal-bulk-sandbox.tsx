// ============================================
// DAG Traversal — Bulk Sandbox
// Stages hold counts; transitions move K items along an edge with the
// hose-stretch pulse and the (now direction-aware) DigitRoller. Three
// layout modes: horizontal, vertical, snake. Auto-play is biased so
// "implement" takes 4–10s while every other step is ~1s.
// ============================================
import {
  type Component,
  For,
  Show,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
} from "solid-js";
import { DigitRoller } from "../../src/components/DataDisplay/DigitRoller";

type Stage = { id: string; label: string; owner?: string };

type Transition = {
  id: string;
  from: string;
  to: string;
  label: string;
  kind: "forward" | "backward";
};

type LayoutMode = "horizontal" | "vertical" | "snake";

const STAGES: Stage[] = [
  { id: "plan", label: "Plan", owner: "Human" },
  { id: "design", label: "Design", owner: "Agent" },
  { id: "implement", label: "Implement", owner: "Agent" },
  { id: "review", label: "Review", owner: "Human" },
  { id: "test", label: "Test", owner: "Agent" },
  { id: "deploy", label: "Deploy", owner: "Agent" },
  { id: "done", label: "Done" },
];

const STAGE_BY_ID = new Map(STAGES.map((s) => [s.id, s]));

const TRANSITIONS: Transition[] = [
  {
    id: "plan-design",
    from: "plan",
    to: "design",
    label: "Approve",
    kind: "forward",
  },
  {
    id: "design-implement",
    from: "design",
    to: "implement",
    label: "Designed",
    kind: "forward",
  },
  {
    id: "implement-review",
    from: "implement",
    to: "review",
    label: "Submit",
    kind: "forward",
  },
  {
    id: "review-test",
    from: "review",
    to: "test",
    label: "Looks good",
    kind: "forward",
  },
  {
    id: "review-implement",
    from: "review",
    to: "implement",
    label: "Needs work",
    kind: "backward",
  },
  {
    id: "test-deploy",
    from: "test",
    to: "deploy",
    label: "Pass",
    kind: "forward",
  },
  {
    id: "test-implement",
    from: "test",
    to: "implement",
    label: "Fail",
    kind: "backward",
  },
  {
    id: "deploy-done",
    from: "deploy",
    to: "done",
    label: "Live",
    kind: "forward",
  },
];

const FORWARD = TRANSITIONS.filter((t) => t.kind === "forward");
const BACKWARD = TRANSITIONS.filter((t) => t.kind === "backward");

const NODE_W = 90;
const NODE_H = 76;
const HGAP = 100; // gap BETWEEN cards horizontally → arrow length ≥ 100
const VGAP = 70; // gap between rows in snake / between cards in vertical
const PAD = 30; // canvas padding around the cards
const SNAKE_PER_ROW = 4;

const INITIAL_PLAN_COUNT = 50;
const MIN_STROKE = 1.5;
const MAX_STROKE = 6; // ~half the previous peak
const EDGE_PULSE_MS = 1400; // slower so the elastic ring is readable
const NUMBER_DURATION_MS = 500;

/**
 * Elastic burst envelope. 0 at t=0, snaps to ~1 by t≈0.1, then a damped
 * cosine ringing decays back through zero with progressively smaller
 * positive bumps. Visual: hose stretches, snaps back, stretches a smaller
 * amount, snaps back, etc.
 */
function elasticBurst(t: number): number {
  if (t <= 0 || t >= 1) return 0;
  if (t < 0.1) return t / 0.1;
  const u = (t - 0.1) / 0.9;
  const decay = Math.exp(-3 * u);
  const wave = Math.cos(u * Math.PI * 3);
  // Negative half-cycles clip to zero — they represent "back to rest"
  // moments between rebounds, which reads as a clear elastic ring.
  return Math.max(0, decay * wave);
}

const QTY_OPTIONS = [1, 3, 5, 10];

type Pos = { x: number; y: number };
type CountState = { count: number; prevCount: number };
type EdgePulse = {
  startedAt: number;
  size: number;
  kind: "forward" | "backward";
};
type LogEntry = {
  ts: number;
  from: string;
  to: string;
  label: string;
  kind: "forward" | "backward";
  size: number;
};

const buildInitial = (): Record<string, CountState> =>
  STAGES.reduce(
    (acc, s) => {
      const initial = s.id === "plan" ? INITIAL_PLAN_COUNT : 0;
      acc[s.id] = { count: initial, prevCount: initial };
      return acc;
    },
    {} as Record<string, CountState>,
  );

const edgeKey = (from: string, to: string) => `${from}-${to}`;

/** Compute card-center positions for the chosen layout mode. */
function computePositions(mode: LayoutMode): {
  positions: Map<string, Pos>;
  width: number;
  height: number;
} {
  const positions = new Map<string, Pos>();
  if (mode === "horizontal") {
    STAGES.forEach((s, i) => {
      positions.set(s.id, {
        x: PAD + i * (NODE_W + HGAP) + NODE_W / 2,
        y: PAD + NODE_H / 2,
      });
    });
    return {
      positions,
      width: PAD * 2 + STAGES.length * NODE_W + (STAGES.length - 1) * HGAP,
      height: PAD * 2 + NODE_H + 100, // extra room for backward arcs
    };
  }
  if (mode === "vertical") {
    STAGES.forEach((s, i) => {
      positions.set(s.id, {
        x: PAD + NODE_W / 2 + 80,
        y: PAD + i * (NODE_H + VGAP) + NODE_H / 2,
      });
    });
    return {
      positions,
      width: PAD * 2 + NODE_W + 160, // extra room for backward arcs to the right
      height: PAD * 2 + STAGES.length * NODE_H + (STAGES.length - 1) * VGAP,
    };
  }
  // snake
  const cols = SNAKE_PER_ROW;
  STAGES.forEach((s, i) => {
    const row = Math.floor(i / cols);
    const colInRow = i % cols;
    const col = row % 2 === 0 ? colInRow : cols - 1 - colInRow;
    positions.set(s.id, {
      x: PAD + col * (NODE_W + HGAP) + NODE_W / 2,
      y: PAD + row * (NODE_H + VGAP) + NODE_H / 2,
    });
  });
  const rowCount = Math.ceil(STAGES.length / cols);
  return {
    positions,
    width: PAD * 2 + cols * NODE_W + (cols - 1) * HGAP,
    height: PAD * 2 + rowCount * NODE_H + (rowCount - 1) * VGAP + 60,
  };
}

/** Find where the line from `center` toward `target` exits the rect at `center`. */
function clipToRect(
  center: Pos,
  target: Pos,
  halfW: number,
  halfH: number,
): Pos {
  const dx = target.x - center.x;
  const dy = target.y - center.y;
  if (dx === 0 && dy === 0) return center;
  const sx = dx !== 0 ? halfW / Math.abs(dx) : Infinity;
  const sy = dy !== 0 ? halfH / Math.abs(dy) : Infinity;
  const s = Math.min(sx, sy);
  return { x: center.x + dx * s, y: center.y + dy * s };
}

/** Quadratic curve from a→b with a perpendicular bow of `bow` px. */
function arcPath(a: Pos, b: Pos, bow: number): string {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.max(1, Math.hypot(dx, dy));
  // Perpendicular direction (rotate 90° clockwise)
  const px = -dy / len;
  const py = dx / len;
  const cx = mx + px * bow;
  const cy = my + py * bow;
  return `M ${a.x.toFixed(1)} ${a.y.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
}

export const DagTraversalBulkSandboxShowcase: Component = () => {
  const [counts, setCounts] = createSignal(buildInitial());
  const [pulses, setPulses] = createSignal<Record<string, EdgePulse>>({});
  const [tickNow, setTickNow] = createSignal(performance.now());
  const [quantity, setQuantity] = createSignal(5);
  const [autoPlay, setAutoPlay] = createSignal(false);
  const [log, setLog] = createSignal<LogEntry[]>([]);
  const [layoutMode, setLayoutMode] = createSignal<LayoutMode>("horizontal");

  const layout = createMemo(() => computePositions(layoutMode()));

  let rafId: number | undefined;
  const tick = () => {
    const now = performance.now();
    setTickNow(now);
    setPulses((prev) => {
      const next: Record<string, EdgePulse> = {};
      for (const [k, p] of Object.entries(prev)) {
        if (now - p.startedAt < EDGE_PULSE_MS) next[k] = p;
      }
      return next;
    });
    if (Object.keys(pulses()).length > 0) {
      rafId = requestAnimationFrame(tick);
    } else {
      rafId = undefined;
    }
  };

  const fire = (transitionId: string, k: number) => {
    const t = TRANSITIONS.find((x) => x.id === transitionId);
    if (!t) return;
    const sourceCount = counts()[t.from]?.count ?? 0;
    const moveK = Math.min(k, sourceCount);
    if (moveK <= 0) return;

    setCounts((prev) => ({
      ...prev,
      [t.from]: {
        count: prev[t.from].count - moveK,
        prevCount: prev[t.from].count,
      },
      [t.to]: { count: prev[t.to].count + moveK, prevCount: prev[t.to].count },
    }));
    setPulses((prev) => ({
      ...prev,
      [edgeKey(t.from, t.to)]: {
        startedAt: performance.now(),
        size: moveK,
        kind: t.kind,
      },
    }));
    setLog((prev) => [
      ...prev.slice(-19),
      {
        ts: Date.now(),
        from: t.from,
        to: t.to,
        label: t.label,
        kind: t.kind,
        size: moveK,
      },
    ]);

    if (rafId === undefined) rafId = requestAnimationFrame(tick);
  };

  onCleanup(() => {
    if (rafId !== undefined) cancelAnimationFrame(rafId);
  });

  // Auto-play with implement throttle: implement-source steps wait 4-10s,
  // every other step waits ~1s. Simulates a workflow where the bottleneck
  // really is the implementation phase.
  let autoTimer: number | undefined;
  const scheduleAuto = () => {
    if (!autoPlay()) return;
    const candidates = TRANSITIONS.filter(
      (t) => (counts()[t.from]?.count ?? 0) > 0,
    );
    if (candidates.length === 0) {
      setAutoPlay(false);
      return;
    }
    const forwards = candidates.filter((t) => t.kind === "forward");
    const backwards = candidates.filter((t) => t.kind === "backward");
    const pickForward = backwards.length === 0 || Math.random() < 0.7;
    const pool =
      pickForward && forwards.length > 0
        ? forwards
        : backwards.length > 0
          ? backwards
          : forwards;
    const t = pool[Math.floor(Math.random() * pool.length)];
    const k = QTY_OPTIONS[Math.floor(Math.random() * QTY_OPTIONS.length)];
    const delay =
      t.from === "implement"
        ? 4000 + Math.random() * 6000 // 4–10s
        : 1000;
    autoTimer = window.setTimeout(() => {
      fire(t.id, k);
      scheduleAuto();
    }, delay);
  };
  createEffect(() => {
    if (autoPlay()) {
      scheduleAuto();
    } else if (autoTimer !== undefined) {
      clearTimeout(autoTimer);
      autoTimer = undefined;
    }
  });
  onCleanup(() => {
    if (autoTimer !== undefined) clearTimeout(autoTimer);
  });

  const reset = () => {
    setAutoPlay(false);
    setCounts(buildInitial());
    setPulses({});
    setLog([]);
  };

  const edgeStrokeWidth = (key: string): number => {
    tickNow();
    const p = pulses()[key];
    if (!p) return MIN_STROKE;
    const elapsed = performance.now() - p.startedAt;
    if (elapsed >= EDGE_PULSE_MS) return MIN_STROKE;
    const t = elapsed / EDGE_PULSE_MS;
    const intensity = Math.min(1, p.size / 10);
    return (
      MIN_STROKE +
      (MAX_STROKE - MIN_STROKE) * elasticBurst(t) * (0.6 + 0.4 * intensity)
    );
  };
  const isEdgePulsing = (key: string) => {
    tickNow();
    return !!pulses()[key];
  };

  const fmtTime = (ts: number) =>
    new Date(ts).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

  const halfW = NODE_W / 2;
  const halfH = NODE_H / 2;

  return (
    <div class="component-section dtb-root">
      <h2>DAG Traversal — Bulk (sandbox)</h2>
      <p class="text-meta">
        Each stage holds a count; pick a quantity, then click a transition to
        move that many items. The big number rolls (up for increases, down for
        decreases) and the edge between them swells like a hose under load. Try
        the layout modes — Snake wraps the row when there are too many stages to
        fit horizontally.
      </p>

      <div class="dtb-toolbar">
        <div class="dtb-layout-modes">
          <span class="dtb-toolbar-label">Layout</span>
          <For each={["horizontal", "vertical", "snake"] as LayoutMode[]}>
            {(m) => (
              <button
                type="button"
                class={`dtb-mode-btn ${layoutMode() === m ? "dtb-mode-btn--active" : ""}`}
                onClick={() => setLayoutMode(m)}
              >
                {m}
              </button>
            )}
          </For>
        </div>
        <div class="dtb-qty">
          <span class="dtb-toolbar-label">Move</span>
          <For each={QTY_OPTIONS}>
            {(q) => (
              <button
                type="button"
                class={`dtb-qty-btn ${quantity() === q ? "dtb-qty-btn--active" : ""}`}
                onClick={() => setQuantity(q)}
              >
                {q}
              </button>
            )}
          </For>
        </div>
        <label class="dtb-autoplay">
          <input
            type="checkbox"
            checked={autoPlay()}
            onChange={(e) => setAutoPlay(e.currentTarget.checked)}
          />
          Auto-play
          <span class="dtb-autoplay-hint">(implement: 4–10s)</span>
        </label>
        <button type="button" class="dtb-btn dtb-btn--ghost" onClick={reset}>
          Reset
        </button>
      </div>

      {/* DAG canvas */}
      <div class="dtb-canvas">
        <svg
          viewBox={`0 0 ${layout().width} ${layout().height}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <marker
              id="dtb-arrow-fwd"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path
                d="M 0 0 L 10 5 L 0 10 z"
                fill="var(--sui-text-secondary)"
              />
            </marker>
            <marker
              id="dtb-arrow-fwd-active"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="5"
              markerHeight="5"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--sui-accent)" />
            </marker>
            <marker
              id="dtb-arrow-back"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--sui-warning)" />
            </marker>
          </defs>

          {/* Backward arcs — quadratic curve with perpendicular bow */}
          <For each={BACKWARD}>
            {(edge) => {
              const positions = layout().positions;
              const from = positions.get(edge.from)!;
              const to = positions.get(edge.to)!;
              const k = edgeKey(edge.from, edge.to);
              const a = clipToRect(from, to, halfW, halfH);
              const b = clipToRect(to, from, halfW, halfH);
              const dist = Math.hypot(to.x - from.x, to.y - from.y);
              const bow = Math.min(80, dist * 0.5);
              return (
                <path
                  d={arcPath(a, b, bow)}
                  class={`dtb-edge dtb-edge--backward ${isEdgePulsing(k) ? "dtb-edge--active" : ""}`}
                  stroke-width={edgeStrokeWidth(k)}
                  marker-end="url(#dtb-arrow-back)"
                />
              );
            }}
          </For>

          {/* Forward edges — straight lines clipped to card boundaries */}
          <For each={FORWARD}>
            {(edge) => {
              const positions = layout().positions;
              const from = positions.get(edge.from)!;
              const to = positions.get(edge.to)!;
              const k = edgeKey(edge.from, edge.to);
              const a = clipToRect(from, to, halfW, halfH);
              const b = clipToRect(to, from, halfW, halfH);
              const active = isEdgePulsing(k);
              return (
                <line
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  class={`dtb-edge dtb-edge--forward ${active ? "dtb-edge--active" : ""}`}
                  stroke-width={edgeStrokeWidth(k)}
                  marker-end={
                    active
                      ? "url(#dtb-arrow-fwd-active)"
                      : "url(#dtb-arrow-fwd)"
                  }
                  stroke-linecap="round"
                />
              );
            }}
          </For>

          {/* Cards via foreignObject */}
          <For each={STAGES}>
            {(stage) => {
              const pos = () => layout().positions.get(stage.id)!;
              const state = () => counts()[stage.id];
              const count = () => state()?.count ?? 0;
              const prev = () => state()?.prevCount ?? 0;
              const isEmpty = () => count() === 0;
              return (
                <foreignObject
                  x={pos().x - NODE_W / 2}
                  y={pos().y - NODE_H / 2}
                  width={NODE_W}
                  height={NODE_H}
                >
                  <div class={`dtb-card ${isEmpty() ? "dtb-card--empty" : ""}`}>
                    <div class="dtb-card__label">{stage.label}</div>
                    <Show when={stage.owner}>
                      <div class="dtb-card__owner">{stage.owner}</div>
                    </Show>
                    <div class="dtb-card__count">
                      <DigitRoller
                        value={String(count())}
                        previousValue={String(prev())}
                        animate
                        duration={NUMBER_DURATION_MS}
                        stagger={50}
                      />
                    </div>
                  </div>
                </foreignObject>
              );
            }}
          </For>
        </svg>
      </div>

      {/* Transition buttons */}
      <div class="dtb-transitions">
        <For each={TRANSITIONS}>
          {(t) => {
            const sourceCount = () => counts()[t.from]?.count ?? 0;
            const movable = () => Math.min(quantity(), sourceCount());
            const disabled = () => sourceCount() <= 0;
            return (
              <button
                type="button"
                class={`dtb-btn dtb-btn--${t.kind}`}
                disabled={disabled()}
                onClick={() => fire(t.id, quantity())}
                title={`${t.from} → ${t.to}`}
              >
                <span class="dtb-btn-from">
                  {STAGE_BY_ID.get(t.from)?.label}
                </span>
                <span class="dtb-btn-arrow">
                  {t.kind === "forward" ? "→" : "↩"}
                </span>
                <span class="dtb-btn-to">{STAGE_BY_ID.get(t.to)?.label}</span>
                <span class="dtb-btn-label">{t.label}</span>
                <span class="dtb-btn-qty">×{movable()}</span>
              </button>
            );
          }}
        </For>
      </div>

      <div class="dtb-log">
        <div class="dtb-log-label">Activity</div>
        <Show
          when={log().length > 0}
          fallback={<div class="dtb-log-empty">No moves yet.</div>}
        >
          <ul class="dtb-log-list">
            <For each={[...log()].reverse()}>
              {(entry) => (
                <li class={`dtb-log-entry dtb-log-entry--${entry.kind}`}>
                  <span class="dtb-log-time">{fmtTime(entry.ts)}</span>
                  <span class="dtb-log-size">×{entry.size}</span>
                  <span class="dtb-log-arrow">
                    {entry.kind === "forward" ? "→" : "↩"}
                  </span>
                  <span class="dtb-log-from">
                    {STAGE_BY_ID.get(entry.from)?.label}
                  </span>
                  <span class="dtb-log-sep">→</span>
                  <span class="dtb-log-to">
                    {STAGE_BY_ID.get(entry.to)?.label}
                  </span>
                  <span class="dtb-log-label-text">{entry.label}</span>
                </li>
              )}
            </For>
          </ul>
        </Show>
      </div>
    </div>
  );
};
