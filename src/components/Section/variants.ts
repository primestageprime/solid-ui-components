// ============================================
// Section Curried Variants — Depth 1 (zero CSS)
// Pre-configured Section and Panel via createSection()/createPanel() factories.
// ============================================
import { createSection, createPanel } from "./Section";

// Collapsible section — bordered with collapse support
export const CollapsibleSection = createSection({ variant: "bordered", collapsible: true, defaultExpanded: true });

// Decorated section — corner brackets, fills parent
export const DecoratedSection = createSection({ variant: "decorated", fill: true });

// Bordered section — simple bordered container
export const BorderedSection = createSection({ variant: "bordered" });

// Compact panel — small padding
export const CompactJTFPanel = createPanel({ padding: "sm" });

// Spacious panel — large padding
export const SpaciousPanel = createPanel({ padding: "lg" });
