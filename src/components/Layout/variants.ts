// ============================================
// Layout Curried Variants — Depth 1 (zero CSS)
// Pre-configured Stack, Row, Box via factories.
// ============================================
import { createStack } from "./Stack";
import { createRow } from "./Row";
import { createBox } from "./Box";

// Stack variants — named by gap
export const TightStack = createStack({ gap: "xs" });
export const NarrowStack = createStack({ gap: "sm" });
export const SpacedStack = createStack({ gap: "md" });

// Stack variants — named by role / page layout
export const PageStack = createStack({ gap: "sm", style: { padding: "24px", "max-width": "1000px" } });
export const ContentStack = createStack({ gap: "xs", style: { flex: "1", "min-width": "0" } });
export const CenteredStack = createStack({ align: "center", justify: "center", gap: "sm" });

// Empty regions — centered stacks with size-specific padding and min-height
export const SmRegion = createStack({ align: "center", justify: "center", gap: "sm", style: { padding: "16px 12px", "min-height": "60px", "text-align": "center" } });
export const MdRegion = createStack({ align: "center", justify: "center", gap: "sm", style: { padding: "32px 16px", "min-height": "120px", "text-align": "center" } });
export const LgRegion = createStack({ align: "center", justify: "center", gap: "sm", style: { padding: "48px 24px", "min-height": "200px", "text-align": "center" } });

// Row variants — named by layout behavior
export const SpreadRow = createRow({ align: "center", justify: "between", gap: "md" });
export const ClusterRow = createRow({ align: "center", gap: "sm" });
export const TightClusterRow = createRow({ gap: "xs", align: "center" });
export const TopClusterRow = createRow({ gap: "sm", align: "start" });
export const TagRow = createRow({ gap: "xs", wrap: true, align: "center" });
export const WrapRow = createRow({ gap: "xs", wrap: true });
export const SpacedClusterRow = createRow({ gap: "md", align: "center" });
export const FlexRow = createRow({});

// Box variants — named by flex-child behavior
export const ActionSlot = createBox({ shrink: false });
export const FadedBox = createBox({ style: { opacity: "0.5" } });
export const ConstrainedBox = createBox({ style: { "max-width": "400px" } });

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
