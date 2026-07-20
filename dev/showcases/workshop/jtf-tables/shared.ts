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
  // row-click ("Row navigation") SUBTRACTED 2026-07-20: ruled that row
  // navigation collapses to the identity cell (identityLinkCol is the link);
  // FieldTable never grows onRowClick.
  // select-state ("Selection labels") SUBTRACTED 2026-07-20: ruled that added
  // calls are REMOVED from the picker (they live in the report bag table)
  // instead of carrying a per-row 'added' label — createFieldSelection covers
  // the rest. The demand rail is EMPTY: every jtf table is expressible.
  // grouped-headers ("Grouped headers") SUBTRACTED 2026-07-20: ruled that the
  // last "stays raw by design" demand falls. Two-row spanned category headers
  // are expressed by the group(label, [...members]) spec wrapper — the ordered
  // gesture names each category run, the resolver stamps each member's `group`,
  // and BaseTable derives the colspan header it already renders. HourLevelDataTable
  // migrated to FieldTable; nothing stays raw for headers.
  // span-row ("Row collapse") SUBTRACTED 2026-07-20: ruled that per-row
  // colspan takeovers collapse to predicate-gated columns — withWhen blanks
  // the stat cells and the row action rides an actions column.
];
