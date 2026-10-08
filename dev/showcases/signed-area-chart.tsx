import type { Component } from "solid-js";
import { SignedAreaChart } from "../../src/components/SignedAreaChart";

// Crosses zero three times; NOW sits inside the 5-6 segment, not on a point.
const TOTAL = [4, 9, 3, -6, -11, -2, 7, 12, 8].map((y, x) => ({ x, y: y * 1000 }));
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"];

export const SignedAreaChartShowcase: Component = () => (
  <SignedAreaChart
    data={TOTAL}
    now={5.5}
    xDomain={[-0.5, 8.5]}
    xTickValues={TOTAL.map((p) => p.x)}
    xTickFormat={(x) => MONTHS[Math.round(x)] ?? ""}
    yTickFormat={(y) => `$${y / 1000}k`}
  />
);
