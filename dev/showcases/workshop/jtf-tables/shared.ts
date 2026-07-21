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

// The not-yet-curried demand rail (CUSTOM_DEMANDS + TableEntry.customs) was
// REMOVED 2026-07-21: the catalog reached 31/31 and every demand was
// subtracted by ruling (row-click → identity cell; select-state → added rows
// leave the picker; grouped-headers → group() spec wrapper; span-row →
// withWhen-gated columns). History lives in the 2026-07-20 commits.
