// ============================================
// ThreePanelLayout width tokens — data only (no CSS, no components).
// The named widths a ThreePanelLayout variant may bake. A consumer never
// types a width: it picks a variant, and the variant picks from here.
// Values are the clusters found across jtf / dside / diddit / thorcasting
// on 2026-10-16 (see variants.tsx for which usage each variant replaces).
// ============================================
export const THREE_PANEL_ASIDE_WIDTH = {
  /** Narrow context pane (the long-standing right-hand default). */
  context: "240px",
  /** Compact left rail (the long-standing left-hand default). */
  rail: "220px",
  /** Standard left list/nav column. */
  list: "260px",
  /** Wide left list-and-detail column. */
  wideList: "320px",
  /** Wide right inspector column. */
  inspector: "320px",
  /** Half-screen-class left pane for a split view. */
  split: "560px",
} as const;
