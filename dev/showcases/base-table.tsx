import { type Component, For, createSignal } from "solid-js";
import { BaseTable } from "../../src/components/Table";
import {
  CompactTable,
  StripedTable,
  StickyTable,
  DataTable,
} from "../../src/components/Table";
import type { TableColumn } from "../../src/components/Table";
import {
  dateTimeCol,
  floatCol,
  intCol,
  statusCol,
  textCol,
} from "../../src/components/Table";
import { IconOnlyButton, TextButton } from "../../src/components/Button";
import { Icon } from "../../src/components/Icon";
import { NarrowStack, WrapRow } from "../../src/components/Layout";

interface Vessel {
  id: number;
  vessel: string;
  imo: string;
  status: string;
  speed: number;
}

// Vessel status → badge variant (StatusCell's default map knows "active" only).
const VESSEL_STATUS = {
  active: { variant: "success" as const },
  underway: { variant: "active" as const },
  berthed: { variant: "inactive" as const },
  anchored: { variant: "pending" as const },
};

const sampleData: Vessel[] = [
  {
    id: 1,
    vessel: "MV Northern Star",
    imo: "9876543",
    status: "Active",
    speed: 14.2,
  },
  {
    id: 2,
    vessel: "SS Pacific Dawn",
    imo: "9123456",
    status: "Berthed",
    speed: 0,
  },
  {
    id: 3,
    vessel: "MT Coral Sea",
    imo: "9654321",
    status: "Underway",
    speed: 11.8,
  },
  { id: 4, vessel: "MV Aurora", imo: "9345678", status: "Anchored", speed: 0 },
  {
    id: 5,
    vessel: "MV Baltic Trader",
    imo: "9501234",
    status: "Underway",
    speed: 16.5,
  },
  {
    id: 6,
    vessel: "SS Gulf Pioneer",
    imo: "9412785",
    status: "Berthed",
    speed: 0,
  },
  {
    id: 7,
    vessel: "MT Arctic Voyager",
    imo: "9388210",
    status: "Active",
    speed: 9.4,
  },
  {
    id: 8,
    vessel: "MV Coral Princess",
    imo: "9276543",
    status: "Anchored",
    speed: 0.3,
  },
  {
    id: 9,
    vessel: "SS Atlantic Crest",
    imo: "9655012",
    status: "Underway",
    speed: 18.1,
  },
  {
    id: 10,
    vessel: "MT Sahara Wind",
    imo: "9701456",
    status: "Active",
    speed: 12.7,
  },
  {
    id: 11,
    vessel: "MV Orion Spirit",
    imo: "9234871",
    status: "Berthed",
    speed: 0,
  },
  {
    id: 12,
    vessel: "SS Caspian Dawn",
    imo: "9588304",
    status: "Underway",
    speed: 15.0,
  },
  {
    id: 13,
    vessel: "MT Bering Glory",
    imo: "9447120",
    status: "Anchored",
    speed: 0,
  },
  {
    id: 14,
    vessel: "MV Indus Mariner",
    imo: "9319802",
    status: "Active",
    speed: 13.6,
  },
  {
    id: 15,
    vessel: "SS Celtic Horizon",
    imo: "9672345",
    status: "Underway",
    speed: 17.3,
  },
  {
    id: 16,
    vessel: "MT Andaman Pearl",
    imo: "9505678",
    status: "Berthed",
    speed: 0,
  },
  {
    id: 17,
    vessel: "MV Tasman Glory",
    imo: "9398012",
    status: "Active",
    speed: 10.9,
  },
  {
    id: 18,
    vessel: "SS Aegean Light",
    imo: "9261904",
    status: "Anchored",
    speed: 0.1,
  },
];

