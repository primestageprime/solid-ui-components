// ============================================
// CadenceStrip — Composite (Depth 2, zero CSS)
// Composes SegmentedInput, PopoverTooltip, the pickers (CompactDayOfMonthPicker,
// MonthOfYearPicker, DayOfWeekPicker), DatePicker, SmallButton and ChipCluster.
// When it pays: the eight shapes (annual, quarterly, monthly, semi-monthly,
// bi-weekly, weekly, daily, once), each carrying only its own anchor. The
// anchor shows as a compact value ("Mar 15", "Day 15", "Mon") and opens its
// selector in a popover. Only valid anchors are offered: a 28-day grid, and
// "last" only for monthly. `allowed` narrows the shapes a kind accepts.
// It edits an engine-neutral `CadenceValue`; the rules (`values.ts`) are pure.
// Factory: createCadenceStrip({ allowed }).
// ============================================
import { type Component, Match, Show, Switch, mergeProps } from "solid-js";
import { map } from "../../fn";
import { SmallButton } from "../Button/variants";
import { CompactDayOfMonthPicker } from "../DayOfMonthPicker";
import { DatePicker } from "../DatePicker";
import { DayOfWeekPicker } from "../DayOfWeekPicker";
import { ChipCluster } from "../Layout/variants";
import { MonthOfYearPicker } from "../MonthOfYearPicker";
import { SegmentedInput } from "../SegmentedInput";
import { NoteText } from "../Text/variants";
import { Anchor, Labeled } from "./parts";
import {
  type CadenceShape,
  type CadenceValue,
  anchorText,
  cadenceOfShape,
  normalizeCadence,
  offeredShapes,
} from "./values";

export interface CadenceStripProps {
  value: CadenceValue;
  onChange: (value: CadenceValue) => void;
  /** The shapes this strip offers; omitted, all eight. */
  allowed?: readonly CadenceShape[];
}

export type CadenceStripOverrides = Pick<CadenceStripProps, "allowed">;
export type CadenceStripDataProps = Omit<CadenceStripProps, keyof CadenceStripOverrides>;

const CadenceStripBase: Component<CadenceStripProps> = (props) => {
  const emit = (next: CadenceValue) => props.onChange(normalizeCadence(next));
  const value = () => props.value;
  const shapes = () => offeredShapes(props.allowed);
  return (
    <ChipCluster>
      <Show when={shapes().length > 1}>
        <Labeled label="Cadence">
          <SegmentedInput
            options={map((c) => ({ id: c.shape, label: c.label }), shapes())}
            value={value().shape}
            onChange={(shape) => emit(cadenceOfShape(shape as CadenceShape, value()))}
          />
        </Labeled>
      </Show>
      <Switch>
        <Match when={props.value.shape === "annual" ? props.value : undefined}>
          {(v) => (
            <Labeled label="Month and day">
              <Anchor value={anchorText(v())}>
                <MonthOfYearPicker
                  value={v().anchor.month}
                  onChange={(month) => emit({ shape: "annual", anchor: { ...v().anchor, month } })}
                />
                <CompactDayOfMonthPicker
                  max={28}
                  value={v().anchor.day}
                  onChange={(day) => emit({ shape: "annual", anchor: { ...v().anchor, day } })}
                />
              </Anchor>
            </Labeled>
          )}
        </Match>
        <Match when={props.value.shape === "quarterly" || props.value.shape === "biweekly" ? props.value : undefined}>
          {(v) => (
            <Labeled label={v().shape === "quarterly" ? "Reference date" : "Reference payday"}>
              <Anchor value={anchorText(v())}>
                <DatePicker
                  value={(v() as { anchor: string }).anchor}
                  onChange={(anchor) => emit({ shape: v().shape as "quarterly" | "biweekly", anchor })}
                />
              </Anchor>
            </Labeled>
          )}
        </Match>
        <Match when={props.value.shape === "monthly" ? props.value : undefined}>
          {(v) => (
            <Labeled label="Day of month">
              <Anchor value={anchorText(v())}>
                <CompactDayOfMonthPicker
                  max={28}
                  value={v().anchor === "last" ? null : v().anchor}
                  onChange={(day) => emit({ shape: "monthly", anchor: day })}
                />
                <SmallButton
                  active={v().anchor === "last"}
                  onClick={() => emit({ shape: "monthly", anchor: "last" })}
                >
                  Last day
                </SmallButton>
              </Anchor>
            </Labeled>
          )}
        </Match>
        <Match when={props.value.shape === "weekly" ? props.value : undefined}>
          {(v) => (
            <Labeled label="Weekday">
              <Anchor value={anchorText(v())}>
                <DayOfWeekPicker
                  value={v().anchor}
                  onChange={(day) => emit({ shape: "weekly", anchor: day })}
                />
              </Anchor>
            </Labeled>
          )}
        </Match>
        <Match when={props.value.shape === "once" ? props.value : undefined}>
          {(v) => (
            <Labeled label="Date">
              <Anchor value={anchorText(v())}>
                <DatePicker
                  value={v().anchor}
                  onChange={(anchor) => emit({ shape: "once", anchor })}
                />
              </Anchor>
            </Labeled>
          )}
        </Match>
        <Match when={props.value.shape === "semimonthly" || props.value.shape === "daily"}>
          <NoteText>{anchorText(props.value)} (no anchor)</NoteText>
        </Match>
      </Switch>
    </ChipCluster>
  );
};

export function createCadenceStrip(
  defaults: CadenceStripOverrides,
): Component<CadenceStripDataProps> {
  return (props) => <CadenceStripBase {...mergeProps(defaults, props)} />;
}
