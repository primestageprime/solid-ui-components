// Workshop bench — ValueMatrix (ruled 2026-07-17).
// An axis × axis grid of computed values with configure-time treatment
// functions: tone(value, row, col) and selected(row, col). Two demos:
// 1. jtf's compliance threshold shape — CE levels × power sources, tone by
//    threshold compliance, the chosen scenario emphasized.
// 2. thorcasting's viable-price shape — price scenarios × salaries-to-pay,
//    tone by margin viability.
import type { Component } from "solid-js";
import { createSignal, For } from "solid-js";
import { SectionTitle, TextBody, TextSublabel } from "../../../src/components/Text";
import { ValueMatrix } from "../../../src/components/ValueMatrix";
import { ContentStack, ClusterRow } from "../../../src/components/Layout";
import { GhostButton } from "../../../src/components/Button";

// ── Demo 1: compliance thresholds (jtf shape) ───────────────────────────────

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

// Deterministic fake g/kWh: worse at low CE, better with more barges.
const gPerKwh = (ce: number, s: PowerSource): number | null => {
  if (s.key === "shore" && ce === 80) return null; // no data cell
  const base = s.key === "shore" ? 9 : s.key === "barge_2" ? 6.4 : 4.8;
  return Number((base * (1 - ce / 100) * 4.6).toFixed(2));
};

// ── Demo 2: viable price × salaries (thorcasting shape) ─────────────────────

const SALARY_COUNTS = [3, 4, 5, 6];
const PRICE_POINTS = [1_800, 2_200, 2_600, 3_000];
const SALARY_COST = 9_500; // per salary per month
const FIXED_COST = 4_200;
const CLIENTS = 11;

const monthlyMargin = (price: number, salaries: number): number =>
  price * CLIENTS - salaries * SALARY_COST - FIXED_COST;

const ValueMatrixBench: Component = () => {
  const [chosenCE, setChosenCE] = createSignal(90);
  const [chosenSource, setChosenSource] = createSignal("barge_2");

  return (
    <div class="component-section component-section--full">
      <ContentStack>
        <SectionTitle>Compliance thresholds (jtf shape)</SectionTitle>
        <TextBody>
          CE levels × power sources; every cell is value(row, col). Tone is a
          configure-time function of the value vs the {THRESHOLD} g/kWh
          threshold; the chosen scenario carries the emphasis halo. Click a
          chooser below to move the selection.
        </TextBody>
        <ValueMatrix
          rows={CE_LEVELS}
          cols={SOURCES}
          rowAxisLabel="CE"
          rowLabel={(ce) => `${ce}%`}
          colLabel={(s) => s.label}
          value={gPerKwh}
          format={(v) => `${v.toFixed(2)} g/kWh`}
          tone={(v) => (v !== null && v < THRESHOLD ? "success" : "danger")}
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
        <TextSublabel>
          null cells render the em-dash; selection reacts without rebuilding
          the matrix config
        </TextSublabel>

        <SectionTitle>Viable price × salaries (thorcasting shape)</SectionTitle>
        <TextBody>
          Monthly margin at each price point under 3–6 salaries. Same
          component, different axes: tone marks viable (positive margin),
          warning within one salary of break-even, danger under water.
        </TextBody>
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
      </ContentStack>
    </div>
  );
};

export const meta = { label: "Value Matrix" };

export default ValueMatrixBench;
