// Curried DistributionSparkline variants — the correct call-site form
// (encoding baked in). A call site passes `values` and the set's `yDomain`;
// it never picks a percentile pair or toggles a mark.
//
// One variant to start, deliberately. `IQRSparkline` (p25–p75), a range-only
// form and a mean-less form are all one `createDistributionSparkline` call
// away — add them when a real caller needs one, not before.
import type { Component } from "solid-js";
import {
  createDistributionSparkline,
  type DistributionSparklineDataProps,
} from "./DistributionSparkline";

/**
 * The full encoding: min..max box with direction shading, p5–p95 rules, mean
 * hairline. The default answer when a number needs its distribution shown
 * beside it.
 */
export const P95Sparkline: Component<DistributionSparklineDataProps> =
  createDistributionSparkline({
    band: [0.05, 0.95],
    marks: { range: true, typical: true, mean: true },
  });
