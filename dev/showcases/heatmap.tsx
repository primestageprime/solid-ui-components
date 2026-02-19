import { Component } from "solid-js";
import { Heatmap, HeatmapMulti, HeatmapRow, HeatmapMultiRow } from "../../src/components/Heatmap";

const singleRows: HeatmapRow[] = [
  {
    id: "nox", label: "NOx",
    cells: [
      { id: "h1", value: 1, status: "full" },
      { id: "h2", value: 0.8, status: "partial" },
      { id: "h3", value: 1, status: "full" },
      { id: "h4", value: 0, status: "missing" },
      { id: "h5", value: 1, status: "full" },
      { id: "h6", value: 1, status: "full" },
    ],
  },
  {
    id: "sox", label: "SOx",
    cells: [
      { id: "h1", value: 1, status: "full" },
      { id: "h2", value: 1, status: "full" },
      { id: "h3", value: 0, status: "missing" },
      { id: "h4", value: 0, status: "missing" },
      { id: "h5", value: 0.5, status: "partial" },
      { id: "h6", value: 1, status: "full" },
    ],
  },
];

const multiRows: HeatmapMultiRow[] = [
  {
    id: "day1", label: "Mon",
    cells: [
      { id: "00:00", categories: { NOx: "full", SOx: "full", CO2: "full" } },
      { id: "04:00", categories: { NOx: "full", SOx: "partial", CO2: "full" } },
      { id: "08:00", categories: { NOx: "missing", SOx: "full", CO2: "partial" } },
      { id: "12:00", categories: { NOx: "full", SOx: "full", CO2: "full" } },
      { id: "16:00", categories: { NOx: "full", SOx: "full", CO2: "missing" } },
      { id: "20:00", categories: { NOx: "partial", SOx: "full", CO2: "full" } },
    ],
  },
  {
    id: "day2", label: "Tue",
    cells: [
      { id: "00:00", categories: { NOx: "full", SOx: "full", CO2: "full" } },
      { id: "04:00", categories: { NOx: "full", SOx: "full", CO2: "full" } },
      { id: "08:00", categories: { NOx: "full", SOx: "full", CO2: "full" } },
      { id: "12:00", categories: { NOx: "partial", SOx: "missing", CO2: "full" } },
      { id: "16:00", categories: { NOx: "full", SOx: "full", CO2: "full" } },
      { id: "20:00", categories: { NOx: "full", SOx: "full", CO2: "full" } },
    ],
  },
];

export const HeatmapShowcase: Component = () => {
  return (
    <div class="component-section">
      <h2>Heatmap + HeatmapMulti — Atomic (Depth 1)</h2>
      <p class="text-meta">Owns CSS (Heatmap.css), no component imports. Grid cells with status colors, legends, tooltips.</p>
      <div class="depth2-layout">
        <div class="depth2-composed">
          <h3>Composed — Single-Category Heatmap</h3>
          <Heatmap
            rows={singleRows}
            columnLabels={["00:00", "04:00", "08:00", "12:00", "16:00", "20:00"]}
            showLegend
            showTooltips
          />

          <h3 style={{ "margin-top": "24px" }}>Composed — Compact Variant</h3>
          <Heatmap rows={singleRows} variant="compact" showTooltips />

          <h3 style={{ "margin-top": "24px" }}>Composed — Multi-Category Heatmap</h3>
          <HeatmapMulti
            rows={multiRows}
            categoryLabels={["NOx", "SOx", "CO2"]}
            showLegend
          />

          <h3 style={{ "margin-top": "24px" }}>Composed — Multi Sparkline</h3>
          <HeatmapMulti
            rows={multiRows}
            categoryLabels={["NOx", "SOx", "CO2"]}
            variant="sparkline"
          />
        </div>
        <div class="depth2-atoms">
          <h3>Props — Heatmap</h3>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Variant</div>
            <div class="depth2-atom"><div class="depth2-atom__label">default / compact / sparkline</div></div>
          </div>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Cell Status</div>
            <div class="depth2-atom"><div class="depth2-atom__label">full / partial / missing / empty</div></div>
          </div>
          <h3>Props — HeatmapMulti</h3>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Variant</div>
            <div class="depth2-atom"><div class="depth2-atom__label">default / compact / sparkline / expanded</div></div>
          </div>
        </div>
      </div>
    </div>
  );
};
