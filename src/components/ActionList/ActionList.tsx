// ============================================
// ActionList — Composite (Depth 3)
// Composes SortableList (rowChrome "bare", gap 1) + ActionListItem. Owns no CSS:
// SortableList supplies the reorder mechanics + chromeless rows, ActionListItem
// supplies the row surface and all row visuals. A drop-in, data-driven list of
// editable action rows (todo queues, filter results, work items).
//
// The base is NOT exported — consumers use the curried `ActionList` drop-in (see
// variants.ts) or createActionList(). Follows the createButton / createPanel
// Overrides/DataProps split: the ONE presentational knob is `statusTones` (the
// status→row-tone map), frozen at curry time so the tone mapping never leaks to
// an app call site; everything else is data.
//
// Each callback opts a behaviour in: `onSort` enables drag reorder, `onDelete`
// the × cap, `onRename` the inline title edit, `onStatusChange` the chip edit +
// select. Omit one and that affordance stays inert.
// ============================================
import { Component, mergeProps } from "solid-js";
import { SortableList } from "../SortableList/SortableList";
import { ActionListItem, type ActionListItemTone } from "../ActionListItem/ActionListItem";
import type { AssigneeIconProps } from "../AssigneeIcon/AssigneeIcon";
import type { TagPillData } from "../TagPill/TagPill";

/** A tag — a plain/`"ns:value"` label, or the explicit `{ key, value }` form. */
export type ActionListTag = TagPillData;

/** Person / AI assignment glyph data. */
export type ActionListAssignee = AssigneeIconProps;

export interface ActionListItemData {
  id: string;
  /** The title. */
  name: string;
  status?: string;
  assignee?: ActionListAssignee;
  tags?: ActionListTag[];
}

export interface ActionListProps {
  items: ActionListItemData[];
  /** Known statuses; drives each chip's select menu + fixed width. */
  statusOptions?: string[];
  /** Enables drag reorder; called with the new id order after a drop. */
  onSort?: (orderedIds: string[]) => void;
  /** Enables the × cap; called with the removed id. */
  onDelete?: (id: string) => void;
  /** Enables inline title edit; called with the id + new name. */
  onRename?: (id: string, name: string) => void;
  /** Enables chip edit/select; called with the id + new status. */
  onStatusChange?: (id: string, status: string) => void;
  /** Accessible label for the list region. */
  label?: string;
}

/** The single presentational knob: how each status maps to a row tone. Frozen at
 *  curry time (see variants.ts) so the mapping stays out of app call sites. */
export interface ActionListOverrides {
  statusTones?: Record<string, ActionListItemTone>;
}

/** Props that remain available to consumers of a curried ActionList variant. */
export type ActionListDataProps = ActionListProps;

/** Default tone map — DONE recedes, DOING pops, everything else stays neutral. */
export const DEFAULT_STATUS_TONES: Record<string, ActionListItemTone> = {
  DONE: "dim",
  DOING: "highlight",
};

const ActionListBase: Component<ActionListProps & ActionListOverrides> = (props) => {
  const tones = () => props.statusTones ?? DEFAULT_STATUS_TONES;
  const toneFor = (status?: string): ActionListItemTone =>
    (status && tones()[status]) || "neutral";

  return (
    <SortableList
      items={props.items}
      getId={(d) => d.id}
      // onSort enables reorder; without it a drop simply doesn't persist.
      onReorder={(ids) => props.onSort?.(ids)}
      rowChrome="bare"
      gap={1}
      label={props.label}
      renderItem={(d) => (
        <ActionListItem
          title={d.name}
          status={d.status}
          statusOptions={props.statusOptions}
          assignee={d.assignee}
          tags={d.tags}
          tone={toneFor(d.status)}
          onStatusChange={
            props.onStatusChange ? (s) => props.onStatusChange!(d.id, s) : undefined
          }
          onTitleChange={
            props.onRename ? (name) => props.onRename!(d.id, name) : undefined
          }
          onDismiss={props.onDelete ? () => props.onDelete!(d.id) : undefined}
        />
      )}
    />
  );
};

export function createActionList(
  defaults: Partial<ActionListOverrides>,
): Component<ActionListDataProps> {
  return (props) => <ActionListBase {...mergeProps(defaults, props)} />;
}
