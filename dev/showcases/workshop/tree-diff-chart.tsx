/**
 * Tree Diff Chart bench — the Scenario Tree Explorer diagram, Situation 1
 * ("one value changes"), ported from the thorcasting prototype.
 *
 * The bench plays the CONSUMER: it holds four scenarios as content-addressed
 * trees and computes the diff bands for the chosen pair. The chart never sees
 * the trees, only the bands.
 */
import { type Component, createMemo, createSignal } from "solid-js";
import { TreeDiffChart } from "../../../src/components/TreeDiffChart";
import type {
  TreeDiffBand,
  TreeDiffChild,
  TreeDiffEntry,
} from "../../../src/components/TreeDiffChart";
import { Select, type SelectOption } from "../../../src/components/Select";
import { SegmentedControl } from "../../../src/components/SegmentedControl";
import { Surface } from "../../../src/components/Surface/Surface";
import {
  CaptionLabel,
  MonoMeta,
  MutedBody,
  SectionTitle,
} from "../../../src/components/Text";
import {
  ClusterRow,
  SpreadRow,
  SpacedStack,
} from "../../../src/components/Layout";

// ─── Consumer-side data: content-addressed trees ─────────────────────────
type Tree = {
  id: string;
  entry: string;
  label: string;
  hash: string;
  /** [entry name, node id] pairs; null for an input the fold never opens. */
  entries: [string, string][] | null;
};
type Leaf = { id: string; label: string; hash: string };
type Scenario = {
  id: string;
  label: string;
  rootHash: string;
  entries: string[];
};

const tree = (
  id: string,
  entry: string,
  hash: string,
  entries: [string, string][] | null,
  label = entry,
): Tree => ({ id, entry, label, hash, entries });
const leaf = (id: string, label: string, hash: string): Leaf => ({
  id,
  label,
  hash,
});

const LEAVES: Leaf[] = [
  leaf("l_tax", "Payroll tax", "8c4e7d1"),
  leaf("l_tax_f", "Payroll tax", "c19d6b2"),
  leaf("l_ana85", "Salary · Ana", "f0d12aa"),
  leaf("l_ana88", "Salary · Ana", "73e0b5f"),
  leaf("l_bo", "Salary · Bo", "2a6b39c"),
  leaf("l_rent", "Office rent", "5d0a9c1"),
  leaf("l_saas", "SaaS stack", "9e1b7f3"),
  leaf("l_book", "Bookkeeping retainer", "41c2e8a"),
];

const TREES: Tree[] = [
  tree("accounts", "accounts", "ba30e17", null),
  tree("settings", "settings", "0af62c3", null),
  tree("options", "options", "4dd819a", null),
  tree("picks", "picks", "e6c70f5", null),
  tree("open", "open_items", "b92d5a4", null),
  tree("g_pay_b", "bucket:payroll", "d41aa07", [
    ["line:payroll-tax", "l_tax"],
    ["line:salary-ana", "l_ana85"],
    ["line:salary-bo", "l_bo"],
  ]),
  tree("g_pay_f", "bucket:payroll", "5e9c3b8", [
    ["line:payroll-tax", "l_tax_f"],
    ["line:salary-ana", "l_ana88"],
    ["line:salary-bo", "l_bo"],
  ]),
  tree("g_opex", "bucket:opex", "77b1ce5", [
    ["line:office-rent", "l_rent"],
    ["line:saas", "l_saas"],
  ]),
  tree("g_opex_c", "bucket:opex", "e02c4b8", [
    ["line:office-rent", "l_rent"],
    ["line:bookkeeping", "l_book"],
  ]),
  tree("g_rev", "side:revenue", "1c8f4d9", null),
];

const SHARED_TAIL = [
  "g_rev",
  "accounts",
  "settings",
  "options",
  "picks",
  "open",
];

const SCENARIOS: Scenario[] = [
  {
    id: "base",
    label: "Baseline",
    rootHash: "3f7ac10",
    entries: ["g_pay_b", "g_opex", ...SHARED_TAIL],
  },
  {
    id: "foo",
    label: "Foo",
    rootHash: "c05e8b2",
    entries: ["g_pay_f", "g_opex", ...SHARED_TAIL],
  },
  {
    id: "bar",
    label: "Bar",
    rootHash: "7a41d0e",
    entries: ["g_pay_b", "g_opex_c", ...SHARED_TAIL],
  },
  {
    id: "both",
    label: "Foo + Bar",
    rootHash: "d9b03f5",
    entries: ["g_pay_f", "g_opex_c", ...SHARED_TAIL],
  },
];

