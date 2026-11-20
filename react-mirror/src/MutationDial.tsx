// The role card's two dials, SUI's MutationDial (dial.tsx) and GroupDial
// (groupDial.tsx), as React markup. SUI keeps them private to MutationSliders;
// the mirror names them so a canvas can lay out one card. They draw a state:
// every callback is optional and only reports the press, as SUI's do.
// Two things are left out: the name is never shortened to fit (SUI measures
// the font after mount; the CSS ellipsis still applies), and the link button
// shows only while linked (SUI also reveals it on hover and focus).
import type { ReactElement, ReactNode } from "react";
import {
  DisclosureButton,
  GlyphSlotGhostButton,
  PressableLabelButton,
  ReservedGlyphSlotButton,
} from "sui:Button/variants";
import { DialStack, TightClusterRow } from "sui:Layout/variants";
import {
  type Domain,
  type Entity,
  dialGeometry,
} from "sui:MarkedSlider/geometry";
import { newCount, resetGroup, spreadOf } from "sui:MutationSliders/groups";
import {
  DEFAULT_LABELS,
  type ResolvedLabels,
} from "sui:MutationSliders/labels";
import { type ReadoutMode, readoutsOf } from "sui:MutationSliders/readouts";
import {
  EllipsisLabel,
  EllipsisMonoMeta,
  EllipsisMonoValue,
  ReservedEllipsisMonoMeta,
} from "sui:Text/variants";
import { Icon } from "./Icon.tsx";
import { MarkedSlider } from "./MarkedSlider.tsx";
import { SliderField } from "./SliderField.tsx";

const NBSP = " ";
const DELETE_MARK = "⊗";

export interface MutationDialProps {
  readonly entity: Entity;
  readonly domain: Domain;
  readonly height: number;
  readonly format: (value: number) => string;
  readonly labels?: ResolvedLabels;
  readonly readout?: ReadoutMode;
  readonly snap?: number;
  readonly dragStep: number;
  readonly keyStep: number;
  readonly selected: boolean;
  readonly onSelect?: () => void;
  readonly headerAction?: ReactNode;
  readonly note?: string;
  readonly resetOnly?: boolean;
  readonly changed?: boolean;
  readonly onMeasure?: (height: number) => void;
  readonly onDragStart?: () => void;
  readonly onMove?: (value: number) => void;
  readonly onCommit?: (value: number) => void;
  readonly onRemove?: () => void;
  readonly onRestore?: () => void;
  readonly onType?: (text: string) => void;
  readonly onReset?: () => void;
  readonly onLink?: () => void;
  readonly linked?: boolean;
}

/** A meta line; a reserved (hidden, space-holding) line when it has nothing to say. */
const Meta = (props: { readonly text: string }): ReactElement =>
  props.text === "" ? (
    <ReservedEllipsisMonoMeta>{NBSP}</ReservedEllipsisMonoMeta>
  ) : (
    <EllipsisMonoMeta title={props.text}>{props.text}</EllipsisMonoMeta>
  );

const ResetButton = (props: {
  readonly label: string;
  readonly changed: boolean;
  readonly onReset: () => void;
}): ReactElement => (
  <GlyphSlotGhostButton
    aria-label={`Reset ${props.label}`}
    title="Reset"
    disabled={!props.changed}
    onClick={props.onReset}
  >
    <Icon name="refresh" size="sm" />
  </GlyphSlotGhostButton>
);

