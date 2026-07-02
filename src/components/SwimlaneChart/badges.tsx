// ============================================
// SwimlaneChart — boundary-badge SVG fragments.
//
// Two <For> render fragments lifted out of the SwimlaneChart body so the
// composition root reads as a short list of layers rather than a wall of
// inline SVG:
//
//   • <SwimlaneBoundaryBadges> — the vertical "+N" pills that sit at the
//     outer edge of the outermost visible column. Each pill spans that
//     column's vertical range (so dashed connectors can anchor at each
//     visible neighbour's row) with the count centred at its midpoint.
//   • <SwimlaneBottomBadges>   — the "+N" pills beneath a column whose node
//     count exceeds the height cap (vertical/row overflow).
//
// REACTIVE-SCOPE CONTRACT: each fragment receives the KEYED STORE itself
// (not a snapshot array) and runs its own <For> so Solid's reconciliation
// and per-element DOM identity are preserved exactly as they were inline.
// The store is read here, inside these components' JSX — never unwrapped by
// the caller. Geometry constants are passed as plain props.
// ============================================
import { For } from "solid-js";
import type { JSX } from "solid-js";
import type { BoundaryBadge } from "./geometry";
import type { SwimlaneBottomBadge } from "./types";

export type SwimlaneBoundaryBadgesProps = {
  badges: BoundaryBadge[];
  badgeRadius: number;
};

/**
 * Vertical "+N" pills at the outer edge of the outermost visible column.
 * `badges` is the reconciled keyed store; the <For> runs here so element
 * identity (and CSS transitions on the rect/text attributes) survive.
 */
export function SwimlaneBoundaryBadges(
  props: SwimlaneBoundaryBadgesProps,
): JSX.Element {
  return (
    <For each={props.badges}>
      {(b) => (
        <g class="sui-swimlane__boundary">
          <rect
            class="sui-swimlane__boundary-badge"
            x={b.badgeX - props.badgeRadius}
            y={b.pillTopY}
            width={props.badgeRadius * 2}
            height={Math.max(props.badgeRadius * 2, b.pillBottomY - b.pillTopY)}
            rx={props.badgeRadius}
            ry={props.badgeRadius}
          />
          <text
            class="sui-swimlane__boundary-badge-text"
            x={b.badgeX}
            y={(b.pillTopY + b.pillBottomY) / 2}
            text-anchor="middle"
            dominant-baseline="central"
          >
            +{b.count}
          </text>
        </g>
      )}
    </For>
  );
}

export type SwimlaneBottomBadgesProps = {
  badges: SwimlaneBottomBadge[];
  badgeRadius: number;
};

/**
 * Bottom row-overflow "+N" pills beneath columns that exceed the height cap.
 * `badges` is the reconciled keyed store; the <For> runs here to keep each
 * pill's DOM identity across simulation ticks.
 */
export function SwimlaneBottomBadges(
  props: SwimlaneBottomBadgesProps,
): JSX.Element {
  return (
    <For each={props.badges}>
      {(b) => (
        <g class="sui-swimlane__boundary sui-swimlane__boundary--bottom">
          <rect
            class="sui-swimlane__boundary-badge"
            x={b.x - props.badgeRadius}
            y={b.y - props.badgeRadius}
            width={props.badgeRadius * 2}
            height={props.badgeRadius * 2}
            rx={props.badgeRadius}
            ry={props.badgeRadius}
          />
          <text
            class="sui-swimlane__boundary-badge-text"
            x={b.x}
            y={b.y}
            text-anchor="middle"
            dominant-baseline="central"
          >
            +{b.count}
          </text>
        </g>
      )}
    </For>
  );
}
