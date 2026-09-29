// ============================================
// The calendar's two cards — COMPOSED from SUI, no CSS of its own.
//
//   HolidayCard  one date: a name, a "Fixed date | Weekday of month" endpoint,
//                and its 2026 and 2027 occurrences.
//   RangeCard    a start and an end, each its own endpoint, its 2026 and 2027
//                occurrences, its 2026 segments, and a "Crosses New Year" tag
//                when the end falls before the start.
//
// Each card carries a picker for WHICH holiday / range it edits.
//   CompactSurface (the card) · SpreadRow / TightStack (layout) · NameInput ·
//   CompactDropdown via ChoiceDropdown · WhenEditor · WarningBadge
// ============================================
import type { Component, JSX } from "solid-js";
import {
  CompactSurface,
  MonoMeta,
  NameInput,
  SpreadRow,
  TextLabel,
  TextSublabel,
  TightStack,
  WarningBadge,
  MonoValue,
  fn,
} from "../../../../src";
import {
  type Holiday,
  type Occurrence,
  type Range,
  type When,
  displayName,
  holidaysOf,
  occurrence,
  rangesOf,
  segmentsText,
  shortOf,
  spanDays,
  weekdayShortOf,
  whenText,
  type Period,
} from "../seasonal-builder-model";
import { ChoiceDropdown } from "./fields";
import { WhenEditor } from "./when-editor";

const { map } = fn;

/** A row of the card's foot: the year, what it resolves to, how long it lasts. */
const Occ: Component<{
  readonly year: number;
  readonly text: string;
  readonly len: string;
}> = (props) => (
  <SpreadRow>
    <TextSublabel>{props.year}</TextSublabel>
    <MonoValue>{props.text}</MonoValue>
    <MonoMeta>{props.len}</MonoMeta>
  </SpreadRow>
);

const plural = (n: number, word: string): string =>
  `${n} ${word}${n === 1 ? "" : "s"}`;

const Picker: Component<{
  readonly periods: readonly Period[];
  readonly value: string;
  readonly onPick: (id: string) => void;
}> = (props) => (
  <ChoiceDropdown
    items={map(
      (p: Period) => ({ value: p.id, label: displayName(p) }),
      props.periods,
    )}
    value={props.value}
    onChange={props.onPick}
  />
);

const Endpoint: Component<{
  readonly caption: string;
  readonly detail: string;
  readonly children: JSX.Element;
}> = (props) => (
  <TightStack>
    <SpreadRow>
      <TextSublabel>{props.caption}</TextSublabel>
      <MonoMeta>{props.detail}</MonoMeta>
    </SpreadRow>
    {props.children}
  </TightStack>
);

export const HolidayCard: Component<{
  readonly holiday: Holiday;
  readonly periods: readonly Period[];
  readonly onPick: (id: string) => void;
  readonly onChange: (next: Holiday) => void;
}> = (props) => {
  const at = (y: number): Occurrence => occurrence(props.holiday, y);
  const row = (y: number) => (
    <Occ
      year={y}
      text={weekdayShortOf(at(y).a)}
      len={`1 day · ends ${shortOf(at(y).e)}`}
    />
  );
  return (
    <CompactSurface>
      <TightStack>
        <SpreadRow>
          <TextLabel>Holiday · one date</TextLabel>
          <Picker
            periods={holidaysOf(props.periods)}
            value={props.holiday.id}
            onPick={props.onPick}
          />
        </SpreadRow>
        <NameInput
          aria-label="Holiday name"
          value={props.holiday.name}
          onInput={(e) =>
            props.onChange({ ...props.holiday, name: e.currentTarget.value })
          }
        />
        <Endpoint
          caption="On"
          detail={`${whenText(props.holiday.on)}, every year`}
        >
          <WhenEditor
            id="holiday-on"
            label="date"
            when={props.holiday.on}
            onChange={(on: When) => props.onChange({ ...props.holiday, on })}
          />
        </Endpoint>
        {row(2026)}
        {row(2027)}
      </TightStack>
    </CompactSurface>
  );
};

export const RangeCard: Component<{
  readonly range: Range;
  readonly periods: readonly Period[];
  readonly onPick: (id: string) => void;
  readonly onChange: (next: Range) => void;
}> = (props) => {
  const row = (y: number) => {
    const o = occurrence(props.range, y);
    return (
      <Occ
        year={y}
        text={`${weekdayShortOf(o.a)} → ${weekdayShortOf(o.e)}`}
        len={plural(spanDays(o), "day")}
      />
    );
  };
  const crosses = () => occurrence(props.range, 2026).crosses;
  return (
    <CompactSurface>
      <TightStack>
        <SpreadRow>
          <TextLabel>Range · start to end</TextLabel>
          <Picker
            periods={rangesOf(props.periods)}
            value={props.range.id}
            onPick={props.onPick}
          />
        </SpreadRow>
        <NameInput
          aria-label="Range name"
          value={props.range.name}
          onInput={(e) =>
            props.onChange({ ...props.range, name: e.currentTarget.value })
          }
        />
        <Endpoint caption="Starts" detail={whenText(props.range.start)}>
          <WhenEditor
            id="range-start"
            label="start"
            when={props.range.start}
            onChange={(start: When) =>
              props.onChange({ ...props.range, start })
            }
          />
        </Endpoint>
        <Endpoint
          caption="Ends"
          detail={`${whenText(props.range.end)}${crosses() ? " · the next year" : ""}`}
        >
          <WhenEditor
            id="range-end"
            label="end"
            when={props.range.end}
            onChange={(end: When) => props.onChange({ ...props.range, end })}
          />
        </Endpoint>
        {row(2026)}
        {row(2027)}
        <SpreadRow>
          <TextSublabel>{`In 2026: ${segmentsText(props.range)}`}</TextSublabel>
          {crosses() ? <WarningBadge label="Crosses New Year" /> : null}
        </SpreadRow>
      </TightStack>
    </CompactSurface>
  );
};
