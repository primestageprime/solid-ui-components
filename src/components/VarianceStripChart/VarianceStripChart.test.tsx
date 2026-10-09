import { describe, expect, it } from "vitest";
import { render } from "@solidjs/testing-library";
import { VarianceStripChart } from "./VarianceStripChart";

const day = (d: number) => new Date(Date.UTC(2026, 8, d));
const DATA = [
  { date: day(1), value: 500, kind: "revenue" as const },
  { date: day(2), value: -1200, kind: "costs" as const },
  { date: day(3), value: 30, kind: "other" as const },
];

describe("VarianceStripChart", () => {
  it("hosts the strip across the plot with its ± extent at the left", () => {
    const { container } = render(() => (
      <VarianceStripChart data={DATA} valueFormat={(v) => `${v}`} size={{ width: 400, height: 120 }} />
    ));
    expect(container.querySelectorAll(".sui-variance-strip__bar").length).toBe(3);
    const labels = [...container.querySelectorAll(".sui-variance-strip__label")].map((l) => l.textContent);
    expect(labels).toEqual(["1200", "-1200"]);
    // The zero line runs through the middle of the plot: (120 − 18 − 26) / 2 = 38.
    expect(Number(container.querySelector(".sui-variance-strip__zero")!.getAttribute("y1"))).toBe(38);
  });

  it("widens the x extent by half a day so the end bars are whole", () => {
    const { container } = render(() => (
      <VarianceStripChart data={DATA} valueFormat={(v) => `${v}`} size={{ width: 400, height: 120 }} />
    ));
    const bars = [...container.querySelectorAll(".sui-variance-strip__bar")];
    const first = Number(bars[0]!.getAttribute("x"));
    expect(first).toBeGreaterThanOrEqual(0);
    const last = bars[2]!;
    expect(Number(last.getAttribute("x")) + Number(last.getAttribute("width"))).toBeLessThanOrEqual(400 - 56 - 12 + 0.5);
  });

  it("renders empty data without a bar", () => {
    const { container } = render(() => (
      <VarianceStripChart data={[]} valueFormat={(v) => `${v}`} size={{ width: 400, height: 120 }} />
    ));
    expect(container.querySelectorAll(".sui-variance-strip__bar").length).toBe(0);
  });
});
