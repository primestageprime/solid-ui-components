// Payroll board — the CHANGES section (element 4, Peter's 2026-09-24 spec).
//
// The change sliders: one dial per person from the shared staff/events
// fixture, in compact dollars, with the old amount beside the prior arrow and
// the difference as `+$5K (4%)` under the new one.
//
// LINKS ARE THE SELECTION: hover a dial for its link button, or click a name —
// both toggle the row's `selected`. Selected dials level up to the highest
// among them and then move as one (`grouping: "link"`). The selection is
// CONTROLLED — this section holds it and persists it to localStorage per
// scenario (changes-model.ts). Save and Reset clear it.
// "Unlink all" appears top right once two or more are linked.
//
// SCENARIO STATE IS LOCAL TO THIS SECTION for now. The DirtyComboBox demo and
// the Events section each own their own state in files other agents own; the
// three will not sync until that state is hoisted to payroll-board.tsx.
//
// Lives in a SUBFOLDER on purpose: the bench discovery glob is
// `workshop/*.tsx`, so a file here is a section, never a bench of its own.
import { type Component, Show, createMemo, createSignal } from "solid-js";
import { filter, find, join, map, some } from "../../../../src/fn";
import {
  type Entity,
  createMutationSliders,
} from "../../../../src/components/MutationSliders";
import { formatCompactCurrency } from "../../../../src/internal/format/number";
import {
  IconOnlyButton,
  SmallGhostButton,
  SmallPrimaryButton,
} from "../../../../src/components/Button";
import { createHotkeyButton } from "../../../../src/components/HotkeyButton";
import { Icon } from "../../../../src/components/Icon";
import { ClusterRow, SpreadRow, TightStack } from "../../../../src/components/Layout";
import { MonoDump, NoteText } from "../../../../src/components/Text";
import { ReviewTitle } from "./review-status";
import { createSegmentedControl } from "../../../../src/components/SegmentedControl";
import { DangerConfirmationModal } from "../../../../src/components/Modal";
import { ItemTintSurface } from "../../../../src/components/Surface";
import {
  SCENARIOS,
  type ScenarioId,
  addPerson,
  positionsOf,
  validateLinks,
  browserStorage,
  observeChanges,
  readLinks,
  resetOne,
  setValue,
  writeLinks,
} from "./changes-model";

/** Bench-only: which scenario the links are keyed by. */
const ScenarioPicker = createSegmentedControl({
  options: map((one) => ({ value: one.id, label: one.label }), [...SCENARIOS]),
});

/**
 * The bench's row: the compact-currency curry's locks plus the payroll board's
 * own verb — the split footer's delete is called Delete here, matching its
 * confirm dialog.
 */
const PayChangeSliders = createMutationSliders({
  format: formatCompactCurrency,
  readout: "beside",
  snap: 1_000,
  grouping: "link",
  precision: -3,
  labels: { remove: "Delete" },
  itemFrame: ItemTintSurface,
});

/** [Add]: the Button idiom at small size, its hotkey armed page-wide. */
const AddButton = createHotkeyButton({ size: "sm" });

type ByScenario = Readonly<Record<ScenarioId, readonly Entity[]>>;
/** Person 3 holds two positions — two dials, one item (changes-model.ts). */
const START: ByScenario = { "plan-a": positionsOf(), "plan-b": positionsOf() };

