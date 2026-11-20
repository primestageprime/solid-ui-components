// ============================================
// WeightedGroupCard — Composite (Depth 3)
// Tags: shows:field, shows:number, shows:diff, does:drag, does:edit, does:expand, data:grouped, role:panel
//
// ZERO CSS AND ZERO INTRINSIC ELEMENTS (Peter's axiom: no component above
// Depth 1 contains anything but existing SUI components). Every column is the
// private `MutationDial` (MutationSliders/dial.tsx); the count button is
// `FieldHeightGhostButton`, the count field `CountInput100` at `size="sm"`
// (both PINNED to 29px, so the two kinds of column line up), the corner button
// `DisclosureButton` + `Icon`, the range editor `createRangeDialog`, the row
// `TopClusterRow`.
//
// ── WHY IT EXISTS (the push-back protocol, answered) ───────────────────────
//
// Peter's role-card sketch, 2026-11-20: Carpenters is Gerald ×2 and Jen ×1.
//   1. No existing component draws a group whose dial is READ-ONLY and sits
//      at its members' COUNT-WEIGHTED mean, with counted members and a
//      "×3 = $186K" total. `MutationSliders`' role groups (groupDial.tsx) are
//      the nearest, and they are the opposite gesture: the group dial is
//      DRAGGED and shifts its members, and its mean is unweighted.
//   2. Its consumer is Thorcasting's roles UX ("editing roles with counts").
//   3. A sibling, not a change to the row: re-expressing role groups this way
//      would change what a live consumer's drag does. Additive — nothing here
//      deprecates anything there.
//
// ── WHAT THE SKETCH ASKS, AND WHERE EACH PART LIVES ───────────────────────
//
//   • the role's NAME opens a min/max dialog for the role's range;
//   • the COUNT is read-only, the members' counts summed, and pressing it
//     expands the card; pressing it again, or the corner button, collapses it;
//   • the group's dial and amount are READ-ONLY: the weighted mean;
//   • the group's Reset puts back the whole set, a member's Reset only that
//     member (weighted.ts);
//   • each member has its own count field, dial, total and Remove;
//   • every dial shares ONE height and ONE scale (the role's range), so the
//     tracks start and end on the same pixel rows. That is by construction:
//     one `height` signal, one `domain`, and every column's header is a name
//     line plus a 29px control.
// ============================================
import {
  type Component,
  type JSX,
  Index,
  Show,
  createSignal,
  mergeProps,
} from "solid-js";
import { Dynamic } from "solid-js/web";
import { DisclosureButton, FieldHeightGhostButton } from "../Button";
import { type RangeDialogLabels, createRangeDialog } from "../ChartFrame";
import { CountInput100 } from "../CurrencyInput";
import { Icon } from "../Icon";
import { TopClusterRow } from "../Layout";
import {
  type Domain,
  type Entity,
  dialHeightFor,
  dragStep,
  niceStep,
} from "../MarkedSlider/geometry";
import { MutationDial } from "../MutationSliders/dial";
import { type MutationSliderLabels, resolveLabels } from "../MutationSliders/labels";
import type { ReadoutMode } from "../MutationSliders/readouts";
import { settleTyped } from "../MutationSliders/typed";
import {
  type CountedMember,
  type WeightedGroup,
  groupEntity,
  headcount,
  isChanged,
  memberTotal,
  removeMember,
  resetAll,
  resetMember,
  restoreMember,
  setCount,
  setRange,
  setValue,
  total,
} from "./weighted";

export interface WeightedGroupCardProps {
  /** The role and its counted members. Controlled. */
  group: WeightedGroup;
  /** Every edit, as the next group. */
  onChange: (next: WeightedGroup) => void;
  /** The unit every amount and total prints in. */
  format: (value: number) => string;
  /** Whether the card starts showing each member. Default closed. */
  defaultOpen?: boolean;
  /** Where each dial prints its figures (MutationSliders/readouts.ts). Default
   *  `"beside"`: the prior and the change on the drawing, as Thorcasting does. */
  readout?: ReadoutMode;
  /** The grid a member's amount lands on, or omitted for a continuous drag. */
  snap?: number;
  /**
   * Supplied, a member's amount is a field you can type into, rounded to this
   * power of ten (`-3`: the thousand). Omitted, it is a readout.
   */
  precision?: number;
  /** Which input the range dialog's bounds are typed in. Default currency. */
  rangeField?: "currency" | "number";
  /** The footer's verbs and the new-member word. */
  labels?: MutationSliderLabels;
}

/** The range dialog's words. The role's range, not a chart's axis. */
const RANGE_LABELS: RangeDialogLabels = {
  title: "Set the range",
  description: "Every amount in this role stays inside it.",
  confirm: "Set range",
  max: "Max",
  min: "Min",
  notANumber: "Enter a number",
  notAboveMin: "Max must be greater than min",
};

/** One dialog per field kind, curried once rather than per render. */
const RANGE_DIALOGS = {
  currency: createRangeDialog({ labels: RANGE_LABELS }),
  number: createRangeDialog({ labels: RANGE_LABELS, field: "number" }),
} as const;

/** "×3 = $186K", or "×3 = —" with nothing to total. */
const footnoteOf = (
  count: number,
  amount: number | null,
  format: (value: number) => string,
): string => `×${count} = ${amount === null ? "—" : format(amount)}`;

