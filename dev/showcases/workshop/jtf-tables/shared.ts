// JTF table catalog — shared contract for the per-group entry modules.
// Each module under this directory exports `ENTRIES: TableEntry[]`; the bench
// (../jtf-tables.tsx) aggregates them into the route sidebar.
import type { Component } from "solid-js";

export interface TableEntry {
  /** jtf-ui route (or component path for embedded tables). */
  route: string;
  /** The table's name as jtf knows it. */
  name: string;
  /** SUI-compliant (FieldTable/fields/ValueMatrix) or still raw BaseTable. */
  status: "sui" | "raw";
  /** One line: what blocks compliance (raw) or what it migrated to (sui). */
  note: string;
  /** CUSTOM_DEMANDS ids this table needs before it can go sui — the
   *  not-yet-curried field types blocking it. Absent/empty on a raw entry
   *  means pure migration work (everything it needs already exists). */
  customs?: string[];
  /** Renders the table with realistic stub data. */
  component: Component;
}

/** A field type (or table feature) the fields system does NOT yet curry. */
export interface CustomDemand {
  id: string;
  /** Short name. */
  name: string;
  /** Why it's still custom — what the fields model can't express yet. */
  why: string;
}

/** The not-yet-curried vocabulary, referenced by TableEntry.customs. The
 *  demand rail derives per-type table counts from the annotations — this
 *  list is the definition side only, never counts. */
export const CUSTOM_DEMANDS: CustomDemand[] = [
  {
    id: "styled-number",
    name: "Emphasis numerics",
    why: "withCellStyle oversized/weighted/colored floats say more than the Tone vocabulary (primary vs accent weight, oversized green).",
  },
  {
    id: "row-tone",
    name: "Row tone",
    why: "getRowClass row highlights (baseline row, conditional row sets) need a semantic rowTone, not a class escape hatch.",
  },
  {
    id: "header-hint",
    name: "Header hint",
    why: "Headers carrying JSX Tooltips; fields headers are plain strings with no hint channel.",
  },
  {
    id: "linked-value",
    name: "Linked value",
    why: "Non-identity cells that navigate (bucket-count links, week links) — identityLinkCol covers names only.",
  },
  {
    id: "count-emphasis",
    name: "Count emphasis",
    why: "Count columns colored from the series palette with conditional emphasis; intCol's tone fn can't reach the palette.",
  },
  {
    id: "linked-badge",
    name: "Linked badge",
    why: "A statusCol badge that is ALSO a link (spreadsheet href).",
  },
  {
    id: "row-click",
    name: "Row navigation",
    why: "Whole-row onRowClick navigation isn't surfaced through FieldTable.",
  },
  {
    id: "select-state",
    name: "Selection labels",
    why: "Bespoke select-all header with per-row 'added' state labels beyond createFieldSelection.",
  },
  {
    id: "grouped-headers",
    name: "Grouped headers",
    why: "Two-row spanned category headers — stays raw by design.",
  },
  {
    id: "span-row",
    name: "Row collapse",
    why: "Per-row colspan takeover for partial weeks (BaseTable spanRow) — stays raw by design.",
  },
];
