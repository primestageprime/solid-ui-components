import { type Component, createSignal } from "solid-js";
import {
  CountInput100,
  CountInput10K,
  CurrencyInput,
  CurrencyInput100M,
  CurrencyInput10K,
  CurrencyInput1B,
  CurrencyInput1M,
  currencyWidthRem,
} from "../../src/components/CurrencyInput";
import { MoneyCell } from "../../src/components/Table/CellRenderers";
import { Stack } from "../../src/components/Layout/Stack";
import { Text } from "../../src/components/Text/Text";

export const CurrencyInputShowcase: Component = () => {
  const [amount, setAmount] = createSignal<number | undefined>(1234.56);
  const [big, setBig] = createSignal<number | undefined>(9_876_543_210.99);
  const [capped, setCapped] = createSignal<number | undefined>(500);

  return (
    <div class="component-section">
      <h2>CurrencyInput — Curried (Depth 1)</h2>
      <p class="text-meta">
        A money-amount field — `ThemedNumberInput`'s stepper + keyboard
        semantics, with USD currency masking and a FIXED width capped to the
        widest expected value so it never stretches to fill its column. The cap
        is DERIVED from the formatted width of `maxValue` (sized for $1B by default):
        <code> "$1,000,000,000.00"</code> is 17 chars →{" "}
        <code>{currencyWidthRem()}rem</code> (17×0.62rem + 4rem stepper chrome).
        Tabular figures keep the digits from reflowing as you type.
      </p>

      <div class="example-group">
        <h3>Default ($1B width)</h3>
        <div class="text-meta demo-caption-gap">
          Placed in a wide container — the field caps at {currencyWidthRem()}rem
          instead of stretching.
        </div>
        <div class="currency-input-demo__frame">
          <CurrencyInput
            name="amount"
            label="Amount ($)"
            value={amount}
            onChange={setAmount}
          />
        </div>
        <Text variant="sublabel">
          Value: {amount() === undefined ? "(none)" : String(amount())}
        </Text>
      </div>

      <div class="example-group">
        <h3>Holds a near-$10B value without reflowing</h3>
        <div class="currency-input-demo__frame">
          <CurrencyInput name="big" value={big} onChange={setBig} step={1000} />
        </div>
      </div>

      <div class="example-group">
        <h3>
          Smaller ceiling (maxValue = $1,000,000 → {currencyWidthRem(1_000_000)}
          rem)
        </h3>
        <div class="text-meta demo-caption-gap">
          A tighter cap for a column that never holds more than a million.
        </div>
        <div class="currency-input-demo__frame">
          <CurrencyInput
            name="fee"
            maxValue={1_000_000}
            value={capped}
            onChange={setCapped}
          />
        </div>
      </div>

      <div class="example-group">
        <h3>Magnitude variants — sized to the ceiling, one digit a character</h3>
        <div class="text-meta demo-caption-gap">
          Six curried fields bake the ceiling so a call site never passes
          `maxValue`: <code>CountInput100</code> (up to 99),{" "}
          <code>CountInput10K</code> (9,999), <code>CurrencyInput10K</code>{" "}
          ($9,999), <code>CurrencyInput1M</code> ($999,999),{" "}
          <code>CurrencyInput100M</code> ($99,999,999),{" "}
          <code>CurrencyInput1B</code> ($1,000,000,000). Each is the widest
          formatted text in its own font plus the stepper and half a character of
          slack, leaving about one character of room left of the widest value.
        </div>
        <Stack gap="xs">
          <CountInput100 name="c100" label="Counts up to 99" value={() => 12} />
          <CountInput10K name="c10k" label="Counts up to 9,999" value={() => 1200} />
          <CurrencyInput10K name="m10k" label="Up to $9,999" value={() => 450} />
          <CurrencyInput1M name="m1m" label="Up to $999,999" value={() => 102_891.1} />
          <CurrencyInput100M name="m100m" label="Up to $99,999,999" value={() => 8_000_000} />
          <CurrencyInput1B name="m1b" label="Up to $1,000,000,000" value={() => 1_000_000_000} />
        </Stack>
      </div>

      <div class="example-group">
        <h3>Matching display cell — MoneyCell</h3>
        <div class="text-meta demo-caption-gap">
          `MoneyCell` shares the same tabular figures + width cap, so a money
          column lines up with its input.
        </div>
        <Stack gap="xs">
          <MoneyCell value={1234.56} />
          <MoneyCell value={9_876_543_210.99} />
          <MoneyCell value={-42} />
          <MoneyCell value={1_000} maxValue={1_000_000} />
        </Stack>
      </div>
    </div>
  );
};
