// One dial of the row, as JSX: an entity's own dial, a collapsed role group's
// aggregate dial, or whichever the slot says. The row's state arrives as
// accessors, so the dials stay as reactive as they were inline.
import { type JSX, Show } from "solid-js";
import type { Entity } from "../MarkedSlider/geometry";
import { MutationDial } from "./dial";
import { GroupDial } from "./groupDial";
import { resetGroup, shiftGroup } from "./groups";
import type { Emitters } from "./emit";
import type { ResolvedLabels } from "./labels";
import type { MutationSlidersProps } from "./props";
import type { RowMoves } from "./rowMoves";
import type { GroupSlot, RoleGroups } from "./roleGroups";
import type { RowScale } from "./scale";
import type { RowSelection } from "./selection";

export interface DialRenderInputs {
  readonly props: MutationSlidersProps;
  readonly format: (value: number) => string;
  readonly labels: () => ResolvedLabels;
  readonly scale: RowScale;
  readonly selection: RowSelection;
  readonly roles: RoleGroups;
  readonly moves: RowMoves;
  readonly emitGroup: Emitters["emitGroup"];
}

/** Build `renderDial`: one dial of the row. `Index` keys by position. */
export const createDialRenderer = ({
  props,
  format,
  labels,
  scale,
  selection,
  roles,
  moves,
  emitGroup,
}: DialRenderInputs): ((entity: () => Entity) => JSX.Element) => {
  const { domain, dialHeight, step, keyStep, measureDial } = scale;
  const { isSelected, toggleSelection } = selection;
  const { slotById, grouped, isOpen, toggleGroup, shiftTo, typeGroup } = roles;

  /** A collapsed role group's one dial (groupDial.tsx). */
  const renderGroupDial = (slot: () => GroupSlot): JSX.Element => (
    <GroupDial
      entity={slot().entity}
      members={slot().members}
      groupLabel={slot().group.label}
      open={isOpen(slot().group.id)}
      onToggle={() => toggleGroup(slot().group.id)}
      onShift={(value, how) => shiftTo(slot(), value, how)}
      // Each present member where it stands: a zero shift.
      onSettle={() => emitGroup(shiftGroup(slot().members, 0, 0), "commit")}
      onReset={
        props.onReset
          ? () => emitGroup(resetGroup(slot().members), "both")
          : undefined
      }
      onType={
        props.precision === undefined
          ? undefined
          : (text) => typeGroup(slot(), text)
      }
      domain={domain()}
      height={dialHeight()}
      format={format}
      labels={labels()}
      readout={props.readout}
      snap={props.snap}
      dragStep={step()}
      keyStep={keyStep()}
      onMeasure={measureDial}
    />
  );

  /**
   * The line under a name in a grouped row: a group of one's person, and an
   * empty line everywhere else, so every dial in the row is the same height.
   */
  const noteOf = (id: string): string | undefined => {
    if (!grouped()) return undefined;
    const slot = slotById().get(id);
    return slot?.kind === "member" && slot.solo ? slot.name : "";
  };

  /** One entity's own dial. */
  const renderEntityDial = (entity: () => Entity): JSX.Element => (
    <MutationDial
      entity={entity()}
      domain={domain()}
      // ONE height feeds everything: the viewBox, the track path, AND
      // every value→y mapping behind the range, the arrows, the change
      // line and the delta label. Omitting it left those five at the
      // 260px default while the track and the viewBox were at the
      // measured height, so the bands and arrows bunched into the top
      // third of a tall dial and the pointer disagreed with all of them.
      height={dialHeight()}
      format={format}
      labels={labels()}
      readout={props.readout}
      snap={props.snap}
      dragStep={step()}
      keyStep={keyStep()}
      selected={isSelected(entity().id)}
      onSelect={() => toggleSelection(entity().id)}
      onMeasure={measureDial}
      onMove={(value) => moves.move(entity(), value, false)}
      onCommit={(value) => moves.move(entity(), value, true)}
      onRemove={
        props.onRemove ? () => props.onRemove?.(entity().id) : undefined
      }
      onRestore={
        props.onRestore ? () => props.onRestore?.(entity().id) : undefined
      }
      onType={
        props.precision === undefined
          ? undefined
          : (text) => moves.typeIn(entity(), text)
      }
      onReset={props.onReset ? () => moves.resetDial(entity()) : undefined}
      onLink={
        props.grouping === "link"
          ? () => toggleSelection(entity().id)
          : undefined
      }
      linked={props.grouping === "link" && isSelected(entity().id)}
      note={noteOf(entity().id)}
    />
  );

  return (entity: () => Entity): JSX.Element => {
    const groupSlot = (): GroupSlot | undefined => {
      const slot = slotById().get(entity().id);
      return slot?.kind === "group" ? slot : undefined;
    };
    return (
      <Show when={groupSlot()} fallback={renderEntityDial(entity)}>
        {(slot) => renderGroupDial(slot)}
      </Show>
    );
  };
};
