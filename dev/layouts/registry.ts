// Registry of saved "default layouts" surfaced in the /layouts gallery.
// Add an entry here and it shows up as a thumbnail in the gallery's left panel.
import type { Component } from "solid-js";
import { StructuralLayout } from "./layout-skeleton";

export type LayoutEntry = {
  id: string;
  label: string;
  description: string;
  component: Component;
};

export const layouts: LayoutEntry[] = [
  {
    id: "structural-layout",
    label: "Cashflow Console — Layout",
    description:
      "A layout-first structural reference: labeled colored region panes (header, scenarios rail, observation, two-column items, detail rail, add footer) built only from SUI layout components — no real chart or data. Responsive: header → hamburger, scenarios → swipe paginator, observation → sparkline, items → tabs, detail → bottom sheet, add → FAB.",
    component: StructuralLayout,
  },
];
