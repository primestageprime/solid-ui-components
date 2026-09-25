// ============================================
// DirtyComboBox — Composite (Depth 2)
// Owns no CSS. Composes CompactDropdown (trigger slot + itemAction +
// onItemDelete + DropdownFitLabel), SlideReveal, ReservedWidth, TagPill,
// TextSublabel, Icon,
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
//   • PRISTINE: no save, no reset — the frame hugs [name ▾]. DIRTY: the save
//     segment slides out and the frame grows with it, and the reset slides in
//     beside it (SlideReveal, 180ms). The whole control sits inside an
//     INVISIBLE reservation of its dirty width (ReservedWidth, an outer
//     element), so nothing beside it ever moves and the frame never carries
//     blank padding (Peter, 2026-09-24).
//   • The reset sits a LOOSE gap away from save, so it is hard to fat-finger;
//     there is deliberately no confirm.
//   • Every row but the selected one carries a trash; Delete/Backspace on a
//     focused row does the same from the keyboard.
//   • The name is as wide as the LONGEST label (capped near 30 characters,
//     ellipsised), so the combo never jumps when the selection changes.
// ============================================
import { type Component, Show, mergeProps } from "solid-js";
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
import { ReservedWidth } from "../ReservedWidth";
import {
  ClusterRow,
  FlexRow,
  LooseClusterRow,
  TightClusterRow,
} from "../Layout";
import { map } from "../../fn";
import type { DirtyComboItem, DirtyComboView } from "./dirtyComboModel";

/** The words the control speaks. Presentational: a curry states them once
 *  (`createDirtyComboBox({ labels })`), never a call site. */
export interface DirtyComboBoxLabels {
  /** The fixed left-hand pill, e.g. "Baseline". */
  reference: string;
  /** The word between the pill and the combo, e.g. "vs". */
  versus: string;
  /** The save button's accessible name and tooltip. */
  save: string;
  /** The reset button's accessible name and tooltip. */
  reset: string;
  /** A row trash's accessible name and tooltip, from the row's label. */
  deleteItem: (label: string) => string;
}

export interface DirtyComboBoxProps {
  /** The words. See `DirtyComboBoxLabels`. */
  labels: DirtyComboBoxLabels;
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

/** The drawn control, in whatever state `view` says. */
const DirtyComboBoxBody: Component<DirtyComboBoxProps> = (props) => {
  // The row's trash. The selected row draws nothing: it cannot be deleted.
  const DeleteAction: Component<DropdownItemActionProps> = (row) => (
    <Show when={!row.selected}>
      <IconOnlyButton
        aria-label={props.labels.deleteItem(row.item.label)}
        title={props.labels.deleteItem(row.item.label)}
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
        <TagPill tag={{ label: props.labels.reference }} />
        <TextSublabel>{props.labels.versus}</TextSublabel>
        <CompactDropdown
          items={props.items}
          value={props.selectedId}
          onChange={props.onSelect}
          itemAction={DeleteAction}
          onItemDelete={deleteFromKeyboard}
          trigger={(state) => (
            // Gapless, so a collapsed save segment leaves no blank space
            // inside the frame after the caret.
            <FlexRow>
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
                    aria-label={props.labels.save}
                    title={props.labels.save}
                    onClick={props.onSave}
                  >
                    <Icon name="check" size="sm" />
                  </IconOnlyButton>
                </TightClusterRow>
              </SlideReveal>
            </FlexRow>
          )}
        />
      </ClusterRow>
      <SlideReveal when={props.view.canReset}>
        <IconOnlyButton
          aria-label={props.labels.reset}
          title={props.labels.reset}
          onClick={props.onReset}
        >
          <Icon name="undo" size="sm" />
        </IconOnlyButton>
      </SlideReveal>
    </LooseClusterRow>
  );
};

/** Every action shown: the widest the control ever gets. */
const widestView = (view: DirtyComboView): DirtyComboView => ({
  ...view,
  canSave: true,
  canReset: true,
});

const noop = () => {};

/**
 * The control, inside an invisible reservation of its WIDEST (dirty) state:
 * the visible frame hugs its content and grows into the reserved space as the
 * save segment slides out, and nothing beside the control ever moves (Peter,
 * 2026-09-24 — "hold the space, but do so invisibly (with an outer element)").
 */
export const DirtyComboBox: Component<DirtyComboBoxProps> = (props) => (
  <ReservedWidth
    widest={
      <DirtyComboBoxBody
        {...props}
        view={widestView(props.view)}
        onSelect={noop}
        onSave={noop}
        onReset={noop}
        onDelete={noop}
      />
    }
  >
    <DirtyComboBoxBody {...props} />
  </ReservedWidth>
);

// ── currying ─────────────────────────────────────────────────────────────

/** Props that are presentational — locked at curry time. */
export type DirtyComboBoxOverrides = Pick<DirtyComboBoxProps, "labels">;

/** Props left to the call site: data and callbacks only. */
export type DirtyComboBoxDataProps = Omit<
  DirtyComboBoxProps,
  keyof DirtyComboBoxOverrides
>;

/** Curry the control's words once — the vocabulary belongs to the SCREEN
 *  (scenarios vs Baseline, presets vs Default), not to any one render. */
export function createDirtyComboBox(
  defaults: DirtyComboBoxOverrides,
): Component<DirtyComboBoxDataProps> {
  return (props) => <DirtyComboBox {...mergeProps(defaults, props)} />;
}
