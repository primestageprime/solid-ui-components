// Bench-local: the Scenario view's builder dials over a strip AmountValue (the
// published strips do not draw dials; the builders do). Dollars on the dial,
// cents in the value.
import { type Component, type JSX, Match, Switch } from "solid-js";
import {
  AccentPanel,
  CompactCurrencyMutationSliders,
  SpacedStack,
  SpreadRow,
  TextSublabel,
  TextTitle,
  TextValue,
  createGroupedMutationSliders,
  createPairedMutationSliders,
} from "../../../../src";
import { type AmountValue, setAmountRangeField } from "../../../../src/components/Strips";

const RangeDials = createGroupedMutationSliders({
  axes: [
    { label: "min", domain: [0, 100_000], snap: 100, format: (n) => `$${n}` },
    { label: "typ", domain: [0, 100_000], snap: 100, format: (n) => `$${n}` },
    { label: "max", domain: [0, 100_000], snap: 100, format: (n) => `$${n}` },
  ],
});

const SeatDials = createGroupedMutationSliders({
  axes: [
    { label: "#", domain: [0, 200], snap: 1, format: (n) => `${n}` },
    { label: "Δ", domain: [-20, 40], snap: 1, format: (n) => (n > 0 ? `+${n}` : `${n}`) },
    { label: "$", domain: [5, 500], snap: 1, format: (n) => `$${n}` },
  ],
});

const HourDials = createPairedMutationSliders({
  axes: [
    { label: "Hrs", format: (n) => `${n}h`, snap: 1, domain: [0, 60] },
    { label: "$/hr", format: (n) => `$${n}`, snap: 5, domain: [25, 300] },
  ],
});

const d = (cents: number): number => cents / 100;
const c = (dollars: number): number => Math.round(dollars * 100);

export const AmountDials: Component<{
  label: string;
  value: AmountValue;
  start: AmountValue;
  unit: "seats" | "hours";
  onChange: (next: AmountValue) => void;
}> = (props) => {
  const single = () => (props.value.kind === "single" ? props.value : undefined);
  const startSingle = () => (props.start.kind === "single" ? props.start : undefined);
  const range = () => (props.value.kind === "range" ? props.value : undefined);
  const startRange = () => (props.start.kind === "range" ? props.start : undefined);
  const units = () => (props.value.kind === "units" ? props.value : undefined);
  const startUnits = () => (props.start.kind === "units" ? props.start : undefined);
  return (
    <Switch>
      <Match when={single()}>
        {(v) => (
          <CompactCurrencyMutationSliders
            entities={[
              {
                id: "amount",
                label: props.label,
                old: d(startSingle()?.cents ?? 0),
                value: d(v().cents),
                range: [0, Math.max(300_000, d(startSingle()?.cents ?? 0) * 2)],
              },
            ]}
            onChange={(_id, dollars) => props.onChange({ ...v(), cents: c(dollars) })}
          />
        )}
      </Match>
      <Match when={range()}>
        {(v) => (
          <RangeDials
            entities={[
              {
                id: "range",
                label: props.label,
                measures: [
                  { prior: d(startRange()?.min ?? 0), value: d(v().min), range: [0, 100_000] },
                  { prior: d(startRange()?.typical ?? 0), value: d(v().typical), range: [0, 100_000] },
                  { prior: d(startRange()?.max ?? 0), value: d(v().max), range: [0, 100_000] },
                ],
              },
            ]}
            onChange={(_id, m, dollars) =>
              props.onChange(
                setAmountRangeField(v(), m === 0 ? "min" : m === 1 ? "typical" : "max", c(dollars)),
              )
            }
          />
        )}
      </Match>
      <Match when={units() !== undefined && props.unit === "seats"}>
          <SeatDials
            entities={[
              {
                id: "seats",
                label: props.label,
                measures: [
                  { prior: startUnits()?.units ?? 0, value: units()?.units ?? 0, range: [0, 200] },
                  { prior: startUnits()?.perPeriod ?? 0, value: units()?.perPeriod ?? 0, range: [-20, 40] },
                  { prior: d(startUnits()?.unitPrice ?? 0), value: d(units()?.unitPrice ?? 0), range: [5, 500] },
                ],
              },
            ]}
            onChange={(_id, m, v) => {
              const u = units();
              if (!u) return;
              props.onChange(
                m === 0 ? { ...u, units: v } : m === 1 ? { ...u, perPeriod: v } : { ...u, unitPrice: c(v) },
              );
            }}
          />
      </Match>
      <Match when={units() !== undefined}>
          <HourDials
            entities={[
              {
                id: "hours",
                label: props.label,
                measures: [
                  { prior: startUnits()?.units ?? 0, value: units()?.units ?? 0, range: [0, 60] },
                  { prior: d(startUnits()?.unitPrice ?? 0), value: d(units()?.unitPrice ?? 0), range: [25, 300] },
                ],
              },
            ]}
            onChange={(_id, m, v) => {
              const u = units();
              if (!u) return;
              props.onChange(m === 0 ? { ...u, units: v } : { ...u, unitPrice: c(v) });
            }}
          />
      </Match>
    </Switch>
  );
};

/** A read-only strip value: a label over its text. */
export const ReadOnly: Component<{ title: string; text: string }> = (props) => (
  <SpreadRow>
    <TextSublabel>{props.title}</TextSublabel>
    <TextValue>{props.text}</TextValue>
  </SpreadRow>
);

export const ScenarioFrame: Component<{ title: string; children: JSX.Element }> = (props) => (
  <AccentPanel>
    <SpacedStack>
      <TextTitle>{props.title}</TextTitle>
      {props.children}
    </SpacedStack>
  </AccentPanel>
);