export const ChangesSection: Component = () => {
  const storage = browserStorage();
  const [scenario, setScenario] = createSignal<ScenarioId>("plan-a");
  const [saved, setSaved] = createSignal<ByScenario>(START);
  const [drafts, setDrafts] = createSignal<ByScenario>(START);
  /**
   * The stored links for a scenario, VALIDATED against the values they load
   * onto — a refresh restores links but not values, so an un-level member
   * drops out (and the pruned list is written back). No value moves.
   */
  const loadLinks = (id: ScenarioId): readonly string[] => {
    const stored = readLinks(storage, id);
    const valid = validateLinks(drafts()[id], stored);
    if (valid.length !== stored.length) writeLinks(storage, id, valid);
    return valid;
  };
  const [links, setLinksSignal] = createSignal<readonly string[]>(
    loadLinks("plan-a"),
  );
  const [lastAction, setLastAction] = createSignal(
    "Hover a dial for its link button.",
  );

  /** The dial a Delete is waiting on a confirm for, or none. */
  const [pendingDelete, setPendingDelete] = createSignal<string>();

  const rows = createMemo(() => drafts()[scenario()]);
  /** Linked ids that still name a dial — what "two or more linked" counts. */
  const linkedCount = createMemo(
    () =>
      filter((id: string) => some((row: Entity) => row.id === id, rows()), links())
        .length,
  );

  /** Every link change goes through here: memory first, then storage. */
  const setLinks = (ids: readonly string[]): void => {
    setLinksSignal(ids);
    writeLinks(storage, scenario(), ids);
  };

  /**
   * Every draft edit is a TRANSFORM of the latest draft, never a value built
   * from `rows()` at call time: a linked move calls `onChange` once per
   * member in a row, and each must see the one before it.
   */
  const updateDraft = (
    change: (draft: readonly Entity[]) => readonly Entity[],
  ): void => {
    setDrafts((before) => ({ ...before, [scenario()]: change(before[scenario()]) }));
  };

  const switchScenario = (id: ScenarioId): void => {
    setScenario(id);
    setLinksSignal(loadLinks(id));
    setLastAction(`Switched to ${id}; links reloaded from storage.`);
  };

  const save = (): void => {
    setSaved((before) => ({ ...before, [scenario()]: rows() }));
    setLinks([]);
    setLastAction(`Saved ${scenario()}; links cleared.`);
  };

  const add = (): void => {
    updateDraft(addPerson);
    setLastAction("Added a person.");
  };

  const reset = (): void => {
    updateDraft(() => saved()[scenario()]);
    setLinks([]);
    setLastAction(`Reset ${scenario()}; links cleared.`);
  };

  return (
    <TightStack>
      <SpreadRow>
        <ClusterRow>
          <ReviewTitle id="changes">Changes</ReviewTitle>
          {/* Element 6: [Add] (hotkey A, underlined in its label — the
              HotkeyButton idiom), then reset-all as an icon, no confirm. */}
          <AddButton hotkey="a" onTrigger={add}>
            Add
          </AddButton>
          <IconOnlyButton
            aria-label="Reset all changes"
            title="Reset all changes"
            onClick={reset}
          >
            <Icon name="undo" size="sm" />
          </IconOnlyButton>
          {/* Bench scaffolding, not element 6: which scenario the stored
              links are keyed by, and a save that clears them. */}
          <ScenarioPicker
            value={scenario()}
            onValueChange={(id) => switchScenario(id as ScenarioId)}
            aria-label="Scenario"
          />
          <SmallPrimaryButton onClick={save}>Save</SmallPrimaryButton>
        </ClusterRow>
        <Show when={linkedCount() >= 2}>
          <SmallGhostButton
            onClick={() => {
              setLinks([]);
              setLastAction("Unlinked all.");
            }}
          >
            Unlink all
          </SmallGhostButton>
        </Show>
      </SpreadRow>
      <PayChangeSliders
        entities={rows()}
        onChange={(id, value) => updateDraft((draft) => setValue(draft, id, value))}
        onReset={(id) => {
          updateDraft((draft) => resetOne(draft, saved()[scenario()], id));
          setLastAction(`Reset ${id}.`);
        }}
        onRemove={setPendingDelete}
        onRestore={(id) =>
          updateDraft((draft) =>
            setValue(
              draft,
              id,
              find((e: Entity) => e.id === id, saved()[scenario()])?.value ?? null,
            ),
          )
        }
        selected={links()}
        onSelectionChange={(ids) => {
          setLinks(ids);
          setLastAction(`Links: [${join(", ", ids)}]`);
        }}
      />
      <DangerConfirmationModal
        open={pendingDelete() !== undefined}
        title={`Delete ${pendingDelete() ?? ""}?`}
        description="They leave this scenario. Restore brings them back."
        confirmLabel="Delete"
        onClose={() => setPendingDelete(undefined)}
        onConfirm={() => {
          const id = pendingDelete();
          if (id !== undefined) updateDraft((draft) => setValue(draft, id, null));
          setPendingDelete(undefined);
          setLastAction(`Deleted ${id}.`);
        }}
      />
      <NoteText>{lastAction()}</NoteText>
      <MonoDump>{observeChanges(rows(), links(), scenario())}</MonoDump>
    </TightStack>
  );
};
