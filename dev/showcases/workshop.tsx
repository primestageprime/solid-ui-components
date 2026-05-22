import { Component, createEffect, createSignal, onCleanup } from "solid-js";
import { SectionTitle, SubsectionTitle } from "../../src/components/Text";
import { JsonPanel } from "./swimlane-chart";
import {
  StatusFlowChart,
  resolveParentStatuses,
  pickVisibleCols,
  type StatusFlowNode,
  type StatusFlowColumn,
  type StatusFlowBreakpoint,
} from "../../src/components/StatusFlowChart";
import {
  computeColFor as computeColForHelper,
  computeChartHeight as computeChartHeightHelper,
  labelForCol as labelForColHelper,
} from "./workshop-layout";

const TICK_MS = 3000;

// ─── Datasets ────────────────────────────────────────────────────────────
// The animated linear-chain swimlane demo (formerly row 1) has been moved
// to the SwimlaneChart showcase. Workshop rows below are
// StatusFlowChart-focused.

// ─── StatusFlowChart demo (row 2) ────────────────────────────────────────
// Single parent + 8 children. Each tick advances one child through
// TODO → DOING → DONE. The parent's effective status is auto-derived:
// any DOING child → DOING; all children DONE → DONE (children collapse
// into a +8 badge); all TODO → TODO; etc.

// ─── Shared layout constants ────────────────────────────────────────────
// Single source of truth for sizing. Both row 2 and row 3 read from
// these, and the lane-box CSS `gap` value matches PARENT_CHART_GAP_PX.

const NODE_WIDTH_PX = 160;
const NODE_HEIGHT_PX = 56;
const ROW_GAP_PX = 64;
const PARENT_HEADER_PX = 56;
// 4px top + 4px bottom on the lane box's padding.
const LANE_BOX_PADDING_PX = 8;
// Minimum horizontal gap reserved for an arrow between two adjacent
// node centers. ColumnGap = nodeWidth + minArrowWidth.
const MIN_ARROW_WIDTH_PX = 50;
const COLUMN_GAP_PX = NODE_WIDTH_PX + MIN_ARROW_WIDTH_PX;
// Summary-dot dimensions: STUB_LENGTH (28) is the length of the stub
// arrow that connects the outermost visible node to the badge; the
// badge itself has diameter 2*BADGE_RADIUS (= 22).
const STUB_LENGTH_PX = 28;
const BADGE_RADIUS_PX = 11;
const BADGE_DIAMETER_PX = BADGE_RADIUS_PX * 2;
const BADGE_EXTENT_PX = STUB_LENGTH_PX + BADGE_DIAMETER_PX; // 50
// Where the badge sits relative to the outermost visible node's center:
// half the node width past the node edge + stub length + badge radius.
const SUMMARY_BADGE_OFFSET_PX = NODE_WIDTH_PX / 2 + STUB_LENGTH_PX + BADGE_RADIUS_PX;
// Horizontal padding the chart reserves on each side of the content
// area, matching SwimlaneChart's H_PADDING_PX.
const H_PADDING_PX = 32;
// 1px top + 1px bottom border on the lane box. With box-sizing:
// border-box, the border eats into the inside height — we add it back
// here so the chart row gets its full nodeHeight and doesn't clip.
const LANE_BOX_BORDER_PX = 2;
// Vertical breathing room between the parent header and the chart row,
// matching the `gap` declared on `.sui-statusflow__lane-box`. ~1rem.
const PARENT_CHART_GAP_PX = 16;
const VISIBLE_HALF = 2; // matches visibleCols=5 cap in STATUS_BREAKPOINTS

const STATUS_COLUMNS: StatusFlowColumn[] = [
  { label: "Done", statuses: ["DONE"] },
  { label: "Doing", statuses: ["DOING"] },
  { label: "Todo", statuses: ["TODO"] },
];

