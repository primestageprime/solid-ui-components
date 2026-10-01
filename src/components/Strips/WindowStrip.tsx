// ============================================
// WindowStrip — Composite (Depth 2, zero CSS)
// Composes PopoverTooltip, DatePicker, SmallButton, ChipCluster and Text.
// "[start] to [end]" on one wrapping line. An empty side is open and reads
// "beginning of time" or "end of time"; neither is the whole line and one is a
// ray. Start never passes end (`setWindowStart` / `setWindowUntil` push the
// other side). It edits an engine-neutral `WindowValue` whose open side is
// absent. `mode` limits it to a start or an end.
// Factory: createWindowStrip({ mode }).
// ============================================
import { type Component, Show, mergeProps } from "solid-js";
import { SmallButton } from "../Button/variants";
import { DatePicker } from "../DatePicker";
import { ChipCluster } from "../Layout/variants";
import { TextSublabel } from "../Text/variants";
import { Anchor } from "./parts";
import {
  type IsoDate,
  OPEN_END_TEXT,
  OPEN_START_TEXT,
  type WindowValue,
  setWindowStart,
  setWindowUntil,
} from "./values";

export interface WindowStripProps {
  value: WindowValue;
  onChange: (value: WindowValue) => void;
  /** Which sides it offers (default "both"). */
  mode?: "both" | "start" | "end";
}

export type WindowStripOverrides = Pick<WindowStripProps, "mode">;
export type WindowStripDataProps = Omit<WindowStripProps, keyof WindowStripOverrides>;

const Side: Component<{
  label: string;
  empty: string;
  date: IsoDate | undefined;
  onChange: (date: IsoDate | undefined) => void;
}> = (props) => (
  <Anchor value={props.date ?? props.empty}>
    <DatePicker
      aria-label={props.label}
      value={props.date ?? ""}
      onChange={(iso) => props.onChange(iso === "" ? undefined : iso)}
    />
    <SmallButton active={props.date === undefined} onClick={() => props.onChange(undefined)}>
      {props.empty}
    </SmallButton>
  </Anchor>
);

const WindowStripBase: Component<WindowStripProps> = (props) => {
  const mode = () => props.mode ?? "both";
  return (
    <ChipCluster>
      <Show when={mode() !== "end"}>
        <Side
          label="Start"
          empty={OPEN_START_TEXT}
          date={props.value.start}
          onChange={(d) => props.onChange(setWindowStart(props.value, d))}
        />
      </Show>
      <Show when={mode() === "both"}>
        <TextSublabel>to</TextSublabel>
      </Show>
      <Show when={mode() !== "start"}>
        <Side
          label="End"
          empty={OPEN_END_TEXT}
          date={props.value.until}
          onChange={(d) => props.onChange(setWindowUntil(props.value, d))}
        />
      </Show>
    </ChipCluster>
  );
};

export function createWindowStrip(
  defaults: WindowStripOverrides,
): Component<WindowStripDataProps> {
  return (props) => <WindowStripBase {...mergeProps(defaults, props)} />;
}
