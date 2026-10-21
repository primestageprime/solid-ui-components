// Role groups in the row: which are open, what the row draws for them, and
// what a move on a group dial means (mean, range union and the shift fan-out
// are in groups.ts; this wires them to the row's callbacks).
import { createMemo, createSignal } from "solid-js";
import { map } from "../../fn";
import type { Entity } from "../MarkedSlider/geometry";
import type { Emission, Emitters } from "./emit";
import { type RowSlot, groupRow, shiftGroup, unionRange } from "./groups";
import type { MutationSlidersProps } from "./props";
import { settleTyped } from "./typed";

/** A role group's aggregate slot (groups.ts). */
export type GroupSlot = Extract<RowSlot, { kind: "group" }>;

export interface RoleGroups {
  readonly isOpen: (groupId: string) => boolean;
  readonly toggleGroup: (groupId: string) => void;
  /** What the row DRAWS, in reading order. */
  readonly shown: () => readonly Entity[];
  readonly slotById: () => ReadonlyMap<string, RowSlot>;
  /** Whether the row has role groups — every dial then holds a note line. */
  readonly grouped: () => boolean;
  /** A role group's SHIFT to `value` (groups.ts, `shiftGroup`). */
  readonly shiftTo: (slot: GroupSlot, value: number, how: Emission) => void;
  /** A figure typed under a group dial: settled, then shifted to. */
  readonly typeGroup: (slot: GroupSlot, text: string) => void;
}

export const createRoleGroups = (
  props: MutationSlidersProps,
  { emitGroup }: Pick<Emitters, "emitGroup">,
): RoleGroups => {
  /** Open role groups, when the caller does not hold them. CONTROLLED wins. */
  const [ownExpanded, setOwnExpanded] = createSignal<ReadonlySet<string>>(
    new Set<string>(),
  );
  const isOpen = (groupId: string): boolean =>
    (props.expandedGroups ?? ownExpanded()).has(groupId);
  const toggleGroup = (groupId: string): void => {
    const open = !isOpen(groupId);
    if (props.expandedGroups === undefined) {
      const next = new Set(ownExpanded());
      if (open) next.add(groupId);
      else next.delete(groupId);
      setOwnExpanded(next);
    }
    props.onExpandedChange?.(groupId, open);
  };

  /**
   * What the row DRAWS, in reading order (groups.ts): each entity in no group
   * as itself, and each role group as its aggregate dial — plus its members'
   * own dials when open. Without `groups` this is one plain slot per entity.
   * Every row fact (paging, items, the window label) reads `shown`;
   * the track `domain` and the selection still read the real entities.
   */
  const slots = createMemo((): readonly RowSlot[] =>
    groupRow(props.entities, props.groups ?? [], isOpen, props.snap),
  );
  const shown = createMemo((): readonly Entity[] =>
    map((slot: RowSlot) => slot.entity, slots()),
  );
  const slotById = createMemo(
    (): ReadonlyMap<string, RowSlot> =>
      new Map(map((slot: RowSlot) => [slot.entity.id, slot] as const, slots())),
  );
  const grouped = (): boolean => (props.groups?.length ?? 0) > 0;

  const shiftTo = (slot: GroupSlot, value: number, how: Emission): void => {
    const from = slot.entity.value;
    if (from !== null) emitGroup(shiftGroup(slot.members, from, value), how);
  };

  const typeGroup = (slot: GroupSlot, text: string): void => {
    const precision = props.precision;
    if (precision === undefined) return;
    const [min, max] = unionRange(slot.members);
    const next = settleTyped(text, { min, max, precision });
    if (next === null || next === slot.entity.value) return;
    shiftTo(slot, next, "both");
  };

  return {
    isOpen,
    toggleGroup,
    shown,
    slotById,
    grouped,
    shiftTo,
    typeGroup,
  };
};