// Breakpoints derived directly from the horizontal-budget formula so
// the demo can never declare a visibleCols value that won't actually
// fit. For depth d, the chart needs:
//     2·d·columnGap + nodeWidth + 2·badgeExtent + 2·sidePadding
// At column 5 (depth 2) that's 4·210 + 160 + 2·50 + 2·32 = 1164px.
// Up to a hard cap of visibleCols = 5 — DOING + 2 cols of context.
const computeStatusBreakpoints = (maxVisibleCols: number): StatusFlowBreakpoint[] => {
  const bps: StatusFlowBreakpoint[] = [{ minWidth: 0, visibleCols: 1 }];
  const maxDepth = Math.floor((maxVisibleCols - 1) / 2);
  for (let d = 1; d <= maxDepth; d++) {
    bps.push({
      minWidth:
        2 * d * COLUMN_GAP_PX +
        NODE_WIDTH_PX +
        2 * BADGE_EXTENT_PX +
        2 * H_PADDING_PX,
      visibleCols: 2 * d + 1,
    });
  }
  return bps;
};
const STATUS_BREAKPOINTS: StatusFlowBreakpoint[] = computeStatusBreakpoints(5);

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
  const [playing, setPlaying] = createSignal(false);

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
  const [playing, setPlaying] = createSignal(false);

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

// ─── Row 4: Frame Explorer ───────────────────────────────────────────────
// Static side-by-side rendering of every interesting state in each
// example's lifecycle. Frames are generated deterministically by walking
// the state machine until it cycles back to the initial state. Each row
// has a short ID (A0, A1, …; B0, B1, …) so we can reference them when
// discussing visuals.

// Per-frame math: counts visible leaves per col, computes the same
// numbers the chart's auto-sizer derives from container width. Pure —
// no Solid signals here so it's safe to call inside render.
const computeFrameMath = (
  nodes: StatusFlowNode[],
  width: number,
): {
  visibleCols: number;
  maxDepth: number;
  byCol: { col: number; ids: string[] }[];
  maxStack: number;
  chartContent: number;
  parentHeader: number;
  gap: number;
  padding: number;
  border: number;
  total: number;
  hasParent: boolean;
} => {
  const visibleCols = pickVisibleCols(width, STATUS_BREAKPOINTS);
  const maxDepth = Math.max(0, Math.floor((visibleCols - 1) / 2));
  const parentIds = new Set<string>();
  for (const n of nodes) if (n.parentId) parentIds.add(n.parentId);
  const hasParent = parentIds.size > 0;
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
  const byColMap = new Map<number, string[]>();
  for (const n of visibleLeaves) {
    const col = computeColFor(n, nodes);
    if (Math.abs(col) > maxDepth) continue;
    const list = byColMap.get(col) ?? [];
    list.push(n.id);
    byColMap.set(col, list);
  }
  const byCol = Array.from(byColMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([col, ids]) => ({ col, ids }));
  const maxStack = byCol.length > 0
    ? Math.max(...byCol.map((c) => c.ids.length))
    : 0;
  const chartContent =
    maxStack > 0 ? (maxStack - 1) * ROW_GAP_PX + NODE_HEIGHT_PX : 0;
  const gap = hasParent && byCol.length > 0 ? PARENT_CHART_GAP_PX : 0;
  const border = hasParent ? LANE_BOX_BORDER_PX : 0;
  let total = chartContent + LANE_BOX_PADDING_PX;
  if (hasParent) total += PARENT_HEADER_PX + gap + border;
  return {
    visibleCols,
    maxDepth,
    byCol,
    maxStack,
    chartContent,
    parentHeader: hasParent ? PARENT_HEADER_PX : 0,
    gap,
    padding: LANE_BOX_PADDING_PX,
    border,
    total,
    hasParent,
  };
};

