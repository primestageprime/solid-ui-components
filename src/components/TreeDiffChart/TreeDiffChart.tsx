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
 *
 * Responsive: the host div is measured and the layout mode follows its
 * width (`frame.ts`). The SVG's viewBox is the measured width, so boxes
 * render 1:1 until the wide cap, then scale up with the container.
 */
import {
  createMemo,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
  type JSX,
} from "solid-js";
import { filter, join, map } from "../../fn";
import { DagArrowMarker, DagSvgEdge } from "../../internal/dag-svg";
import { observeSize } from "../../internal/dom/observeSize";
import { TightStack } from "../Layout";
import { Legend } from "../Legend/Legend";
import { EllipsizedNodeLabel } from "../Text";
import { Tooltip } from "../Tooltip";
import { computeHighlight, edgeKey } from "./highlight";
import { KINDS, kindLegendItems } from "./kinds";
import { computeTreeDiffLayout } from "./layout";
import type {
  LayoutEdge,
  LayoutGuide,
  LayoutNode,
  TreeDiffLayout,
} from "./layout-types";
import { edgePath, trunkPath } from "./route";
import type { TreeDiffChartProps, TreeDiffKind, TreeDiffSide } from "./types";
import "./TreeDiffChart.css";

export type { TreeDiffChartProps } from "./types";

const SIDES: TreeDiffSide[] = ["baseline", "compare", "shared"];
const markerId = (side: TreeDiffSide) => `sui-tree-diff-arrow-${side}`;
const kindMarkerId = (kind: TreeDiffKind) => `sui-tree-diff-arrow-kind-${kind}`;
const GUIDE_CLASS: Record<LayoutGuide["kind"], string> = {
  rule: "sui-tree-diff__band-rule",
  divider: "sui-tree-diff__divider",
  joiner: "sui-tree-diff__joiner",
};
const HEAD_RADIUS = 23;
const BOX_RADIUS = 7;
/** Breathing room between the box edge and the label slot, per side. */
const LABEL_INSET = 8;
/** Height of the label slot. Matches the old SVG text's line box. */
const LABEL_H = 16;

type NodeFlags = { selected: boolean; dim: boolean; clickable: boolean };

const nodeClass = (n: LayoutNode, flags: NodeFlags) => {
  const classes = [
    "sui-tree-diff__node",
    `sui-tree-diff__node--${n.side}`,
    n.changeKind ? `sui-tree-diff__node--kind-${n.changeKind}` : "",
    n.kind === "same" ? "sui-tree-diff__node--same" : "",
    flags.selected ? "sui-tree-diff__node--selected" : "",
    flags.dim ? "sui-tree-diff__node--dim" : "",
    flags.clickable ? "sui-tree-diff__node--clickable" : "",
  ];
  return join(
    " ",
    filter((c: string) => c !== "", classes),
  );
};

const edgeClass = (
  edge: LayoutEdge,
  kind: TreeDiffKind | undefined,
  hot: boolean,
  dim: boolean,
) =>
  join(
    " ",
    filter(
      (c: string) => c !== "",
      [
        "sui-tree-diff__edge",
        `sui-tree-diff__edge--${edge.side}`,
        kind ? `sui-tree-diff__edge--kind-${kind}` : "",
        hot ? "sui-tree-diff__edge--hot" : "",
        dim ? "sui-tree-diff__edge--dim" : "",
      ],
    ),
  );

/**
 * The title line. A label the CONSUMER supplied can be any length, so it
 * lives in HTML inside a `foreignObject` clamped to the box: it ellipsizes
 * at the box edge and a tooltip carries the complete value. The box width is
 * the constraint — a long label never widens it. Labels the CHART mints
 * ("commit", "root tree", "[SAME]") are a known, short, enumerated set and
 * stay plain SVG text.
 */
