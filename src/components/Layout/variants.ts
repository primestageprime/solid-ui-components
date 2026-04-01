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
