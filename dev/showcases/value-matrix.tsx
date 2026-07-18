// Showcase — ValueMatrix (promoted 2026-07-17).
// An axis × axis grid of computed values: every cell is value(row, col).
// Treatment is configure-time functions — tone(value, row, col) and
// selected(row, col) — never call-site CSS. createValueMatrix curries the
// mapping surface (labels, format, tone) into a domain matrix.
import { type Component, createSignal, For } from "solid-js";
import {
  ValueMatrix,
  createValueMatrix,
} from "../../src/components/ValueMatrix";
import { ClusterRow } from "../../src/components/Layout";
import { GhostButton } from "../../src/components/Button";

interface PowerSource {
  key: string;
  label: string;
}
const SOURCES: PowerSource[] = [
  { key: "shore", label: "Shore" },
  { key: "barge_2", label: "Barge ×2" },
  { key: "barge_3", label: "Barge ×3" },
];
const CE_LEVELS = [80, 85, 90, 95];
const THRESHOLD = 2.8;

// Deterministic demo g/kWh: worse at low CE, better with more barges.
const gPerKwh = (ce: number, s: PowerSource): number | null => {
  if (s.key === "shore" && ce === 80) return null; // no data cell
  const base = s.key === "shore" ? 9 : s.key === "barge_2" ? 6.4 : 4.8;
  return Number((base * (1 - ce / 100) * 4.6).toFixed(2));
};

// The curried domain matrix: labels, format, and threshold tone baked in —
// call sites pass only axes + values + selection (jtf's
// ComplianceThresholdTable is exactly this shape).
const ComplianceMatrix = createValueMatrix<number, PowerSource>({
  rowAxisLabel: "CE",
  rowLabel: (ce) => `${ce}%`,
  colLabel: (s) => s.label,
  format: (v) => `${v.toFixed(2)} g/kWh`,
  tone: (v) => (v !== null && v < THRESHOLD ? "success" : "danger"),
});

const SALARY_COUNTS = [3, 4, 5, 6];
const PRICE_POINTS = [1_800, 2_200, 2_600, 3_000];
const SALARY_COST = 9_500;
const FIXED_COST = 4_200;
const CLIENTS = 14;

const monthlyMargin = (price: number, salaries: number): number =>
  price * CLIENTS - salaries * SALARY_COST - FIXED_COST;

export const ValueMatrixShowcase: Component = () => {
  const [chosenCE, setChosenCE] = createSignal(90);
  const [chosenSource, setChosenSource] = createSignal("barge_2");

  return (
    <div class="component-section">
      <h2>ValueMatrix — Composite (Depth 2)</h2>
      <p class="text-meta">
        A row-axis × column-axis grid of COMPUTED values — not a row table.
        Cells come from <code>value(row, col)</code>; tone and selection are
        configure-time functions; null renders blank (empty markers distract
        from real data — ruled 2026-07-18); the chosen cell
        carries weight + a soft halo. Generic over both axis types.
      </p>

      <div class="example-group">
        <h3>Curried domain matrix (compliance grid)</h3>
        <p class="text-meta">
          <code>createValueMatrix</code> bakes labels, format, and the
          threshold tone; the call site passes rows, cols, value, selected.
          Click a chooser to move the selection — the matrix config is static,
          the emphasis reacts.
        </p>
        <ComplianceMatrix
          rows={CE_LEVELS}
          cols={SOURCES}
          value={gPerKwh}
          selected={(ce, s) => ce === chosenCE() && s.key === chosenSource()}
        />
        <ClusterRow>
          <For each={CE_LEVELS}>
            {(ce) => (
              <GhostButton onClick={() => setChosenCE(ce)}>{`CE ${ce}%`}</GhostButton>
            )}
          </For>
          <For each={SOURCES}>
            {(s) => (
              <GhostButton onClick={() => setChosenSource(s.key)}>
                {s.label}
              </GhostButton>
            )}
          </For>
        </ClusterRow>
      </div>

      <div class="example-group">
        <h3>Same component, different domain (viable price × salaries)</h3>
        <p class="text-meta">
          Monthly margin at each price point under 3–6 salaries: success when
          viable, warning within one salary of break-even, danger under water.
        </p>
        <ValueMatrix
          rows={PRICE_POINTS}
          cols={SALARY_COUNTS}
          rowAxisLabel="Price"
          rowLabel={(p) => `$${p.toLocaleString()}`}
          colLabel={(n) => `${n} salaries`}
          value={monthlyMargin}
          format={(v) => `${v < 0 ? "-" : ""}$${Math.abs(v).toLocaleString()}`}
          tone={(v) =>
            v === null || v < 0
              ? "danger"
              : v < SALARY_COST
                ? "warning"
                : "success"
          }
        />
      </div>
    </div>
  );
};