// Every column goes through a value renderer (canon, 2026-10-16): the text
// column takes the remainder; IMO, status and speed are sized to the data.
const columns: TableColumn<Vessel>[] = [
  textCol("vessel", "Vessel", { sortable: true }),
  textCol("imo", "IMO", { data: sampleData }),
  statusCol("status", "Status", {
    data: sampleData,
    statusMap: VESSEL_STATUS,
    sortable: true,
  }),
  floatCol("speed", "Speed (kn)", 1, { data: sampleData, sortable: true }),
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
  {
    hour: "2026-01-15 08:00",
    ftir_status: "Full",
    ftir_samples: 60,
    scr_status: "Partial",
    scr_samples: 42,
  },
  {
    hour: "2026-01-15 09:00",
    ftir_status: "Full",
    ftir_samples: 60,
    scr_status: "Full",
    scr_samples: 60,
  },
  {
    hour: "2026-01-15 10:00",
    ftir_status: "Missing",
    ftir_samples: 0,
    scr_status: "Full",
    scr_samples: 58,
  },
];

// Sample coverage → badge variant.
const COVERAGE_STATUS = {
  full: { variant: "success" as const },
  partial: { variant: "warning" as const },
  missing: { variant: "error" as const },
};

// The Hour column is a minute-precision dateTimeCol sized to its data
// ("2026-01-15 08:00" → 16ch + padding), so it can never wrap onto two lines
// the way the bare `accessor: "hour"` it replaced did (Peter, 2026-10-16).
const groupedColumns: TableColumn<SensorReading>[] = [
  dateTimeCol("hour", "Hour", {
    data: groupedData,
    precision: "minute",
    sortable: true,
  }),
  statusCol("ftir_status", "Status", {
    data: groupedData,
    statusMap: COVERAGE_STATUS,
    group: "FTIR",
    sortable: true,
  }),
  intCol("ftir_samples", "Samples", {
    data: groupedData,
    group: "FTIR",
    sortable: true,
  }),
  statusCol("scr_status", "Status", {
    data: groupedData,
    statusMap: COVERAGE_STATUS,
    group: "SCR",
    sortable: true,
  }),
  intCol("scr_samples", "Samples", {
    data: groupedData,
    group: "SCR",
    sortable: true,
  }),
];

/** `highlighted` — the other half of an `onRowHover` cross-highlight. Hover a
 *  name above the table (standing in for a chart mark) and its row lights;
 *  hover a row and its name reads back. One signal, both directions. */
const CrossHighlightExample: Component = () => {
  const [hovered, setHovered] = createSignal<number | null>(null);
  return (
    <>
      <WrapRow>
        <For each={sampleData.slice(0, 4)}>
          {(row) => (
            <TextButton
              onPointerEnter={() => setHovered(row.id)}
              onPointerLeave={() => setHovered(null)}
              onClick={() => setHovered(row.id)}
            >
              {row.id === hovered() ? `▸ ${row.vessel}` : row.vessel}
            </TextButton>
          )}
        </For>
      </WrapRow>
      <CompactTable
        data={sampleData.slice(0, 4)}
        columns={columns}
        hoverable
        onRowHover={(row) => setHovered(row ? row.id : null)}
        highlighted={(row) => row.id === hovered()}
      />
    </>
  );
};

