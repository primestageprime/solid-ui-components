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
import {
  computeColFor as computeColForHelper,
  computeChartHeight as computeChartHeightHelper,
  labelForCol as labelForColHelper,
} from "./workshop-layout";
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

const advanceChildren = (
  prev: StatusFlowNode[],
  init: () => StatusFlowNode[],
): StatusFlowNode[] => {
  // Parents auto-flip via resolveParentStatuses in the chart, so we only
  // tick the leaf nodes (children) here. Datasets with NO parent are
  // also handled: every node counts as a leaf and ticks through.
  const parentIds = new Set<string>();
  for (const n of prev) if (n.parentId) parentIds.add(n.parentId);
  const isLeaf = (n: StatusFlowNode) => !parentIds.has(n.id);

  // Reset when every leaf is DONE.
  if (prev.filter(isLeaf).every((n) => n.status === "DONE")) {
    return init();
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

// ─── Shared layout constants ────────────────────────────────────────────
// Single source of truth for sizing. Both row 2 and row 3 read from
// these, and the lane-box CSS `gap` value matches PARENT_CHART_GAP_PX.

const NODE_WIDTH_PX = 160;
const NODE_HEIGHT_PX = 56;
const ROW_GAP_PX = 64;
const PARENT_HEADER_PX = 56;
// 4px top + 4px bottom on the lane box's padding.
const LANE_BOX_PADDING_PX = 8;
// 1px top + 1px bottom border on the lane box. With box-sizing:
// border-box, the border eats into the inside height — we add it back
// here so the chart row gets its full nodeHeight and doesn't clip.
const LANE_BOX_BORDER_PX = 2;
// Vertical breathing room between the parent header and the chart row,
// matching the `gap` declared on `.sui-statusflow__lane-box`. ~1rem.
const PARENT_CHART_GAP_PX = 16;
const VISIBLE_HALF = 2; // matches visibleCols=5 cap in STATUS_BREAKPOINTS

// Bridge into workshop-layout.ts so the workshop and the unit tests
// share a single source of truth. computeColFor needs effective parent
// statuses (parent auto-flips when children are uniform), which we
// resolve via StatusFlowChart's helper.
const computeColFor = (n: StatusFlowNode, nodes: StatusFlowNode[]): number => {
  const effective = resolveParentStatuses(nodes, "DOING");
  return computeColForHelper(n, nodes, (id) => effective.get(id));
};

// Auto-size helper used by every row's ChartBox. Pure fn → unit-tested
// via workshop-layout.test.ts. Reads the shared layout constants so
// every demo stays in sync.
const computeRowChartHeight = (nodes: StatusFlowNode[]): number => {
  const parentIds = new Set<string>();
  for (const n of nodes) if (n.parentId) parentIds.add(n.parentId);
  const effective = resolveParentStatuses(nodes, "DOING");
  const collapsedParents = new Set<string>();
  for (const pid of parentIds) {
    if (effective.get(pid) === "DONE") collapsedParents.add(pid);
  }
  const visibleLeaves = nodes.filter(
    (n) =>
      !parentIds.has(n.id) &&
      !(n.parentId && collapsedParents.has(n.parentId)),
  );
  return computeChartHeightHelper(
    visibleLeaves,
    (n) => computeColFor(n, nodes),
    {
      nodeHeight: NODE_HEIGHT_PX,
      rowGap: ROW_GAP_PX,
      parentHeader: PARENT_HEADER_PX,
      padding: LANE_BOX_PADDING_PX,
      visibleHalfWindow: VISIBLE_HALF,
      parentChartGap: PARENT_CHART_GAP_PX,
      borderTotal: LANE_BOX_BORDER_PX,
    },
    parentIds.size > 0,
  );
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
      const next = advanceChildren(h[i], initParentChildren);
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
  const TABLE_MAX_DEPTH = 2;
  const labelForCol = (col: number) => labelForColHelper(col, TABLE_MAX_DEPTH);
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
              // Auto-size to current content (parent header + chart row +
              // padding). Halves the previously hardcoded 180px gap on
              // single-row states.
              height: `${computeRowChartHeight(current())}px`,
              "min-width": "360px",
              "box-sizing": "border-box",
              transition: "height 0.45s ease-out",
            }}
          >
            <StatusFlowChart
              nodes={current()}
              columns={STATUS_COLUMNS}
              centerStatus="DOING"
              terminalStatus="DONE"
              nodeWidth={NODE_WIDTH_PX}
              nodeHeight={NODE_HEIGHT_PX}
              minArrowWidth={50}
              rowGap={ROW_GAP_PX}
              breakpoints={STATUS_BREAKPOINTS}
              colFor={(n) => computeColFor(n, current())}
            />
          </div>
        </div>
      </div>
    </>
  );
};

