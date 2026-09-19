// MutationToolbar — the header row of a "changes" panel: a title, the as-of
// chips that pick which change is being edited, and the panel's actions.
//
// The showcase plays the CONSUMER: it owns the change list and the selection
// as signals, and every button is wired to working state, so the toolbar is
// proven as a drop-in rather than described. Three forms, because the three
// screens that use it differ in exactly these ways:
//
//   • The boards' row — an × on each chip and nothing but Reset in the corner,
//     as the Hourly and License Boards use it since 2026-09-18. Save went to
//     the board's own title row, where one Save covers the whole board.
//   • The full row — Add, Reset, Save and the DEPRECATED corner Delete — the
//     shape the component shipped with, kept so the old path stays proven.
//   • A CURRIED row with its own words and only Delete + Reset, as the
//     Scenario Board uses it (it commits on the fly, so it has no Save).
//   • The empty state: no changes yet, so a sentence stands in the chips' slot.
import { type Component, createSignal } from "solid-js";
import {
  MutationToolbar,
  createMutationToolbar,
  type MutationToolbarChange,
} from "../../src/components/MutationToolbar";
import { CardSurface } from "../../src/components/Surface";
import {
  CaptionLabel,
  SectionTitle,
  SubsectionTitle,
} from "../../src/components/Text";
import { SpacedStack } from "../../src/components/Layout";

const SEED: readonly MutationToolbarChange[] = [
  { id: "june", label: "W23 · Jun 2" },
  { id: "september", label: "W36 · Sep 1" },
];

/** The Scenario Board's vocabulary, curried once. */
const PayChangesToolbar = createMutationToolbar({
  labels: { chips: "Pay change being edited" },
});

/** A new chip a week after the last one, so Add visibly does something. */
const nextChange = (
  changes: readonly MutationToolbarChange[],
): MutationToolbarChange => {
  const n = changes.length + 1;
  return { id: `added-${n}`, label: `Change ${n}` };
};

export const MutationToolbarShowcase: Component = () => {
  const [changes, setChanges] =
    createSignal<readonly MutationToolbarChange[]>(SEED);
  const [selected, setSelected] = createSignal<string | null>("june");
  const [saved, setSaved] = createSignal(JSON.stringify(SEED));
  const dirty = () => JSON.stringify(changes()) !== saved();

  const add = () => {
    const added = nextChange(changes());
    setChanges([...changes(), added]);
    setSelected(added.id);
  };
  const remove = (id: string) => {
    const rest = changes().filter((change) => change.id !== id);
    setChanges(rest);
    setSelected(rest[0]?.id ?? null);
  };
  const reset = () => {
    setChanges(SEED);
    setSelected("june");
  };

  const [boardChanges, setBoardChanges] =
    createSignal<readonly MutationToolbarChange[]>(SEED);
  const [boardSelected, setBoardSelected] = createSignal<string | null>("june");

  const [payChanges, setPayChanges] =
    createSignal<readonly MutationToolbarChange[]>(SEED);
  const [paySelected, setPaySelected] = createSignal<string | null>(
    "september",
  );

  return (
    <div class="component-section">
      <SectionTitle>MutationToolbar</SectionTitle>
      <CaptionLabel>
        Composite (Depth 2). Title, as-of chips and the panel's actions. An
        action renders only when its callback is passed. A change is removed
        from its own chip (`onRemove`); the corner Delete it replaced is
        deprecated but still honoured.
      </CaptionLabel>

      <SpacedStack>
        <div class="example-group">
          <SubsectionTitle>
            The boards' row — × on the chip, Reset as a glyph
          </SubsectionTitle>
          <CaptionLabel>
            Hover a chip (or focus one and press Delete) to remove that change.
            The corner holds nothing but Reset; Save lives on the board's title
            row, because one board saves once.
          </CaptionLabel>
          <CardSurface>
            <MutationToolbar
              title="Changes"
              changes={boardChanges()}
              selected={boardSelected()}
              onSelect={setBoardSelected}
              emptyNote="Click a month, or move a dial, to propose a change"
              onReset={() => {
                setBoardChanges(SEED);
                setBoardSelected("june");
              }}
              onRemove={(id) => {
                const rest = boardChanges().filter(
                  (change) => change.id !== id,
                );
                setBoardChanges(rest);
                if (boardSelected() === id)
                  setBoardSelected(rest[0]?.id ?? null);
              }}
            />
          </CardSurface>
        </div>

        <div class="example-group">
          <SubsectionTitle>The full row</SubsectionTitle>
          <CardSurface>
            <MutationToolbar
              title="Changes"
              changes={changes()}
              selected={selected()}
              onSelect={setSelected}
              emptyNote="Click a week to propose a change"
              onAdd={add}
              onReset={reset}
              onSave={() => setSaved(JSON.stringify(changes()))}
              saveDisabled={!dirty()}
              onDelete={remove}
            />
          </CardSurface>
        </div>

        <div class="example-group">
          <SubsectionTitle>Curried, Delete and Reset only</SubsectionTitle>
          <CardSurface>
            <PayChangesToolbar
              title="Changes"
              changes={payChanges()}
              selected={paySelected()}
              onSelect={setPaySelected}
              emptyNote="To change payroll click the pay levels chart to indicate when"
              onReset={() => {
                setPayChanges(SEED);
                setPaySelected("september");
              }}
              onDelete={(id) => {
                const rest = payChanges().filter((change) => change.id !== id);
                setPayChanges(rest);
                setPaySelected(rest[0]?.id ?? null);
              }}
            />
          </CardSurface>
        </div>

        <div class="example-group">
          <SubsectionTitle>No changes yet</SubsectionTitle>
          <CardSurface>
            <MutationToolbar
              title="Changes"
              changes={[]}
              selected={null}
              onSelect={() => {}}
              emptyNote="Click a week, or move a dial, to propose a change"
              onAdd={() => {}}
              onReset={() => {}}
            />
          </CardSurface>
        </div>
      </SpacedStack>
    </div>
  );
};