export const BaseTableShowcase: Component = () => {
  return (
    <div class="component-section">
      <h2>BaseTable — Atomic (Depth 1)</h2>
      <p class="text-meta">
        Owns CSS (Table.css), no component imports. Sortable table with sticky
        header, striped rows.
      </p>
      <div class="depth2-layout">
        <div class="depth2-composed">
          <h3>Composed — Default (natural height)</h3>
          <p class="text-meta">
            No <code>maxHeight</code> — the table grows to fit all rows. Shown
            for contrast against the scrolling demos below.
          </p>
          <BaseTable data={sampleData} columns={columns} />

          <h3 class="showcase-heading-gap">
            Composed — Striped + Hoverable + Scroll
          </h3>
          <p class="text-meta">
            <code>maxHeight="300px"</code> caps the body so the{" "}
            {sampleData.length}-row dataset scrolls internally.
          </p>
          <BaseTable
            data={sampleData}
            columns={columns}
            striped
            hoverable
            maxHeight="300px"
          />

          <h3 class="showcase-heading-gap">
            Composed — Compact + Sticky Header
          </h3>
          <p class="text-meta">
            {sampleData.length} rows capped at <code>maxHeight="300px"</code>:
            scroll the body and the header stays pinned.
          </p>
          <BaseTable
            data={sampleData}
            columns={columns}
            compact
            stickyHeader
            maxHeight="300px"
          />

          <h3 class="showcase-heading-gap">Composed — Hover Row Actions</h3>
          <p class="text-meta">
            Hover a row to reveal the trailing action. Clicking the action does
            not fire <code>onRowClick</code>.
          </p>
          <BaseTable
            data={sampleData}
            columns={columns}
            hoverable
            onRowClick={(r) => console.log("row click", r.vessel)}
            rowActions={(r) => (
              <IconOnlyButton onClick={() => console.log("delete", r.vessel)}>
                <Icon name="close" />
              </IconOnlyButton>
            )}
          />

          <h3 class="showcase-heading-gap">Composed — Empty State</h3>
          <BaseTable
            data={[]}
            columns={columns}
            emptyMessage="No vessels found"
          />

          <h3 class="showcase-heading-gap">
            Composed — Fit (shrink-wrap to content)
          </h3>
          <p class="text-meta">
            <code>fit</code> packs the table AND its bordered frame to the
            columns' natural width instead of stretching full-width — for a
            table whose columns are all fixed/capped content (IDs, speed), where
            a full-width stretch would spread them apart with dead gaps. The
            frame's right edge should land right after <strong>Speed</strong>,
            not at the panel's own edge.
          </p>
          <BaseTable
            data={sampleData.slice(0, 3)}
            columns={[
              intCol<Vessel>("id", "ID", { data: sampleData.slice(0, 3) }),
              textCol<Vessel>("imo", "IMO", { data: sampleData.slice(0, 3) }),
              floatCol<Vessel>("speed", "Speed", 1, {
                data: sampleData.slice(0, 3),
              }),
            ]}
            fit
          />

          <h3 class="showcase-heading-gap">Curried Variants</h3>
          <NarrowStack>
            <div>
              <CompactTable data={sampleData} columns={columns} />
              <div class="text-meta">
                CompactTable — compact, stickyHeader, maxHeight: "300px"
              </div>
            </div>
            <div>
              <StripedTable data={sampleData} columns={columns} />
              <div class="text-meta">StripedTable — striped, hoverable</div>
            </div>
            <div>
              <StickyTable data={sampleData} columns={columns} />
              <div class="text-meta">
                StickyTable — stickyHeader, maxHeight: "400px"
              </div>
            </div>
            <div>
              <DataTable data={sampleData} columns={columns} />
              <div class="text-meta">
                DataTable — striped, hoverable, stickyHeader, fill
              </div>
            </div>
          </NarrowStack>
        </div>
        <div class="depth2-atoms">
          <h3>Props</h3>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Booleans</div>
            <div class="depth2-atom">
              <div class="depth2-atom__label">
                striped / hoverable / compact / stickyHeader / fill
              </div>
            </div>
          </div>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Max Height</div>
            <div class="depth2-atom">
              <div class="depth2-atom__label">
                string (e.g. "300px") — enables scroll
              </div>
            </div>
          </div>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Column</div>
            <div class="depth2-atom">
              <div class="depth2-atom__label">
                sortable / width / align / accessor / group
              </div>
            </div>
          </div>
        </div>
      </div>

      <h2 class="showcase-heading-gap--lg">Highlighted from outside</h2>
      <p class="text-meta">
        <code>highlighted</code> lights rows as if hovered, driven by state the
        table does not own.
      </p>
      <CrossHighlightExample />

      <h2 class="showcase-heading-gap--lg">Column Groups</h2>
      <p class="text-meta">
        Columns with the same <code>group</code> string get merged under a
        colspan header. Ungrouped columns span both rows.
      </p>
      <div class="depth2-layout">
        <div class="depth2-composed">
          <h3>Composed — Grouped Headers</h3>
          <BaseTable data={groupedData} columns={groupedColumns} striped />

          <h3 class="showcase-heading-gap">Composed — Compact + Grouped</h3>
          <BaseTable
            data={groupedData}
            columns={groupedColumns}
            compact
            stickyHeader
            maxHeight="200px"
          />
        </div>
      </div>
    </div>
  );
};
