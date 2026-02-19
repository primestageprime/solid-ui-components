import { Component } from "solid-js";
import { BaseTable } from "../../src/components/Table";
import { CompactTable, StripedTable, StickyTable, DataTable } from "../../src/components/Table";
import type { TableColumn } from "../../src/components/Table";

const sampleData = [
  { id: 1, vessel: "MV Northern Star", imo: "9876543", status: "Active", speed: 14.2 },
  { id: 2, vessel: "SS Pacific Dawn", imo: "9123456", status: "Berthed", speed: 0 },
  { id: 3, vessel: "MT Coral Sea", imo: "9654321", status: "Active", speed: 11.8 },
  { id: 4, vessel: "MV Aurora", imo: "9345678", status: "Anchored", speed: 0 },
];

const columns = [
  { id: "vessel", header: "Vessel", accessor: "vessel" as const, sortable: true },
  { id: "imo", header: "IMO", accessor: "imo" as const, width: "100px" },
  { id: "status", header: "Status", accessor: "status" as const, sortable: true },
  { id: "speed", header: "Speed (kn)", accessor: "speed" as const, align: "right" as const, sortable: true },
];

// Column groups demo data
interface SensorReading {
  hour: string;
  ftir_status: string;
  ftir_samples: number;
  scr_status: string;
  scr_samples: number;
}

const groupedData: SensorReading[] = [
  { hour: "2026-01-15 08:00", ftir_status: "Full", ftir_samples: 60, scr_status: "Partial", scr_samples: 42 },
  { hour: "2026-01-15 09:00", ftir_status: "Full", ftir_samples: 60, scr_status: "Full", scr_samples: 60 },
  { hour: "2026-01-15 10:00", ftir_status: "Missing", ftir_samples: 0, scr_status: "Full", scr_samples: 58 },
];

const groupedColumns: TableColumn<SensorReading>[] = [
  { id: "hour", header: "Hour", accessor: "hour", sortable: true },
  { id: "ftir_status", header: "Status", accessor: "ftir_status", group: "FTIR", sortable: true },
  { id: "ftir_samples", header: "Samples", accessor: "ftir_samples", group: "FTIR", align: "right", sortable: true },
  { id: "scr_status", header: "Status", accessor: "scr_status", group: "SCR", sortable: true },
  { id: "scr_samples", header: "Samples", accessor: "scr_samples", group: "SCR", align: "right", sortable: true },
];

export const BaseTableShowcase: Component = () => {
  return (
    <div class="component-section">
      <h2>BaseTable — Atomic (Depth 1)</h2>
      <p class="text-meta">Owns CSS (Table.css), no component imports. Sortable table with sticky header, striped rows.</p>
      <div class="depth2-layout">
        <div class="depth2-composed">
          <h3>Composed — Default</h3>
          <BaseTable data={sampleData} columns={columns} />

          <h3 style={{ "margin-top": "24px" }}>Composed — Striped + Hoverable</h3>
          <BaseTable data={sampleData} columns={columns} striped hoverable />

          <h3 style={{ "margin-top": "24px" }}>Composed — Compact + Sticky Header</h3>
          <BaseTable data={sampleData} columns={columns} compact stickyHeader maxHeight="150px" />

          <h3 style={{ "margin-top": "24px" }}>Composed — Empty State</h3>
          <BaseTable data={[]} columns={columns} emptyMessage="No vessels found" />

          <h3 style={{ "margin-top": "24px" }}>Curried Variants</h3>
          <div>
            <CompactTable data={sampleData} columns={columns} />
            <div class="text-meta">CompactTable — compact, stickyHeader, maxHeight: "300px"</div>
          </div>
          <div style={{ "margin-top": "16px" }}>
            <StripedTable data={sampleData} columns={columns} />
            <div class="text-meta">StripedTable — striped, hoverable</div>
          </div>
          <div style={{ "margin-top": "16px" }}>
            <StickyTable data={sampleData} columns={columns} />
            <div class="text-meta">StickyTable — stickyHeader, maxHeight: "400px"</div>
          </div>
          <div style={{ "margin-top": "16px" }}>
            <DataTable data={sampleData} columns={columns} />
            <div class="text-meta">DataTable — striped, hoverable, stickyHeader, fill</div>
          </div>
        </div>
        <div class="depth2-atoms">
          <h3>Props</h3>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Booleans</div>
            <div class="depth2-atom"><div class="depth2-atom__label">striped / hoverable / compact / stickyHeader / fill</div></div>
          </div>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Max Height</div>
            <div class="depth2-atom"><div class="depth2-atom__label">string (e.g. "300px") — enables scroll</div></div>
          </div>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Column</div>
            <div class="depth2-atom"><div class="depth2-atom__label">sortable / width / align / accessor / group</div></div>
          </div>
        </div>
      </div>

      <h2 style={{ "margin-top": "32px" }}>Column Groups</h2>
      <p class="text-meta">Columns with the same <code>group</code> string get merged under a colspan header. Ungrouped columns span both rows.</p>
      <div class="depth2-layout">
        <div class="depth2-composed">
          <h3>Composed — Grouped Headers</h3>
          <BaseTable data={groupedData} columns={groupedColumns} striped />

          <h3 style={{ "margin-top": "24px" }}>Composed — Compact + Grouped</h3>
          <BaseTable data={groupedData} columns={groupedColumns} compact stickyHeader maxHeight="200px" />
        </div>
      </div>
    </div>
  );
};
