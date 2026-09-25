// ============================================
// DirtyComboSection — the payroll-board bench's DirtyComboBox demo.
// A client-only store over the fixture scenarios, one draft field to make it
// dirty, and the model's JSON printed below the control (headless first).
// Parity with thorcasting's scenario chip: a chart-line swatch per row, a
// leading "None", a refused row with its reason, the [ reset | new ] split,
// and click-the-name rename.
// ============================================
import { type Component, createMemo, createSignal } from "solid-js";
import { MonoDump } from "../../../../src/components/Text";
import { CurrencyInput } from "../../../../src/components/CurrencyInput";
import { SpacedStack } from "../../../../src/components/Layout";
import {
  ScenarioComboBox,
  dirtyComboCreate,
  dirtyComboRemove,
  dirtyComboRename,
  dirtyComboReset,
  dirtyComboSave,
  dirtyComboSelect,
  dirtyComboUniqueLabel,
  dirtyComboViewOf,
  type DirtyComboSavedItem,
  type DirtyComboStore,
} from "../../../../src";
import {
  PAYROLL_STORE,
  type PayrollConfig,
} from "../../../../src/components/DirtyComboBox/dirtyComboFixtures";
import { map } from "../../../../src/fn";
import { ReviewTitle } from "./review-status";

const SHAPES = ["circle", "diamond", "square", "pentagon"] as const;

/** Each scenario's chart-line identity: the series colour and shape its line
 *  would wear. The fourth scenario is refused, as thorcasting refuses a plan
 *  the builders cannot draw back as cards. */
const withIdentity = (
  item: DirtyComboSavedItem<PayrollConfig>,
  i: number,
): DirtyComboSavedItem<PayrollConfig> => ({
  ...item,
  color: `var(--sui-series-${(i % 8) + 1})`,
  shape: SHAPES[i % SHAPES.length],
  ...(i === 3
    ? { disabled: true, reason: "Built on another baseline — cannot be compared" }
    : {}),
});

const BENCH_STORE: DirtyComboStore<PayrollConfig> = {
  ...PAYROLL_STORE,
  items: map(withIdentity, PAYROLL_STORE.items),
};

export const DirtyComboSection: Component = () => {
  const [store, setStore] =
    createSignal<DirtyComboStore<PayrollConfig>>(BENCH_STORE);
  let created = 0;
  const view = createMemo(() => dirtyComboViewOf(store()));
  const setEngineer = (engineer: number | undefined) =>
    setStore((s) => ({ ...s, draft: { ...s.draft, engineer: engineer ?? 0 } }));
  const create = () =>
    setStore((s) => {
      created += 1;
      const next = dirtyComboCreate(s, {
        id: `new-${created}`,
        label: dirtyComboUniqueLabel(s.items, "New scenario"),
      });
      // A new scenario takes the next series colour, like a new chart line.
      const colour = (item: DirtyComboSavedItem<PayrollConfig>, i: number) =>
        item.id === next.selectedId
          ? { ...withIdentity(item, i), disabled: undefined, reason: undefined }
          : item;
      return { ...next, items: map(colour, next.items) };
    });
  const observation = () =>
    JSON.stringify(
      { selectedId: store().selectedId, draft: store().draft, view: view() },
      null,
      2,
    );

  return (
    <SpacedStack>
      <ReviewTitle id="combo">DirtyComboBox</ReviewTitle>
      <ScenarioComboBox
        items={store().items}
        selectedId={store().selectedId}
        view={view()}
        onSelect={(id) => setStore((s) => dirtyComboSelect(s, id))}
        onSave={() => setStore(dirtyComboSave)}
        onReset={() => setStore(dirtyComboReset)}
        onDelete={(id) => setStore((s) => dirtyComboRemove(s, id))}
        onCreate={create}
        onRename={(name) => setStore((s) => dirtyComboRename(s, name))}
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