// ─── Consumer-side diff: two scenarios → bands ───────────────────────────
const NODE = new Map<string, Tree | Leaf>([
  ...TREES.map((t) => [t.id, t] as const),
  ...LEAVES.map((l) => [l.id, l] as const),
]);
const entryOf = (id: string): TreeDiffEntry => {
  const n = NODE.get(id)!;
  return { id: n.id, label: n.label, hash: n.hash };
};
const entryName = (id: string) => (NODE.get(id) as Tree).entry;
const childrenOf = (id?: string): [string, string][] =>
  id ? ((NODE.get(id) as Tree).entries ?? []) : [];

function diffBands(a: Scenario, b: Scenario): TreeDiffBand[] {
  const byName = (s: Scenario) =>
    new Map(s.entries.map((id) => [entryName(id), id]));
  const aMap = byName(a);
  const bMap = byName(b);
  const names = [...new Set([...aMap.keys(), ...bMap.keys()])].sort();
  return names.map((name) => {
    const ga = aMap.get(name);
    const gb = bMap.get(name);
    const kids = new Map<string, TreeDiffChild>();
    for (const [kidName, id] of childrenOf(ga)) {
      kids.set(kidName, { name: kidName, baseline: entryOf(id) });
    }
    for (const [kidName, id] of childrenOf(gb)) {
      kids.set(kidName, {
        ...(kids.get(kidName) ?? { name: kidName }),
        compare: entryOf(id),
      });
    }
    return {
      name,
      baseline: ga ? entryOf(ga) : undefined,
      compare: gb ? entryOf(gb) : undefined,
      children: [...kids.values()],
    };
  });
}

// ─── Bench ───────────────────────────────────────────────────────────────
const OPTIONS: SelectOption[] = SCENARIOS.map((s) => ({
  value: s.id,
  label: s.label,
}));
const scenarioOf = (o: SelectOption | null) =>
  SCENARIOS.find((s) => s.id === o?.value) ?? SCENARIOS[0];

export const meta = { label: "Tree Diff Chart" };

const TreeDiffChartBench: Component = () => {
  const [baseline, setBaseline] = createSignal<SelectOption | null>(OPTIONS[0]);
  const [compare, setCompare] = createSignal<SelectOption | null>(OPTIONS[1]);
  const [mode, setMode] = createSignal("differences");
  const [selected, setSelected] = createSignal<string | undefined>();

  const bands = createMemo(() =>
    diffBands(scenarioOf(baseline()), scenarioOf(compare())),
  );

  return (
    <div class="component-section component-section--full">
      <SectionTitle>Tree Diff Chart</SectionTitle>
      <MutedBody>
        Situation 1 from the Scenario Tree Explorer: Foo raises Ana from $8,500
        to $8,800, and the employer payroll tax moves with it. Bar swaps the
        SaaS line for a bookkeeping retainer. Pick any pair; the bench computes
        the bands and the chart draws them.
      </MutedBody>
      <SpacedStack>
        <SpreadRow>
          <ClusterRow>
            <CaptionLabel>Baseline</CaptionLabel>
            <Select
              options={() => OPTIONS}
              value={baseline}
              onChange={setBaseline}
            />
            <CaptionLabel>Compare</CaptionLabel>
            <Select
              options={() => OPTIONS}
              value={compare}
              onChange={setCompare}
            />
          </ClusterRow>
          <ClusterRow>
            <CaptionLabel>View</CaptionLabel>
            <SegmentedControl
              aria-label="Tree view"
              options={[
                { value: "differences", label: "Show differences" },
                { value: "full", label: "Full tree" },
              ]}
              value={mode()}
              onValueChange={setMode}
            />
          </ClusterRow>
        </SpreadRow>
        <Surface>
          <TreeDiffChart
            baseline={{
              label: scenarioOf(baseline()).label,
              hash: scenarioOf(baseline()).rootHash,
            }}
            compare={{
              label: scenarioOf(compare()).label,
              hash: scenarioOf(compare()).rootHash,
            }}
            bands={bands()}
            mode={mode() === "full" ? "full" : "differences"}
            selectedId={selected()}
            onNodeClick={(id) =>
              setSelected((cur) => (cur === id ? undefined : id))
            }
          />
        </Surface>
        <MonoMeta>
          {selected()
            ? `selected ${selected()}`
            : "click a group or leaf to select it"}
        </MonoMeta>
      </SpacedStack>
    </div>
  );
};

export default TreeDiffChartBench;
