// ============================================
// DiffPair Curried Variants — Depth 1 (zero CSS)
// Pre-configured DiffPair via createDiffPair() factory.
// ============================================
import { createDiffPair } from "./DiffPair";

/** Heavy double-arrow flavor, useful for state-machine transitions. */
export const BoldArrowDiffPair = createDiffPair({ arrow: "⇒" });

/** Filled triangular arrow, useful for flow / sequence-style diffs. */
export const FlowDiffPair = createDiffPair({ arrow: "➔" });
