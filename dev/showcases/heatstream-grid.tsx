import { Component } from "solid-js";
import { HeatStreamGrid } from "../../src/components/HeatStreamGrid";
import { createSelectionStore } from "../../src/components/Table/createSelectionStore";
import type { HeatStreamItem, HeatStreamStatus } from "../../src/components/HeatStream";

const KEYS = ["FTIR.I", "FTIR.O", "SCR", "FID", "DP", "MSI", "MSO"];

const ROWS = ["xbox3-1", "xbox3-2", "xbox5-1", "xbox5-2"];
const COLUMNS = ["2025-09", "2025-10", "2025-11", "2025-12", "2026-01", "2026-02"];

const item = (name: string, overrides?: Record<string, HeatStreamStatus>): HeatStreamItem => ({
  name,
  statuses: Object.fromEntries(KEYS.map(k => [k, overrides?.[k] ?? "full"])) as Record<string, HeatStreamStatus>,
});

const full = (count: number) =>
  Array.from({ length: count }, (_, i) => item(`VC-${i + 1}`));

const fidMissing: Record<string, HeatStreamStatus> = { FID: "missing" };
const ftirIMissing: Record<string, HeatStreamStatus> = { "FTIR.I": "missing" };
const allMissing: Record<string, HeatStreamStatus> = Object.fromEntries(KEYS.map(k => [k, "missing"]));
const allUnknown: Record<string, HeatStreamStatus> = Object.fromEntries(KEYS.map(k => [k, "unknown"]));

// xbox3-1: explicit data to place scattered partials
const XBOX3_1: Record<string, HeatStreamItem[]> = {
  "2025-09": [item("VC-1"), item("VC-2"), item("VC-3")],
  "2025-10": [item("VC-1", { SCR: "partial" }), item("VC-2")],
  "2025-11": [item("VC-1"), item("VC-2"), item("VC-3"), item("VC-4")],
  "2025-12": [item("VC-1"), item("VC-2", { MSO: "partial" })],
  "2026-01": [item("VC-1"), item("VC-2"), item("VC-3")],
  "2026-02": [item("VC-1"), item("VC-2", allUnknown)],
};

// xbox5-1: FID missing from mid-Oct through end of Jan
const XBOX5_1: Record<string, HeatStreamItem[]> = {
  "2025-09": full(1),
  "2025-10": [item("VC-1", { MSI: "partial" }), item("VC-2", fidMissing)],
  "2025-11": [item("VC-1", fidMissing), item("VC-2", fidMissing), item("VC-3", fidMissing)],
  "2025-12": [item("VC-1", fidMissing), item("VC-2", fidMissing), item("VC-3", fidMissing)],
  "2026-01": [item("VC-1", { ...fidMissing, "FTIR.O": "partial" }), item("VC-2", fidMissing)],
  "2026-02": [item("VC-1"), item("VC-2", allUnknown)],
};

// xbox3-2: scattered FTIR.I failures across Sep–Dec
const XBOX3_2: Record<string, HeatStreamItem[]> = {
  "2025-09": [item("VC-1", ftirIMissing), item("VC-2")],
  "2025-10": [item("VC-1"), item("VC-2", { DP: "partial" }), item("VC-3", ftirIMissing)],
  "2025-11": [item("VC-1"), item("VC-2", { ...ftirIMissing, "FTIR.O": "partial" })],
  "2025-12": [item("VC-1"), item("VC-2"), item("VC-3"), item("VC-4", ftirIMissing), item("VC-5")],
  "2026-01": full(2),
  "2026-02": [item("VC-1"), item("VC-2", allUnknown)],
};

// xbox5-2: 4 scattered vessel calls with all categories missing
const XBOX5_2: Record<string, HeatStreamItem[]> = {
  "2025-09": [item("VC-1"), item("VC-2", allMissing), item("VC-3", { "FTIR.I": "partial" }), item("VC-4")],
  "2025-10": [item("VC-1"), item("VC-2"), item("VC-3", allMissing)],
  "2025-11": [item("VC-1", allMissing), item("VC-2")],
  "2025-12": full(1),
  "2026-01": [item("VC-1"), item("VC-2"), item("VC-3", allMissing)],
  "2026-02": [item("VC-1"), item("VC-2", { FID: "partial" }), item("VC-3", allUnknown)],
};

const ALL_DATA: Record<string, Record<string, HeatStreamItem[]>> = {
  "xbox3-1": XBOX3_1,
  "xbox3-2": XBOX3_2,
  "xbox5-1": XBOX5_1,
  "xbox5-2": XBOX5_2,
};

const getData = (row: string, col: string): HeatStreamItem[] =>
  ALL_DATA[row]?.[col] ?? [];

export const HeatStreamGridShowcase: Component = () => {
  const selectionStore = createSelectionStore<string>();

  return (
    <div class="component-section">
      <h2>HeatStreamGrid — Depth 2</h2>
      <p class="text-meta">Composes HeatStream. Renders a grid table with assets as rows and time windows as columns. Each cell contains a compact HeatStream. Click cells, row labels, column headers, or the corner to toggle selection.</p>
      <div class="depth2-layout">
        <div class="depth2-composed">
          <h3>4 Assets x 6 Months — Selectable Grid</h3>
          <p class="text-meta" style={{ "margin-bottom": "8px" }}>
            Selected: {selectionStore.selected().size} cells
          </p>
          <HeatStreamGrid
            rows={ROWS}
            columns={COLUMNS}
            keys={KEYS}
            data={getData}
            selectionStore={selectionStore}
          />
        </div>
        <div class="depth2-atoms">
          <h3>Props</h3>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">rows</div>
            <div class="depth2-atom"><div class="depth2-atom__label">string[] — row labels</div></div>
          </div>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">columns</div>
            <div class="depth2-atom"><div class="depth2-atom__label">string[] — column headers</div></div>
          </div>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">keys</div>
            <div class="depth2-atom"><div class="depth2-atom__label">string[] — HeatStream keys</div></div>
          </div>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">data</div>
            <div class="depth2-atom"><div class="depth2-atom__label">(row, col) =&gt; HeatStreamItem[]</div></div>
          </div>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">selectionStore</div>
            <div class="depth2-atom"><div class="depth2-atom__label">SelectionStore&lt;string&gt; — optional selection control</div></div>
          </div>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">onCellClick</div>
            <div class="depth2-atom"><div class="depth2-atom__label">(row, col) =&gt; void — fallback when no selectionStore</div></div>
          </div>
        </div>
      </div>
    </div>
  );
};
