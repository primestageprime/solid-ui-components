import { Component, createEffect, createSignal, onCleanup } from "solid-js";
import { SectionTitle, SubsectionTitle } from "../../src/components/Text";
import { JsonPanel } from "./swimlane-chart";
import { LinearFlowSwimlaneChart } from "../../src/components/SwimlaneChart";
import {
  StatusFlowChart,
  resolveParentStatuses,
  type StatusFlowNode,
  type StatusFlowColumn,
  type StatusFlowBreakpoint,
} from "../../src/components/StatusFlowChart";
import type { DAGNode, NodeRenderState } from "../../src/components/DagChart";
import { Surface } from "../../src/components/Surface";
import { Stack } from "../../src/components/Layout";
import { TextLabel, EllipsizedTitle } from "../../src/components/Text";

type Status = "todo" | "doing" | "done";

const TICK_MS = 3000;

// ─── Datasets ────────────────────────────────────────────────────────────
// Topology shapes that demonstrate how the swimlane chart handles various
// dep-graph structures: linear chain, fan-out, disjoint pairs, fan-in,
// and isolated nodes. Col is assigned dynamically from graph distance to
// the current DOING node (see makeRunner), so no static col metadata.

type Dataset = {
  label: string;
  description: string;
  nodes: { id: string; data: { label: string } }[];
  edges: { source: string; target: string }[];
};

// Linear 8-node chain: n1 → n2 → … → n8.
const LINEAR_CHAIN: Dataset = {
  label: "linear chain (8)",
  description: "n1 → n2 → … → n8 — one DOING at a time, slides through.",
  nodes: Array.from({ length: 8 }, (_, i) => ({
    id: `n${i + 1}`,
    data: { label: `Step ${i + 1}` },
  })),
  edges: Array.from({ length: 7 }, (_, i) => ({
    source: `n${i + 1}`,
    target: `n${i + 2}`,
  })),
};

// ─── Runner: per-dataset topo helpers + col assignment ───────────────────

type Runner = {
  topo: string[];
  initialStatuses: () => Record<string, Status>;
  computeNext: (prev: Record<string, Status>) => Record<string, Status>;
  /** Map of id → col, computed from graph distance to the current DOING. */
  colByStatus: (s: Record<string, Status>) => Record<string, number>;
};

const makeRunner = (dataset: Dataset): Runner => {
  // Kahn's topological sort.
  const inDeg = new Map<string, number>();
  const succ = new Map<string, string[]>();
  const pred = new Map<string, string[]>();
  for (const n of dataset.nodes) {
    inDeg.set(n.id, 0);
    succ.set(n.id, []);
    pred.set(n.id, []);
  }
  for (const e of dataset.edges) {
    inDeg.set(e.target, (inDeg.get(e.target) ?? 0) + 1);
    succ.get(e.source)!.push(e.target);
    pred.get(e.target)!.push(e.source);
  }
  const topo: string[] = [];
  const queue = dataset.nodes.filter((n) => inDeg.get(n.id) === 0).map((n) => n.id);
  const inDegMut = new Map(inDeg);
  while (queue.length > 0) {
    const id = queue.shift()!;
    topo.push(id);
    for (const s of succ.get(id) ?? []) {
      const d = (inDegMut.get(s) ?? 0) - 1;
      inDegMut.set(s, d);
      if (d === 0) queue.push(s);
    }
  }

  const deps: Record<string, string[]> = {};
  for (const e of dataset.edges) (deps[e.target] ??= []).push(e.source);

  const allTodo = (): Record<string, Status> =>
    Object.fromEntries(dataset.nodes.map((n) => [n.id, "todo" as Status]));

  const allDepsDone = (id: string, s: Record<string, Status>): boolean =>
    (deps[id] ?? []).every((d) => s[d] === "done");

  const initialStatuses = (): Record<string, Status> => {
    const out = allTodo();
    for (const id of topo) {
      if (out[id] === "todo" && allDepsDone(id, out)) out[id] = "doing";
    }
    return out;
  };

  const computeNext = (prev: Record<string, Status>): Record<string, Status> => {
    const next = { ...prev };
    const toFinish = topo.find((id) => next[id] === "doing");
    if (toFinish) next[toFinish] = "done";
    for (const id of topo) {
      if (next[id] === "todo" && allDepsDone(id, next)) next[id] = "doing";
    }
    if (topo.every((id) => next[id] === "done")) return initialStatuses();
    return next;
  };

  // Col = signed graph distance from the current DOING node:
  //   - forward BFS along edges → positive cols (descendants / upcoming)
  //   - backward BFS along edges → negative cols (ancestors / completed)
  //   - nodes that can't be reached either way get a status-based fallback
  //     so they still appear (DOING at col 0, DONE at -1, TODO at +1).
  // This produces a sensible layout for any DAG shape: linear chains
  // spread across cols; fan-out children stack at col +1; fan-in roots
  // stack at col -1; disconnected nodes stack at status-bucketed cols.
  const colByStatus = (s: Record<string, Status>): Record<string, number> => {
    const doingId = topo.find((id) => s[id] === "doing");
    const depth = new Map<string, number>();
    if (doingId) {
      depth.set(doingId, 0);
      let frontier = [doingId];
      while (frontier.length > 0) {
        const next: string[] = [];
        for (const id of frontier) {
          for (const t of succ.get(id) ?? []) {
            if (!depth.has(t)) { depth.set(t, depth.get(id)! + 1); next.push(t); }
          }
        }
        frontier = next;
      }
      frontier = [doingId];
      while (frontier.length > 0) {
        const next: string[] = [];
        for (const id of frontier) {
          for (const t of pred.get(id) ?? []) {
            if (!depth.has(t)) { depth.set(t, depth.get(id)! - 1); next.push(t); }
          }
        }
        frontier = next;
      }
    }
    for (const n of dataset.nodes) {
      if (!depth.has(n.id)) {
        const st = s[n.id];
        depth.set(n.id, st === "done" ? -1 : st === "doing" ? 0 : 1);
      }
    }
    return Object.fromEntries(depth);
  };

  return { topo, initialStatuses, computeNext, colByStatus };
};

