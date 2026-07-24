// JTF card catalog — shared contract for the per-group entry modules.
// Each module under this directory exports `ENTRIES: CardEntry[]`; the bench
// (../jtf-cards.tsx) aggregates them into the feature sidebar.
//
// Mirrors the JTF Table Catalog (../jtf-tables + ../jtf-tables/shared.ts):
// every card layout in jtf-ui, replicated with realistic stub data and tagged
// SUI-compliant (composed from Surface/Layout/Text variants) or raw (still on
// hand-rolled markup with call-site geometry/color). The catalog is the
// migration worklist made visible.
import type { Component } from "solid-js";

export interface CardEntry {
  /** jtf-ui route (or component path for embedded cards). */
  route: string;
  /** The card's name as jtf knows it. */
  name: string;
  /** SUI-compliant (Surface/Layout/Text variants) or still raw hand-rolled. */
  status: "sui" | "raw";
  /** One line: what blocks compliance (raw) or what it migrated to (sui). */
  note: string;
  /** Renders the card with realistic stub data. */
  component: Component;
}
