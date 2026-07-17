/**
 * The swimlane node card in isolation — the thing the AnimatedSwimlaneChart
 * stamps into every lane slot. This showcase pins each card to the real node
 * size ([cardWidth * 1.5, 104]) and exercises the two cases that matter:
 *
 *   - Short title  — fits comfortably, vertically centered.
 *   - Long title   — clamps to 3 lines with an ellipsis on the card, and the
 *                    popover (shown alongside) renders the COMPLETE text.
 *
 * Card markup/popover come straight from the library defaults so this stays
 * in lockstep with what the chart actually renders.
 */
import { createSignal, Show, type Component } from "solid-js";
import {
  defaultRenderNode,
  defaultRenderPopover,
  ANIMATED_SWIMLANE_DEFAULTS,
} from "../../src/components/AnimatedSwimlaneChart/defaults";
// Pull in the card/popover CSS (normally loaded via SwimlaneAnimatedLane).
import "../../src/components/AnimatedSwimlaneChart/SwimlaneAnimatedLane.css";
import type { StatusFlowNode } from "../../src/components/StatusFlowChart";
import { MonoMeta } from "../../src/components/Text";
import { NarrowStack } from "../../src/components/Layout";

const [NODE_W, NODE_H] = ANIMATED_SWIMLANE_DEFAULTS.nodeSize;

const SHORT: StatusFlowNode = {
  id: "short",
  title: "Saw planks",
  status: "DOING",
  claimedBy: "Dana",
  estimate: "3d",
  actual: "4d",
};

const LONG: StatusFlowNode = {
  id: "long",
  title:
    "Cut, square, and sand the replacement shingles, then dry-fit each course against the existing roofline, flash the valleys, and nail down the starter strip before the inspector arrives on Thursday to sign off on the structural work",
  status: "DOING",
  claimedBy: "Miguel",
  estimate: "8h",
  actual: "11h",
};

const WITH_SUBTITLE: StatusFlowNode = {
  id: "sub",
  title: "Inspector signs off",
  subtitle: "blocked on permit #4471",
  status: "TODO",
  estimate: "1d",
};

/** A node rendered at the exact rect the chart would give it. */
const CardSlot: Component<{ node: StatusFlowNode; parent?: boolean }> = (
  props,
) => (
  <div style={{ width: `${NODE_W}px`, height: `${NODE_H}px` }}>
    {defaultRenderNode(props.node, {
      effectiveStatus: props.node.status,
      isParent: props.parent ?? false,
    })}
  </div>
);

/**
 * Same card, but hovering it reveals the popover above — mirrors the chart's
 * own hover affordance, so you can see the clamp-then-reveal in one place.
 */
const HoverCardSlot: Component<{ node: StatusFlowNode }> = (props) => {
  const [hovered, setHovered] = createSignal(false);
  return (
    <div
      class="swimlane-node-card-demo__node"
      style={{ width: `${NODE_W}px`, height: `${NODE_H}px` }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Show when={hovered()}>
        <div
          class="sui-asc__popover-host"
          class="swimlane-node-card-demo__tooltip"
          style={{ bottom: `${NODE_H + 8}px` }}
        >
          {defaultRenderPopover(props.node)}
        </div>
      </Show>
      {defaultRenderNode(props.node, {
        effectiveStatus: props.node.status,
        isParent: false,
      })}
    </div>
  );
};

const Caption: Component<{ children: any }> = (props) => (
  <MonoMeta>{props.children}</MonoMeta>
);

export const SwimlaneNodeCardShowcase: Component = () => (
  <div
    class="swimlane-node-card-demo__page"
  >
    <div
      class="swimlane-node-card-demo__intro"
    >
      The card the swimlane chart stamps into each slot, pinned to its real size
      ({NODE_W}×{NODE_H}). The top line carries claimedBy (left) vs. status
      (right); the title fills the middle (clamping to 3 lines); the bottom line
      carries estimate (left) vs. actual (right). Long titles spill their full
      text into the hover popover.
    </div>

    <NarrowStack>
      <Caption>short title — estimate 3d / actual 4d</Caption>
      <CardSlot node={SHORT} />
    </NarrowStack>

    <NarrowStack>
      <Caption>
        long title — clamps to 3 lines; hover to reveal the full text
      </Caption>
      <HoverCardSlot node={LONG} />
    </NarrowStack>

    <NarrowStack>
      <Caption>unclaimed (no claimedBy) + subtitle + estimate only</Caption>
      <CardSlot node={WITH_SUBTITLE} />
    </NarrowStack>

    <NarrowStack>
      <Caption>parent row (DONE) — no estimate/actual</Caption>
      <CardSlot
        node={{ id: "p", title: "Patch the roof", status: "DONE" }}
        parent
      />
    </NarrowStack>
  </div>
);
