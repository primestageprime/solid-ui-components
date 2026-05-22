// ============================================
// Layout Curried Variants — Depth 1 (zero CSS)
// Pre-configured Stack, Row, Box via factories.
//
// Exports carry explicit `Component<…DataProps>` annotations to keep
// `vite-plugin-dts` from inlining solid-js type paths through pnpm's
// github-dep build store (TS2742 "inferred type cannot be named without
// a reference to …"). Without the annotation the generated `.d.ts` can
// end up with references to pnpm's ephemeral temp paths, which then
// strip the declarations entirely and surface as TS2305 downstream.
// ============================================
import { createStack } from "./Stack";
import { createRow } from "./Row";
import { createBox } from "./Box";
import type { StackDataProps } from "./Stack";
import type { RowDataProps } from "./Row";
import type { BoxDataProps } from "./Box";
import type { Component } from "solid-js";

// Stack variants — named by gap
export const TightStack: Component<StackDataProps> = createStack({ gap: "xs" });
export const NarrowStack: Component<StackDataProps> = createStack({ gap: "sm" });
export const SpacedStack: Component<StackDataProps> = createStack({ gap: "md" });

// Conversation root — capped reading width and conversation-typography for a
// multi-participant chat tree. Width math: bubble max = 80ch, body width = 80%
// of container; for `self` bubbles to overlap `other` bubbles, container needs
// >= 80ch / 0.8 = 100ch. Cap at ~110ch — full-width bubbles + ~20% breathing
// room without sprawling on wide displays.
export const ConversationStack: Component<StackDataProps> = createStack({
  gap: "sm",
  style: {
    "font-size": "0.85rem",
    "line-height": "1.4",
    color: "var(--sui-text-primary, inherit)",
    width: "100%",
    "max-width": "110ch",
  },
});

// Small, tight, start-aligned column — for dense indicator rows (e.g.
// label-on-top / status-trace-beneath). Smaller font and tighter line-height
// than the default body text so it sits comfortably in a packed dashboard.
export const SmallTightStack: Component<StackDataProps> = createStack({
  gap: "xs",
  align: "start",
  style: { "font-size": "0.8rem", "line-height": "1.2" },
});

// Stack variants — named by role / page layout
export const PageStack = createStack({ gap: "sm", style: { padding: "24px", "max-width": "1000px" } });
export const ContentStack: Component<StackDataProps> = createStack({ gap: "xs", style: { flex: "1", "min-width": "0" } });
export const CenteredStack: Component<StackDataProps> = createStack({ align: "center", justify: "center", gap: "sm" });

// Empty regions — centered stacks with size-specific padding and min-height
export const SmRegion: Component<StackDataProps> = createStack({ align: "center", justify: "center", gap: "sm", style: { padding: "16px 12px", "min-height": "60px", "text-align": "center" } });
export const MdRegion: Component<StackDataProps> = createStack({ align: "center", justify: "center", gap: "sm", style: { padding: "32px 16px", "min-height": "120px", "text-align": "center" } });
export const LgRegion: Component<StackDataProps> = createStack({ align: "center", justify: "center", gap: "sm", style: { padding: "48px 24px", "min-height": "200px", "text-align": "center" } });

// Row variants — named by layout behavior
export const SpreadRow: Component<RowDataProps> = createRow({ align: "center", justify: "between", gap: "md" });
/** Tight spread row — 4px gap, baseline-aligned key+count rows for compact
 *  data displays (pivot cells, legend rows, chip groupings). */
export const TightSpreadRow: Component<RowDataProps> = createRow({ align: "baseline", justify: "between", gap: "xs" });
export const ClusterRow: Component<RowDataProps> = createRow({ align: "center", gap: "sm" });
export const TightClusterRow: Component<RowDataProps> = createRow({ gap: "xs", align: "center" });
export const TopClusterRow: Component<RowDataProps> = createRow({ gap: "sm", align: "start" });
export const TagRow: Component<RowDataProps> = createRow({ gap: "xs", wrap: true, align: "center" });
export const WrapRow: Component<RowDataProps> = createRow({ gap: "xs", wrap: true });
export const SpacedClusterRow: Component<RowDataProps> = createRow({ gap: "md", align: "center" });
export const FlexRow: Component<RowDataProps> = createRow({});

// Wrapping center-aligned cluster — for header rows where a name + timestamp
// pair must collapse onto a second line on narrow widths without forcing a
// large vertical row-gap.
export const WrappedClusterRow: Component<RowDataProps> = createRow({ gap: "sm", align: "center", wrap: true });

// Box variants — named by flex-child behavior
export const ActionSlot: Component<BoxDataProps> = createBox({ shrink: false });
export const FadedBox: Component<BoxDataProps> = createBox({ style: { opacity: "0.5" } });
export const ConstrainedBox: Component<BoxDataProps> = createBox({ style: { "max-width": "400px" } });

// ScrollPanel — curried Box for a height-bounded, bordered, scrolling region.
// Use to drop a long table/list/log into a detail area without letting it push
// the page. Override `max-height` per-instance via style if needed.
export const ScrollPanel = createBox({
  style: {
    "max-height": "320px",
    overflow: "auto",
    border: "1px solid var(--sui-border, rgba(255, 255, 255, 0.08))",
    "border-radius": "4px",
  },
});

// PageCanvas — curried Box that fills its parent and paints the mocked-app
// thematic background. No margin, no padding. Drop it between the sandbox
// frame (the gray border) and the mock's top-level layout to give the mock a
// distinct surface that reads as "this is the app".
export const PageCanvas = createBox({
  style: {
    background: "var(--jtf-bg-primary, #1a1a2e)",
    width: "100%",
    height: "100%",
    margin: "0",
    padding: "0",
  },
});

// "shrink-wrapped delineated sidebar with chosen cards" — see DESIGN_LANGUAGE.md.
// 200px wide column — the floor doubles as a practical cap so cards fit a
// predictable slot and long titles ellipsize inside them rather than blowing
// the column out. A right-edge line denotes the column delimiter even when
// empty.
export const DelineatedSidebar = createStack({
  gap: "sm",
  style: {
    width: "400px",
    "min-width": "400px",
    "max-width": "400px",
    "align-self": "stretch",
    "border-right": "1px solid var(--sui-border, rgba(255, 255, 255, 0.12))",
    padding: "12px",
    "box-sizing": "border-box",
    "overflow-y": "auto",
  },
});