export const MutationDial = (props: MutationDialProps): ReactElement => {
  const labels = props.labels ?? DEFAULT_LABELS;
  const { entity } = props;
  const dial = dialGeometry(props.domain, entity, props.height);
  const readouts = readoutsOf(
    props.readout ?? "stacked",
    dial,
    props.format,
    labels,
  );
  const changed =
    props.changed ?? (dial.isNew || dial.clampedOld !== dial.clampedValue);

  const nameLabel = (
    <EllipsisLabel data-dial-name="" title={entity.label}>
      {entity.label}
    </EllipsisLabel>
  );
  const name = props.onSelect ? (
    <PressableLabelButton
      active={props.selected}
      aria-pressed={props.selected}
      data-struck={dial.removed ? "" : undefined}
      onClick={props.onSelect}
    >
      {nameLabel}
    </PressableLabelButton>
  ) : (
    nameLabel
  );

  const footer = dial.removed
    ? props.onRestore && {
        label: `${labels.restore} ${entity.label}`,
        glyph: <Icon name="undo" size="sm" />,
        act: props.onRestore,
      }
    : props.onRemove && {
        label: `${labels.remove} ${entity.label}`,
        glyph: DELETE_MARK,
        act: props.onRemove,
      };

  const single = footer ? (
    <GlyphSlotGhostButton aria-label={footer.label} onClick={footer.act}>
      {footer.glyph}
    </GlyphSlotGhostButton>
  ) : (
    <ReservedGlyphSlotButton disabled aria-hidden="true">
      {DELETE_MARK}
    </ReservedGlyphSlotButton>
  );

  const linkMark = <Icon name="link" size="sm" />;

  const lastSlot = (): ReactNode => {
    if (props.onReset && props.onRemove && !dial.removed && !props.resetOnly) {
      return (
        <TightClusterRow>
          <ResetButton
            label={entity.label}
            changed={changed}
            onReset={props.onReset}
          />
          <GlyphSlotGhostButton
            aria-label={`${labels.remove} ${entity.label}`}
            title={labels.remove}
            onClick={props.onRemove}
          >
            {DELETE_MARK}
          </GlyphSlotGhostButton>
        </TightClusterRow>
      );
    }
    if (props.resetOnly && props.onReset && !dial.removed) {
      return (
        <ResetButton
          label={entity.label}
          changed={changed}
          onReset={props.onReset}
        />
      );
    }
    return single;
  };

  return (
    <DialStack>
      {props.headerAction ? (
        <TightClusterRow>
          {name}
          {props.headerAction}
        </TightClusterRow>
      ) : (
        name
      )}
      {props.note !== undefined && <Meta text={props.note} />}
      {props.onLink &&
        (props.linked === true ? (
          <GlyphSlotGhostButton
            active
            aria-pressed
            aria-label={`Unlink ${entity.label}`}
            title="Unlink"
            onClick={props.onLink}
          >
            {linkMark}
          </GlyphSlotGhostButton>
        ) : (
          <ReservedGlyphSlotButton disabled aria-hidden="true">
            {linkMark}
          </ReservedGlyphSlotButton>
        ))}
      <MarkedSlider
        domain={props.domain}
        range={dial.range}
        value={entity.value}
        prior={entity.old}
        height={props.height}
        snap={props.snap}
        dragStep={props.dragStep}
        keyStep={props.keyStep}
        label={entity.label}
        valueText={readouts.value}
        deltaLabel={readouts.deltaLabel}
        priorLabel={readouts.priorLabel}
        active={props.selected}
      />
      {props.onType !== undefined && !dial.removed ? (
        <SliderField
          label={`${entity.label} amount`}
          value={readouts.value}
          editValue={String(dial.clampedValue ?? "")}
          onCommit={props.onType}
        />
      ) : (
        <EllipsisMonoValue title={readouts.value}>
          {readouts.value}
        </EllipsisMonoValue>
      )}
      <Meta text={readouts.meta} />
      {lastSlot()}
    </DialStack>
  );
};

export interface GroupDialProps {
  readonly entity: Entity;
  readonly members: readonly Entity[];
  readonly groupLabel: string;
  readonly open: boolean;
  readonly onToggle?: () => void;
  readonly onReset?: () => void;
  readonly onType?: (text: string) => void;
  readonly domain: Domain;
  readonly height: number;
  readonly format: (value: number) => string;
  readonly labels?: ResolvedLabels;
  readonly readout?: ReadoutMode;
  readonly snap?: number;
  readonly dragStep: number;
  readonly keyStep: number;
}

/** "avg · $40K–$90K · 2 new": the spread when members differ, the new count when some are new. */
export const groupNote = (
  members: readonly Entity[],
  format: (value: number) => string,
  newLabel: string,
): string => {
  const spread = spreadOf(members);
  const fresh = newCount(members);
  return [
    ...(spread && spread.lo !== spread.hi
      ? [`avg · ${format(spread.lo)}–${format(spread.hi)}`]
      : []),
    ...(fresh > 0 && fresh < members.length
      ? [`${fresh} ${newLabel.toLowerCase()}`]
      : []),
  ].join(" · ");
};

export const GroupDial = (props: GroupDialProps): ReactElement => {
  const base = props.labels ?? DEFAULT_LABELS;
  const fresh = newCount(props.members);
  const labels =
    fresh > 1 ? { ...base, new: `${fresh} ${base.new.toLowerCase()}` } : base;
  return (
    <MutationDial
      entity={props.entity}
      domain={props.domain}
      height={props.height}
      format={props.format}
      labels={labels}
      readout={props.readout}
      snap={props.snap}
      dragStep={props.dragStep}
      keyStep={props.keyStep}
      selected={false}
      headerAction={
        <DisclosureButton
          aria-expanded={props.open}
          aria-label={`${props.open ? "Collapse" : "Show each"} ${props.groupLabel}`}
          title={props.open ? "Collapse" : "Show each"}
          onClick={props.onToggle}
        >
          <Icon name="chevron-right" size="sm" flipped={props.open} />
        </DisclosureButton>
      }
      note={groupNote(props.members, props.format, base.new)}
      onType={props.onType}
      onReset={props.onReset}
      resetOnly
      changed={resetGroup(props.members).length > 0}
    />
  );
};
