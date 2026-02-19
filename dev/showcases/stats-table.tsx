import { Component, JSX } from "solid-js";
import { StatsTable, StatsColumn } from "../../src/components/DataDisplay";
import { NumberWithUnits } from "../../src/components/DataDisplay";

interface Depth2Props {
  onNavigate?: (id: string) => void;
}

interface PeriodRow {
  period: string;
  count: number;
  avgNox: number;
  noxColor: string;
  avgNO: number;
  avgNO2: number;
}

interface StatusRow {
  status: string;
  count: number;
  rate: string;
}

interface EngineRow {
  engine: string;
  power: number;
  nox: number;
  rog: number;
}

const periodColumns: StatsColumn<PeriodRow>[] = [
  { header: "Period", accessor: "period" },
  { header: "Data Points", accessor: "count", align: "right" },
  {
    header: "Avg NOx",
    accessor: (r) => <NumberWithUnits value={r.avgNox} units="ppm" precision={2} color={r.noxColor} />,
    align: "right",
  },
  {
    header: "Avg NO",
    accessor: (r) => <NumberWithUnits value={r.avgNO} units="ppm" precision={2} />,
    align: "right",
  },
  {
    header: "Avg NO\u2082",
    accessor: (r) => <NumberWithUnits value={r.avgNO2} units="ppm" precision={2} />,
    align: "right",
  },
];

const periodRows: PeriodRow[] = [
  { period: "Before Control", count: 142, avgNox: 18.34, noxColor: "#ff8800", avgNO: 12.81, avgNO2: 5.53 },
  { period: "During Control", count: 89, avgNox: 3.21, noxColor: "#00ff88", avgNO: 2.14, avgNO2: 1.07 },
  { period: "After Control", count: 56, avgNox: 16.92, noxColor: "#ff8800", avgNO: 11.44, avgNO2: 5.48 },
];

const statusColumns: StatsColumn<StatusRow>[] = [
  { header: "Status", accessor: "status" },
  { header: "Count", accessor: "count", align: "right" },
  { header: "Rate", accessor: "rate", align: "right" },
];

const statusRows: StatusRow[] = [
  { status: "Normal", count: 214, rate: "82.3%" },
  { status: "Warning", count: 32, rate: "12.3%" },
  { status: "Critical", count: 14, rate: "5.4%" },
];

const engineColumns: StatsColumn<EngineRow>[] = [
  { header: "Engine", accessor: "engine" },
  { header: "Power", accessor: (r) => <NumberWithUnits value={r.power} units="kW" />, align: "right" },
  { header: "NOx", accessor: (r) => <NumberWithUnits value={r.nox} units="g/kWh" precision={2} />, align: "right" },
  { header: "ROG", accessor: (r) => <NumberWithUnits value={r.rog} units="g/kWh" precision={2} />, align: "right" },
];

const engineRows: EngineRow[] = [
  { engine: "Main Engine 1", power: 1200, nox: 2.31, rog: 0.84 },
  { engine: "Main Engine 2", power: 1200, nox: 2.45, rog: 0.91 },
  { engine: "Aux Generator", power: 450, nox: 3.12, rog: 1.24 },
];

export const StatsTableShowcase: Component<Depth2Props> = (props) => {
  return (
    <div class="component-section">
      <h2>StatsTable — Atomic (Depth 1)</h2>
      <p class="text-meta">Owns CSS (StatsTable.css), no component imports. Simple stats table with typed columns and row classes.</p>
      <div class="depth2-layout">
        <div class="depth2-composed">
          <h3>Composed — Period Statistics</h3>
          <StatsTable
            caption="NOx Statistics by Control Period"
            columns={periodColumns}
            rows={periodRows}
            getRowClass={(row) => row.period === "During Control" ? "stats-table__row--highlight" : undefined}
          />

          <h3 style={{ "margin-top": "24px" }}>Composed — Row Variants</h3>
          <StatsTable
            columns={statusColumns}
            rows={statusRows}
            getRowClass={(_, i) => i === 1 ? "stats-table__row--warning" : i === 2 ? "stats-table__row--danger" : undefined}
          />

          <h3 style={{ "margin-top": "24px" }}>Composed — Engine Data</h3>
          <StatsTable
            caption="Engine Performance Summary"
            columns={engineColumns}
            rows={engineRows}
          />
        </div>
        <div class="depth2-atoms">
          <h3>Curried Variants Used</h3>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Table Primitives</div>
            <div class="depth2-atom">
              <div class="depth2-atom__label">StatsTable</div>
              <div class="text-meta">generic table with typed columns + rows</div>
            </div>
            <div class="depth2-atom">
              <div class="depth2-atom__label">StatsColumn&lt;T&gt;</div>
              <div class="text-meta">header, accessor (key or function), align, width</div>
            </div>
          </div>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Row Variants</div>
            <div class="depth2-atom">
              <div class="depth2-atom__label">--highlight</div>
              <div class="text-meta">green bg — compliant/success</div>
            </div>
            <div class="depth2-atom">
              <div class="depth2-atom__label">--warning</div>
              <div class="text-meta">yellow bg — warning state</div>
            </div>
            <div class="depth2-atom">
              <div class="depth2-atom__label">--danger</div>
              <div class="text-meta">red bg — danger/violation</div>
            </div>
          </div>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Depth 2</div>
            <div class="depth2-atom depth2-atom--link" onClick={() => props.onNavigate?.("number-with-units")}>
              <div class="depth2-atom__label">NumberWithUnits</div>
              <div class="text-meta">used in cell accessors for formatted values</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
