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
//   • OPT-IN PARITY with thorcasting's scenario chip (Peter, 2026-09-24),
//     each off unless configured, so the control above is the default:
//       onCreate → the reset becomes a split [ ↺ | + ], shown only while
//         dirty (it slides in with ✓); "new" selects the created item and
//         opens its name field.
//       onRename → the name is an EditableTitle (click: a text field; Enter or
//         blur saves, Esc cancels) and the caret alone opens the menu.
//       labels.none → a leading "None" row (DIRTY_COMBO_NONE_ID).
//       item.color/shape → a swatch on the row and the selected value;
//       item.disabled/reason → Dropdown's own refused row with its reason.
// ============================================
import { type Component, Show, mergeProps } from "solid-js";
import {
  CompactDropdown,
  DropdownFitLabel,
  type DropdownItem,
  type DropdownItemActionProps,
} from "../Dropdown";
import { ScenarioGlyph, TagPill } from "../Badge";
import { EditableTitle } from "../EditableTitle";
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
import { find, map } from "../../fn";
import {
  DIRTY_COMBO_NONE_ID,
  type DirtyComboItem,
  type DirtyComboView,
} from "./dirtyComboModel";

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
  /** The "new" half of the [ reset | new ] split's accessible name and
   *  tooltip. Read only when `onCreate` is given. */
  create?: string;
  /** The caret's accessible name and tooltip once the name is a rename
   *  target (with `onRename`), so the caret alone opens the menu. */
  choose?: string;
  /** Names the "compare against nothing" row, which then leads the menu
   *  (`DIRTY_COMBO_NONE_ID`). Absent: no such row. */
  none?: string;
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
  /** Create an item and select it (`dirtyComboCreate`). Given, the reset
   *  becomes a split [ ↺ reset | + new ] that always stands — reset disabled
   *  while pristine — and "new" opens the name field on the new item. */
  onCreate?: () => void;
  /** Rename the selected item (`dirtyComboRename`). Given, clicking the name
   *  turns it into a text field: Enter or blur saves, Esc cancels. */
  onRename?: (name: string) => void;
}

const labelOf = (item: DirtyComboItem): string => item.label;

/** The trigger's swatch: the selected row's identity mark, the same one the
 *  menu draws on its row. Nothing when the row carries no colour. */
const Swatch: Component<{ item: DirtyComboItem | undefined }> = (props) => (
  <Show when={props.item?.color}>
    {(color) => (
      <ScenarioGlyph
        color={color()}
        shape={props.item?.shape ?? "circle"}
        filled
        size={8}
      />
    )}
  </Show>
);

