// ============================================
// Treemap Curried Variants — Depth 1 (zero new CSS).
// Pre-configured Treemap via createTreemap() Factory.
// ============================================
import { createTreemap } from "./Treemap";

/** A Treemap with no Override Props locked in — equivalent to using the raw
 *  Primitive but participates in the Factory ecosystem for future overrides
 *  (class names, theming hooks, etc.). Re-exposes the full Data Prop API. */
export const SelectableTreemap = createTreemap();