function NodeLabel(props: { node: LayoutNode }): JSX.Element {
  return (
    <Show
      when={props.node.labelFromData}
      fallback={
        <text
          class="sui-tree-diff__label"
          x={props.node.x}
          y={props.node.y - 2}
          text-anchor="middle"
        >
          {props.node.label}
        </text>
      }
    >
      <foreignObject
        x={props.node.x - props.node.width / 2 + LABEL_INSET}
        y={props.node.y - LABEL_H}
        width={Math.max(0, props.node.width - LABEL_INSET * 2)}
        height={LABEL_H}
      >
        {/* A span trigger, not the default button: the node <g> is already
            role="button", and its aria-label already carries the full
            label, so the keyboard path this costs is already covered. */}
        <Tooltip
          content={props.node.label}
          triggerAs="span"
          class="sui-tree-diff__label-trigger"
        >
          <EllipsizedNodeLabel class="sui-tree-diff__label">
            {props.node.label}
          </EllipsizedNodeLabel>
        </Tooltip>
      </foreignObject>
    </Show>
  );
}

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
        rx={props.node.kind === "head" ? HEAD_RADIUS : BOX_RADIUS}
      />
      <NodeLabel node={props.node} />
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
  let hostRef: HTMLDivElement | undefined;
  const [width, setWidth] = createSignal(0);
  onMount(() => {
    if (!hostRef) return;
    onCleanup(observeSize(hostRef, (size) => setWidth(size.width)));
  });

  const layout = createMemo<TreeDiffLayout>(() =>
    computeTreeDiffLayout({
      baseline: props.baseline,
      compare: props.compare,
      bands: props.bands,
      mode: props.mode ?? "differences",
      width: width(),
    }),
  );
  // Pair selection: the clicked node, its counterpart, the chain to the
  // spine on both sides, and one level down. Everything else dims.
  const highlight = createMemo(() =>
    computeHighlight(props.selectedId, props.bands, layout().edges),
  );
  const flagsFor = (n: LayoutNode, clickable: boolean): NodeFlags => ({
    selected: highlight().selected.has(n.id),
    dim: !!props.selectedId && !highlight().hot.has(n.id),
    clickable,
  });
  const boxes = createMemo(
    () => new Map(map((n: LayoutNode) => [n.id, n] as const, layout().nodes)),
  );
  const pathFor = (edge: LayoutEdge): string => {
    const a = boxes().get(edge.from);
    const b = boxes().get(edge.to);
    if (!a || !b) return "";
    if (edge.trunkX === undefined) return edgePath(a, b);
    const dir = b.x > edge.trunkX ? 1 : -1;
    return trunkPath(edge.trunkX, a.y + a.height / 2, b, dir);
  };
  // Only group and leaf nodes are actionable: the spine nodes and the
  // pruned node carry no id the consumer minted.
  const clickable = (n: LayoutNode) =>
    !!props.onNodeClick && (n.kind === "group" || n.kind === "leaf");
  const activate = (n: LayoutNode) => {
    if (clickable(n)) props.onNodeClick?.(n.id);
  };
  // "An arrow takes the colour of the node it points at" — so an edge's kind
  // is READ from its target, never plumbed through the layout. `side` already
  // works this way.
  const kindOfEdge = (edge: LayoutEdge): TreeDiffKind | undefined =>
    boxes().get(edge.to)?.changeKind;
  const legendItems = createMemo(() => kindLegendItems(layout().nodes));
  // Default on whenever the data carries kinds; a chart with none has
  // nothing to key, so it must not sprout an empty legend.
  const showLegend = () => props.legend ?? legendItems().length > 0;

  return (
    <div ref={hostRef} class="sui-tree-diff__host">
      <TightStack>
        <svg
          class={`sui-tree-diff sui-tree-diff--${layout().mode}`}
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
            {/* A kind-coloured line with a side-coloured arrowhead reads as a
              bug, so every kind gets its own marker. */}
            <For each={KINDS}>
              {(kind) => (
                <DagArrowMarker
                  id={kindMarkerId(kind)}
                  pathClass={`sui-tree-diff__arrow--kind-${kind}`}
                />
              )}
            </For>
          </defs>

          <For each={layout().captions}>
            {(c) => (
              <text
                class={`sui-tree-diff__spine-label sui-tree-diff__spine-label--${c.side}`}
                x={c.x}
                y={c.y}
                text-anchor={c.anchor}
              >
                {c.text}
              </text>
            )}
          </For>

          <For each={layout().guides}>
            {(g) => (
              <line
                class={GUIDE_CLASS[g.kind]}
                x1={g.x1}
                y1={g.y1}
                x2={g.x2}
                y2={g.y2}
              />
            )}
          </For>

          <For each={layout().bands}>
            {(band) => (
              <>
                <text
                  class="sui-tree-diff__band-label"
                  x={band.labelX}
                  y={band.labelY}
                  text-anchor={band.labelAnchor}
                >
                  {band.name}
                </text>
                <text
                  class="sui-tree-diff__band-note"
                  x={band.noteX}
                  y={band.labelY}
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
                class={edgeClass(
                  edge,
                  kindOfEdge(edge),
                  highlight().live.has(edgeKey(edge)),
                  !!props.selectedId && !highlight().live.has(edgeKey(edge)),
                )}
                dataKind={kindOfEdge(edge)}
                d={pathFor(edge)}
                arrowMarkerId={
                  kindOfEdge(edge)
                    ? kindMarkerId(kindOfEdge(edge) as TreeDiffKind)
                    : markerId(edge.side)
                }
              />
            )}
          </For>

          <For each={layout().nodes}>
            {(n) => (
              <Show
                when={clickable(n)}
                fallback={
                  <g
                    class={nodeClass(n, flagsFor(n, false))}
                    data-node-id={n.id}
                    data-kind={n.changeKind}
                    aria-label={`${n.label} ${n.hash}`}
                  >
                    <NodeBody node={n} />
                  </g>
                }
              >
                {/* biome-ignore lint/a11y/useSemanticElements: a native <button> is not valid inside SVG; role="button" on the <g> is the accessible affordance for an SVG hit target */}
                <g
                  class={nodeClass(n, flagsFor(n, true))}
                  data-node-id={n.id}
                  data-kind={n.changeKind}
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
        <Show when={showLegend()}>
          <Legend items={legendItems()} />
        </Show>
      </TightStack>
    </div>
  );
}