// Column-label strip rendered below each chart. Aligned to the chart's
// col x positions: col 0 sits at the chart's horizontal center, col ±c
// sits at center ± c*COLUMN_GAP_PX, and the -S/+S summary labels sit at
// the same x position as the side-summary badges that SwimlaneChart
// draws. Only renders labels that should be visible at the current
// `maxDepth`, plus −S/+S when there's at least one collapsed node on
// that side.
const ColLabelStrip: Component<{
  nodes: StatusFlowNode[];
  width: number;
}> = (p) => {
  const m = () => computeFrameMath(p.nodes, p.width);
  const labels = () => {
    const md = m().maxDepth;
    // Always emit a symmetrical strip: -S and +S slots are present on
    // every frame regardless of whether nodes are collapsed on that
    // side, so resize-driven changes only shift label positions — they
    // never add or remove a slot from one side and not the other.
    const out: { label: string; x: number; isSummary: boolean }[] = [
      {
        label: "-S",
        x: -md * COLUMN_GAP_PX - SUMMARY_BADGE_OFFSET_PX,
        isSummary: true,
      },
    ];
    for (let c = -md; c <= md; c++) {
      out.push({
        label: c === 0 ? "0" : c > 0 ? `+${c}` : `${c}`,
        x: c * COLUMN_GAP_PX,
        isSummary: false,
      });
    }
    out.push({
      label: "+S",
      x: md * COLUMN_GAP_PX + SUMMARY_BADGE_OFFSET_PX,
      isSummary: true,
    });
    return out;
  };
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "18px",
        "font-family": "ui-monospace, SFMono-Regular, monospace",
        "font-size": "10px",
        "margin-top": "2px",
      }}
    >
      {labels().map((l) => (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: `calc(50% + ${l.x}px)`,
            transform: "translateX(-50%)",
            color: l.isSummary
              ? "rgba(255,255,255,0.45)"
              : l.label === "0"
                ? "var(--sui-accent, #00d4ff)"
                : "rgba(255,255,255,0.6)",
            "font-weight": l.label === "0" ? 600 : 400,
          }}
        >
          {l.label}
        </div>
      ))}
    </div>
  );
};

const FrameMathPanel: Component<{ nodes: StatusFlowNode[]; width: number }> = (p) => {
  const m = () => computeFrameMath(p.nodes, p.width);
  const labelForCol = (col: number) => labelForColHelper(col, m().maxDepth);
  const cellStyle = {
    "font-family": "ui-monospace, SFMono-Regular, monospace",
    "font-size": "10px",
    "line-height": "1.5",
    color: "rgba(255,255,255,0.75)",
  } as const;

  const effective = () => resolveParentStatuses(p.nodes, "DOING");
  const nodeDecisions = () => {
    const eff = effective();
    return p.nodes.map((n) => {
      const col = computeColFor(n, p.nodes);
      const visible = Math.abs(col) <= m().maxDepth;
      return {
        id: n.id,
        title: n.title,
        status: eff.get(n.id) ?? n.status,
        col,
        visible,
      };
    });
  };

  const slotsList = () => {
    const d = m().maxDepth;
    return Array.from({ length: d * 2 + 1 }, (_, i) =>
      labelForCol(i - d),
    ).join(", ");
  };

  return (
    <div
      style={{
        ...cellStyle,
        width: "100%",
        "box-sizing": "border-box",
        "background": "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
        "border-radius": "4px",
        padding: "4px 8px",
      }}
    >
      <div>width = {p.width}px</div>
      <div>
        visibleCols = {m().visibleCols} · maxDepth = ±{m().maxDepth}
      </div>

      <div style={{ "margin-top": "4px", color: "rgba(255,255,255,0.55)" }}>
        horizontal budget:
      </div>
      <div style={{ "padding-left": "8px" }}>node = {NODE_WIDTH_PX}px</div>
      <div style={{ "padding-left": "8px" }}>arrow = {MIN_ARROW_WIDTH_PX}px</div>
      <div style={{ "padding-left": "8px" }}>
        columnGap = node + arrow = {COLUMN_GAP_PX}px
      </div>
      <div style={{ "padding-left": "8px" }}>
        summary dot = stub({STUB_LENGTH_PX}) + ⌀{BADGE_DIAMETER_PX} = {BADGE_EXTENT_PX}px
      </div>
      <div style={{ "padding-left": "8px" }}>
        side padding = {H_PADDING_PX}px (×2 = {H_PADDING_PX * 2})
      </div>
      <div style={{ "padding-left": "8px" }}>
        minWidth(±{m().maxDepth}) = {2 * m().maxDepth}·{COLUMN_GAP_PX} +{" "}
        {NODE_WIDTH_PX} + 2·{BADGE_EXTENT_PX} + 2·{H_PADDING_PX} ={" "}
        <strong>
          {2 * m().maxDepth * COLUMN_GAP_PX + NODE_WIDTH_PX + 2 * BADGE_EXTENT_PX + 2 * H_PADDING_PX}px
        </strong>
      </div>

      <div style={{ "margin-top": "4px", color: "rgba(255,255,255,0.55)" }}>
        slots ({m().visibleCols}):
      </div>
      <div style={{ "padding-left": "8px" }}>[{slotsList()}]</div>

      <div style={{ "margin-top": "4px", color: "rgba(255,255,255,0.55)" }}>
        switch (status → col):
      </div>
      {nodeDecisions().map((d) => (
        <div
          style={{
            "padding-left": "8px",
            color: d.visible
              ? "rgba(255,255,255,0.85)"
              : "rgba(255,255,255,0.45)",
          }}
        >
          {d.id} ({d.status}) → {labelForCol(d.col)}
          {!d.visible && " ⤳ summary"}
        </div>
      ))}

      <div style={{ "margin-top": "4px", color: "rgba(255,255,255,0.55)" }}>
        byCol (in slot):
      </div>
      {m().byCol.map((c) => (
        <div style={{ "padding-left": "8px" }}>
          {labelForCol(c.col)} → [{c.ids.join(", ")}] ({c.ids.length})
        </div>
      ))}
      {m().byCol.length === 0 && (
        <div style={{ "padding-left": "8px", color: "rgba(255,255,255,0.4)" }}>
          (no visible leaves)
        </div>
      )}

      <div style={{ "margin-top": "4px", color: "rgba(255,255,255,0.55)" }}>
        stack:
      </div>
      <div style={{ "padding-left": "8px" }}>maxStack = {m().maxStack}</div>
      <div style={{ "padding-left": "8px" }}>
        chartContent = {m().maxStack > 0 ? `(${m().maxStack}−1)×${ROW_GAP_PX} + ${NODE_HEIGHT_PX}` : "0"}{" "}
        = {m().chartContent}
      </div>

      <div style={{ "margin-top": "4px", color: "rgba(255,255,255,0.55)" }}>
        height = chart + padding{m().hasParent ? " + parent + gap + border" : ""}:
      </div>
      <div style={{ "padding-left": "8px" }}>
        = {m().chartContent} + {m().padding}
        {m().hasParent && ` + ${m().parentHeader} + ${m().gap} + ${m().border}`}{" "}
        = <strong>{m().total}px</strong>
      </div>
    </div>
  );
};

