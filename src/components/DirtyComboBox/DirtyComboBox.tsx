// ============================================
// DirtyComboBox — Composite (Depth 2)
// Owns no CSS. Composes CompactDropdown (trigger slot + itemAction +
// onItemDelete + DropdownFitLabel), SlideReveal, TagPill, TextSublabel, Icon,
// the SmallGhostButton / IconOnlyButton curried variants, VerticalDivider and
// the ClusterRow / TightClusterRow / LooseClusterRow Layout variants.
//
//   [Baseline] vs [ name… ▾ │ ✓ ]      ↺
//
// A list of things that can be SAVED or RESET, with dirty detection (Peter,
// 2026-09-24; first consumer: thorcasting's payroll scenario strip). What it
// draws is derived by the pure `dirtyComboModel` (./dirtyComboModel.ts) — the
// headless observation — and this file only renders that view and forwards
// the four commands:
//
//   • PRISTINE: no save, no reset. DIRTY: the save segment slides out of the
//     combo and the reset slides in beside it (SlideReveal, 180ms).
//   • The reset sits a LOOSE gap away from save, so it is hard to fat-finger;
//     there is deliberately no confirm.
//   • Every row but the selected one carries a trash; Delete/Backspace on a
//     focused row does the same from the keyboard.
//   • The name is as wide as the LONGEST label (capped near 30 characters,
//     ellipsised), so the combo never jumps when the selection changes.
// ============================================
import { type Component, Show } from "solid-js";
import {
  CompactDropdown,
  DropdownFitLabel,
  type DropdownItem,
  type DropdownItemActionProps,
} from "../Dropdown";
import { TagPill } from "../Badge";
import { TextSublabel } from "../Text";
import { Icon } from "../Icon";
import { IconOnlyButton, SmallGhostButton } from "../Button";
import { VerticalDivider } from "../Divider";
import { SlideReveal } from "../SlideReveal";
import { ClusterRow, LooseClusterRow, TightClusterRow } from "../Layout";
import { map } from "../../fn";
import type { DirtyComboItem, DirtyComboView } from "./dirtyComboModel";

export interface DirtyComboBoxProps {
  /** The fixed left-hand pill, e.g. "Baseline". */
  reference: string;
  items: DirtyComboItem[];
  selectedId: string;
  /** From `dirtyComboModel` — the control draws only what this says. */
  view: DirtyComboView;
  onSelect: (id: string) => void;
  onSave: () => void;
  onReset: () => void;
  /** Delete a row. Never called for the selected row. */
  onDelete: (id: string) => void;
}

const labelOf = (item: DirtyComboItem): string => item.label;

export const DirtyComboBox: Component<DirtyComboBoxProps> = (props) => {
  // The row's trash. The selected row draws nothing: it cannot be deleted.
  const DeleteAction: Component<DropdownItemActionProps> = (row) => (
    <Show when={!row.selected}>
      <IconOnlyButton
        aria-label={`Delete ${row.item.label}`}
        title={`Delete ${row.item.label}`}
        onClick={() => props.onDelete(row.item.id)}
      >
        <Icon name="trash" size="sm" />
      </IconOnlyButton>
    </Show>
  );

  // The keyboard twin of the trash, with the same refusal.
  const deleteFromKeyboard = (item: DropdownItem) => {
    if (item.id !== props.selectedId) props.onDelete(item.id);
  };

  return (
    <LooseClusterRow>
      <ClusterRow>
        <TagPill tag={{ label: props.reference }} />
        <TextSublabel>vs</TextSublabel>
        <CompactDropdown
          items={props.items}
          value={props.selectedId}
          onChange={props.onSelect}
          itemAction={DeleteAction}
          onItemDelete={deleteFromKeyboard}
          trigger={(state) => (
            <TightClusterRow>
              <SmallGhostButton onClick={state.toggle}>
                <TightClusterRow>
                  <DropdownFitLabel
                    label={props.view.selectedLabel}
                    candidates={map(labelOf, props.items)}
                  />
                  <Icon
                    name={state.open ? "chevron-up" : "chevron-down"}
                    size="xs"
                  />
                </TightClusterRow>
              </SmallGhostButton>
              <SlideReveal when={props.view.canSave}>
                <TightClusterRow>
                  <VerticalDivider />
                  <IconOnlyButton
                    aria-label="Save"
                    title="Save"
                    onClick={props.onSave}
                  >
                    <Icon name="check" size="sm" />
                  </IconOnlyButton>
                </TightClusterRow>
              </SlideReveal>
            </TightClusterRow>
          )}
        />
      </ClusterRow>
      <SlideReveal when={props.view.canReset}>
        <IconOnlyButton
          aria-label="Reset to saved"
          title="Reset to saved"
          onClick={props.onReset}
        >
          <Icon name="undo" size="sm" />
        </IconOnlyButton>
      </SlideReveal>
    </LooseClusterRow>
  );
};
