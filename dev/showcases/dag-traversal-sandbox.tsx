// ============================================
// DAG Traversal Sandbox
// A small workflow state machine with forward + backward transitions,
// rendered as an animated SVG DAG. The "puck" cursor animates between
// stages on each transition; backward transitions slide left along
// dashed orange arcs beneath the row, forward slide right along the
// edge. Active stage glows; previous stage briefly tags as "from".
// Pure Solid signals + requestAnimationFrame + CSS — no D3.
// ============================================
import { type Component, createEffect, createMemo, createSignal, For, Show, onCleanup } from "solid-js";

type Stage = {
  id: string;
  label: string;
  owner?: string;
  /** Center coordinates in SVG units. */
  x: number;
  y: number;
};

type Transition = {
  id: string;
  from: string;
  to: string;
  label: string;
  kind: "forward" | "backward";
};

const STAGES: Stage[] = [
  { id: "plan",      label: "Plan",      owner: "Human", x: 80,  y: 60 },
  { id: "design",    label: "Design",    owner: "Agent", x: 220, y: 60 },
  { id: "implement", label: "Implement", owner: "Agent", x: 360, y: 60 },
  { id: "review",    label: "Review",    owner: "Human", x: 500, y: 60 },
  { id: "test",      label: "Test",      owner: "Agent", x: 640, y: 60 },
  { id: "deploy",    label: "Deploy",    owner: "Agent", x: 780, y: 60 },
  { id: "done",      label: "Done",                      x: 920, y: 60 },
];

const STAGE_BY_ID = new Map(STAGES.map((s) => [s.id, s]));

const TRANSITIONS: Transition[] = [
  { id: "plan-design",       from: "plan",      to: "design",    label: "Approve plan", kind: "forward"  },
  { id: "design-implement",  from: "design",    to: "implement", label: "Design done",  kind: "forward"  },
  { id: "implement-review",  from: "implement", to: "review",    label: "Submit",       kind: "forward"  },
  { id: "review-test",       from: "review",    to: "test",      label: "Looks good",   kind: "forward"  },
  { id: "review-implement",  from: "review",    to: "implement", label: "Needs work",   kind: "backward" },
  { id: "test-deploy",       from: "test",      to: "deploy",    label: "Pass",         kind: "forward"  },
  { id: "test-implement",    from: "test",      to: "implement", label: "Fail",         kind: "backward" },
  { id: "deploy-done",       from: "deploy",    to: "done",      label: "Live",         kind: "forward"  },
];

const FORWARD = TRANSITIONS.filter((t) => t.kind === "forward");
const BACKWARD = TRANSITIONS.filter((t) => t.kind === "backward");

const NODE_W = 110;
const NODE_H = 50;
const ANIMATION_MS = 700;
const FROM_FLASH_MS = 350;

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

type Anim = {
  from: string;
  to: string;
  kind: "forward" | "backward";
  startedAt: number;
};

type LogEntry = {
  ts: number;
  from: string;
  to: string;
  label: string;
  kind: "forward" | "backward";
};

