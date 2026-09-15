/**
 * TreeDiffChart showcase — the Scenario Tree Explorer diagram, driven by
 * pre-computed diff bands. The data below is the prototype's Situation 1:
 * Foo raises Ana's salary, the employer payroll tax moves with it, and
 * every other root entry stays identical. The third example adds a second
 * scenario that removes a line and adds one.
 */
import { type Component, createSignal } from "solid-js";
import { TreeDiffChart } from "../../src/components/TreeDiffChart";
import type {
  TreeDiffBand,
  TreeDiffEntry,
} from "../../src/components/TreeDiffChart";
import { SpacedStack } from "../../src/components/Layout";
import { MonoMeta } from "../../src/components/Text";

const e = (id: string, label: string, hash: string): TreeDiffEntry => ({
  id,
  label,
  hash,
});

// ─── Shared entries ───────────────────────────────────────────────────────
const BASELINE = {
  label: "Baseline",
  hash: "3f7ac10",
  commit: "6d2b0e4",
  ref: "sc_base",
};
const FOO = { label: "Foo", hash: "c05e8b2", commit: "9be4413", ref: "sc_foo" };
const BAR = { label: "Bar", hash: "7a41d0e", commit: "5d7c228", ref: "sc_bar" };

const G_PAY_B = e("g_pay_b", "bucket:payroll", "d41aa07");
const G_PAY_F = e("g_pay_f", "bucket:payroll", "5e9c3b8");
const G_OPEX = e("g_opex", "bucket:opex", "77b1ce5");
const G_OPEX_C = e("g_opex_c", "bucket:opex", "e02c4b8");
const G_REV = e("g_rev", "side:revenue", "1c8f4d9");
const L_TAX = e("l_tax", "Payroll tax", "8c4e7d1");
const L_TAX_F = e("l_tax_f", "Payroll tax", "c19d6b2");
const L_ANA85 = e("l_ana85", "Salary · Ana", "f0d12aa");
const L_ANA88 = e("l_ana88", "Salary · Ana", "73e0b5f");
const L_BO = e("l_bo", "Salary · Bo", "2a6b39c");
const L_RENT = e("l_rent", "Office rent", "5d0a9c1");
const L_SAAS = e("l_saas", "SaaS stack", "9e1b7f3");
const L_BOOK = e("l_book", "Bookkeeping retainer", "41c2e8a");

/** Inputs the fold never opens: one identical group each, no children. */
const INPUTS: TreeDiffBand[] = [
  ["accounts", "ba30e17"],
  ["settings", "0af62c3"],
  ["options", "4dd819a"],
  ["picks", "e6c70f5"],
  ["open_items", "b92d5a4"],
].map(([name, hash]) => {
  const group = e(name, name, hash);
  return { name, baseline: group, compare: group, children: [] };
});

// ─── Situation 1: one value changes ──────────────────────────────────────
const PAYROLL_FORKED: TreeDiffBand = {
  name: "bucket:payroll",
  baseline: G_PAY_B,
  compare: G_PAY_F,
  children: [
    { name: "line:payroll-tax", baseline: L_TAX, compare: L_TAX_F },
    { name: "line:salary-ana", baseline: L_ANA85, compare: L_ANA88 },
    { name: "line:salary-bo", baseline: L_BO, compare: L_BO },
  ],
};
const OPEX_SAME: TreeDiffBand = {
  name: "bucket:opex",
  baseline: G_OPEX,
  compare: G_OPEX,
  children: [
    { name: "line:office-rent", baseline: L_RENT, compare: L_RENT },
    { name: "line:saas", baseline: L_SAAS, compare: L_SAAS },
  ],
};
const REVENUE_SAME: TreeDiffBand = {
  name: "side:revenue",
  baseline: G_REV,
  compare: G_REV,
  children: [],
};
const ONE_VALUE_CHANGES: TreeDiffBand[] = [
  PAYROLL_FORKED,
  OPEX_SAME,
  REVENUE_SAME,
  ...INPUTS,
];