// ─── Animation-aware node renderer ────────────────────────────────────────
// `col` is computed per-tick from the current DOING node (see makeRunner).
// `status` drives the visual color + label.
type AnimNode = { label: string; col: number; status: Status };

const STATUS_LABEL: Record<Status, string> = {
  todo: "TODO",
  doing: "DOING",
  done: "COMPLETED",
};
const STATUS_TINT: Record<Status, { bg: string; border: string }> = {
  todo: { bg: "rgba(95,179,124,0.10)", border: "rgba(95,179,124,0.5)" },
  doing: { bg: "rgba(0,212,255,0.10)", border: "var(--sui-accent, #00d4ff)" },
  done: { bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.18)" },
};

const renderAnimNode = (node: DAGNode<AnimNode>, state: NodeRenderState) => {
  if (state.kind === "collapsed") {
    return (
      <Surface
        padding="sm"
        radius="sm"
        bg="rgba(255,255,255,0.03)"
        borderColor="rgba(255,255,255,0.25)"
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          "align-items": "center",
          "justify-content": "center",
          "border-style": "dashed",
        }}
      >
        ({state.collapsedCount} {state.collapsedCount === 1 ? "node" : "nodes"}…)
      </Surface>
    );
  }
  const tint = STATUS_TINT[node.data.status];
  return (
    <Surface
      padding="sm"
      radius="sm"
      bg={tint.bg}
      borderColor={tint.border}
      style={{ width: "100%", height: "100%" }}
    >
      <Stack gap="xs">
        <TextLabel>{STATUS_LABEL[node.data.status]}</TextLabel>
        <EllipsizedTitle>{node.data.label}</EllipsizedTitle>
      </Stack>
    </Surface>
  );
};

