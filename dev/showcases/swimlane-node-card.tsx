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
      style={{
        position: "relative",
        width: `${NODE_W}px`,
        height: `${NODE_H}px`,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Show when={hovered()}>
        <div
          class="sui-asc__popover-host"
          style={{
            position: "absolute",
            bottom: `${NODE_H + 8}px`,
            left: "0",
            "z-index": "10",
          }}
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
  <div
    style={{
      "font-size": "12px",
      color: "rgba(255,255,255,0.55)",
      "font-family": "ui-monospace, SFMono-Regular, monospace",
    }}
  >
    {props.children}
  </div>
);

export const SwimlaneNodeCardShowcase: Component = () => (
  <div
    style={{
      display: "flex",
      "flex-direction": "column",
      gap: "28px",
      padding: "24px",
    }}
  >
    <div
      style={{
        "font-size": "14px",
        color: "rgba(255,255,255,0.7)",
        "max-width": "640px",
      }}
    >
      The card the swimlane chart stamps into each slot, pinned to its real size
      ({NODE_W}×{NODE_H}). The top line carries claimedBy (left) vs. status
      (right); the title fills the middle (clamping to 3 lines); the bottom line
      carries estimate (left) vs. actual (right). Long titles spill their full
      text into the hover popover.
    </div>

    <div style={{ display: "flex", "flex-direction": "column", gap: "8px" }}>
      <Caption>short title — estimate 3d / actual 4d</Caption>
      <CardSlot node={SHORT} />
    </div>

    <div style={{ display: "flex", "flex-direction": "column", gap: "8px" }}>
      <Caption>
        long title — clamps to 3 lines; hover to reveal the full text
      </Caption>
      <HoverCardSlot node={LONG} />
    </div>

    <div style={{ display: "flex", "flex-direction": "column", gap: "8px" }}>
      <Caption>unclaimed (no claimedBy) + subtitle + estimate only</Caption>
      <CardSlot node={WITH_SUBTITLE} />
    </div>

    <div style={{ display: "flex", "flex-direction": "column", gap: "8px" }}>
      <Caption>parent row (DONE) — no estimate/actual</Caption>
      <CardSlot
        node={{ id: "p", title: "Patch the roof", status: "DONE" }}
        parent
      />
    </div>
  </div>
);
