// ============================================
// TabbedSidePanel Curried Variants — Depth 2 (zero CSS)
// ============================================
import { createTabbedSidePanel } from "./TabbedSidePanel";

/** Right-edge detail panel — matches amygdala-ui /assets/:id/:edgeType. */
export const RightDetailTabbedPanel = createTabbedSidePanel({
  side: "right",
  tabsVariant: "default",
});

/** Left-edge navigator — symmetric case for future consumers. */
export const LeftNavTabbedPanel = createTabbedSidePanel({
  side: "left",
  tabsVariant: "default",
});
