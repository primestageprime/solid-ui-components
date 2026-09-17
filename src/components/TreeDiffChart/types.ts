// ============================================
// TreeDiffChart — public prop types.
//
// The consumer supplies a PRE-COMPUTED diff of two scenario trees. The chart
// owns nothing about how the diff is computed: it takes the two roots and one
// band per root entry, each band pairing the group node each side resolves
// and the children each group holds. Layout, pruning, ordering, routing and
// paint are the chart's concern.
//
// Pure types only — no Solid reactivity, no DOM, no side effects.
// ============================================

/**
 * How a node changed between the two sides. The chart NEVER infers this — it
 * is data the consumer supplies, because only the consumer knows what
 * "changed" means for its own trees. Omit it and the node paints by side
 * exactly as it did before kinds existed.
 *
 * Fixed colour semantics, keyed to the legend and to `--sui-*` tone tokens:
 * `unchanged` grey (muted), `changed` blue (accent), `added` green (success),
 * `removed` red (danger).
 */
export type TreeDiffKind = "unchanged" | "changed" | "added" | "removed";

/** One content-addressed tree node: a group or a leaf. */
export type TreeDiffEntry = {
  /** Stable id. Two sides that resolve the SAME id draw one shared node. */
  id: string;
  /** Title line of the node box. */
  label: string;
  /** Subtitle line of the node box, normally the short hash. */
  hash: string;
  /**
   * Optional change kind. Paints this node's outline and every edge pointing
   * AT it, and puts its swatch in the legend. Consumer-supplied; the chart
   * does not derive it. Absent = paint by side, as before.
   */
  kind?: TreeDiffKind;
};

/**
 * A child of a root-entry group, paired across the two sides by `name`.
 * Missing on one side = added or removed. Same id on both sides = shared.
 * Different ids on both sides = changed.
 */
export type TreeDiffChild = {
  name: string;
  baseline?: TreeDiffEntry;
  compare?: TreeDiffEntry;
};

/**
 * One root entry. `baseline` and `compare` are the group nodes each side
 * resolves for that entry; equal ids mean the subtree is identical and the
 * chart may prune it. The consumer passes EVERY root entry, identical ones
 * included; `mode` decides what the chart shows.
 */
export type TreeDiffBand = {
  name: string;
  baseline?: TreeDiffEntry;
  compare?: TreeDiffEntry;
  children: TreeDiffChild[];
};

/**
 * One side of the comparison. In the wide layout each side draws a spine of
 * three nodes: the head (scenario), its commit, and its root tree. Narrower
 * layouts fold the three into one chip titled `label`, subtitled with the
 * root hash and, when given, the commit hash.
 */
export type TreeDiffRoot = {
  /** Scenario name. Title of the head node and of the chip. */
  label: string;
  /** Root tree hash. */
  hash: string;
  /** Commit hash. Its own node in the wide layout; appended to the chip otherwise. */
  commit?: string;
  /** Subtitle of the head node in the wide layout, e.g. the scenario id. */
  ref?: string;
};

/**
 * `differences` prunes every identical root entry into one `[SAME]` node.
 * `full` draws every root entry, identical ones as shared grey subtrees.
 */
export type TreeDiffMode = "differences" | "full";

/** Which side a drawn node or edge belongs to. Drives the three-colour paint. */
export type TreeDiffSide = "baseline" | "compare" | "shared";

export type TreeDiffChartProps = {
  baseline: TreeDiffRoot;
  compare: TreeDiffRoot;
  bands: TreeDiffBand[];
  /** Defaults to `differences`. */
  mode?: TreeDiffMode;
  /**
   * Id of the selected node. Its counterpart on the other side lights with
   * it, the chain to the spine stays lit on both sides, and the rest dims.
   */
  selectedId?: string;
  /** When set, group and leaf nodes are focusable and fire on click / Enter / Space. */
  onNodeClick?: (id: string) => void;
  /**
   * Show the change-kind legend. Defaults to ON whenever any entry carries a
   * `kind`, and OFF otherwise — a chart with no kinds has nothing to key. Set
   * it explicitly only to suppress a legend you would otherwise get.
   */
  legend?: boolean;
};

/** Synthetic ids the layout mints for the spine nodes and the pruned node. */
export const ROOT_BASELINE_ID = "__root_baseline";
export const ROOT_COMPARE_ID = "__root_compare";
export const COMMIT_BASELINE_ID = "__commit_baseline";
export const COMMIT_COMPARE_ID = "__commit_compare";
export const HEAD_BASELINE_ID = "__head_baseline";
export const HEAD_COMPARE_ID = "__head_compare";
export const SAME_ID = "__same";
