// ============================================
// ThreePanelLayout Curried Variants — Depth 1 (zero CSS)
// The exported way to use a three-panel page. Each variant bakes its aside
// widths (from tokens.ts) and `height: "100%"` via createThreePanelLayout;
// a consumer passes only the panels (topBar / leftPanel / centerPanel /
// rightPanel).
//
// VARIANT-CHANGE RULE (Peter, 2026-10-16): a size change to a variant is
// either (a) a NEW named variant, or (b) a GLOBAL change to that variant for
// every consumer. It is never a call-site prop. An agent asked to "make the
// left column wider" asks which of the two before editing.
// ============================================
import { type Component, mergeProps, splitProps } from "solid-js";
import { createThreePanelLayout, ThreePanelLayout } from "./ThreePanelLayout";
import type { ThreePanelLayoutDataProps } from "./ThreePanelLayout";
import { THREE_PANEL_ASIDE_WIDTH as W } from "./tokens";

/** Standard list / center / context page: 260 left, 240 right.
 *  Replaces jtf metric-explorer, cache-explorer, timesleuth;
 *  thorcasting TriageTab (left only). */
export const StandardThreePanel: Component<ThreePanelLayoutDataProps> =
  createThreePanelLayout({
    height: "100%",
    leftPanelWidth: W.list,
    rightPanelWidth: W.context,
  });

/** How wide the right panel of `ListDetailThreePanel` is: `narrow` is the 240 context pane, `wide` a
 *  time + text log column (`clamp(320px, 28vw, 440px)`, panel padding dropped, stacked asides uncapped). */
export type ListDetailRightWidth = "narrow" | "wide";

export interface ListDetailThreePanelProps extends ThreePanelLayoutDataProps {
  /** Right panel width as configuration, not a new variant: `narrow` (default, 240) or `wide` (a log column). */
  rightWidth?: ListDetailRightWidth;
}

/** List-and-detail page with a wide left column: 320 left, right 240 (`rightWidth="narrow"`, the default)
 *  or a wide log column (`rightWidth="wide"`: `clamp(320px, 28vw, 440px)`, right panel flush, stacked asides uncapped).
 *  Replaces jtf silver-explorer, metric-sleuth; dside TriageView (left only). */
export const ListDetailThreePanel: Component<ListDetailThreePanelProps> = (props) => {
  const [own, rest] = splitProps(props, ["rightWidth"]);
  const wide = () => own.rightWidth === "wide";
  return (
    <ThreePanelLayout
      {...mergeProps(rest, {
        height: "100%",
        leftPanelWidth: W.wideList,
        get rightPanelWidth() { return wide() ? W.logContext : W.context; },
        get rightPanelFlush() { return wide(); },
        get asideMaxHeight() { return wide() ? "none" : undefined; },
      })}
    />
  );
};

/** Page with a wide right inspector: 220 left rail, 320 right.
 *  Replaces thorcasting CoverageTab. */
export const InspectorThreePanel: Component<ThreePanelLayoutDataProps> =
  createThreePanelLayout({
    height: "100%",
    leftPanelWidth: W.rail,
    rightPanelWidth: W.inspector,
  });

/** Split page with a half-screen-class left pane: 560 left, 240 right.
 *  Replaces diddit index (desktop layout). */
export const SplitThreePanel: Component<ThreePanelLayoutDataProps> =
  createThreePanelLayout({
    height: "100%",
    leftPanelWidth: W.split,
    rightPanelWidth: W.context,
  });

/** Fluid list-and-detail page: left list 22vw clamped 240..360, right context
 *  15vw clamped 180..260, and stacked asides uncapped (no 200px max-height,
 *  no internal scroll) at phone widths.
 *  Replaces the Taskmaster touchstone's hand-written clamp layout. */
export const FluidListDetailThreePanel: Component<ThreePanelLayoutDataProps> =
  createThreePanelLayout({
    height: "100%",
    leftPanelWidth: W.fluidList,
    rightPanelWidth: W.fluidContext,
    asideMaxHeight: "none",
  });

/**
 * @deprecated Use `<ListDetailThreePanel rightWidth="wide" />`: width is configuration on the one list-and-detail
 * variant, not a content-named variant. Same geometry; kept exported until nothing imports it.
 * List-and-detail page whose right panel is a time + text log: 320 left, right 28vw clamped 320..440.
 */
export const ListDetailLogThreePanel: Component<ThreePanelLayoutDataProps> = (props) => (
  <ListDetailThreePanel {...props} rightWidth="wide" />
);