// ─── Situation 2: a line removed, a line added ───────────────────────────
const OPEX_FORKED: TreeDiffBand = {
  name: "bucket:opex",
  baseline: G_OPEX,
  compare: G_OPEX_C,
  children: [
    { name: "line:office-rent", baseline: L_RENT, compare: L_RENT },
    { name: "line:saas", baseline: L_SAAS },
    { name: "line:bookkeeping", compare: L_BOOK },
  ],
};
const PAYROLL_SAME: TreeDiffBand = {
  name: "bucket:payroll",
  baseline: G_PAY_B,
  compare: G_PAY_B,
  children: [
    { name: "line:payroll-tax", baseline: L_TAX, compare: L_TAX },
    { name: "line:salary-ana", baseline: L_ANA85, compare: L_ANA85 },
    { name: "line:salary-bo", baseline: L_BO, compare: L_BO },
  ],
};
const LINE_REMOVED_LINE_ADDED: TreeDiffBand[] = [
  PAYROLL_SAME,
  OPEX_FORKED,
  REVENUE_SAME,
  ...INPUTS,
];

export const TreeDiffChartShowcase: Component = () => {
  const [selected, setSelected] = createSignal<string | undefined>();
  const toggle = (id: string) =>
    setSelected((cur) => (cur === id ? undefined : id));

  return (
    <div class="component-section component-section--full">
      <h2>TreeDiffChart — Primitive (Depth 0)</h2>
      <p class="text-meta">
        A pre-computed diff of two content-addressed scenario trees. The
        baseline root sits on the left, the comparison root on the right. Each
        root entry is one band: a diverged band draws one group per side and one
        row per child, a child both sides share draws once in the center, and in{" "}
        <code>differences</code> mode every identical root entry folds into one{" "}
        <code>[SAME]</code> node. The consumer computes the bands; the chart
        owns layout, routing and paint. Three colours carry the picture:
        baseline ink, accent for the comparison, dim dashes for what both sides
        share.
      </p>

      <div class="example-group">
        <h3>Show differences (default)</h3>
        <p class="text-meta">
          Situation 1: Foo raises Ana from $8,500 to $8,800 and the employer
          payroll tax moves with it. Bo's salary is untouched, so it stays one
          shared node in the middle. Seven of eight root entries prune. Click a
          group or leaf: <code>onNodeClick</code> fires with the entry id, and{" "}
          <code>selectedId</code> lights the pair: the clicked node, its
          counterpart on the other side, the chain to the roots on both sides,
          and what a selected group holds. The rest dims.
        </p>
        <SpacedStack>
          <TreeDiffChart
            baseline={BASELINE}
            compare={FOO}
            bands={ONE_VALUE_CHANGES}
            selectedId={selected()}
            onNodeClick={toggle}
          />
          <MonoMeta>
            {selected() ? `selected ${selected()}` : "nothing selected"}
          </MonoMeta>
        </SpacedStack>
      </div>

      <div class="example-group">
        <h3>Full tree</h3>
        <p class="text-meta">
          <code>mode="full"</code> draws every root entry. Identical entries
          render as one shared subtree fed from both roots, diverged bands
          first. Without <code>onNodeClick</code> nothing is focusable.
        </p>
        <TreeDiffChart
          baseline={BASELINE}
          compare={FOO}
          bands={ONE_VALUE_CHANGES}
          mode="full"
        />
      </div>

      <div class="example-group">
        <h3>A line removed, a line added</h3>
        <p class="text-meta">
          Situation 2: Bar drops the SaaS stack and adds a bookkeeping retainer.
          A child missing on one side is drawn on the other side only, in that
          side's colour. Children sort added, changed, removed, identical. The
          note counts the lines that moved.
        </p>
        <TreeDiffChart
          baseline={BASELINE}
          compare={BAR}
          bands={LINE_REMOVED_LINE_ADDED}
        />
      </div>

      <div class="example-group">
        <h3>Contract</h3>
        <p class="text-meta">
          Pass every root entry, identical ones included; <code>mode</code>{" "}
          decides what shows. Two sides that resolve the same entry id draw one
          shared node, so a shared child carries the same entry object in both{" "}
          <code>baseline</code> and <code>compare</code>. The chart mints its
          own ids for the two roots and the pruned node (
          <code>ROOT_BASELINE_ID</code>, <code>ROOT_COMPARE_ID</code>,{" "}
          <code>SAME_ID</code>); those never reach <code>onNodeClick</code>. The
          SVG scales to its container width through its viewBox; a full tree
          grows taller, never denser.
        </p>
      </div>
    </div>
  );
};
