// SUI's WeightedGroupCard (the role card from Peter's sketch), as React
// markup. The model is SUI's own `weighted.ts`, imported unchanged; the
// columns are the mirror's `MutationDial`, the count field its
// `CountInput100`, the buttons and the row SUI's own variant tables.
//
// It keeps SUI's one piece of local state, whether the card is open, so a
// canvas can press the count to open and close it. Every edit is reported as
// the next group through `onChange`, computed by SUI's model; nothing drags
// or takes keys (the mirror draws a state). The range dialog the role's name
// opens is not drawn yet: the name is the same button, and pressing it does
// nothing here.
import { type ReactElement, useState } from "react";
import { DisclosureButton, FieldHeightGhostButton } from "sui:Button/variants";
import { TopClusterRow } from "sui:Layout/variants";
import {
  type Domain,
  type Entity,
  dialHeightFor,
  dragStep,
  niceStep,
} from "sui:MarkedSlider/geometry";
import {
  type MutationSliderLabels,
  resolveLabels,
} from "sui:MutationSliders/labels";
import type { ReadoutMode } from "sui:MutationSliders/readouts";
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
  setValue,
  total,
} from "sui:WeightedGroupCard/weighted";
import { Icon } from "./Icon.tsx";
import { MutationDial } from "./MutationDial.tsx";
import { CountInput100 } from "./NumberInput.tsx";

export interface WeightedGroupCardProps {
  readonly group: WeightedGroup;
  readonly onChange?: (next: WeightedGroup) => void;
  readonly format: (value: number) => string;
  readonly defaultOpen?: boolean;
  readonly readout?: ReadoutMode;
  readonly snap?: number;
  readonly precision?: number;
  readonly rangeField?: "currency" | "number";
  readonly labels?: MutationSliderLabels;
  /** The dial height to draw at, in px. Default SUI's floor for an unmeasured row. */
  readonly height?: number;
}

/** "×3 = $186K", or "×3 = —" with nothing to total. As SUI writes it. */
export const footnoteOf = (
  count: number,
  amount: number | null,
  format: (value: number) => string,
): string => `×${count} = ${amount === null ? "—" : format(amount)}`;

const memberEntity = (member: CountedMember, range: Domain): Entity => ({
  id: member.id,
  label: member.label,
  old: member.old,
  value: member.value,
  range,
});

const noop = (): void => undefined;

export const WeightedGroupCard = (
  props: WeightedGroupCardProps,
): ReactElement => {
  const [open, setOpen] = useState(props.defaultOpen ?? false);
  const { group, format } = props;
  const labels = resolveLabels(props.labels);
  const domain = group.range;
  const height = props.height ?? dialHeightFor(0);
  const step = props.snap ?? dragStep(domain);
  const keyStep = Math.max(niceStep(domain), props.snap ?? 0);
  const readout = props.readout ?? "beside";
  const count = headcount(group.members);
  const report = (next: WeightedGroup): void => props.onChange?.(next);
  const members = (next: readonly CountedMember[]): void =>
    report({ ...group, members: next });

  const shared = {
    domain,
    height,
    format,
    labels,
    readout,
    dragStep: step,
    keyStep,
    selected: false,
  } as const;

  return (
    <TopClusterRow>
      <MutationDial
        {...shared}
        entity={groupEntity(group)}
        readOnly
        nameAction={{ label: `Edit range for ${group.label}`, act: noop }}
        subheader={
          <FieldHeightGhostButton
            aria-expanded={open}
            aria-label={`${open ? "Hide each" : "Show each"} ${group.label} (${count})`}
            title={open ? "Hide each" : "Show each"}
            onClick={() => setOpen(!open)}
          >
            {String(count)}
          </FieldHeightGhostButton>
        }
        footnote={footnoteOf(count, total(group.members), format)}
        onReset={() => members(resetAll(group.members))}
        resetOnly
        changed={isChanged(group.members)}
      />
      {open &&
        group.members.map((m) => (
          <MutationDial
            key={m.id}
            {...shared}
            entity={memberEntity(m, domain)}
            snap={props.snap}
            subheader={
              <CountInput100
                name={`${m.id}-count`}
                aria-label={`${m.label} count`}
                size="sm"
                min={1}
                value={() => m.count}
                onChange={(next) => {
                  if (next !== undefined)
                    members(setCount(group.members, m.id, next));
                }}
              />
            }
            footnote={footnoteOf(m.count, memberTotal(m), format)}
            onMove={(value) => report(setValue(group, m.id, value))}
            onCommit={(value) => report(setValue(group, m.id, value))}
            onType={props.precision === undefined ? undefined : noop}
            onReset={() => members(resetMember(group.members, m.id))}
            onRemove={() => members(removeMember(group.members, m.id))}
            onRestore={() => members(restoreMember(group.members, m.id))}
          />
        ))}
      {open && (
        <DisclosureButton
          aria-label={`Collapse ${group.label}`}
          title="Collapse"
          onClick={() => setOpen(false)}
        >
          <Icon name="shrink" size="sm" />
        </DisclosureButton>
      )}
    </TopClusterRow>
  );
};
