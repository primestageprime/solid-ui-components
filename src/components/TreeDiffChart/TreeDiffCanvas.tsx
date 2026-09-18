// lastReviewedAt: 2026-09-17
// lastReviewedBy: adlai.arnold
/**
 * TreeDiffCanvas — Structural Primitive (Depth 1).
 *
 * The paint half of the tree diff. Owns `TreeDiffCanvas.css` and every
 * intrinsic element the picture is made of — the `<svg>`, the node rects, the
 * spine and band text, the guide lines, the edges' paths and the
 * `<foreignObject>` that a consumer-supplied label ellipsizes inside. It
 * composes no library component: `src/internal/dag-svg` is a utility module
 * (the arrowhead marker and the edge path element), the same kind of
 * dependency the DOM is.
 *
 * It decides nothing. `layout` arrives fully computed (`layout.ts`) and
 * `highlight` fully resolved (`highlight.ts`); this module turns numbers into
 * elements and nothing else. That is the same discipline `Chart` keeps — a
 * Structural Primitive whose slots arrive as the caller's children.
 *
 * ## The label seam
 *
 * A label the CONSUMER supplied can be any length, so by Peter's standing rule
 * it must ellipsize AND hand the whole of itself back in a Tooltip. A Tooltip
 * is a sibling Primitive, which a Primitive may not import, so the canvas
 * does not build that device: it draws the `<foreignObject>` slot, states the
 * class hooks its own CSS defines, and calls `renderLabel` for the content.
 * The Composite above supplies `Tooltip` + `EllipsizedNodeLabel` into it.
 * This is ADR 0010's core/adapter split at the element level, and the same
 * shape as `ScrubChart`'s `renderChart` / `renderChartOverlay` callbacks,
 * which that ADR keeps precisely so adapters can mount inside them.
 *
 * Content passed in through a prop is the CALLER's child, not this module's,
 * so it does not raise this module's depth — exactly as `Stack` and `Surface`
 * stay Depth 1 while hosting arbitrary children.
 *
 * Labels the CHART mints ("commit", "root tree", "[SAME]") are a known, short,
 * enumerated set and stay plain SVG `<text>`.
 */
import { createMemo, For, type JSX, Show } from "solid-js";
import { filter, join, map } from "../../fn";
import { DagArrowMarker, DagSvgEdge } from "../../internal/dag-svg";
import { edgeKey, type Highlight } from "./highlight";
import { KINDS } from "./kinds";
import type {
  LayoutEdge,
  LayoutGuide,
  LayoutNode,
  TreeDiffLayout,
} from "./layout-types";
import { edgePath, trunkPath } from "./route";
import type { TreeDiffKind, TreeDiffSide } from "./types";
import "./TreeDiffCanvas.css";

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

/**
 * What the canvas hands the caller for one consumer-supplied label: the whole
 * text, and the two class hooks this module's CSS defines for it. The hooks
 * travel with the slot so the Composite never hardcodes a class name the
 * canvas owns.
 */
export interface TreeDiffLabelSlot {
  /** The complete label the consumer supplied — never truncated here. */
  text: string;
  /** Class for the element that fills the slot and takes the pointer. */
  triggerClass: string;
  /** Class for the text itself, which every side/kind paint rule tints. */
  textClass: string;
}

export interface TreeDiffCanvasProps {
  /** The fully computed picture. The canvas decides no position. */
  layout: TreeDiffLayout;
  /** The resolved pair selection. Drives the lit/dim classes only. */
  highlight: Highlight;
  /** Set while a pair is selected; everything outside `highlight.hot` dims. */
  selectedId?: string;
  /** When set, group and leaf nodes become `role="button"` hit targets. */
  onNodeClick?: (id: string) => void;
  /** The whole `aria-label` for the `<svg>`, in the caller's words. */
  ariaLabel: string;
  /** Content for a consumer-supplied label's `<foreignObject>` slot. */
  renderLabel: (slot: TreeDiffLabelSlot) => JSX.Element;
}

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

export function TreeDiffCanvas(props: TreeDiffCanvasProps): JSX.Element {
  const flagsFor = (n: LayoutNode, clickable: boolean): NodeFlags => ({
    selected: props.highlight.selected.has(n.id),
    dim: !!props.selectedId && !props.highlight.hot.has(n.id),
    clickable,
  });
  const boxes = createMemo(
    () => new Map(map((n: LayoutNode) => [n.id, n] as const, props.layout.nodes)),
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

  /**
   * The title line. Consumer text goes into a `<foreignObject>` clamped to the
   * box so it ellipsizes at the box edge; the box width is the constraint — a
   * long label never widens it. Chart-minted labels stay SVG text.
   */
  const NodeLabel = (labelProps: { node: LayoutNode }): JSX.Element => (
    <Show
      when={labelProps.node.labelFromData}
      fallback={
        <text
          class="sui-tree-diff__label"
          x={labelProps.node.x}
          y={labelProps.node.y - 2}
          text-anchor="middle"
        >
          {labelProps.node.label}
        </text>
      }
    >
      <foreignObject
        x={labelProps.node.x - labelProps.node.width / 2 + LABEL_INSET}
        y={labelProps.node.y - LABEL_H}
        width={Math.max(0, labelProps.node.width - LABEL_INSET * 2)}
        height={LABEL_H}
      >
        {props.renderLabel({
          text: labelProps.node.label,
          triggerClass: "sui-tree-diff__label-trigger",
          textClass: "sui-tree-diff__label",
        })}
      </foreignObject>
    </Show>
  );

  /** The box and its two text lines. Shared by the static and the button node. */
  const NodeBody = (bodyProps: { node: LayoutNode }): JSX.Element => (
    <>
      <rect
        class="sui-tree-diff__body"
        x={bodyProps.node.x - bodyProps.node.width / 2}
        y={bodyProps.node.y - bodyProps.node.height / 2}
        width={bodyProps.node.width}
        height={bodyProps.node.height}
        rx={bodyProps.node.kind === "head" ? HEAD_RADIUS : BOX_RADIUS}
      />
      <NodeLabel node={bodyProps.node} />
      <text
        class="sui-tree-diff__hash"
        x={bodyProps.node.x}
        y={bodyProps.node.y + 13}
        text-anchor="middle"
      >
        {bodyProps.node.hash}
      </text>
    </>
  );

  return (
    <svg
      class={`sui-tree-diff sui-tree-diff--${props.layout.mode}`}
      viewBox={`0 0 ${props.layout.width} ${props.layout.height}`}
      preserveAspectRatio="xMidYMin meet"
      role="img"
      aria-label={props.ariaLabel}
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

      <For each={props.layout.captions}>
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

      <For each={props.layout.guides}>
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

      <For each={props.layout.bands}>
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

      <For each={props.layout.edges}>
        {(edge) => (
          <DagSvgEdge
            class={edgeClass(
              edge,
              kindOfEdge(edge),
              props.highlight.live.has(edgeKey(edge)),
              !!props.selectedId && !props.highlight.live.has(edgeKey(edge)),
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

      <For each={props.layout.nodes}>
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
  );
}
