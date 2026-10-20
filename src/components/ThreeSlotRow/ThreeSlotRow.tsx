// ============================================
// ThreeSlotRow — Composite (Depth 2)
// Tags: shows:text, shows:status, does:view, does:layout, data:scalar, role:row
// Owns zero CSS files and zero inline style={} (STYLE_GUIDE Layout Purity —
// composes curried Primitives only). Composes a Grid (Layout Primitive) curried
// at factory time, GrowCenterRow and EndClusterRow (Layout variants).
//
// Three slots on one line: START | CENTER | END, as the grid tracks
// `<startWidth> minmax(0, 1fr) auto`. The start and end slots keep their own
// width; the centre slot takes everything left and centres its content in
// THAT space (not in the viewport), so a wide start slot pushes the centre
// right rather than overlapping it. This is the page header's "layout A"
// (Taskmaster canon, 2026-10-15): logo fixed | nav centred in the remainder |
// status + user fixed.
//
// The centre track is `minmax(0, 1fr)`, not `1fr`: a plain `1fr` is
// `minmax(auto, 1fr)` and inherits its content's min-width, so a self-measuring
// child (OverflowNav) would never be squeezed and never fold. A centre child
// that should FILL the track rather than sit at its natural width (a nav that
// measures its own box) goes in a `GrowBox`.
//
// `startWidth` is the only Override and it is curried at factory time, never
// passed per render: `createThreeSlotRow({ startWidth: "160px" })`. Omitted,
// the start track is `auto`.
// ============================================
import type { Component, JSX } from "solid-js";
import { createGrid } from "../Layout/Grid";
import { ClusterRow, EndClusterRow, GrowCenterRow } from "../Layout/variants";

export interface ThreeSlotRowProps {
  /** Leading slot (a logo, a title). Keeps its own width, or `startWidth`. */
  start?: JSX.Element;
  /** Centre slot — centred in the space the other two leave. */
  center?: JSX.Element;
  /** Trailing slot (status, a user menu). Keeps its own width, packed to the end. */
  end?: JSX.Element;
}

/** Props that are visual/static overrides — locked at variant-definition time. */
export interface ThreeSlotRowOverrides {
  /** The start track's width as a CSS length (`"160px"`). Default `auto`. */
  startWidth?: string;
}

/** Props that remain available to consumers of a curried ThreeSlotRow variant. */
export type ThreeSlotRowDataProps = ThreeSlotRowProps;

/** The grid track list for a given start width — the one place it is spelled. */
export const threeSlotColumns = (startWidth: string = "auto"): string =>
  `${startWidth} minmax(0, 1fr) auto`;

export function createThreeSlotRow(
  defaults: ThreeSlotRowOverrides,
): Component<ThreeSlotRowDataProps> {
  // Curried ONCE, at definition time — the track list is static per variant.
  const Frame = createGrid({
    columns: threeSlotColumns(defaults.startWidth),
    gap: "sm",
    align: "center",
  });
  return (props) => (
    <Frame data-three-slot-row="">
      <ClusterRow data-slot="start">{props.start}</ClusterRow>
      <GrowCenterRow data-slot="center">{props.center}</GrowCenterRow>
      <EndClusterRow data-slot="end">{props.end}</EndClusterRow>
    </Frame>
  );
}