/** The drawn control, in whatever state `view` says. */
const DirtyComboBoxBody: Component<DirtyComboBoxProps> = (props) => {
  // "None" leads the menu when the labels name it.
  const noneRow = (): DirtyComboItem[] =>
    props.labels.none === undefined
      ? []
      : [{ id: DIRTY_COMBO_NONE_ID, label: props.labels.none }];
  const menuItems = (): DirtyComboItem[] => [...noneRow(), ...props.items];
  const selectedItem = () =>
    find((item) => item.id === props.selectedId, props.items);
  const shownLabel = () =>
    props.view.none ? (props.labels.none ?? "") : props.view.selectedLabel;
  const isDeletable = (id: string) =>
    id !== props.selectedId && id !== DIRTY_COMBO_NONE_ID;

  // "new" hands the NEXT mounted name field an autoEdit: the caller's create
  // selects the new item synchronously, the keyed name remounts on it, and
  // that mount takes (and clears) the flag. A create that selected nothing
  // must not leave it armed for some later selection, so it is dropped after
  // the click either way.
  let nameNext = false;
  const takeNameNext = (): boolean => {
    const armed = nameNext;
    nameNext = false;
    return armed;
  };
  const create = () => {
    nameNext = true;
    props.onCreate?.();
    queueMicrotask(() => {
      nameNext = false;
    });
  };

  // The row's trash. The selected row draws nothing: it cannot be deleted.
  // Nor does "None": it is not an item.
  const DeleteAction: Component<DropdownItemActionProps> = (row) => (
    <Show when={isDeletable(row.item.id)}>
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
    if (isDeletable(item.id)) props.onDelete(item.id);
  };

  return (
    <LooseClusterRow>
      <ClusterRow>
        <TagPill tag={{ label: props.labels.reference }} />
        <TextSublabel>{props.labels.versus}</TextSublabel>
        <CompactDropdown
          items={menuItems()}
          value={props.selectedId}
          onChange={props.onSelect}
          itemAction={DeleteAction}
          onItemDelete={deleteFromKeyboard}
          trigger={(state) => (
            // Gapless, so a collapsed save segment leaves no blank space
            // inside the frame after the caret.
            <FlexRow>
              <Show
                when={props.onRename}
                fallback={
                  <SmallGhostButton onClick={state.toggle}>
                    <TightClusterRow>
                      <Swatch item={selectedItem()} />
                      <DropdownFitLabel
                        label={shownLabel()}
                        candidates={map(labelOf, menuItems())}
                      />
                      <Icon
                        name={state.open ? "chevron-up" : "chevron-down"}
                        size="xs"
                      />
                    </TightClusterRow>
                  </SmallGhostButton>
                }
              >
                {/* RENAMEABLE: the name is its own click target (a text
                    field on click, or at once after "new"), so the caret
                    alone opens the menu. The name holds the longest label's
                    width, so opening the field moves nothing. */}
                <TightClusterRow>
                  <Swatch item={selectedItem()} />
                  <ReservedWidth
                    widest={
                      <DropdownFitLabel
                        label=""
                        candidates={map(labelOf, menuItems())}
                      />
                    }
                  >
                    <Show when={props.selectedId} keyed>
                      {/* Inert under "None": there is nothing to rename,
                          but the name keeps the same type and place. */}
                      <EditableTitle
                        title={shownLabel()}
                        onChange={
                          props.view.canRename
                            ? (name) => props.onRename?.(name)
                            : undefined
                        }
                        autoEdit={takeNameNext()}
                      />
                    </Show>
                  </ReservedWidth>
                  <IconOnlyButton
                    aria-label={props.labels.choose}
                    title={props.labels.choose}
                    onClick={state.toggle}
                  >
                    <Icon
                      name={state.open ? "chevron-up" : "chevron-down"}
                      size="xs"
                    />
                  </IconOnlyButton>
                </TightClusterRow>
              </Show>
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
      <Show
        when={props.onCreate}
        fallback={
          <SlideReveal when={props.view.canReset}>
            <IconOnlyButton
              aria-label={props.labels.reset}
              title={props.labels.reset}
              onClick={props.onReset}
            >
              <Icon name="undo" size="sm" />
            </IconOnlyButton>
          </SlideReveal>
        }
      >
        {/* THE SPLIT [ ↺ reset | + new ] (Peter, 2026-09-24). Shown ONLY
            while dirty — a new item that differs from no existing one makes
            no sense — so it slides in with the ✓ segment, inside the same
            ReservedWidth, and nothing outside the control moves. */}
        <SlideReveal when={props.view.canCreate}>
          <TightClusterRow>
            <IconOnlyButton
              aria-label={props.labels.reset}
              title={props.labels.reset}
              onClick={props.onReset}
            >
              <Icon name="undo" size="sm" />
            </IconOnlyButton>
            <VerticalDivider />
            <IconOnlyButton
              aria-label={props.labels.create}
              title={props.labels.create}
              onClick={create}
            >
              <Icon name="plus" size="sm" />
            </IconOnlyButton>
          </TightClusterRow>
        </SlideReveal>
      </Show>
    </LooseClusterRow>
  );
};

/** Every action shown: the widest the control ever gets. */
const widestView = (view: DirtyComboView): DirtyComboView => ({
  ...view,
  canSave: true,
  canReset: true,
  canCreate: true,
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
        onCreate={props.onCreate && noop}
        onRename={props.onRename && noop}
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
