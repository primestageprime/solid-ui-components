// ============================================
// Cell Curried Variants — Depth 1 (zero CSS)
// Pre-configured Cell, CellTable, CellRow via factories.
//
// Exports carry explicit `Component<…>` / `ParentComponent<…>` annotations
// to keep `vite-plugin-dts` from inlining solid-js type paths through
// pnpm's github-dep build store (TS2742 "inferred type cannot be named
// without a reference to …"). Without the annotation the generated
// `.d.ts` can end up with references to pnpm's ephemeral temp paths,
// which then strip the declarations entirely and surface as TS2305
// downstream.
// ============================================
import { createCell, createCellTable, createCellRow } from "./Cell";
import type { CellProps, CellTableProps, CellRowProps } from "./Cell";
import type { Component, ParentComponent } from "solid-js";

// ── Table ────────────────────────────────────────────────────────────

export const KVTable: ParentComponent<CellTableProps> = createCellTable({});

// ── Row ──────────────────────────────────────────────────────────────

export const BorderRow: ParentComponent<CellRowProps> = createCellRow({ border: true });

// ── Term cells (label column) ────────────────────────────────────────

export const DataTerm: Component<CellProps> = createCell({ color: "var(--text-primary, #e0f4ff)" });
export const DataTermMuted: Component<CellProps> = createCell({ color: "var(--text-muted, #7aa8c0)" });

// ── Value cells (data column) ────────────────────────────────────────

export const DataValue: Component<CellProps> = createCell({ align: "right", weight: "semibold", color: "var(--text-secondary, #b0d4e8)" });
export const DataValueHighlight: Component<CellProps> = createCell({ align: "right", weight: "semibold", color: "var(--sui-warning)" });
export const DataValueSuccess: Component<CellProps> = createCell({ align: "right", weight: "semibold", color: "var(--sui-success)" });
export const DataValuePrimary: Component<CellProps> = createCell({ align: "right", weight: "semibold", color: "var(--text-primary, #e0f4ff)" });
export const DataValueMuted: Component<CellProps> = createCell({ align: "right", weight: "semibold", color: "var(--text-muted, #7aa8c0)" });

// ── Header cells ─────────────────────────────────────────────────────

export const DataHeader: Component<CellProps> = createCell({ as: "th", weight: "medium", color: "var(--text-muted, #7aa8c0)" });
export const DataHeaderRight: Component<CellProps> = createCell({ as: "th", align: "right", weight: "medium", color: "var(--text-muted, #7aa8c0)" });
export const DataHeaderCenter: Component<CellProps> = createCell({ as: "th", align: "center", weight: "medium", color: "var(--text-muted, #7aa8c0)" });