// Workshop rules (shared by every row):
//   1. Use the compressed view: nodes that don't fit collapse into the
//      summary circle badges on the side they overflowed to.
//   2. DOING stays in the center (col 0) at all times.
//   3. No node ever extends past the edge of the available space —
//      `effectiveMaxDepth` must always pick a depth whose total width
//      fits within `containerWidth`.
const AnimatedDag: Component<{ dataset: Dataset }> = (props) => {
  // Each instance gets its own runner — the dataset is stable, so we
  // compute helpers once per component lifetime.
  const runner = makeRunner(props.dataset);

  // History of states allows Prev to step back through frames already
  // visited. Advancing past the history's end computes a new frame.
  const [history, setHistory] = createSignal<Record<string, Status>[]>([
    runner.initialStatuses(),
  ]);
  const [historyIdx, setHistoryIdx] = createSignal(0);
  const [playing, setPlaying] = createSignal(true);

  const statuses = () => history()[historyIdx()];
  const setStatuses = (next: Record<string, Status>) => {
    const idx = historyIdx();
    setHistory((h) => [...h.slice(0, idx + 1), next]);
    setHistoryIdx(idx + 1);
  };

  const advance = () => {
    const idx = historyIdx();
    const h = history();
    if (idx + 1 < h.length) {
      setHistoryIdx(idx + 1); // replay a future-of-cursor frame
    } else {
      setStatuses(runner.computeNext(h[idx]));
    }
  };

  const goBack = () => {
    const idx = historyIdx();
    if (idx > 0) setHistoryIdx(idx - 1);
  };

  const togglePlay = () => setPlaying((p) => !p);

  createEffect(() => {
    if (!playing()) return;
    const timer = setInterval(advance, TICK_MS);
    onCleanup(() => clearInterval(timer));
  });

  const animatedNodes = (): DAGNode<AnimNode>[] => {
    const s = statuses();
    const cols = runner.colByStatus(s);
    return props.dataset.nodes.map((n) => ({
      id: n.id,
      data: {
        label: n.data.label,
        col: cols[n.id] ?? 0,
        status: s[n.id],
      },
    }));
  };

  const btnStyle = {
    padding: "6px 14px",
    "font-size": "12px",
    "font-family": "inherit",
    color: "var(--sui-text, #e6ecf5)",
    background: "var(--sui-surface, rgba(0,0,0,0.2))",
    border: "1px solid var(--sui-border, rgba(255,255,255,0.15))",
    "border-radius": "4px",
    cursor: "pointer",
  } as const;

  return (
    <div style={{ display: "flex", "flex-direction": "column", gap: "8px" }}>
      <div style={{ display: "flex", gap: "8px", "align-items": "center" }}>
        <button
          type="button"
          style={btnStyle}
          onClick={goBack}
          disabled={historyIdx() === 0}
        >
          ← Prev
        </button>
        <button type="button" style={btnStyle} onClick={togglePlay}>
          {playing() ? "⏸ Pause" : "▶ Play"}
        </button>
        <button type="button" style={btnStyle} onClick={advance}>
          Next →
        </button>
        <span style={{ "font-size": "11px", color: "rgba(255,255,255,0.5)" }}>
          frame {historyIdx() + 1} / {history().length}
        </span>
      </div>
      <div
        style={{
          width: "100%",
          height: "560px",
          "min-width": "360px",
          border: "1px dashed rgba(255,255,255,0.12)",
          "border-radius": "4px",
          "box-sizing": "border-box",
        }}
      >
        {/* LinearFlowSwimlaneChart is the curried variant that bakes in
            the depth/collapse/center defaults every row needs (per ADR-0001).
            Consumer only passes data + render callback. */}
        <LinearFlowSwimlaneChart
          nodes={animatedNodes()}
          edges={props.dataset.edges}
          swimlaneFor={(n) => n.data.col}
          renderNode={renderAnimNode}
        />
      </div>
    </div>
  );
};

// ─── StatusFlowChart demo (row 2) ────────────────────────────────────────
// Single parent + 8 children. Each tick advances one child through
// TODO → DOING → DONE. The parent's effective status is auto-derived:
// any DOING child → DOING; all children DONE → DONE (children collapse
// into a +8 badge); all TODO → TODO; etc.

const STATUS_COLUMNS: StatusFlowColumn[] = [
  { label: "Done", statuses: ["DONE"] },
  { label: "Doing", statuses: ["DOING"] },
  { label: "Todo", statuses: ["TODO"] },
];

// Cap at 5 visible columns (DONE/DONE, DOING, TODO/TODO). The two
// outer slots per side fill with chain-adjacent children; anything
// past that collapses to a side-summary badge. So in the all-TODO
// state, c1 and c2 are visible at cols +1 and +2 and c3..c8 collapse
// into the `+6` badge at the right edge.
const STATUS_BREAKPOINTS: StatusFlowBreakpoint[] = [
  { minWidth: 0, visibleCols: 1 },
  { minWidth: 500, visibleCols: 3 },
  { minWidth: 900, visibleCols: 5 },
];

// Children are a dep-chain: c1 → c2 → … → c8. The parent has NO
// dep edges to/from children (parentId is purely visual grouping).
const initParentChildren = (): StatusFlowNode[] => [
  // Parent's input status is just a fallback — its effective status is
  // auto-derived from children (all-TODO → parent TODO; any DOING →
  // parent DOING; all-DONE → parent DONE).
  { id: "p", title: "Parent task", subtitle: "owns 8 children", status: "TODO" },
  ...Array.from({ length: 8 }, (_, i) => ({
    id: `c${i + 1}`,
    title: `Child ${i + 1}`,
    status: "TODO" as string,
    parentId: "p",
    // c1 has no deps; c2 depends on c1; c3 on c2; etc.
    dependsOn: i === 0 ? undefined : [`c${i}`],
  })),
];

