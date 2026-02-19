// ============================================
// Table Curried Variants — Depth 1 (zero CSS)
// Pre-configured BaseTable via createBaseTable() factory.
// ============================================
import { createBaseTable } from "./BaseTable";

// Compact scrollable table — dense rows, sticky header, scroll container
export const CompactTable = createBaseTable({ compact: true, stickyHeader: true, maxHeight: "300px" });

// Striped interactive table — alternating rows with hover highlight
export const StripedTable = createBaseTable({ striped: true, hoverable: true });

// Sticky table — header pinned at top with scroll container
export const StickyTable = createBaseTable({ stickyHeader: true, maxHeight: "400px" });

// Full-featured data table — all display enhancements enabled
export const DataTable = createBaseTable({ striped: true, hoverable: true, stickyHeader: true, fill: true });
