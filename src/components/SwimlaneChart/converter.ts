/**
 * Client-friendly conversion: turn a `SwimlaneDagInput` (the JSON shape
 * documented in `docs/swimlane-dag-input.md` in dside) into the
 * `nodes` + `edges` + `swimlaneFor` triple that `SwimlaneChart` expects.
 *
 * Consumers describe their work using THEIR OWN statuses (any string)
 * plus a `stateMachine.order` listing those statuses from earliest to
 * latest and a `stateMachine.doing` field identifying the in-progress
 * focus. Everything to the LEFT of DOING in that ordering becomes
 * DONE-bucket (rendered on the left, signed-negative cols). Everything
 * to the RIGHT becomes TODO-bucket (rendered on the right,
 * signed-positive cols). DOING sits at col 0.
 *
 * Pure function. No side effects, no DOM, no Solid signals — call from
 * anywhere, including unit tests.
 */

import type { DAGEdge } from "../DagChart/types";
import { pipe, filter, map } from "../../fn";

// ---------------------------------------------------------------------------
// Public input types — the client-facing JSON shape.
// ---------------------------------------------------------------------------

export interface SwimlaneDagInput {
  nodes: SwimlaneDagNode[];
  edges: SwimlaneDagEdge[];
  lanes?: SwimlaneDagLane[];
}

export interface SwimlaneDagNode {
  id: string;
  title: string;
  subtitle?: string;
  /** Any string from the caller's state machine. */
  status: string;
  /**
   * Optional explicit lane. When omitted, lane is derived from the
   * status (via stateMachine) + the dependency DAG depth.
   */
  lane?: number | string;
  badges?: Array<{
    label: string;
    tone?: "default" | "success" | "warning" | "danger";
  }>;
  meta?: Record<string, string | number | boolean>;
}

export interface SwimlaneDagEdge {
  from: string;
  to: string;
  /** "dependency" drives layout depth; "containment" is decorative. */
  kind?: "dependency" | "containment" | (string & {});
}

export interface SwimlaneDagLane {
  id: number | string;
  label?: string;
  order?: number;
}

/** The caller's state machine. */
export interface SwimlaneStateMachine {
  /** Ordered list of statuses from "earliest" to "latest". */
  order: string[];
  /** Which status represents the in-progress focus (col 0). */
  doing: string;
}

// ---------------------------------------------------------------------------
// Converted output — what SwimlaneChart consumes.
// ---------------------------------------------------------------------------

export type SwimlaneBucket = "DONE" | "DOING" | "TODO";

export interface ConvertedNodeData {
  title: string;
  subtitle?: string;
  /** Original status string (for `renderNode` to use). */
  status: string;
  /** Coarse-grained bucket the status mapped to. */
  bucket: SwimlaneBucket;
  /** Signed col integer — pass to SwimlaneChart's swimlaneFor. */
  col: number;
  badges?: SwimlaneDagNode["badges"];
  meta?: SwimlaneDagNode["meta"];
}

export interface ConvertedNode {
  id: string;
  data: ConvertedNodeData;
}

export interface ConvertedResult {
  nodes: ConvertedNode[];
  edges: DAGEdge[];
  /** Drop this directly into SwimlaneChart's `swimlaneFor` prop. */
  swimlaneFor: (node: ConvertedNode) => number;
}

// ---------------------------------------------------------------------------
// Main converter
// ---------------------------------------------------------------------------

export function convertSwimlaneDagInput(
  input: SwimlaneDagInput,
  stateMachine: SwimlaneStateMachine,
): ConvertedResult {
  const { order, doing } = stateMachine;
  const doingIdx = order.indexOf(doing);
  if (doingIdx < 0) {
    throw new Error(
      `convertSwimlaneDagInput: stateMachine.doing "${doing}" not found in order`,
    );
  }

  // Status → bucket. Unknown statuses fall to TODO (defensive default).
  const bucketFor = (status: string): SwimlaneBucket => {
    const idx = order.indexOf(status);
    if (idx < 0) return "TODO";
    if (idx < doingIdx) return "DONE";
    if (idx === doingIdx) return "DOING";
    return "TODO";
  };

  // Topo depth from DEPENDENCY edges only. Containment edges are
  // decorative (they record decomposition, not scheduling order).
  const depthMap = computeTopoDepths(input.nodes, input.edges);

  // Per-bucket unique-depth → rank mapping. Same rule as
  // workshop-layout.ts so consumers get the familiar layout:
  //   DONE  → cols -1, -2, … (depths sorted DESC so highest-depth lands closest to center)
  //   TODO  → cols +1, +2, … (depths sorted ASC so lowest-depth lands closest to center)
  //   DOING → col 0 always.
  const byBucket: Record<SwimlaneBucket, SwimlaneDagNode[]> = {
    DONE: [],
    DOING: [],
    TODO: [],
  };
  for (const n of input.nodes) byBucket[bucketFor(n.status)].push(n);

  const uniqueDepths = (bucket: "DONE" | "TODO"): number[] => {
    const set = new Set<number>();
    for (const n of byBucket[bucket]) set.add(depthMap.get(n.id) ?? 0);
    return Array.from(set).sort((a, b) => (bucket === "DONE" ? b - a : a - b));
  };
  const doneRanks = uniqueDepths("DONE");
  const todoRanks = uniqueDepths("TODO");

  const colFor = (n: SwimlaneDagNode): number => {
    const bucket = bucketFor(n.status);
    if (bucket === "DOING") return 0;
    const depth = depthMap.get(n.id) ?? 0;
    if (bucket === "DONE") return -(doneRanks.indexOf(depth) + 1);
    return todoRanks.indexOf(depth) + 1;
  };

  const nodes: ConvertedNode[] = input.nodes.map((n) => ({
    id: n.id,
    data: {
      title: n.title,
      subtitle: n.subtitle,
      status: n.status,
      bucket: bucketFor(n.status),
      col: colFor(n),
      badges: n.badges,
      meta: n.meta,
    },
  }));

  // Only dependency edges feed the chart's edge graph. Containment
  // edges are dropped here (they could be re-introduced later via a
  // separate decorative-edges field if a renderer wants them).
  const edges: DAGEdge[] = pipe(
    input.edges,
    filter((e: SwimlaneDagEdge) => (e.kind ?? "dependency") === "dependency"),
    map((e: SwimlaneDagEdge) => ({ source: e.from, target: e.to })),
  );

  return {
    nodes,
    edges,
    swimlaneFor: (n) => n.data.col,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function computeTopoDepths(
  nodes: SwimlaneDagNode[],
  edges: SwimlaneDagEdge[],
): Map<string, number> {
  const visible = new Set(nodes.map((n) => n.id));
  const upstream = new Map<string, string[]>();
  for (const n of nodes) upstream.set(n.id, []);
  for (const e of edges) {
    if ((e.kind ?? "dependency") !== "dependency") continue;
    if (!visible.has(e.from) || !visible.has(e.to)) continue;
    upstream.get(e.to)!.push(e.from);
  }
  const memo = new Map<string, number>();
  const visit = (id: string): number => {
    const cached = memo.get(id);
    if (cached != null) return cached;
    memo.set(id, 0); // cycle guard
    const ups = upstream.get(id) ?? [];
    const d = ups.length === 0 ? 0 : 1 + Math.max(...ups.map(visit));
    memo.set(id, d);
    return d;
  };
  for (const n of nodes) visit(n.id);
  return memo;
}
