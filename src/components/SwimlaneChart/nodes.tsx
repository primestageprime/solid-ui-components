// ============================================
// SwimlaneChart — node-layer SVG fragments (enter/leave animation).
//
// The two node <For> loops lifted out of the SwimlaneChart body:
//
//   • <SwimlaneNodes>        — the live nodes (real only; summaries render as
//     boundary badges). Newly-appeared nodes grow OUT of the boundary badge
//     on their own side; the enter slide is the time-mirror of the leave.
//   • <SwimlaneLeavingNodes> — nodes that just disappeared, kept in the DOM
//     for one animation cycle while they compress INTO the boundary badge on
//     their side before being dropped.
//
// REACTIVE-SCOPE CONTRACT (important): these fragments take ACCESSORS /
// stores, never unwrapped snapshots.
//   - `items` / `leaving` are read inside each fragment's own <For> so keyed
//     reconciliation and per-node DOM identity are preserved.
//   - `isEntering` is passed as a FUNCTION `(id) => boolean` and invoked
//     inside the child row so the `entering` flag stays reactive to the
//     owning component's `enteringIds` signal — we never snapshot it in the
//     parent.
// The signals themselves (enteringIds, leavingItems, the items store) remain
// owned by the SwimlaneChart component; only their read is relocated here.
//
// The enter/leave slide magnitude is STUB_LENGTH + BADGE_RADIUS on the node's
// own side (sign follows item.x); a centered node (x === 0) does not slide.
// ============================================
import { For } from "solid-js";
import type { JSX } from "solid-js";
import type { DAGNode, NodeRenderState } from "../DagChart/types";
import { DagSvgNode } from "../../internal/dag-svg";
import { STUB_LENGTH, BADGE_RADIUS, type SwimlaneItem } from "./types";

/** Signed horizontal reach of a node's enter/leave slide toward its badge. */
const slideOffsetX = (x: number): number => {
  const reach = STUB_LENGTH + BADGE_RADIUS;
  if (x < 0) return -reach;
  if (x > 0) return reach;
  return 0;
};

export type SwimlaneNodesProps<T> = {
  items: SwimlaneItem<T>[];
  isEntering: (id: string) => boolean;
  onNodeClick: (nodeId: string) => void;
  renderNode: (node: DAGNode<T>, state: NodeRenderState) => JSX.Element;
};

/**
 * Live node layer. `items` is the reconciled keyed store; `isEntering` is
 * read per-row so the enter animation stays reactive. Left-side enterers
 * start at the left badge, right side mirrors — magnitude matches the leave
 * reach so the two animations trace the same path in opposite time.
 */
export function SwimlaneNodes<T>(props: SwimlaneNodesProps<T>): JSX.Element {
  return (
    <For each={props.items}>
      {(item) => {
        const entering = () => props.isEntering(item.id);
        const enterOffsetX = slideOffsetX(item.x);
        return (
          <DagSvgNode
            node={item.node}
            state={item.state}
            x={item.x}
            y={item.y}
            width={item.width}
            height={item.height}
            wrapperClass="sui-swimlane__node-wrapper"
            onClick={props.onNodeClick}
            renderNode={props.renderNode}
            entering={entering()}
            enteringOffsetX={enterOffsetX}
          />
        );
      }}
    </For>
  );
}

export type SwimlaneLeavingNodesProps<T> = {
  leaving: SwimlaneItem<T>[];
  renderNode: (node: DAGNode<T>, state: NodeRenderState) => JSX.Element;
};

/**
 * Leaving node layer. Each node keeps its last position while translating its
 * outer edge by STUB_LENGTH + BADGE_RADIUS toward the badge on its side;
 * combined with transform-origin: outer-edge, the rect collapses straight
 * into the badge.
 */
export function SwimlaneLeavingNodes<T>(
  props: SwimlaneLeavingNodesProps<T>,
): JSX.Element {
  return (
    <For each={props.leaving}>
      {(item) => {
        const leaveOffsetX = slideOffsetX(item.x);
        return (
          <DagSvgNode
            node={item.node}
            state={item.state}
            x={item.x}
            y={item.y}
            width={item.width}
            height={item.height}
            wrapperClass="sui-swimlane__node-wrapper"
            renderNode={props.renderNode}
            leaving
            leavingOffsetX={leaveOffsetX}
          />
        );
      }}
    </For>
  );
}
