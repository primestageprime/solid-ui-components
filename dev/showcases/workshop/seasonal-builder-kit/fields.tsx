// ============================================
// fields — the bench's small form pieces, COMPOSED from SUI (no CSS of its own).
//
//   Field           a label over any control      TightStack + TextSublabel
//   ChoiceDropdown  a labelled pick from a list   CompactDropdown (`id: string`)
//   NumField        a labelled small number       ThemedNumberInput size="sm"
//   MoneyField      a labelled small amount       CurrencyInput size="sm"
//
// BENCH-LOCAL, recorded in docs/handoffs/seasonal-builder-sui-gaps.md: SUI has
// no labelled compact pick over plain values, and its number fields emit
// `undefined` when cleared, which every caller here would have to drop.
// ============================================
import type { Component, JSX } from "solid-js";
import { Show } from "solid-js";
import {
  CompactDropdown,
  CurrencyInput,
  TextSublabel,
  ThemedNumberInput,
  TightStack,
  fn,
} from "../../../../src";

const { find, map } = fn;

/** A label over any control. Without a label, just the control. */
export const Field: Component<{
  readonly label?: string;
  readonly children: JSX.Element;
}> = (props) => (
  <Show when={props.label} fallback={props.children}>
    <TightStack>
      <TextSublabel>{props.label}</TextSublabel>
      {props.children}
    </TightStack>
  </Show>
);

export interface Choice<V extends string | number> {
  readonly value: V;
  readonly label: string;
}

/** A compact pick from `items`, by value rather than by id. */
export const ChoiceDropdown = <V extends string | number>(props: {
  readonly label?: string;
  readonly items: readonly Choice<V>[];
  readonly value: V;
  readonly onChange: (value: V) => void;
}): JSX.Element => (
  <Field label={props.label}>
    <CompactDropdown
      items={map(
        (c: Choice<V>) => ({ id: String(c.value), label: c.label }),
        props.items,
      )}
      value={String(props.value)}
      onChange={(id) => {
        const hit = find((c: Choice<V>) => String(c.value) === id, props.items);
        if (hit) props.onChange(hit.value);
      }}
    />
  </Field>
);

interface NumberFieldProps {
  readonly label?: string;
  /** Unique within the page: kobalte's form-field name. */
  readonly name: string;
  readonly value: number;
  readonly onChange: (value: number) => void;
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
}

/** A small number field; a cleared field is not a change. */
export const NumField: Component<NumberFieldProps> = (props) => (
  <ThemedNumberInput
    size="sm"
    name={props.name}
    label={props.label}
    value={() => props.value}
    min={props.min}
    max={props.max}
    step={props.step}
    onChange={(v) => {
      if (v !== undefined) props.onChange(v);
    }}
  />
);

/** A small money field, in dollars. */
export const MoneyField: Component<NumberFieldProps> = (props) => (
  <CurrencyInput
    size="sm"
    name={props.name}
    label={props.label}
    value={() => props.value}
    min={props.min}
    step={props.step}
    onChange={(v) => {
      if (v !== undefined) props.onChange(v);
    }}
  />
);