const BreakpointsPanel: Component<{ width: number }> = (p) => {
  const active = () => pickVisibleCols(p.width, STATUS_BREAKPOINTS);
  const sorted = [...STATUS_BREAKPOINTS].sort((a, b) => a.minWidth - b.minWidth);
  const cell = {
    padding: "4px 10px",
    "border-bottom": "1px solid rgba(255,255,255,0.06)",
    "font-family": "ui-monospace, SFMono-Regular, monospace",
    "font-size": "11px",
    color: "var(--sui-text, #e6ecf5)",
  } as const;
  const head = {
    ...cell,
    "font-size": "10px",
    "letter-spacing": "0.06em",
    "text-transform": "uppercase" as const,
    color: "rgba(255,255,255,0.5)",
    background: "rgba(255,255,255,0.04)",
    "text-align": "left" as const,
  };
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        "border-radius": "6px",
        padding: "10px 14px",
        "margin-bottom": "12px",
      }}
    >
      <div
        style={{
          "font-size": "10px",
          "letter-spacing": "0.08em",
          "text-transform": "uppercase",
          color: "rgba(255,255,255,0.55)",
          "margin-bottom": "8px",
        }}
      >
        Breakpoints — container width: {p.width}px
      </div>
      <table style={{ "border-collapse": "collapse", width: "100%" }}>
        <thead>
          <tr>
            <th style={head}>min-width</th>
            <th style={head}>visibleCols</th>
            <th style={head}>maxDepth</th>
            <th style={head}>visible col labels</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((bp) => {
            const isActive = bp.visibleCols === active();
            const depth = Math.max(0, Math.floor((bp.visibleCols - 1) / 2));
            const labels = depth === 0
              ? "0"
              : Array.from({ length: depth * 2 + 1 }, (_, i) =>
                  i - depth === 0 ? "0" : i - depth > 0 ? `+${i - depth}` : `${i - depth}`,
                ).join(", ");
            return (
              <tr style={{ background: isActive ? "rgba(0,212,255,0.08)" : "transparent" }}>
                <td style={cell}>≥ {bp.minWidth}px</td>
                <td style={cell}>{bp.visibleCols}</td>
                <td style={cell}>±{depth}</td>
                <td style={{ ...cell, color: isActive ? "var(--sui-accent, #00d4ff)" : cell.color }}>
                  {labels}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const FrameRow: Component<{
  id: string;
  nodes: StatusFlowNode[];
  width: number;
  /** Optional callback so the FIRST frame can register its chart div
   *  with the FrameExplorerRow's ResizeObserver. All FrameRows share
   *  the same flex layout, so one measurement applies to all. */
  chartRef?: (el: HTMLDivElement) => void;
}> = (p) => {
  const effective = resolveParentStatuses(p.nodes, "DOING");
  // maxDepth comes from the chart's runtime width via the same pipe
  // as the chart itself, so the table's col labels match what's
  // actually rendered (e.g. +2 collapses to +S when visibleCols=3).
  const tableMaxDepth = () => {
    const vc = pickVisibleCols(p.width, STATUS_BREAKPOINTS);
    return Math.max(0, Math.floor((vc - 1) / 2));
  };
  const tableRows = () =>
    p.nodes.map((n) => ({
      id: n.id,
      title: n.title,
      inputStatus: n.status,
      effectiveStatus: effective.get(n.id) ?? n.status,
      col: computeColFor(n, p.nodes),
    }));

  const tableStyle = {
    "border-collapse": "collapse" as const,
    "font-family": "ui-monospace, SFMono-Regular, monospace",
    "font-size": "10px",
    "min-width": "260px",
    "flex-shrink": 0,
  };
  const cellStyle = {
    padding: "2px 6px",
    "border-bottom": "1px solid rgba(255,255,255,0.06)",
    color: "var(--sui-text, #e6ecf5)",
  };
  const headStyle = {
    ...cellStyle,
    "font-size": "9px",
    "letter-spacing": "0.06em",
    "text-transform": "uppercase" as const,
    color: "rgba(255,255,255,0.45)",
    background: "rgba(255,255,255,0.03)",
    "text-align": "left" as const,
  };
  const colStyleFor = (col: number) => ({
    ...cellStyle,
    "text-align": "right" as const,
    color:
      Math.abs(col) > tableMaxDepth()
        ? "rgba(255,255,255,0.35)"
        : col === 0
          ? "var(--sui-accent, #00d4ff)"
          : col < 0
            ? "rgba(255,255,255,0.55)"
            : "rgba(95,179,124,0.85)",
    "font-weight": 600,
  });
  const labelForCol = (col: number) => labelForColHelper(col, tableMaxDepth());

  return (
    <div
      style={{
        display: "flex",
        "align-items": "flex-start",
        gap: "12px",
        "margin-bottom": "12px",
      }}
    >
      <div
        style={{
          "font-family": "ui-monospace, SFMono-Regular, monospace",
          "font-size": "11px",
          color: "var(--sui-accent, #00d4ff)",
          width: "32px",
          "flex-shrink": 0,
          "text-align": "right",
          "padding-top": "10px",
        }}
      >
        {p.id}
      </div>
      <div
        style={{
          flex: 1,
          "min-width": "360px",
          "box-sizing": "border-box",
          display: "flex",
          "flex-direction": "column",
        }}
      >
        <div
          ref={(el) => p.chartRef?.(el)}
          style={{
            height: `${computeRowChartHeight(p.nodes)}px`,
            width: "100%",
          }}
        >
          <StatusFlowChart
            nodes={p.nodes}
            columns={STATUS_COLUMNS}
            centerStatus="DOING"
            terminalStatus="DONE"
            nodeWidth={NODE_WIDTH_PX}
            nodeHeight={NODE_HEIGHT_PX}
            minArrowWidth={MIN_ARROW_WIDTH_PX}
            rowGap={ROW_GAP_PX}
            breakpoints={STATUS_BREAKPOINTS}
            colFor={(n) => computeColFor(n, p.nodes)}
          />
        </div>
        <ColLabelStrip nodes={p.nodes} width={p.width} />
      </div>
      <div
        style={{
          display: "flex",
          "flex-direction": "column",
          gap: "6px",
          "min-width": "240px",
          width: "240px",
          "flex-shrink": 0,
        }}
      >
        <FrameMathPanel nodes={p.nodes} width={p.width} />
        <table style={{ ...tableStyle, "min-width": "0", width: "100%" }}>
          <thead>
            <tr>
              <th style={headStyle}>Task</th>
              <th style={headStyle}>Status</th>
              <th style={{ ...headStyle, "text-align": "right" }}>Col</th>
            </tr>
          </thead>
          <tbody>
            {tableRows().map((r) => (
              <tr>
                <td style={cellStyle}>{r.title}</td>
                <td style={cellStyle}>
                  {r.effectiveStatus}
                  {r.inputStatus !== r.effectiveStatus && (
                    <span style={{ color: "rgba(255,255,255,0.3)", "margin-left": "4px" }}>
                      ({r.inputStatus})
                    </span>
                  )}
                </td>
                <td style={colStyleFor(r.col)}>{labelForCol(r.col)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const RulesPanel: Component = () => (
  <div
    style={{
      "font-size": "11px",
      "line-height": "1.6",
      color: "rgba(255,255,255,0.75)",
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.08)",
      "border-radius": "6px",
      padding: "10px 14px",
      "margin-bottom": "12px",
    }}
  >
    <div
      style={{
        "font-size": "10px",
        "letter-spacing": "0.08em",
        "text-transform": "uppercase",
        color: "rgba(255,255,255,0.55)",
        "margin-bottom": "8px",
      }}
    >
      Layout rules
    </div>

    <strong style={{ color: "var(--sui-accent, #00d4ff)" }}>Node placement</strong>
    <ol style={{ margin: "4px 0 10px", "padding-left": "20px" }}>
      <li>
        <strong>Parent</strong> column = status-based on its{" "}
        <em>effective</em> status: DONE → −1, DOING → 0, TODO → +1.
        Effective status auto-derives from children: any DOING child →
        DOING; all children share one status → that status; otherwise
        parent's input status.
      </li>
      <li>
        <strong>Leaf with status DOING</strong> → col <code>0</code>. Multiple
        DOING leaves stack vertically at col 0.
      </li>
      <li>
        <strong>Leaf with status DONE</strong> → rank by topo depth among
        DONE leaves, sorted <em>descending</em>. Highest-depth DONE → col
        −1, next → −2, etc. Same (depth, status) → same col → stack.
      </li>
      <li>
        <strong>Leaf with status TODO</strong> → rank by topo depth among
        TODO leaves, sorted <em>ascending</em>. Lowest-depth TODO → col
        +1, next → +2, etc. Same (depth, status) → same col → stack.
      </li>
      <li>
        <strong>Visible window</strong>: cols within ±maxDepth (currently
        ±2 → 5 visible cols). Anything beyond ±maxDepth is hidden and
        contributes to the side summary badge.
      </li>
      <li>
        <strong>Side summary</strong>: every hidden node on the left side
        (col &lt; 0) counts into ONE <code>−S</code> badge anchored on
        the outermost-left visible node. Same for the right (<code>+S</code>).
      </li>
      <li>
        <strong>Parent collapse</strong>: when the parent's effective
        status equals <code>terminalStatus</code> (DONE), children are
        hidden and the parent renders with a <code>+N</code> badge.
      </li>
    </ol>

    <strong style={{ color: "var(--sui-accent, #00d4ff)" }}>Edges</strong>
    <ol style={{ margin: "4px 0 0", "padding-left": "20px" }}>
      <li>
        <strong>Visible → visible</strong>: arrow drawn from source's right
        edge to target's left edge along a Bezier path.
      </li>
      <li>
        <strong>Visible → hidden</strong> (target collapsed to ±S): arrow
        ends at the side-summary badge, NOT at the hidden node itself.
        The badge absorbs every cross-edge for hidden nodes on that side.
      </li>
      <li>
        <strong>Hidden → visible</strong> (source collapsed to ±S): arrow
        starts from the side-summary badge.
      </li>
      <li>
        <strong>Hidden → hidden</strong>: no arrow rendered (both endpoints
        are inside the same summary).
      </li>
      <li>
        Arrows DO NOT spawn duplicate per-edge summary stubs; each side
        has exactly one badge regardless of how many cross-edges target
        hidden nodes.
      </li>
    </ol>
  </div>
);

// Hand-picked broom snapshots that exhibit "edge passes through unrelated
// node" cases — used as anchors when iterating on edge routing.
const makeBroomFrame = (statuses: Partial<Record<string, string>>): StatusFlowNode[] =>
  initParentB().map((n) =>
    n.parentId === "pB" || n.id !== "pB"
      ? { ...n, status: statuses[n.id] ?? n.status }
      : n,
  );

// 1. b3 (DOING, col 0) → b6 (TODO, col +2): line crosses b5 at col +1.
const BROOM_CASE_1 = makeBroomFrame({
  b1: "DONE", b2: "DONE", b3: "DOING", b4: "DOING",
  b5: "TODO", b6: "TODO", b7: "TODO", b8: "TODO",
});
// 2. b3 (DONE, col -2) → b6 (TODO, col +2): line crosses b4 and b5.
const BROOM_CASE_2 = makeBroomFrame({
  b1: "DONE", b2: "DONE", b3: "DONE", b4: "DOING",
  b5: "TODO", b6: "TODO", b7: "TODO", b8: "TODO",
});
// 3. Tail end of the broom: only b6, b7, b8 visible; b1..b5 collapse to −S.
const BROOM_CASE_3 = makeBroomFrame({
  b1: "DONE", b2: "DONE", b3: "DONE", b4: "DONE",
  b5: "DONE", b6: "DONE", b7: "DONE", b8: "DOING",
});

const BROOM_CASES: { id: string; nodes: StatusFlowNode[]; note: string }[] = [
  { id: "B1", nodes: BROOM_CASE_1, note: "b3 → b6 crosses b5" },
  { id: "B2", nodes: BROOM_CASE_2, note: "b3 → b6 crosses b4 + b5" },
  { id: "B3", nodes: BROOM_CASE_3, note: "tail end — clean routing" },
];

const FrameExplorerRow: Component = () => {
  // Track the actual DAG (chart) container width — not the whole row,
  // since the row also has the id column + state table + math panel.
  // All FrameRows share one flex layout so measuring the first chart's
  // div gives us the canonical chart width for every frame's math.
  const [width, setWidth] = createSignal(0);
  let firstChart: HTMLDivElement | undefined;
  let ro: ResizeObserver | undefined;
  const attachFirstChart = (el: HTMLDivElement) => {
    if (firstChart || !el) return;
    firstChart = el;
    setWidth(el.clientWidth);
    ro = new ResizeObserver(([entry]) => {
      if (entry) setWidth(entry.contentRect.width);
    });
    ro.observe(el);
  };
  onCleanup(() => ro?.disconnect());

  return (
    <>
      <div class="workshop-grid__cell">
        <SubsectionTitle>Frame explorer — edge routing cases</SubsectionTitle>
        <p style={{ "font-size": "12px", color: "rgba(255,255,255,0.6)", margin: "8px 0" }}>
          Hand-picked broom snapshots that exercise edge routing. The first
          two cases draw a line from a source node straight through an
          unrelated visible node — these are the configurations to verify
          when iterating on the orthogonal-routing detour.
        </p>
        <RulesPanel />
      </div>
      <div class="workshop-grid__cell">
        <BreakpointsPanel width={width()} />
        {BROOM_CASES.map((c, i) => (
          <>
            <div
              style={{
                "font-size": "11px",
                "letter-spacing": "0.06em",
                "text-transform": "uppercase" as const,
                color: "rgba(255,255,255,0.5)",
                margin: "16px 0 6px",
              }}
            >
              {c.id} — {c.note}
            </div>
            <FrameRow
              id={c.id}
              nodes={c.nodes}
              width={width()}
              chartRef={i === 0 ? attachFirstChart : undefined}
            />
          </>
        ))}
      </div>
    </>
  );
};

export const WorkshopShowcase: Component = () => {
  return (
    <div class="component-section component-section--full">
      <SectionTitle>Workshop</SectionTitle>
      <div class="workshop-grid">
        <ParentChildrenRow />
        <TwoParentsRow />
        <FrameExplorerRow />
      </div>
    </div>
  );
};
