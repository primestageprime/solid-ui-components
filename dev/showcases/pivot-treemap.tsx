import { type Component, createSignal } from "solid-js";
import {
  PivotTreemap,
  PivotPills,
  type PivotAccessors,
  type PivotSelection,
} from "../../src/components/PivotTreemap";
import { Stack } from "../../src/components/Layout/Stack";

// ── Sample dataset: a flat list of "alarm" rows with two pivot dimensions:
//    ASSET (single-valued) and SEVERITY (single-valued). Some rows are
//    "resolved" — used by the metrics showcase to populate SlotFillBar feeds.
type Dim = "ASSET" | "SEVERITY";

interface AlarmRow {
  id: string;
  asset: string;
  severity: "critical" | "warning" | "info";
  status: "open" | "in-progress" | "resolved";
}

const ROWS: readonly AlarmRow[] = [
  { id: "a1", asset: "Engine-1",    severity: "critical", status: "resolved" },
  { id: "a2", asset: "Engine-1",    severity: "critical", status: "in-progress" },
  { id: "a3", asset: "Engine-1",    severity: "warning",  status: "open" },
  { id: "a4", asset: "Engine-1",    severity: "info",     status: "resolved" },
  { id: "a5", asset: "Engine-2",    severity: "critical", status: "open" },
  { id: "a6", asset: "Engine-2",    severity: "warning",  status: "in-progress" },
  { id: "a7", asset: "Engine-2",    severity: "warning",  status: "resolved" },
  { id: "a8", asset: "Generator-A", severity: "critical", status: "in-progress" },
  { id: "a9", asset: "Generator-A", severity: "warning",  status: "resolved" },
  { id: "a10", asset: "Generator-A", severity: "warning", status: "open" },
  { id: "a11", asset: "Generator-A", severity: "info",    status: "resolved" },
  { id: "a12", asset: "Generator-A", severity: "info",    status: "resolved" },
  { id: "a13", asset: "Pump-3",     severity: "warning",  status: "open" },
  { id: "a14", asset: "Pump-3",     severity: "info",     status: "in-progress" },
  { id: "a15", asset: "Pump-3",     severity: "info",     status: "resolved" },
  { id: "a16", asset: "Compressor", severity: "critical", status: "open" },
  { id: "a17", asset: "Compressor", severity: "info",     status: "resolved" },
];

const accessors: PivotAccessors<AlarmRow, Dim> = {
  dims: ["ASSET", "SEVERITY"],
  values: (row, dim) => (dim === "ASSET" ? [row.asset] : [row.severity]),
};

const debugBlock = {
  "margin-top": "8px",
  padding: "8px 12px",
  background: "var(--sui-bg-secondary)",
  "border-radius": "4px",
  "font-size": "12px",
  color: "var(--sui-text-secondary, #7aa8c0)",
  "font-family": "var(--sui-font-mono, monospace)",
  "white-space": "pre",
} as const;

const Debug = (props: { value: unknown }) => (
  <div style={debugBlock}>
    {JSON.stringify(props.value, null, 2)}
  </div>
);

export const PivotTreemapShowcase: Component = () => {
  const [sel1, setSel1] = createSignal<PivotSelection | null>(null);
  const [sel2, setSel2] = createSignal<PivotSelection | null>(null);
  const [sel3, setSel3] = createSignal<PivotSelection | null>(null);
  const [order, setOrder] = createSignal<Dim[]>(["ASSET", "SEVERITY"]);

  return (
    <div class="component-section">
      <h2>PivotTreemap — Pure Composite (Depth 1)</h2>
      <p class="text-meta">
        Composes Treemap + SlotFillBar + the PivotPills sub-Primitive + the
        compact ChipLabel / EllipsizedChipLabel / CountText (Text) and
        TightSpreadRow (Layout) Curried Variants. Owns zero CSS and zero
        inline `style{}`. Pivot of flat rows × two tag dimensions; clicking
        an outer header filters to that bucket, clicking a leaf filters
        further. Multi-valued dims are honest (a row with N values for an
        axis contributes to N buckets).
      </p>

      <div class="example-group">
        <h3>Basic pivot — ASSET × SEVERITY</h3>
        <div class="text-meta" style={{ "margin-bottom": "12px" }}>
          Outer columns are assets; inner leaves are severity tiers. Cell
          weights match row counts so heavier buckets get wider columns and
          taller leaves.
        </div>
        <Stack>
          <div style={{ height: "320px" }}>
            <PivotTreemap
              rows={ROWS}
              outer="ASSET"
              inner="SEVERITY"
              accessors={accessors}
              selection={sel1()}
              onSelect={setSel1}
            />
          </div>
          <Debug value={sel1()} />
        </Stack>
      </div>

      <div class="example-group">
        <h3>With per-bucket SlotFillBar feed</h3>
        <div class="text-meta" style={{ "margin-bottom": "12px" }}>
          `metrics` adds resolved/in-progress predicates → each leaf gets a
          SlotFillBar (`done/total`) and each outer header gets a thin
          summary bar across its children.
        </div>
        <Stack>
          <div style={{ height: "360px" }}>
            <PivotTreemap
              rows={ROWS}
              outer="ASSET"
              inner="SEVERITY"
              accessors={accessors}
              metrics={{
                done: (r) => r.status === "resolved",
                doing: (r) => r.status === "in-progress",
              }}
              selection={sel2()}
              onSelect={setSel2}
            />
          </div>
          <Debug value={sel2()} />
        </Stack>
      </div>

      <div class="example-group">
        <h3>Untagged sidebar</h3>
        <div class="text-meta" style={{ "margin-bottom": "12px" }}>
          Pass `untaggedCount` to surface a trailing sidebar for rows that
          aren't represented in the tagged buckets. The sidebar uses
          ChipLabel + CountText for its label/count typography.
        </div>
        <Stack>
          <div style={{ height: "320px" }}>
            <PivotTreemap
              rows={ROWS}
              outer="ASSET"
              inner="SEVERITY"
              accessors={accessors}
              untaggedCount={4}
              selection={sel3()}
              onSelect={setSel3}
            />
          </div>
          <Debug value={sel3()} />
        </Stack>
      </div>

      <div class="example-group">
        <h3>PivotPills — drag-to-reorder dim picker</h3>
        <div class="text-meta" style={{ "margin-bottom": "12px" }}>
          Sub-Primitive exported alongside PivotTreemap. Drag a pill onto
          another to swap their slot positions; slot 0 = outer, slot 1 =
          inner, slot 2+ = unused.
        </div>
        <Stack>
          <PivotPills<Dim>
            order={order()}
            setOrder={setOrder}
          />
          <Debug value={order()} />
        </Stack>
      </div>
    </div>
  );
};
