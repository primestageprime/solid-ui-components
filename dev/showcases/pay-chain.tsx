// PayChain / StepChain — the three layouts, each at a width that forces it.
import type { Component } from "solid-js";
import { PayChain } from "../../src/components/PayChain";
import { StepChain } from "../../src/components/StepChain";

const SARA = [
  { amount_cents: 625_000, months: 6 },
  { amount_cents: 3_750_000, months: 1 },
  { amount_cents: 1_666_700 },
];
const PETER = [
  { amount_cents: 278_400, weeks: 4 },
  { amount_cents: 385_700, weeks: 52 },
  { amount_cents: 1_689_700, weeks: 20 },
  { amount_cents: 3_661_000, weeks: 10 },
  { amount_cents: 769_200 },
];
const MICHAEL = [
  { amount_cents: 253_000, weeks: 4 },
  { amount_cents: 395_700, weeks: 26 },
  { amount_cents: 516_300, weeks: 4 },
  { amount_cents: 0, weeks: 0 },
  { amount_cents: 1_933_000, weeks: 4 },
  { amount_cents: 605_700, weeks: 22 },
  { amount_cents: 857_400, weeks: 26 },
  { amount_cents: 1_142_700, weeks: 52 },
  { amount_cents: 769_200 },
];

export const PayChainShowcase: Component = () => (
  <div class="component-section">
    <h2>PayChain / StepChain — Composite (Depth 2)</h2>
    <p class="text-meta">
      One row per person: a name, a muted cadence and a chain of steps. Measured width picks the layout:
      <b> one line</b> when everything fits, <b>two lines</b> (name on top, whole chain below) when the chain
      fits alone, and a <b>fold</b> (first two, an ellipsis with the omitted count above it, the last) when it
      does not. Hover, focus or tap the ellipsis for the full chain. Zero-length $0 gaps are dropped and equal
      neighbours merged. <code>PayChain</code> takes pay steps; <code>StepChain</code> takes any label and span.
    </p>
    <h3>One line (wide)</h3>
    <div class="pay-chain-demo pay-chain-demo--wide">
      <PayChain name="Sara Lincoln" cadence="monthly" steps={SARA} />
    </div>
    <h3>Two lines (medium)</h3>
    <div class="pay-chain-demo pay-chain-demo--medium">
      <PayChain name="Peter D Stradinger" cadence="biweekly" steps={PETER} />
    </div>
    <h3>Folded (narrow): hover or focus the count</h3>
    <div class="pay-chain-demo pay-chain-demo--narrow">
      <PayChain name="Michael A Arnold" cadence="biweekly" steps={MICHAEL} />
    </div>
    <h3>Closed chain, generic StepChain</h3>
    <div class="pay-chain-demo pay-chain-demo--wide">
      <StepChain
        name="Launch plan"
        tag="3 phases"
        ends
        steps={[{ label: "Build", span: "6wk" }, { label: "Beta", span: "4wk" }, { label: "Ship", span: "2wk" }]}
      />
    </div>
  </div>
);
