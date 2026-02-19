// ============================================
// Section Curried Variants — Depth 1 (zero CSS)
// Pre-configured Section via createSection() factory.
// Updated to use new props (corners instead of variant="decorated").
// ============================================
import { createSection } from "./Section";

// Collapsible section — with collapse support
export const CollapsibleSection = createSection({ collapsible: true, defaultExpanded: true });

// Decorated section — bracket corner brackets, fills parent
export const DecoratedSection = createSection({ corners: "bracket", fill: true });

// Bordered section — simple bordered container (now uses round corners)
export const BorderedSection = createSection({ corners: "round" });
