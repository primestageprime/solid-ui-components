// ============================================
// MutationSliders role groups — pure, headless, no Solid, no DOM.
//
// ROLES, NOT NAMES (owner, thorcasting payroll builder, 2026-10-21: "yes,
// shift. that looks great"). A group is several entities the reader thinks of
// as one thing — "Roofer × 3". Collapsed, the group is ONE dial over its
// members; expanded, the members' own dials stand beside it in the group's
// frame.
//
// THE GROUP DIAL IS AN AGGREGATE, built here as an ordinary `Entity` so the
// dial draws it with no new geometry:
//   • value = the mean of the present members, rounded to the dial step;
//   • old   = the mean of the members' `old` (null when every member is new);
//   • range = the union of the members' ranges.
//
// A MOVE ON IT IS A SHIFT (`shiftGroup`): every present member moves by the
// same delta (new mean − current mean), each clamped into its OWN range, so a
// member at its band edge stops there while the others keep moving.
//
// THE ROW (`groupRow`): a group stands where its FIRST member stood, and every
// dial it shows carries the group's item key, so the row's item machinery
// (items.ts) pages it as one unit and frames it. An entity in no group is
// passed through untouched.
//
// Everything here prints as a table (groups.test.ts).
// ============================================

import { filter, find, flatMap, map, mean, some } from "../../fn";
import { clamp } from "../../internal/math/clamp";
import type { Domain, Entity } from "../MarkedSlider/geometry";

/** A role group: several entities read, and moved, as one. */
export interface SliderGroup {
  readonly id: string;
  /** What the group is — "Roofer". The header adds " × N" for N > 1. */
  readonly label: string;
  /** The members, by entity id. Ids not in `entities` are ignored. */
  readonly memberIds: readonly string[];
}

/** The item key every dial of a group carries — and the aggregate's id. */
export const groupKey = (groupId: string): string => `group:${groupId}`;

/** The members as they stood when a drag of the group dial began. */
export interface GroupDragStart {
  readonly members: readonly Entity[];
  /** The group dial's value then. */
  readonly from: number;
}

/** What one place in the row draws. */
export type RowSlot =
  /** An entity in no group: drawn exactly as before groups existed. */
  | { readonly kind: "plain"; readonly entity: Entity }
  /** A group of two or more, as its one aggregate dial. */
  | {
      readonly kind: "group";
      readonly entity: Entity;
      readonly group: SliderGroup;
      readonly members: readonly Entity[];
    }
  /** A member's own dial, inside its group (expanded, or a group of one). */
  | {
      readonly kind: "member";
      readonly entity: Entity;
      readonly group: SliderGroup;
      /** A group of one: the dial wears the group label, and this is the name. */
      readonly solo: boolean;
      /** The member's own label, before a group of one replaced it. */
      readonly name: string;
    };

/** Round onto a grid of `step`; no grid, no rounding. */
const toStep = (value: number, step: number | undefined): number =>
  step && step > 0 ? Math.round(value / step) * step : value;

/** The present (not removed) members' amounts. */
const presentValues = (members: readonly Entity[]): readonly number[] =>
  filter(
    (value: number | null): value is number => value !== null,
    map((member: Entity) => member.value, members),
  ) as readonly number[];

/** The union of the members' ranges. */
export const unionRange = (members: readonly Entity[]): Domain => [
  Math.min(...map((member: Entity) => member.range[0], members)),
  Math.max(...map((member: Entity) => member.range[1], members)),
];

/** The aggregate entity a collapsed group draws. */
export function groupEntity(
  group: SliderGroup,
  members: readonly Entity[],
  step?: number,
): Entity {
  const range = unionRange(members);
  const values = presentValues(members);
  const olds = filter(
    (old: number | null): old is number => old !== null,
    map((member: Entity) => member.old, members),
  ) as readonly number[];
  return {
    id: groupKey(group.id),
    label:
      members.length > 1 ? `${group.label} × ${members.length}` : group.label,
    value:
      values.length > 0
        ? clamp(toStep(mean(values), step), range[0], range[1])
        : null,
    old: olds.length > 0 ? toStep(mean(olds), step) : null,
    range,
    item: groupKey(group.id),
  };
}

/** The lowest and highest present amount, or `null` when all are removed. */
export function spreadOf(
  members: readonly Entity[],
): { readonly lo: number; readonly hi: number } | null {
  const values = presentValues(members);
  return values.length > 0
    ? { lo: Math.min(...values), hi: Math.max(...values) }
    : null;
}

/** How many members are NEW (`old: null`). */
export const newCount = (members: readonly Entity[]): number =>
  filter((member: Entity) => member.old === null, members).length;

