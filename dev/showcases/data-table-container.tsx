import { Component, For } from "solid-js";
import { DataTableContainer } from "../../src/components/Table";
import { Stack } from "../../src/components/Layout/Stack";

const sampleRows = Array.from({ length: 20 }, (_, i) => ({
  id: i + 1,
  vessel: `Vessel ${String.fromCharCode(65 + (i % 26))}`,
  value: (Math.random() * 100).toFixed(2),
}));

export const DataTableContainerShowcase: Component = () => {
  return (
    <div class="component-section">
      <h2>DataTableContainer — Atomic (Depth 1)</h2>
      <p class="text-meta">Owns CSS (DataTableContainer.css), no component imports. Scrollable container with max-height or flex-fill.</p>

      <div class="example-group">
        <h3>Base Component</h3>
        <Stack gap="sm">
          <div>
            <div class="text-meta">maxHeight: 200px (default: 500px)</div>
            <DataTableContainer maxHeight="200px">
              <table style={{ width: "100%", "border-collapse": "collapse" }}>
                <thead class="sticky-table-header">
                  <tr>
                    <th style={{ padding: "8px", "text-align": "left", "border-bottom": "1px solid var(--sui-border)" }}>ID</th>
                    <th style={{ padding: "8px", "text-align": "left", "border-bottom": "1px solid var(--sui-border)" }}>Vessel</th>
                    <th style={{ padding: "8px", "text-align": "right", "border-bottom": "1px solid var(--sui-border)" }}>Value</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={sampleRows}>
                    {(row) => (
                      <tr>
                        <td style={{ padding: "8px", "border-bottom": "1px solid var(--sui-border)" }}>{row.id}</td>
                        <td style={{ padding: "8px", "border-bottom": "1px solid var(--sui-border)" }}>{row.vessel}</td>
                        <td style={{ padding: "8px", "text-align": "right", "border-bottom": "1px solid var(--sui-border)" }}>{row.value}</td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </DataTableContainer>
          </div>

          <div>
            <div class="text-meta">fill: true — flex: 1, no max-height (fills parent)</div>
            <div style={{ height: "150px", display: "flex", "flex-direction": "column", border: "1px dashed var(--sui-border-bright)" }}>
              <DataTableContainer fill>
                <table style={{ width: "100%", "border-collapse": "collapse" }}>
                  <thead class="sticky-table-header">
                    <tr>
                      <th style={{ padding: "8px", "text-align": "left", "border-bottom": "1px solid var(--sui-border)" }}>ID</th>
                      <th style={{ padding: "8px", "text-align": "left", "border-bottom": "1px solid var(--sui-border)" }}>Vessel</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={sampleRows.slice(0, 10)}>
                      {(row) => (
                        <tr>
                          <td style={{ padding: "8px", "border-bottom": "1px solid var(--sui-border)" }}>{row.id}</td>
                          <td style={{ padding: "8px", "border-bottom": "1px solid var(--sui-border)" }}>{row.vessel}</td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </DataTableContainer>
            </div>
          </div>
        </Stack>
      </div>

      <div class="example-group">
        <h3>CSS Utility Classes</h3>
        <Stack gap="sm">
          <div>
            <code class="text-meta">.sticky-table-header</code>
            <div class="text-meta">Apply to thead — sticky top: 0, z-index: 10, dark bg</div>
          </div>
          <div>
            <code class="text-meta">.sticky-row-header</code>
            <div class="text-meta">Apply to first-column th — sticky left: 0, z-index: 11</div>
          </div>
          <div>
            <code class="text-meta">.sticky-row-cell</code>
            <div class="text-meta">Apply to first-column td — sticky left: 0, z-index: 1, font-weight: 600</div>
          </div>
        </Stack>
      </div>
    </div>
  );
};