// ─── Row 3: two parent groups stacked ────────────────────────────────────
// Same single-parent chart as row 2 — just two instances, one per parent.
// Each parent has its own state machine; both advance on the shared tick.

const initParentA = (): StatusFlowNode[] => [
  { id: "pA", title: "Parent Task A", subtitle: "owns 3 children", status: "TODO" },
  ...Array.from({ length: 3 }, (_, i) => ({
    id: `a${i + 1}`,
    title: `A child ${i + 1}`,
    status: "TODO" as string,
    parentId: "pA",
    dependsOn: i === 0 ? undefined : [`a${i}`],
  })),
];

// Broom topology: b1, b2, b3 are independent roots (no deps);
// b4 depends on {b1, b2}; b5 on {b4}; b6 on {b3, b5}; b7 and b8 on {b6}.
// Not a linear chain — multiple children can be DOING simultaneously.
const initParentB = (): StatusFlowNode[] => [
  { id: "pB", title: "Parent Task B", subtitle: "owns 8 children", status: "TODO" },
  { id: "b1", title: "B child 1", status: "TODO", parentId: "pB" },
  { id: "b2", title: "B child 2", status: "TODO", parentId: "pB" },
  { id: "b3", title: "B child 3", status: "TODO", parentId: "pB" },
  { id: "b4", title: "B child 4", status: "TODO", parentId: "pB", dependsOn: ["b1", "b2"] },
  { id: "b5", title: "B child 5", status: "TODO", parentId: "pB", dependsOn: ["b4"] },
  { id: "b6", title: "B child 6", status: "TODO", parentId: "pB", dependsOn: ["b3", "b5"] },
  { id: "b7", title: "B child 7", status: "TODO", parentId: "pB", dependsOn: ["b6"] },
  { id: "b8", title: "B child 8", status: "TODO", parentId: "pB", dependsOn: ["b6"] },
];

// Standalone chain: 4 tasks with NO parent — t1 → t2 → t3 → t4.
// They form a linear dep chain but aren't grouped under a parent task,
// so no curly brace renders above; just the chain itself.
const initStandaloneChain = (): StatusFlowNode[] =>
  Array.from({ length: 4 }, (_, i) => ({
    id: `t${i + 1}`,
    title: `Task ${i + 1}`,
    status: "TODO" as string,
    dependsOn: i === 0 ? undefined : [`t${i}`],
  }));

// Chores: 3 independent tasks (no parent, no dependsOn). All start
// TODO, all become DOING in parallel on the first tick, then finish
// one per tick. computeColFor falls back to status-based positioning
// for any dataset with no dependsOn anywhere, so the chores stack
// vertically within their current status column.
const initChores = (): StatusFlowNode[] => [
  { id: "ch1", title: "Chore 1", status: "TODO" },
  { id: "ch2", title: "Chore 2", status: "TODO" },
  { id: "ch3", title: "Chore 3", status: "TODO" },
];

