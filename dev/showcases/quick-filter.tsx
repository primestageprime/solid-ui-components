import type { Component } from "solid-js";
import {
  FilterableTable as QuickFilter,
  type TableColumn,
  floatCol,
  textCol,
} from "../../src/components/Table";

interface Fluid {
  id: number;
  name: string;
  category: string;
  volume: number;
  unit: string;
}

const sampleData: Fluid[] = [
  { id: 1, name: "Fuel Oil", category: "Fuel", volume: 1250.5, unit: "L" },
  { id: 2, name: "Diesel", category: "Fuel", volume: 840.2, unit: "L" },
  { id: 3, name: "Engine Oil", category: "Lubricant", volume: 45.0, unit: "L" },
  {
    id: 4,
    name: "Hydraulic Fluid",
    category: "Lubricant",
    volume: 22.8,
    unit: "L",
  },
  { id: 5, name: "Coolant", category: "Fluid", volume: 180.0, unit: "L" },
  {
    id: 6,
    name: "Urea Solution",
    category: "Additive",
    volume: 95.3,
    unit: "L",
  },
];

// Renderers throughout (canon 2026-10-16); Volume and Unit size to the data.
const columns: TableColumn<Fluid>[] = [
  textCol("name", "Name", { sortable: true }),
  textCol("category", "Category", { sortable: true }),
  floatCol("volume", "Volume", 1, { data: sampleData, sortable: true }),
  textCol("unit", "Unit", { data: sampleData }),
];

export const QuickFilterShowcase: Component = () => {
  return (
    <div class="component-section">
      <h2>QuickFilter — Depth 1 (zero CSS)</h2>
      <p class="text-meta">
        Composes BaseTable (Atomic/Depth 1). Filter input + table passthrough.
      </p>
      <div class="depth2-layout">
        <div class="depth2-composed">
          <h3>Composed — Filterable Table</h3>
          <QuickFilter
            data={sampleData}
            columns={columns}
            filterPlaceholder="Search fluids..."
            striped
            hoverable
          />
        </div>
        <div class="depth2-atoms">
          <h3>Sub-Components</h3>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">BaseTable (Atomic)</div>
            <div class="depth2-atom">
              <div class="depth2-atom__label">
                All BaseTable props pass through
              </div>
            </div>
          </div>
          <h3>Props</h3>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">filterPlaceholder</div>
            <div class="depth2-atom">
              <div class="depth2-atom__label">
                string — placeholder text for filter input
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
