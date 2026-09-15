// lastReviewedAt: 2026-09-15
// lastReviewedBy: adlai.arnold
/**
 * TreeDiffChart — Atomic Primitive (Depth 1).
 *
 * Draws a pre-computed diff of two scenario trees as one SVG: the baseline
 * root on the left, the comparison root on the right, one band per root
 * entry between them, and a pruned [SAME] node for every identical entry.
 * Owns its own CSS and consumes the arrowhead marker from
 * `src/internal/dag-svg`, a utility module rather than a Primitive.
 *
 * The consumer computes the diff. This component owns layout (`layout.ts`),
 * edge routing (`route.ts`) and paint. Nodes are plain SVG rect + text, so
 * the SVG coordinate system is the whole layout engine.
 */
import { createMemo, For, Show, type JSX } from "solid-js";
import { filter, join, map } from "../../fn";
import { DagArrowMarker, DagSvgEdge } from "../../internal/dag-svg";
import {
  computeTreeDiffLayout,
  type LayoutNode,
  type TreeDiffLayout,
} from "./layout";
import { edgePath } from "./route";
import type { TreeDiffChartProps, TreeDiffSide } from "./types";
import "./TreeDiffChart.css";

export type { TreeDiffChartProps } from "./types";

const SIDES: TreeDiffSide[] = ["baseline", "compare", "shared"];
const markerId = (side: TreeDiffSide) => `sui-tree-diff-arrow-${side}`;
const RULE_INSET = 24;
const LABEL_BASELINE = 14;
const SPINE_LABEL_Y = 20;

const nodeClass = (n: LayoutNode, selected: boolean, clickable: boolean) => {
  const classes = [
    "sui-tree-diff__node",
    `sui-tree-diff__node--${n.side}`,
    n.kind === "same" ? "sui-tree-diff__node--same" : "",
    selected ? "sui-tree-diff__node--selected" : "",
    clickable ? "sui-tree-diff__node--clickable" : "",
  ];
  return join(
    " ",
    filter((c: string) => c !== "", classes),
  );
};

/** The box and its two text lines. Shared by the static and the button node. */
function NodeBody(props: { node: LayoutNode }): JSX.Element {
  return (
    <>
      <rect
        class="sui-tree-diff__body"
        x={props.node.x - props.node.width / 2}
        y={props.node.y - props.node.height / 2}
        width={props.node.width}
        height={props.node.height}
        rx={7}
      />
      <text
        class="sui-tree-diff__label"
        x={props.node.x}
        y={props.node.y - 2}
        text-anchor="middle"
      >
        {props.node.label}
      </text>
      <text
        class="sui-tree-diff__hash"
        x={props.node.x}
        y={props.node.y + 13}
        text-anchor="middle"
      >
        {props.node.hash}
      </text>
    </>
  );
}

export function TreeDiffChart(props: TreeDiffChartProps): JSX.Element {
  const layout = createMemo<TreeDiffLayout>(() =>
    computeTreeDiffLayout({
      baseline: props.baseline,
      compare: props.compare,
      bands: props.bands,
      mode: props.mode ?? "differences",
    }),
  );
  const boxes = createMemo(
    () => new Map(map((n: LayoutNode) => [n.id, n] as const, layout().nodes)),
  );
  const pathFor = (from: string, to: string): string => {
    const a = boxes().get(from);
    const b = boxes().get(to);
    return a && b ? edgePath(a, b) : "";
  };
  // Only group and leaf nodes are actionable: roots and the pruned node
  // carry no id the consumer minted.
  const clickable = (n: LayoutNode) =>
    !!props.onNodeClick && (n.kind === "group" || n.kind === "leaf");
  const activate = (n: LayoutNode) => {
    if (clickable(n)) props.onNodeClick?.(n.id);
  };

  return (
    <svg
      class="sui-tree-diff"
      viewBox={`0 0 ${layout().width} ${layout().height}`}
      preserveAspectRatio="xMidYMin meet"
      role="img"
      aria-label={`Tree diff of ${props.baseline.label} against ${props.compare.label}`}
    >
      <defs>
        <For each={SIDES}>
          {(side) => (
            <DagArrowMarker
              id={markerId(side)}
              pathClass={`sui-tree-diff__arrow--${side}`}
            />
          )}
        </For>
      </defs>

      {/* Column captions and the rule under the two roots. */}
      <text
        class="sui-tree-diff__spine-label sui-tree-diff__spine-label--baseline"
        x={layout().spine.baselineX}
        y={SPINE_LABEL_Y}
        text-anchor="middle"
      >
        Baseline
      </text>
      <text
        class="sui-tree-diff__spine-label sui-tree-diff__spine-label--compare"
        x={layout().spine.compareX}
        y={SPINE_LABEL_Y}
        text-anchor="middle"
      >
        Comparing
      </text>
      <line
        class="sui-tree-diff__band-rule"
        x1={RULE_INSET}
        y1={layout().spine.ruleY}
        x2={layout().width - RULE_INSET}
        y2={layout().spine.ruleY}
      />

      {/* Bands: a rule above each band after the first, a centered name and a right-aligned note. */}
      <For each={layout().bands}>
        {(band, i) => (
          <>
            <Show when={i() > 0}>
              <line
                class="sui-tree-diff__band-rule"
                x1={RULE_INSET}
                y1={band.y - 4}
                x2={layout().width - RULE_INSET}
                y2={band.y - 4}
              />
            </Show>
            <text
              class="sui-tree-diff__band-label"
              x={layout().width / 2}
              y={band.y + LABEL_BASELINE}
              text-anchor="middle"
            >
              {band.name}
            </text>
            <text
              class="sui-tree-diff__band-note"
              x={layout().width - RULE_INSET}
              y={band.y + LABEL_BASELINE}
              text-anchor="end"
            >
              {band.note}
            </text>
          </>
        )}
      </For>

      <For each={layout().edges}>
        {(edge) => (
          <DagSvgEdge
            class={`sui-tree-diff__edge sui-tree-diff__edge--${edge.side}`}
            d={pathFor(edge.from, edge.to)}
            arrowMarkerId={markerId(edge.side)}
          />
        )}
      </For>

      <For each={layout().nodes}>
        {(n) => (
          <Show
            when={clickable(n)}
            fallback={
              <g
                class={nodeClass(n, props.selectedId === n.id, false)}
                data-node-id={n.id}
                aria-label={`${n.label} ${n.hash}`}
              >
                <NodeBody node={n} />
              </g>
            }
          >
            {/* biome-ignore lint/a11y/useSemanticElements: a native <button> is not valid inside SVG; role="button" on the <g> is the accessible affordance for an SVG hit target */}
            <g
              class={nodeClass(n, props.selectedId === n.id, true)}
              data-node-id={n.id}
              role="button"
              tabIndex={0}
              aria-label={`${n.label} ${n.hash}`}
              onClick={() => activate(n)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  activate(n);
                }
              }}
            >
              <NodeBody node={n} />
            </g>
          </Show>
        )}
      </For>
    </svg>
  );
}
