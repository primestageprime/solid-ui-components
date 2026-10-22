// ============================================
// GroupDial — a collapsed ROLE GROUP's one dial. Composite (Depth 3), private
// to MutationSliders.
//
// ZERO CSS AND ZERO INTRINSIC ELEMENTS, like the dial it wraps: the column is
// `MutationDial`, the chevron is `DisclosureButton` + `Icon` (`flipped` turns
// it 180° when the group is open, with the Icon's own transition).
//
// Lowercase filename for the same reason as dial.tsx: a PascalCase `.tsx`
// here would register as a published component owing a showcase.
//
// WHAT THIS OWNS: the words and the gesture of a group dial. The header is
// "Roofer × 3" with the chevron beside it; the note under it is the spread
// ("avg · $40K–$60K") when the members differ, and "N new" when some are new.
// A drag or a key press reports a SHIFT target to the row (groups.ts,
// `shiftGroup`), and the row fans it out to every member.
//
// ONE GESTURE, ONE SHIFT. A key press arrives as a move and then a commit at
// the SAME value. After the move the members are already shifted, and their
// new mean can differ from that value when a member stopped at its band
// edge — so a commit at the value the last move reached only SETTLES the
// members where they are, and never shifts them a second time.
//
// A DRAG IS MEASURED FROM ITS START (groups.ts, `dragGroup`). The pointer
// going down takes a snapshot of the members; every move of that drag places
// each member from its snapshot, never from where the last move left it, so a
// member stopped at the floor cannot drag the others' starting point down.
// A key step has no snapshot and shifts from the members as they stand.
//
// KOBALTE ECHOES each pointer move: after `onChange(target)` it calls
// `onChange` again with the slider's current value — the group mean this row
// just recomputed. A move to the value the dial already shows is that echo,
// and it moves nothing; read as a target it would pull the members back
// toward the mean on every tick.
// ============================================
import type { Component, JSX } from "solid-js";
import { DisclosureButton } from "../Button";
import { Icon } from "../Icon";
import type { Domain, Entity } from "../MarkedSlider/geometry";
import { MutationDial } from "./dial";
import { type GroupDragStart, newCount, resetGroup, spreadOf } from "./groups";
import type { ResolvedLabels } from "./labels";
import type { ReadoutMode } from "./readouts";

export interface GroupDialProps {
  /** The aggregate entity (groups.ts, `groupEntity`). */
  entity: Entity;
  /** The group's members, in row order. */
  members: readonly Entity[];
  /** The group's own label, without " × N" — for the chevron's words. */
  groupLabel: string;
  /** Whether the members' own dials are showing. */
  open: boolean;
  /** The chevron was pressed. */
  onToggle: () => void;
  /**
   * Shift every member so the group's mean moves to `value` — from `start`
   * during a drag, from the members as they stand for a key step.
   */
  onShift: (
    value: number,
    how: "change" | "both",
    start?: GroupDragStart,
  ) => void;
  /** Commit every member where it stands (`onChangeEnd` only). */
  onSettle: () => void;
  /** Put every changed member back on its old amount. Omitted, no Reset. */
  onReset?: () => void;
  /** A typed figure for the group's mean. Omitted, the amount is static. */
  onType?: (text: string) => void;
  domain: Domain;
  height: number;
  format: (value: number) => string;
  labels: ResolvedLabels;
  readout?: ReadoutMode;
  snap?: number;
  dragStep: number;
  keyStep: number;
  onMeasure: (height: number) => void;
}

export const GroupDial: Component<GroupDialProps> = (props) => {
  /** The value the last move reached — see ONE GESTURE, ONE SHIFT above. */
  let reached: number | null = null;
  /** The members when the pointer went down; `null` outside a drag. */
  let start: GroupDragStart | null = null;

  const fresh = (): number => newCount(props.members);

  /** The muted line under the header. */
  const note = (): string => {
    const spread = spreadOf(props.members);
    const parts = [
      ...(spread && spread.lo !== spread.hi
        ? [`avg · ${props.format(spread.lo)}–${props.format(spread.hi)}`]
        : []),
      ...(fresh() > 0 && fresh() < props.members.length
        ? [`${fresh()} ${props.labels.new.toLowerCase()}`]
        : []),
    ];
    return parts.join(" · ");
  };

  /** "3 new" in place of "New" when every member of a group is new. */
  const labels = (): ResolvedLabels =>
    fresh() > 1
      ? { ...props.labels, new: `${fresh()} ${props.labels.new.toLowerCase()}` }
      : props.labels;

  const chevron = (): JSX.Element => (
    <DisclosureButton
      aria-expanded={props.open}
      aria-label={`${props.open ? "Collapse" : "Show each"} ${props.groupLabel}`}
      title={props.open ? "Collapse" : "Show each"}
      onClick={() => props.onToggle()}
    >
      <Icon name="chevron-right" size="sm" flipped={props.open} />
    </DisclosureButton>
  );

  return (
    <MutationDial
      entity={props.entity}
      domain={props.domain}
      height={props.height}
      format={props.format}
      labels={labels()}
      readout={props.readout}
      snap={props.snap}
      dragStep={props.dragStep}
      keyStep={props.keyStep}
      selected={false}
      headerAction={chevron()}
      note={note()}
      onMeasure={props.onMeasure}
      onDragStart={() => {
        const from = props.entity.value;
        start = from === null ? null : { members: props.members, from };
      }}
      onMove={(value) => {
        if (value === props.entity.value) return;
        reached = value;
        props.onShift(value, "change", start ?? undefined);
      }}
      onCommit={(value) => {
        if (reached === value || value === props.entity.value) {
          props.onSettle();
        } else props.onShift(value, "both", start ?? undefined);
        reached = null;
        start = null;
      }}
      onType={props.onType}
      onReset={props.onReset}
      resetOnly={true}
      changed={resetGroup(props.members).length > 0}
    />
  );
};
