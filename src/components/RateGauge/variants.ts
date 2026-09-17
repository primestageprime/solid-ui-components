// Curried RateGauge variants — the correct call-site form, with the WORDING
// baked in. A call site passes a domain, a reference, a value and a name; it
// never picks a formatter or names the reference needle.
//
// One variant to start, deliberately. The expected shape of a second is a
// consumer currying its OWN units once — `createRateGauge({ formatAgainst,
// formatDelta })` in their design-system layer — rather than another variant
// shipped from here, because units are the one thing a library cannot guess.
import type { Component } from "solid-js";
import { createRateGauge, type RateGaugeDataProps } from "./RateGauge";

/**
 * Plain numbers against zero: the dial with no units and no domain nouns.
 *
 * The three presentational props are baked EXPLICITLY rather than left to the
 * component's own defaults, so that what `RateDial` says is pinned here. A
 * later change to `RateGauge`'s fallback wording is then a change to the bare
 * component, not a silent change to every `RateDial` on every screen.
 */
export const RateDial: Component<RateGaugeDataProps> = createRateGauge({
  baselineLabel: "Reference",
  formatAgainst: (value: number): string =>
    value === 0 ? "at zero" : Math.round(value).toLocaleString(),
  formatDelta: (delta: number): string =>
    `${delta < 0 ? "−" : "+"}${Math.abs(Math.round(delta)).toLocaleString()}`,
});
