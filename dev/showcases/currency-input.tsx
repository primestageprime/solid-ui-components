import { type Component, createSignal } from "solid-js";
import { CurrencyInput, currencyWidthRem } from "../../src/components/CurrencyInput";
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
        is DERIVED from the formatted width of `maxValue` (default $10B):
        <code> "$10,000,000,000.00"</code> is 18 chars →{" "}
        <code>{currencyWidthRem()}rem</code> (18×0.62rem + 4rem stepper chrome).
        Tabular figures keep the digits from reflowing as you type.
      </p>

      <div class="example-group">
        <h3>Default ($10B cap)</h3>
        <div class="text-meta" style={{ "margin-bottom": "12px" }}>
          Placed in a wide container — the field caps at{" "}
          {currencyWidthRem()}rem instead of stretching.
        </div>
        <div style={{ width: "640px", border: "1px dashed var(--sui-border)", padding: "12px" }}>
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
        <div style={{ width: "640px", border: "1px dashed var(--sui-border)", padding: "12px" }}>
          <CurrencyInput name="big" value={big} onChange={setBig} step={1000} />
        </div>
      </div>

      <div class="example-group">
        <h3>Smaller ceiling (maxValue = $1,000,000 → {currencyWidthRem(1_000_000)}rem)</h3>
        <div class="text-meta" style={{ "margin-bottom": "12px" }}>
          A tighter cap for a column that never holds more than a million.
        </div>
        <div style={{ width: "640px", border: "1px dashed var(--sui-border)", padding: "12px" }}>
          <CurrencyInput name="fee" maxValue={1_000_000} value={capped} onChange={setCapped} />
        </div>
      </div>

      <div class="example-group">
        <h3>Matching display cell — MoneyCell</h3>
        <div class="text-meta" style={{ "margin-bottom": "12px" }}>
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
