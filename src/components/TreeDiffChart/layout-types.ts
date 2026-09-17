// ============================================
// TreeDiffChart — the layout's output types, shared by the column layouts
// (`layout.ts`) and the narrow layout (`narrow.ts`). Pure types.
// ============================================
import type { TreeDiffLayoutMode } from "./frame";
import type {
  TreeDiffBand,
  TreeDiffChild,
  TreeDiffKind,
  TreeDiffSide,
} from "./types";

export type LayoutNodeKind =
  | "head"
  | "commit"
  | "root"
  | "group"
  | "leaf"
  | "same";

export type LayoutNode = {
  id: string;
  label: string;
  hash: string;
  kind: LayoutNodeKind;
  side: TreeDiffSide;
  /** Center x. */
  x: number;
  /** Center y. */
  y: number;
  width: number;
  height: number;
  /**
   * Consumer-supplied change kind, carried straight through from the entry.
   * Undefined on nodes the chart mints (the spine, the pruned node) and on
   * entries the consumer left unkinded — both paint by side.
   */
  changeKind?: TreeDiffKind;
  /**
   * True when `label` is a consumer-supplied string of unknown length, so it
   * must ellipsize with a tooltip. False for the fixed strings the chart
   * mints ("commit", "root tree", "[SAME]"), which stay plain SVG text.
   */
  labelFromData?: boolean;
};

export type LayoutEdge = {
  from: string;
  to: string;
  /** Paint side, taken from the target node. */
  side: TreeDiffSide;
  /**
   * Set on edges that leave a root in the compact layout: the x of the
   * vertical trunk the edge drops along before it turns level into its
   * target. Every edge from the same root shares one trunk, so they draw as
   * one line with branches.
   */
  trunkX?: number;
};

export type LayoutBand = {
  name: string;
  /** Right-aligned caption: "2 lines moved", "identical", "7 root entries · pruned". */
  note: string;
  /** Top y of the band. */
  y: number;
  height: number;
  /** True for the pruned [SAME] band. */
  same: boolean;
  labelX: number;
  labelY: number;
  labelAnchor: "start" | "middle";
  /** x of the right-aligned note; it shares `labelY`. */
  noteX: number;
};

/** A rule, the narrow layout's dashed center divider, or a joiner between a changed pair. */
export type LayoutGuide = {
  kind: "rule" | "divider" | "joiner";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

/** A side caption: "Baseline" / "Comparing" over a spine, or the scenario names over the narrow columns. */
export type LayoutCaption = {
  text: string;
  x: number;
  y: number;
  anchor: "start" | "middle" | "end";
  side: TreeDiffSide;
};

export type TreeDiffLayout = {
  mode: TreeDiffLayoutMode;
  width: number;
  height: number;
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  bands: LayoutBand[];
  guides: LayoutGuide[];
  captions: LayoutCaption[];
};

/** A band after ranking: its children sorted, its score and row count fixed. */
export type RankedBand = {
  band: TreeDiffBand;
  children: TreeDiffChild[];
  diverged: boolean;
  moved: number;
  movedNote: string;
  score: number;
  slots: number;
};