const TwoParentsRow: Component = () => {
  const [histA, setHistA] = createSignal<StatusFlowNode[][]>([initParentA()]);
  const [histB, setHistB] = createSignal<StatusFlowNode[][]>([initParentB()]);
  const [histS, setHistS] = createSignal<StatusFlowNode[][]>([initStandaloneChain()]);
  const [histC, setHistC] = createSignal<StatusFlowNode[][]>([initChores()]);
  const [idx, setIdx] = createSignal(0);
  const [playing, setPlaying] = createSignal(true);

  const currA = () => histA()[idx()];
  const currB = () => histB()[idx()];
  const currS = () => histS()[idx()];
  const currC = () => histC()[idx()];

  const advance = () => {
    const i = idx();
    const hA = histA();
    const hB = histB();
    const hS = histS();
    const hC = histC();
    if (i + 1 < Math.min(hA.length, hB.length, hS.length, hC.length)) {
      setIdx(i + 1);
    } else {
      setHistA([...hA, advanceChildren(hA[i], initParentA)]);
      setHistB([...hB, advanceChildren(hB[i], initParentB)]);
      setHistS([...hS, advanceChildren(hS[i], initStandaloneChain)]);
      setHistC([...hC, advanceChildren(hC[i], initChores)]);
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

  const TABLE_MAX_DEPTH = 2;
  const labelForCol = (col: number) => labelForColHelper(col, TABLE_MAX_DEPTH);

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
    background: "rgba(255,255,255,0.04)",
  };
  const colStyleFor = (col: number) => ({
    ...cellStyle,
    "text-align": "right" as const,
    color:
      Math.abs(col) > TABLE_MAX_DEPTH
        ? "rgba(255,255,255,0.35)"
        : col === 0
          ? "var(--sui-accent, #00d4ff)"
          : col < 0
            ? "rgba(255,255,255,0.55)"
            : "rgba(95,179,124,0.85)",
    "font-weight": 600,
  });

  const rowsFor = (nodes: StatusFlowNode[]) => {
    const effective = resolveParentStatuses(nodes, "DOING");
    return nodes.map((n) => ({
      id: n.id,
      title: n.title,
      status: n.status,
      effectiveStatus: effective.get(n.id) ?? n.status,
      col: computeColFor(n, nodes),
    }));
  };

  const ChartBox: Component<{ nodes: StatusFlowNode[] }> = (p) => (
    <div
      style={{
        width: "100%",
        height: `${computeRowChartHeight(p.nodes)}px`,
        "min-width": "360px",
        "box-sizing": "border-box",
        transition: "height 0.45s ease-out",
      }}
    >
      <StatusFlowChart
        nodes={p.nodes}
        columns={STATUS_COLUMNS}
        centerStatus="DOING"
        terminalStatus="DONE"
        nodeWidth={NODE_WIDTH_PX}
        nodeHeight={NODE_HEIGHT_PX}
        minArrowWidth={50}
        rowGap={ROW_GAP_PX}
        breakpoints={STATUS_BREAKPOINTS}
        colFor={(n) => computeColFor(n, p.nodes)}
      />
    </div>
  );

  return (
    <>
      <div class="workshop-grid__cell">
        <SubsectionTitle>StatusFlowChart — mixed shapes</SubsectionTitle>
        <p style={{ "font-size": "12px", color: "rgba(255,255,255,0.6)", margin: "8px 0" }}>
          Four lanes demonstrating different shapes — all sharing one tick:
          (1) Parent Task A owns 3 children;
          (2) Parent Task B owns 8 children;
          (3) 4 standalone tasks in a dep chain (no parent → no brace);
          (4) 3 chores with no deps and no parent — independent, run in
          parallel, stack vertically inside their status column.
        </p>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={headStyle}>Task</th>
              <th style={headStyle}>Status</th>
              <th style={{ ...headStyle, "text-align": "right" }}>Col</th>
            </tr>
          </thead>
          <tbody>
            {[...rowsFor(currA()), ...rowsFor(currB()), ...rowsFor(currS()), ...rowsFor(currC())].map((r) => (
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
              frame {idx() + 1} / {Math.min(histA().length, histB().length)}
            </span>
          </div>
          <ChartBox nodes={currA()} />
          <ChartBox nodes={currB()} />
          <ChartBox nodes={currS()} />
          <ChartBox nodes={currC()} />
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
        <TwoParentsRow />
      </div>
    </div>
  );
};