const advanceChildren = (prev: StatusFlowNode[]): StatusFlowNode[] => {
  // Parents auto-flip via resolveParentStatuses in the chart, so we only
  // tick the leaf nodes (children) here.
  const parentIds = new Set<string>();
  for (const n of prev) if (n.parentId) parentIds.add(n.parentId);
  const isLeaf = (n: StatusFlowNode) => !parentIds.has(n.id);

  // Reset when every leaf is DONE.
  if (prev.filter(isLeaf).every((n) => n.status === "DONE")) {
    return initParentChildren();
  }

  const next = prev.map((n) => ({ ...n }));
  // Finish ONE currently-DOING leaf (lowest id, for stable ordering).
  const doing = next.filter((n) => isLeaf(n) && n.status === "DOING");
  doing.sort((a, b) => a.id.localeCompare(b.id));
  if (doing[0]) doing[0].status = "DONE";
  // Promote every TODO leaf whose dependsOn is satisfied. Read from
  // `next` so a finish in this tick cascades to its dependent.
  for (const n of next) {
    if (!isLeaf(n) || n.status !== "TODO") continue;
    const ready = (n.dependsOn ?? []).every((d) =>
      next.find((x) => x.id === d)?.status === "DONE",
    );
    if (ready) n.status = "DOING";
  }
  return next;
};

// Status-to-column map (matches STATUS_COLUMNS indexed off DOING).
const STATUS_TO_COL: Record<string, number> = { DONE: -1, DOING: 0, TODO: 1 };

// Same colFor the chart uses — extracted so the inspection table can
// show the col each node will land in.
const computeColFor = (n: StatusFlowNode, nodes: StatusFlowNode[]): number => {
  if (!n.id.startsWith("c")) {
    // Parent: status-based, using effective status.
    const effective = resolveParentStatuses(nodes, "DOING").get(n.id) ?? n.status;
    return STATUS_TO_COL[effective] ?? 0;
  }
  const chainIdx = parseInt(n.id.slice(1), 10) - 1;
  const doingIdx = nodes.findIndex((x) => x.parentId && x.status === "DOING");
  const anchorChainIdx =
    doingIdx >= 0 ? parseInt(nodes[doingIdx].id.slice(1), 10) - 1 : -1;
  return chainIdx - anchorChainIdx;
};

