import { Component, createSignal } from "solid-js";
import { SelectableTable } from "../../src/components/Table";

const sampleData = [
  { id: "r1", vessel: "MV Northern Star", imo: "9876543", date: "2026-01-15" },
  { id: "r2", vessel: "SS Pacific Dawn", imo: "9123456", date: "2026-01-14" },
  { id: "r3", vessel: "MT Coral Sea", imo: "9654321", date: "2026-01-13" },
  { id: "r4", vessel: "MV Aurora", imo: "9345678", date: "2026-01-12" },
];

const columns = [
  { id: "vessel", header: "Vessel", accessor: "vessel" as const },
  { id: "imo", header: "IMO", accessor: "imo" as const, width: "100px" },
  { id: "date", header: "Date", accessor: "date" as const, width: "120px" },
];

export const SelectableTableShowcase: Component = () => {
  const [selected, setSelected] = createSignal<Set<string>>(new Set());

  return (
    <div class="component-section">
      <h2>SelectableTable — Depth 2 (zero CSS)</h2>
      <p class="text-meta">Composes Button (Atomic/Depth 1). Table + checkbox selection + action bar.</p>
      <div class="depth2-layout">
        <div class="depth2-composed">
          <h3>Composed — With Selection Actions</h3>
          <SelectableTable
            data={sampleData}
            columns={columns}
            getRowId={(row) => row.id}
            selectionStore={{ selected, setSelected }}
            selectionActions={[
              {
                label: "Delete",
                variant: "danger" as const,
                onClick: (ids) => {
                  console.log("Delete:", [...ids]);
                  setSelected(new Set());
                },
              },
            ]}
            stickyHeader
          />
        </div>
        <div class="depth2-atoms">
          <h3>Sub-Components</h3>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Button (Atomic)</div>
            <div class="depth2-atom"><div class="depth2-atom__label">Used in action bar</div></div>
          </div>
          <h3>Props</h3>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Selection</div>
            <div class="depth2-atom"><div class="depth2-atom__label">selectionStore / selectionActions / getRowId</div></div>
          </div>
        </div>
      </div>
    </div>
  );
};
