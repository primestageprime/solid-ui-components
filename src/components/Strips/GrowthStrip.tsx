// ============================================
// GrowthStrip — Composite (Depth 2, zero CSS)
// Composes SegmentedInput, CountInput100, CountInput10K, ChipCluster and Text.
// How a count of units changes each period: none, + units per period, or %
// per period, with an optional churn % and an optional ceiling. It edits an
// engine-neutral `GrowthValue`; the rules (`growth.ts`) are pure: churn stays
// 0..100, the ceiling is never below the starting units, a blank clears either.
// `startUnits` is the units the amount starts with, which the ceiling respects.
// Factory: createGrowthStrip({ churn, ceiling, kinds }).
// ============================================
import { filter, map } from "../../fn";
import { type Component, Match, Show, Switch, mergeProps } from "solid-js";
import { CountInput100, CountInput10K } from "../CurrencyInput";
import { ChipCluster } from "../Layout/variants";
import { SegmentedInput } from "../SegmentedInput";
import { NoteText } from "../Text/variants";
import { GROWTH_KINDS, type GrowthKind, type GrowthValue, growthOfKind, setGrowthCeiling, setGrowthChurn } from "./growth";
import { Labeled } from "./parts";

type GrowthKindInfo = (typeof GROWTH_KINDS)[number];

export interface GrowthStripProps {
  value: GrowthValue;
  onChange: (value: GrowthValue) => void;
  /** The units the amount starts with: the ceiling is never below it. */
  startUnits?: number;
  /** Offer a churn % (default true). */
  churn?: boolean;
  /** Offer a ceiling (default true). */
  ceiling?: boolean;
  /** The kinds offered (default all three). */
  kinds?: readonly GrowthKind[];
}

export type GrowthStripOverrides = Pick<GrowthStripProps, "churn" | "ceiling" | "kinds">;
export type GrowthStripDataProps = Omit<GrowthStripProps, keyof GrowthStripOverrides>;

const GrowthStripBase: Component<GrowthStripProps> = (props) => {
  const start = () => props.startUnits ?? 0;
  return (
    <ChipCluster>
      <Labeled label="Growth">
        <SegmentedInput
          options={map(
            (g: GrowthKindInfo) => ({ id: g.kind, label: g.label }),
            filter((g: GrowthKindInfo) => props.kinds === undefined || props.kinds.includes(g.kind), GROWTH_KINDS),
          )}
          value={props.value.kind}
          onChange={(kind) => props.onChange(growthOfKind(kind as GrowthKind, props.value))}
        />
      </Labeled>
      <Switch>
        <Match when={props.value.kind === "units" ? props.value : undefined}>
          {(v) => (
            <CountInput10K
              name="growth-units"
              label="+ units per period"
              value={() => v().perPeriod}
              onChange={(n) => props.onChange({ ...v(), perPeriod: n ?? 0 })}
            />
          )}
        </Match>
        <Match when={props.value.kind === "percent" ? props.value : undefined}>
          {(v) => (
            <CountInput100
              name="growth-percent"
              label="% per period"
              step={0.5}
              value={() => v().pctPerPeriod}
              onChange={(n) => props.onChange({ ...v(), pctPerPeriod: n ?? 0 })}
            />
          )}
        </Match>
      </Switch>
      <Show when={props.churn !== false}>
        <CountInput100
          name="growth-churn"
          label="Churn % (blank: none)"
          min={0}
          step={0.1}
          value={() => props.value.churnPct}
          onChange={(n) => props.onChange(setGrowthChurn(props.value, n))}
        />
      </Show>
      <Show when={props.ceiling !== false}>
        <CountInput10K
          name="growth-ceiling"
          label="Ceiling (blank: none)"
          min={0}
          value={() => props.value.ceiling}
          onChange={(n) => props.onChange(setGrowthCeiling(props.value, n, start()))}
        />
        <Show when={props.value.ceiling !== undefined}>
          <NoteText>{`At least the ${start()} you start with.`}</NoteText>
        </Show>
      </Show>
    </ChipCluster>
  );
};

export function createGrowthStrip(
  defaults: GrowthStripOverrides,
): Component<GrowthStripDataProps> {
  return (props) => <GrowthStripBase {...mergeProps(defaults, props)} />;
}