/** A member as the dial draws it: on the group's range. */
const memberEntity = (member: CountedMember, range: Domain): Entity => ({
  id: member.id,
  label: member.label,
  old: member.old,
  value: member.value,
  range,
});

export const WeightedGroupCard: Component<WeightedGroupCardProps> = (props) => {
  const [open, setOpen] = createSignal(props.defaultOpen ?? false);
  const [dialogOpen, setDialogOpen] = createSignal(false);
  // Every dial in the card is the same height, so ONE signal serves them all;
  // a zero reading is no measurement (jsdom), as in MutationSliders/scale.ts.
  const [measured, setMeasured] = createSignal(0);
  const measure = (height: number): void => {
    if (height > 0) setMeasured(height);
  };
  const height = (): number => dialHeightFor(measured());

  const labels = () => resolveLabels(props.labels);
  const domain = (): Domain => props.group.range;
  const step = (): number => props.snap ?? dragStep(domain());
  const keyStep = (): number => Math.max(niceStep(domain()), props.snap ?? 0);

  const members = (next: readonly CountedMember[]): void =>
    props.onChange({ ...props.group, members: next });
  const amount = (id: string, value: number): void =>
    props.onChange(setValue(props.group, id, value));

  const typed = (id: string, text: string): void => {
    const precision = props.precision;
    if (precision === undefined) return;
    const [min, max] = domain();
    const value = settleTyped(text, { min, max, precision });
    if (value !== null) amount(id, value);
  };

  const count = (): number => headcount(props.group.members);

  /** The count, as the button that opens and closes the card. */
  const countButton = (): JSX.Element => (
    <FieldHeightGhostButton
      aria-expanded={open()}
      aria-label={`${open() ? "Hide each" : "Show each"} ${props.group.label} (${count()})`}
      title={open() ? "Hide each" : "Show each"}
      onClick={() => setOpen(!open())}
    >
      {String(count())}
    </FieldHeightGhostButton>
  );

  /** A member's count, as the field that edits it. */
  const countField = (m: () => CountedMember): JSX.Element => (
    <CountInput100
      name={`${m().id}-count`}
      aria-label={`${m().label} count`}
      size="sm"
      min={1}
      value={() => m().count}
      onChange={(next) => {
        if (next !== undefined) members(setCount(props.group.members, m().id, next));
      }}
    />
  );

  const group = (): JSX.Element => (
    <MutationDial
      entity={groupEntity(props.group)}
      domain={domain()}
      height={height()}
      format={props.format}
      labels={labels()}
      readout={props.readout ?? "beside"}
      dragStep={step()}
      keyStep={keyStep()}
      selected={false}
      readOnly={true}
      nameAction={{
        label: `Edit range for ${props.group.label}`,
        act: () => setDialogOpen(true),
      }}
      subheader={countButton()}
      footnote={footnoteOf(count(), total(props.group.members), props.format)}
      onMeasure={measure}
      onMove={() => undefined}
      onCommit={() => undefined}
      onReset={() => members(resetAll(props.group.members))}
      resetOnly={true}
      changed={isChanged(props.group.members)}
    />
  );

  const member = (m: () => CountedMember): JSX.Element => (
    <MutationDial
      entity={memberEntity(m(), domain())}
      domain={domain()}
      height={height()}
      format={props.format}
      labels={labels()}
      readout={props.readout ?? "beside"}
      snap={props.snap}
      dragStep={step()}
      keyStep={keyStep()}
      selected={false}
      subheader={countField(m)}
      footnote={footnoteOf(m().count, memberTotal(m()), props.format)}
      onMeasure={measure}
      onMove={(value) => amount(m().id, value)}
      onCommit={(value) => amount(m().id, value)}
      onType={
        props.precision === undefined ? undefined : (text) => typed(m().id, text)
      }
      onReset={() => members(resetMember(props.group.members, m().id))}
      onRemove={() => members(removeMember(props.group.members, m().id))}
      onRestore={() => members(restoreMember(props.group.members, m().id))}
    />
  );

  return (
    <>
      <TopClusterRow>
        {group()}
        <Show when={open()}>
          <Index each={props.group.members}>{(m) => member(m)}</Index>
          <DisclosureButton
            aria-label={`Collapse ${props.group.label}`}
            title="Collapse"
            onClick={() => setOpen(false)}
          >
            <Icon name="shrink" size="sm" />
          </DisclosureButton>
        </Show>
      </TopClusterRow>
      <Dynamic
        component={RANGE_DIALOGS[props.rangeField ?? "currency"]}
        open={dialogOpen()}
        lock={props.group.range}
        onLock={(range: Domain) => {
          props.onChange(setRange(props.group, range));
          setDialogOpen(false);
        }}
        onClose={() => setDialogOpen(false)}
      />
    </>
  );
};

/** Props that are visual/static overrides — locked at variant-definition time. */
export type WeightedGroupCardOverrides = Pick<
  WeightedGroupCardProps,
  "format" | "readout" | "snap" | "precision" | "rangeField" | "labels"
>;

/** Props that remain available to consumers of a curried WeightedGroupCard variant. */
export type WeightedGroupCardDataProps = Omit<
  WeightedGroupCardProps,
  keyof WeightedGroupCardOverrides
>;

export function createWeightedGroupCard(
  defaults: WeightedGroupCardOverrides,
): Component<WeightedGroupCardDataProps> {
  return (props) => <WeightedGroupCard {...mergeProps(defaults, props)} />;
}
