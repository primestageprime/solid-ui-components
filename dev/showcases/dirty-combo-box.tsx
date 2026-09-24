import { type Component, createMemo, createSignal } from "solid-js";
import {
  DirtyComboBox,
  removeItem,
  resetDraft,
  saveDraft,
  selectItem,
  viewOf,
  type DirtyComboStore,
} from "../../src/components/DirtyComboBox";
import {
  PAYROLL_STORE,
  type PayrollConfig,
} from "../../src/components/DirtyComboBox/dirtyComboFixtures";
import { CurrencyInput } from "../../src/components/CurrencyInput";
import { MonoDump } from "../../src/components/Text";
import { SpacedStack } from "../../src/components/Layout";

export const DirtyComboBoxShowcase: Component = () => {
  const [store, setStore] =
    createSignal<DirtyComboStore<PayrollConfig>>(PAYROLL_STORE);
  const view = createMemo(() => viewOf(store()));
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
      <h2>DirtyComboBox — Composite (Depth 2)</h2>
      <p class="text-meta">
        A list of things that can be saved or reset, with dirty detection:
        [Baseline] vs [name ▾ │ ✓] ↺. Pristine shows no save and no reset;
        editing the draft makes it dirty, and the save segment and the reset
        slide out (SlideReveal, 180ms). The reset sits a loose gap away so it
        is hard to fat-finger — there is no confirm. Every row but the selected
        one has a trash (Delete/Backspace on a focused row does the same), the
        list scrolls, and the combo is as wide as the LONGEST name, so it never
        jumps. What it draws comes from the pure <code>dirtyComboModel</code>,
        printed below.
      </p>

      <div class="example-group">
        <h3>Sixteen payroll scenarios — edit the draft to make it dirty</h3>
        <SpacedStack>
          <DirtyComboBox
            reference="Baseline"
            items={store().items}
            selectedId={store().selectedId}
            view={view()}
            onSelect={(id) => setStore((s) => selectItem(s, id))}
            onSave={() => setStore(saveDraft)}
            onReset={() => setStore(resetDraft)}
            onDelete={(id) => setStore((s) => removeItem(s, id))}
          />
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
