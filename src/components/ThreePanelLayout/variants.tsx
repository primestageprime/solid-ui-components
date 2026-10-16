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
import type { Component } from "solid-js";
import { createThreePanelLayout } from "./ThreePanelLayout";
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

/** List-and-detail page with a wide left column: 320 left, 240 right.
 *  Replaces jtf silver-explorer, metric-sleuth; dside TriageView (left only). */
export const ListDetailThreePanel: Component<ThreePanelLayoutDataProps> =
  createThreePanelLayout({
    height: "100%",
    leftPanelWidth: W.wideList,
    rightPanelWidth: W.context,
  });

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
