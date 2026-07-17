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
  /** Renders the table with realistic stub data. */
  component: Component;
}
