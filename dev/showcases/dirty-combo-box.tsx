import { type Component, createMemo, createSignal } from "solid-js";
import {
  ScenarioComboBox,
  dirtyComboRemove,
  dirtyComboReset,
  dirtyComboSave,
  dirtyComboSelect,
  dirtyComboViewOf,
  type DirtyComboStore,
} from "../../src/components/DirtyComboBox";
import {
  PAYROLL_STORE,
  type PayrollConfig,
} from "../../src/components/DirtyComboBox/dirtyComboFixtures";
import { CurrencyInput } from "../../src/components/CurrencyInput";
import { MonoDump } from "../../src/components/Text";
import { ClusterRow, SpacedStack } from "../../src/components/Layout";
import { TagPill } from "../../src/components/Badge";

export const DirtyComboBoxShowcase: Component = () => {
  const [store, setStore] =
    createSignal<DirtyComboStore<PayrollConfig>>(PAYROLL_STORE);
  const view = createMemo(() => dirtyComboViewOf(store()));
  const setEngineer = (engineer: number | undefined) =>
    setStore((s) => ({ ...s, draft: { ...s.draft, engineer: engineer ?? 0 } }));
  const observation = () =>
    JSON.stringify(
      { selectedId: store().selectedId, draft: store().draft, view: view() },
      null,
      2,
    );

  return (
    <div class="component-section">
      <h2>DirtyComboBox — Composite (Depth 2) · ScenarioComboBox</h2>
      <p class="text-meta">
        A list of things that can be saved or reset, with dirty detection:
        [Baseline] vs [name ▾ │ ✓] ↺. Pristine shows no save and no reset;
        editing the draft makes it dirty, and the save segment and the reset
        slide out (SlideReveal, 180ms) inside space the control always holds,
        so nothing beside it moves (see the neighbour pill). The reset sits a loose gap away so it
        is hard to fat-finger — there is no confirm. Every row but the selected
        one has a trash (Delete/Backspace on a focused row does the same), the
        list scrolls, and the combo is as wide as the LONGEST name, so it never
        jumps. What it draws comes from the pure <code>dirtyComboModel</code>,
        printed below.
      </p>

      <div class="example-group">
        <h3>Sixteen payroll scenarios — edit the draft to make it dirty</h3>
        <SpacedStack>
          <ClusterRow>
            <ScenarioComboBox
              items={store().items}
              selectedId={store().selectedId}
              view={view()}
              onSelect={(id) => setStore((s) => dirtyComboSelect(s, id))}
              onSave={() => setStore(dirtyComboSave)}
              onReset={() => setStore(dirtyComboReset)}
              onDelete={(id) => setStore((s) => dirtyComboRemove(s, id))}
            />
            {/* A neighbour: it must NOT move when the combo goes dirty. */}
            <TagPill tag={{ label: "neighbour — never moves" }} />
          </ClusterRow>
          <CurrencyInput
            name="dirty-combo-draft"
            label="Draft: engineer salary"
            step={5000}
            value={() => store().draft.engineer}
            onChange={setEngineer}
          />
          <MonoDump>{observation()}</MonoDump>
        </SpacedStack>
      </div>
    </div>
  );
};
