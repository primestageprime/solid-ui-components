// ============================================
// Cell Curried Variants — Depth 1 (zero CSS)
// Pre-configured Cell, CellTable, CellRow via factories.
// ============================================
import { createCell, createCellTable, createCellRow } from "./Cell";

// ── Table ────────────────────────────────────────────────────────────

export const KVTable = createCellTable({});

// ── Row ──────────────────────────────────────────────────────────────

export const BorderRow = createCellRow({ border: true });

// ── Term cells (label column) ────────────────────────────────────────

export const DataTerm = createCell({ color: "var(--text-primary, #e0f4ff)" });
export const DataTermMuted = createCell({ color: "var(--text-muted, #7aa8c0)" });

// ── Value cells (data column) ────────────────────────────────────────

export const DataValue = createCell({ align: "right", weight: "semibold", color: "var(--text-secondary, #b0d4e8)" });
export const DataValueHighlight = createCell({ align: "right", weight: "semibold", color: "#ff8800" });
export const DataValueSuccess = createCell({ align: "right", weight: "semibold", color: "#00ff88" });
export const DataValuePrimary = createCell({ align: "right", weight: "semibold", color: "var(--text-primary, #e0f4ff)" });
export const DataValueMuted = createCell({ align: "right", weight: "semibold", color: "var(--text-muted, #7aa8c0)" });

// ── Header cells ─────────────────────────────────────────────────────

export const DataHeader = createCell({ as: "th", weight: "medium", color: "var(--text-muted, #7aa8c0)" });
export const DataHeaderRight = createCell({ as: "th", align: "right", weight: "medium", color: "var(--text-muted, #7aa8c0)" });
export const DataHeaderCenter = createCell({ as: "th", align: "center", weight: "medium", color: "var(--text-muted, #7aa8c0)" });