export const DagTraversalSandboxShowcase: Component = () => {
  const [currentId, setCurrentId] = createSignal("plan");
  const [anim, setAnim] = createSignal<Anim | null>(null);
  const [progress, setProgress] = createSignal(0);
  const [log, setLog] = createSignal<LogEntry[]>([]);
  const [autoPlay, setAutoPlay] = createSignal(false);
  const [visited, setVisited] = createSignal<Set<string>>(new Set(["plan"]));
  const [reworkCount, setReworkCount] = createSignal<Record<string, number>>({});

  let rafId: number | undefined;
  const tickAnim = () => {
    const a = anim();
    if (!a) return;
    const elapsed = performance.now() - a.startedAt;
    const t = Math.min(1, elapsed / ANIMATION_MS);
    setProgress(easeOutCubic(t));
    if (t < 1) {
      rafId = requestAnimationFrame(tickAnim);
    } else {
      setAnim(null);
      setProgress(0);
    }
  };

  const fire = (transitionId: string) => {
    const t = TRANSITIONS.find((x) => x.id === transitionId);
    if (!t) return;
    if (t.from !== currentId()) return;
    if (anim()) return;

    setCurrentId(t.to);
    setVisited((prev) => new Set([...prev, t.to]));
    if (t.kind === "backward") {
      setReworkCount((prev) => ({ ...prev, [t.to]: (prev[t.to] ?? 0) + 1 }));
    }
    setAnim({ from: t.from, to: t.to, kind: t.kind, startedAt: performance.now() });
    setProgress(0);
    setLog((prev) => [...prev.slice(-19), { ts: Date.now(), from: t.from, to: t.to, label: t.label, kind: t.kind }]);
    rafId = requestAnimationFrame(tickAnim);
  };

  onCleanup(() => {
    if (rafId) cancelAnimationFrame(rafId);
  });

  // Auto-play loop
  let autoTimer: number | undefined;
  createEffect(() => {
    if (!autoPlay()) return;

    const tick = () => {
      if (anim()) {
        autoTimer = window.setTimeout(tick, 100);
        return;
      }
      const valid = TRANSITIONS.filter((t) => t.from === currentId());
      if (valid.length === 0) {
        // At terminal — pause briefly then reset
        autoTimer = window.setTimeout(() => {
          setCurrentId("plan");
          setVisited(new Set(["plan"]));
          setReworkCount({});
          autoTimer = window.setTimeout(tick, 600);
        }, 1200);
        return;
      }
      // Bias toward forward when there's a fork (70/30)
      const forwards = valid.filter((t) => t.kind === "forward");
      const backwards = valid.filter((t) => t.kind === "backward");
      const pickForward = backwards.length === 0 || Math.random() < 0.7;
      const choice = pickForward && forwards.length > 0
        ? forwards[Math.floor(Math.random() * forwards.length)]
        : backwards[Math.floor(Math.random() * backwards.length)];
      fire(choice.id);
      autoTimer = window.setTimeout(tick, ANIMATION_MS + 500);
    };
    autoTimer = window.setTimeout(tick, 400);

    onCleanup(() => {
      if (autoTimer) clearTimeout(autoTimer);
    });
  });

  const reset = () => {
    setAutoPlay(false);
    setCurrentId("plan");
    setLog([]);
    setAnim(null);
    setProgress(0);
    setVisited(new Set(["plan"]));
    setReworkCount({});
  };

  const validTransitions = createMemo(() => TRANSITIONS.filter((t) => t.from === currentId()));

  // Puck position (lerp between from and to). For backward edges we follow
  // the curved arc beneath; for forward we go straight along the edge.
  const puck = createMemo(() => {
    const a = anim();
    if (!a) return null;
    const from = STAGE_BY_ID.get(a.from)!;
    const to = STAGE_BY_ID.get(a.to)!;
    const p = progress();

    if (a.kind === "forward") {
      return {
        x: from.x + (to.x - from.x) * p,
        y: from.y + (to.y - from.y) * p,
        kind: a.kind,
      };
    }

    // Backward: quadratic Bezier curve dipping below the row
    const midX = (from.x + to.x) / 2;
    const arcY = Math.max(from.y, to.y) + 90;
    // Quadratic at parameter p: B(p) = (1-p)^2 P0 + 2(1-p)p P1 + p^2 P2
    const u = 1 - p;
    return {
      x: u * u * from.x + 2 * u * p * midX + p * p * to.x,
      y: u * u * from.y + 2 * u * p * arcY + p * p * to.y,
      kind: a.kind,
    };
  });

  const isEdgeActive = (from: string, to: string) => {
    const a = anim();
    return a && a.from === from && a.to === to;
  };

  const fmtTime = (ts: number) => new Date(ts).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <div class="component-section dts-root">
      <h2>DAG Traversal — Sandbox</h2>
      <p class="text-meta">
        A small workflow state machine. Click a transition button to advance — or toggle
        auto-play. Forward transitions slide right along the edge; backward transitions
        loop back along the orange arc below.
      </p>

      {/* DAG visualization */}
      <div class="dts-canvas">
        <svg viewBox="0 0 1000 220" preserveAspectRatio="xMidYMid meet">
          <defs>
            <marker id="dts-arrow-fwd" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--sui-text-secondary)" />
            </marker>
            <marker id="dts-arrow-fwd-active" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--sui-accent)" />
            </marker>
            <marker id="dts-arrow-back" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--sui-warning)" />
            </marker>
          </defs>

          {/* Backward arcs (under) */}
          <For each={BACKWARD}>
            {(edge) => {
              const from = STAGE_BY_ID.get(edge.from)!;
              const to = STAGE_BY_ID.get(edge.to)!;
              const midX = (from.x + to.x) / 2;
              const arcY = Math.max(from.y, to.y) + 90;
              const fromXEdge = from.x - NODE_W / 2 + 20;
              const toXEdge = to.x + NODE_W / 2 - 20;
              const d = `M ${fromXEdge} ${from.y + NODE_H / 2} Q ${midX} ${arcY} ${toXEdge} ${to.y + NODE_H / 2}`;
              const active = isEdgeActive(edge.from, edge.to);
              return (
                <path
                  d={d}
                  class={`dts-edge dts-edge--backward ${active ? "dts-edge--active" : ""}`}
                  marker-end="url(#dts-arrow-back)"
                />
              );
            }}
          </For>

          {/* Forward edges */}
          <For each={FORWARD}>
            {(edge) => {
              const from = STAGE_BY_ID.get(edge.from)!;
              const to = STAGE_BY_ID.get(edge.to)!;
              const x1 = from.x + NODE_W / 2;
              const x2 = to.x - NODE_W / 2;
              const active = isEdgeActive(edge.from, edge.to);
              return (
                <line
                  x1={x1}
                  y1={from.y}
                  x2={x2}
                  y2={to.y}
                  class={`dts-edge dts-edge--forward ${active ? "dts-edge--active" : ""}`}
                  marker-end={active ? "url(#dts-arrow-fwd-active)" : "url(#dts-arrow-fwd)"}
                />
              );
            }}
          </For>

          {/* Stages */}
          <For each={STAGES}>
            {(stage) => {
              const isCurrent = () => currentId() === stage.id;
              const isFrom = () => {
                const a = anim();
                return !!a && a.from === stage.id && performance.now() - a.startedAt < FROM_FLASH_MS;
              };
              const wasVisited = () => visited().has(stage.id);
              const rework = () => reworkCount()[stage.id] ?? 0;
              return (
                <g
                  transform={`translate(${stage.x - NODE_W / 2}, ${stage.y - NODE_H / 2})`}
                  class="dts-stage-group"
                  classList={{
                    "dts-stage-group--current": isCurrent(),
                    "dts-stage-group--from": isFrom() && !isCurrent(),
                    "dts-stage-group--visited": wasVisited() && !isCurrent(),
                  }}
                >
                  <rect
                    width={NODE_W}
                    height={NODE_H}
                    rx="8"
                    class="dts-stage-rect"
                  />
                  <text x={NODE_W / 2} y={stage.owner ? NODE_H / 2 - 2 : NODE_H / 2 + 4} text-anchor="middle" class="dts-stage-label">
                    {stage.label}
                  </text>
                  <Show when={stage.owner}>
                    <text x={NODE_W / 2} y={NODE_H / 2 + 13} text-anchor="middle" class="dts-stage-owner">
                      {stage.owner}
                    </text>
                  </Show>
                  <Show when={rework() > 0}>
                    <g transform={`translate(${NODE_W - 6}, -6)`}>
                      <circle r="9" class="dts-stage-rework" />
                      <text text-anchor="middle" dominant-baseline="central" class="dts-stage-rework-text">
                        {rework()}
                      </text>
                    </g>
                  </Show>
                </g>
              );
            }}
          </For>

          {/* Puck cursor */}
          <Show when={puck()}>
            {(p) => (
              <g class={`dts-puck dts-puck--${p().kind}`}>
                <circle cx={p().x} cy={p().y} r="9" class="dts-puck-glow" />
                <circle cx={p().x} cy={p().y} r="5" class="dts-puck-core" />
              </g>
            )}
          </Show>
        </svg>
      </div>

      {/* Controls */}
      <div class="dts-controls">
        <div class="dts-control-row">
          <span class="dts-current">
            Current: <strong>{STAGE_BY_ID.get(currentId())?.label ?? currentId()}</strong>
          </span>
          <label class="dts-autoplay">
            <input
              type="checkbox"
              checked={autoPlay()}
              onChange={(e) => setAutoPlay(e.currentTarget.checked)}
            />
            Auto-play
          </label>
          <button type="button" class="dts-btn dts-btn--ghost" onClick={reset}>Reset</button>
        </div>

        <div class="dts-transitions">
          <Show
            when={validTransitions().length > 0}
            fallback={<span class="dts-no-actions">Terminal — no further transitions.</span>}
          >
            <For each={validTransitions()}>
              {(t) => (
                <button
                  type="button"
                  class={`dts-btn dts-btn--${t.kind}`}
                  disabled={!!anim()}
                  onClick={() => fire(t.id)}
                  title={`${t.from} → ${t.to}`}
                >
                  {t.label}
                  <span class="dts-btn-arrow">{t.kind === "forward" ? "→" : "↩"}</span>
                </button>
              )}
            </For>
          </Show>
        </div>
      </div>

      {/* Log */}
      <div class="dts-log">
        <div class="dts-log-label">Activity</div>
        <Show
          when={log().length > 0}
          fallback={<div class="dts-log-empty">No transitions yet.</div>}
        >
          <ul class="dts-log-list">
            <For each={[...log()].reverse()}>
              {(entry) => (
                <li class={`dts-log-entry dts-log-entry--${entry.kind}`}>
                  <span class="dts-log-time">{fmtTime(entry.ts)}</span>
                  <span class="dts-log-arrow">{entry.kind === "forward" ? "→" : "↩"}</span>
                  <span class="dts-log-from">{STAGE_BY_ID.get(entry.from)?.label ?? entry.from}</span>
                  <span class="dts-log-sep">→</span>
                  <span class="dts-log-to">{STAGE_BY_ID.get(entry.to)?.label ?? entry.to}</span>
                  <span class="dts-log-label-text">{entry.label}</span>
                </li>
              )}
            </For>
          </ul>
        </Show>
      </div>
    </div>
  );
};