/**
 * A move of the group dial from `from` to `to`: every present member shifts by
 * the same delta, clamped into its own range. Removed members do not move.
 */
export function shiftGroup(
  members: readonly Entity[],
  from: number,
  to: number,
): readonly { readonly id: string; readonly value: number }[] {
  const delta = to - from;
  return flatMap(
    (member: Entity) =>
      member.value === null
        ? []
        : [
            {
              id: member.id,
              value: clamp(
                member.value + delta,
                member.range[0],
                member.range[1],
              ),
            },
          ],
    members,
  );
}

/**
 * A DRAG of the group dial, measured from the members as they stood when the
 * pointer went down (`start`, at the group mean `from`). Owner report,
 * 2026-10-21: a drag to the floor left [30K, 33K, 30K] from
 * [59.8K, 65K, 54.6K], because each tick shifted from the CURRENT mean, and
 * the members already stopped at the floor pulled that mean down.
 *
 * Every present member moves by ONE delta from its start amount, clamped into
 * its own range, so the gaps hold wherever no member is at an edge. The
 * delta is scaled so the ENDS of the dial mean the ends of the band: the
 * dial's floor puts every member on its floor, its ceiling puts every member
 * on its ceiling, and `from` puts every member back where it started. A plain
 * `to − from` cannot do that, because the dial stops at the band floor while
 * the member furthest above its floor still has further to go.
 *
 * The delta is rounded onto `step`, the row's grid.
 */
export function dragGroup(
  start: readonly Entity[],
  from: number,
  to: number,
  step?: number,
): readonly { readonly id: string; readonly value: number }[] {
  const [lo, hi] = unionRange(start);
  const present = filter((member: Entity) => member.value !== null, start);
  const down = Math.max(
    0,
    ...map((member: Entity) => (member.value ?? 0) - member.range[0], present),
  );
  const up = Math.max(
    0,
    ...map((member: Entity) => member.range[1] - (member.value ?? 0), present),
  );
  const scaled =
    to < from
      ? from > lo
        ? ((to - from) / (from - lo)) * down
        : -down
      : to > from
        ? hi > from
          ? ((to - from) / (hi - from)) * up
          : up
        : 0;
  return shiftGroup(start, 0, toStep(scaled, step));
}

/**
 * The members a collapsed group's Reset puts back: each present member with a
 * prior amount it has moved off, with that amount clamped into its range. A
 * new member has nothing to go back to and is left alone.
 */
export function resetGroup(
  members: readonly Entity[],
): readonly { readonly id: string; readonly value: number }[] {
  return flatMap((member: Entity) => {
    if (member.value === null || member.old === null) return [];
    const target = clamp(member.old, member.range[0], member.range[1]);
    return target === member.value ? [] : [{ id: member.id, value: target }];
  }, members);
}

/** The members of `group`, in the order the row gave the entities. */
const membersOf = (
  group: SliderGroup,
  entities: readonly Entity[],
): readonly Entity[] =>
  filter(
    (entity: Entity) => some((id: string) => id === entity.id, group.memberIds),
    entities,
  );

/**
 * The row's slots, in reading order. A group stands where its first member
 * stood; an entity in more than one group belongs to the FIRST. Every dial a
 * group shows carries `groupKey(group.id)` as its `item`.
 */
export function groupRow(
  entities: readonly Entity[],
  groups: readonly SliderGroup[],
  isOpen: (groupId: string) => boolean,
  step?: number,
): readonly RowSlot[] {
  const groupOf = (entity: Entity): SliderGroup | undefined =>
    find(
      (group: SliderGroup) =>
        some((id: string) => id === entity.id, group.memberIds),
      groups,
    );
  return flatMap((entity: Entity): readonly RowSlot[] => {
    const group = groupOf(entity);
    if (!group) return [{ kind: "plain", entity }];
    const members = membersOf(group, entities);
    if (members[0]?.id !== entity.id) return [];
    const key = groupKey(group.id);
    if (members.length === 1) {
      return [
        {
          kind: "member",
          entity: { ...entity, label: group.label, item: key },
          group,
          solo: true,
          name: entity.label,
        },
      ];
    }
    const aggregate: RowSlot = {
      kind: "group",
      entity: groupEntity(group, members, step),
      group,
      members,
    };
    return isOpen(group.id)
      ? [
          aggregate,
          ...map(
            (member: Entity): RowSlot => ({
              kind: "member",
              entity: { ...member, item: key },
              group,
              solo: false,
              name: member.label,
            }),
            members,
          ),
        ]
      : [aggregate];
  }, entities);
}
