// ============================================
// DirtyComboSection — the payroll-board bench's DirtyComboBox demo.
// A client-only store over six fixture scenarios, one draft field to make it
// dirty, and the model's JSON printed below the control (headless first).
// ============================================
import { type Component, createMemo, createSignal } from "solid-js";
import { SubsectionTitle, MonoDump } from "../../../../src/components/Text";
import { CurrencyInput } from "../../../../src/components/CurrencyInput";
import { SpacedStack } from "../../../../src/components/Layout";
import {
  ScenarioComboBox,
  dirtyComboRemove,
  dirtyComboReset,
  dirtyComboSave,
  dirtyComboSelect,
  dirtyComboViewOf,
  type DirtyComboStore,
} from "../../../../src";
import {
  PAYROLL_STORE,
  type PayrollConfig,
} from "../../../../src/components/DirtyComboBox/dirtyComboFixtures";

export const DirtyComboSection: Component = () => {
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
    <SpacedStack>
      <SubsectionTitle>DirtyComboBox</SubsectionTitle>
      <ScenarioComboBox
        items={store().items}
        selectedId={store().selectedId}
        view={view()}
        onSelect={(id) => setStore((s) => dirtyComboSelect(s, id))}
        onSave={() => setStore(dirtyComboSave)}
        onReset={() => setStore(dirtyComboReset)}
        onDelete={(id) => setStore((s) => dirtyComboRemove(s, id))}
      />
      <CurrencyInput
        name="draft-engineer"
        label="Draft: engineer salary"
        step={5000}
        value={() => store().draft.engineer}
        onChange={setEngineer}
      />
      <MonoDump>{observation()}</MonoDump>
    </SpacedStack>
  );
};
