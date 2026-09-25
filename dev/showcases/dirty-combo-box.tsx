import { type Component, createMemo, createSignal } from "solid-js";
import {
  ScenarioComboBox,
  dirtyComboCreate,
  dirtyComboRename,
  dirtyComboUniqueLabel,
  type DirtyComboSavedItem,
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
import { MonoDump, NoteText } from "../../src/components/Text";
import { ClusterRow, SpacedStack } from "../../src/components/Layout";
import { TagPill } from "../../src/components/Badge";
import { map } from "../../src/fn";
import { createSegmentedControl } from "../../src/components/SegmentedControl";

/** A save that round-trips: `onSave` returns a promise after this delay. */
const SAVE_LATENCIES = ["100", "800", "2000"] as const;
const SaveLatencyPicker = createSegmentedControl({
  options: map(
    (ms: string) => ({
      value: ms,
      label: ms === "2000" ? "2s" : `${ms}ms`,
    }),
    [...SAVE_LATENCIES],
  ),
});
const after = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const SHAPES = ["circle", "diamond", "square", "pentagon"] as const;

/** Each scenario's chart-line identity (series colour + shape). The fourth is
 *  refused, as thorcasting refuses a plan it cannot compare. */
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

const SHOWCASE_STORE: DirtyComboStore<PayrollConfig> = {
  ...PAYROLL_STORE,
  items: map(withIdentity, PAYROLL_STORE.items),
};

export const DirtyComboBoxShowcase: Component = () => {
  const [latency, setLatency] = createSignal<string>("800");
  const [store, setStore] =
    createSignal<DirtyComboStore<PayrollConfig>>(SHOWCASE_STORE);
  let created = 0;
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
        printed below. Configured here as thorcasting uses it: a series
        swatch per row and on the value, a leading "None", a refused row
        stating its reason, click-anywhere-on-the-name rename (Enter or blur
        saves, Esc cancels; ▾ alone opens the menu), and — only while dirty —
        the split [ ↺ │ + ] whose "+" saves the edit as a new scenario and
        opens its name.
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
              onSave={() =>
                after(Number(latency())).then(() => setStore(dirtyComboSave))
              }
              onReset={() => setStore(dirtyComboReset)}
              onDelete={(id) => setStore((s) => dirtyComboRemove(s, id))}
              onCreate={create}
              onRename={(name) => setStore((s) => dirtyComboRename(s, name))}
            />
            {/* A neighbour: it must NOT move when the combo goes dirty. */}
            <TagPill tag={{ label: "neighbour — never moves" }} />
          </ClusterRow>
          <ClusterRow>
            <NoteText>Save latency</NoteText>
            <SaveLatencyPicker value={latency()} onValueChange={setLatency} />
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
