// MutationToolbar — Composite (Depth 2). The header row of a "changes" panel:
// a title, the as-of chips that pick which change is being edited, and the
// panel's actions. Composes SpreadRow / ClusterRow (Layout), TextTitle /
// NoteText (Atomic), SegmentedControl (Atomic), the curried Buttons and Icon —
// every one Depth 1, so this is Depth 2 and owns no CSS.
//
// WHY IT EXISTS: the Scenario Board and Hourly Board benches built this row by
// hand, identically, and Thorcasting's payroll simulator did too, with a TODO
// naming the gap. One row, three copies.
//
// THE CHIPS OR A SENTENCE, NEVER AN EMPTY BAR. With no changes there is nothing
// to pick, and an empty segmented control is a control that cannot be
// operated, so `emptyNote` takes its slot. It is a hint about a missing INPUT,
// not `EmptyState`: the panel below still has content.
//
// AN ACTION IS OFFERED ONLY WHEN IT CAN ACT. Add, Reset and Save render only
// when their callback is passed, because a screen that has no Save (the
// Scenario Board commits on the fly) should not draw one. Delete removes the
// SELECTED change, so it renders only while one is selected — hidden rather
// than disabled, because the empty-state sentence already explains that state.
import { type Component, type JSX, Show, mergeProps } from "solid-js";
import { map } from "../../fn";
import { DangerButton, GhostButton, PrimaryButton } from "../Button";
import { Icon } from "../Icon";
import { ClusterRow, SpreadRow } from "../Layout";
import { SegmentedControl } from "../SegmentedControl";
import { NoteText, TextTitle } from "../Text";

/** One change the as-of chips can pick. `label` is what the chip reads. */
export interface MutationToolbarChange {
  readonly id: string;
  readonly label: string;
}

/** The toolbar's words. Presentational, so they are curried, never inline. */
export interface MutationToolbarLabels {
  add: string;
  reset: string;
  save: string;
  delete: string;
  /** Accessible name of the chip group. */
  chips: string;
}

export interface MutationToolbarProps {
  /** The panel's title, e.g. "Changes". */
  title: string;
  /** The changes, in the order the chips read. */
  changes: readonly MutationToolbarChange[];
  /** The change being edited, or `null` for none. */
  selected: string | null;
  /** Fires with the id of the chip picked. */
  onSelect: (id: string) => void;
  /** What stands in the chips' slot while there are no changes. */
  emptyNote: JSX.Element;
  /** Add. Omit and no Add button renders. */
  onAdd?: () => void;
  /** Reset. Omit and no Reset button renders. */
  onReset?: () => void;
  /** Save. Omit and no Save button renders. */
  onSave?: () => void;
  /** Disables Save — typically "nothing has changed since the last save". */
  saveDisabled?: boolean;
  /** Delete the selected change. Omit and no Delete button renders. */
  onDelete?: (id: string) => void;
  /** The words. See `MutationToolbarLabels`. */
  labels?: Partial<MutationToolbarLabels>;
}

/** The words a toolbar uses unless a curry states its own. */
export const DEFAULT_MUTATION_TOOLBAR_LABELS: MutationToolbarLabels = {
  add: "Add",
  reset: "Reset",
  save: "Save",
  delete: "Delete",
  chips: "Change being edited",
};

export const MutationToolbar: Component<MutationToolbarProps> = (props) => {
  const labels = (): MutationToolbarLabels => ({
    ...DEFAULT_MUTATION_TOOLBAR_LABELS,
    ...props.labels,
  });
  return (
    <SpreadRow>
      <TextTitle>{props.title}</TextTitle>
      <Show when={props.changes.length > 0} fallback={<NoteText>{props.emptyNote}</NoteText>}>
        <SegmentedControl
          options={map(
            (change: MutationToolbarChange) => ({
              value: change.id,
              label: change.label,
            }),
            props.changes,
          )}
          value={props.selected ?? ""}
          onValueChange={props.onSelect}
          aria-label={labels().chips}
        />
      </Show>
      <ClusterRow>
        <Show when={props.onAdd}>
          {(add) => (
            <GhostButton onClick={() => add()()}>
              <Icon name="plus" size="sm" /> {labels().add}
            </GhostButton>
          )}
        </Show>
        <Show when={props.onReset}>
          {(reset) => (
            <GhostButton onClick={() => reset()()}>{labels().reset}</GhostButton>
          )}
        </Show>
        <Show when={props.onSave}>
          {(save) => (
            <PrimaryButton
              disabled={props.saveDisabled ?? false}
              onClick={() => save()()}
            >
              {labels().save}
            </PrimaryButton>
          )}
        </Show>
        <Show when={props.onDelete !== undefined && props.selected}>
          {(selected) => (
            <DangerButton onClick={() => props.onDelete?.(selected())}>
              <Icon name="trash" size="sm" /> {labels().delete}
            </DangerButton>
          )}
        </Show>
      </ClusterRow>
    </SpreadRow>
  );
};

/** Props that are presentational — locked at curry time. */
export type MutationToolbarOverrides = Pick<MutationToolbarProps, "labels">;

/** Props left to the call site: data and callbacks only. */
export type MutationToolbarDataProps = Omit<
  MutationToolbarProps,
  keyof MutationToolbarOverrides
>;

/**
 * Curry the toolbar's words once, the way `createPairedMutationSliders` curries
 * its axes: the vocabulary belongs to the SCREEN ("Hire" rather than "Add"),
 * not to any one render of it.
 */
export function createMutationToolbar(
  defaults: MutationToolbarOverrides,
): Component<MutationToolbarDataProps> {
  return (props) => <MutationToolbar {...mergeProps(defaults, props)} />;
}