const ParentChildrenRow: Component = () => {
  const [history, setHistory] = createSignal<StatusFlowNode[][]>([initParentChildren()]);
  const [idx, setIdx] = createSignal(0);
  const [playing, setPlaying] = createSignal(true);

  const current = () => history()[idx()];

  const advance = () => {
    const h = history();
    const i = idx();
    if (i + 1 < h.length) {
      setIdx(i + 1);
    } else {
      const next = advanceChildren(h[i]);
      setHistory([...h, next]);
      setIdx(i + 1);
    }
  };
  const goBack = () => {
    const i = idx();
    if (i > 0) setIdx(i - 1);
  };

  createEffect(() => {
    if (!playing()) return;
    const timer = setInterval(advance, TICK_MS);
    onCleanup(() => clearInterval(timer));
  });

  // Per-tick projection: each node with its effective status + computed col.
  // Used by the inspection table to verify the chart's layout decisions.
  const rows = () => {
    const nodes = current();
    const effective = resolveParentStatuses(nodes, "DOING");
    return nodes.map((n) => ({
      id: n.id,
      title: n.title,
      status: n.status,
      effectiveStatus: effective.get(n.id) ?? n.status,
      col: computeColFor(n, nodes),
    }));
  };

  const btnStyle = {
    padding: "6px 14px",
    "font-size": "12px",
    "font-family": "inherit",
    color: "var(--sui-text, #e6ecf5)",
    background: "var(--sui-surface, rgba(0,0,0,0.2))",
    border: "1px solid var(--sui-border, rgba(255,255,255,0.15))",
    "border-radius": "4px",
    cursor: "pointer",
  } as const;

  const tableStyle = {
    width: "100%",
    "border-collapse": "collapse" as const,
    "font-size": "11px",
    "font-family": "ui-monospace, SFMono-Regular, monospace",
    "margin-top": "8px",
  };
  const cellStyle = {
    padding: "4px 8px",
    "border-bottom": "1px solid rgba(255,255,255,0.08)",
    "text-align": "left" as const,
    color: "var(--sui-text, #e6ecf5)",
  };
  const headStyle = {
    ...cellStyle,
    "font-size": "10px",
    "letter-spacing": "0.06em",
    "text-transform": "uppercase" as const,
    color: "rgba(255,255,255,0.5)",
    "background": "rgba(255,255,255,0.04)",
  };
  // visibleCols cap = 5 (per STATUS_BREAKPOINTS) → maxDepth = 2.
  // Cols beyond ±2 fall into the side-summary badge ("-S" / "+S").
  const TABLE_MAX_DEPTH = 2;
  const labelForCol = (col: number): string => {
    if (col < -TABLE_MAX_DEPTH) return "-S";
    if (col > TABLE_MAX_DEPTH) return "+S";
    if (col === 0) return "0";
    return col > 0 ? `+${col}` : `${col}`;
  };
  const colStyleFor = (col: number) => ({
    ...cellStyle,
    "text-align": "right" as const,
    color:
      Math.abs(col) > TABLE_MAX_DEPTH
        ? "rgba(255,255,255,0.35)" // summary slot — muted
        : col === 0
          ? "var(--sui-accent, #00d4ff)" // DOING center
          : col < 0
            ? "rgba(255,255,255,0.55)" // DONE side
            : "rgba(95,179,124,0.85)", // TODO side
    "font-weight": 600,
  });

  return (
    <>
      <div class="workshop-grid__cell">
        <SubsectionTitle>StatusFlowChart — single parent + 8 children</SubsectionTitle>
        <p style={{ "font-size": "12px", color: "rgba(255,255,255,0.6)", margin: "8px 0" }}>
          Caller passes nodes with <code>status</code> (no positional hints).
          The chart computes columns from breakpoints + container width.
          Any child DOING → parent DOING; all 8 DONE → parent flips to DONE
          and children collapse into a +8 badge on the parent.
        </p>
        <JsonPanel
          value={{
            columns: STATUS_COLUMNS,
            breakpoints: STATUS_BREAKPOINTS,
            centerStatus: "DOING",
            terminalStatus: "DONE",
          }}
          heightLines={10}
        />
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={headStyle}>Task</th>
              <th style={headStyle}>Status</th>
              <th style={{ ...headStyle, "text-align": "right" }}>Col</th>
            </tr>
          </thead>
          <tbody>
            {rows().map((r) => (
              <tr>
                <td style={cellStyle}>{r.title}</td>
                <td style={cellStyle}>
                  {r.effectiveStatus}
                  {r.status !== r.effectiveStatus && (
                    <span style={{ color: "rgba(255,255,255,0.35)", "margin-left": "6px" }}>
                      (input: {r.status})
                    </span>
                  )}
                </td>
                <td style={colStyleFor(r.col)}>{labelForCol(r.col)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div class="workshop-grid__cell">
        <div style={{ display: "flex", "flex-direction": "column", gap: "8px" }}>
          <div style={{ display: "flex", gap: "8px", "align-items": "center" }}>
            <button type="button" style={btnStyle} onClick={goBack} disabled={idx() === 0}>← Prev</button>
            <button type="button" style={btnStyle} onClick={() => setPlaying((p) => !p)}>
              {playing() ? "⏸ Pause" : "▶ Play"}
            </button>
            <button type="button" style={btnStyle} onClick={advance}>Next →</button>
            <span style={{ "font-size": "11px", color: "rgba(255,255,255,0.5)" }}>
              frame {idx() + 1} / {history().length}
            </span>
          </div>
          <div
            style={{
              width: "100%",
              height: "180px",
              "min-width": "360px",
              "box-sizing": "border-box",
            }}
          >
            <StatusFlowChart
              nodes={current()}
              columns={STATUS_COLUMNS}
              centerStatus="DOING"
              terminalStatus="DONE"
              nodeWidth={160}
              nodeHeight={56}
              minArrowWidth={50}
              breakpoints={STATUS_BREAKPOINTS}
              colFor={(n) => computeColFor(n, current())}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export const WorkshopShowcase: Component = () => {
  return (
    <div class="component-section component-section--full">
      <SectionTitle>Workshop</SectionTitle>
      <div class="workshop-grid">
        <div class="workshop-grid__cell">
          <SubsectionTitle>{LINEAR_CHAIN.label}</SubsectionTitle>
          <p style={{ "font-size": "12px", color: "rgba(255,255,255,0.6)", margin: "8px 0" }}>
            {LINEAR_CHAIN.description}
          </p>
          <JsonPanel value={LINEAR_CHAIN} heightLines={10} />
        </div>
        <div class="workshop-grid__cell">
          <AnimatedDag dataset={LINEAR_CHAIN} />
        </div>

        <ParentChildrenRow />
      </div>
    </div>
  );
};
