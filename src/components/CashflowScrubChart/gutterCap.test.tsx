// G14 — the right label gutter is CAPPED at MAX_RIGHT_GUTTER_SHARE of the plot
// it leaves; past it, "right" labels fall back to "below". Printed headless
// first (the pure rule), then mounted at a phone and a desktop width.
import { render } from "@solidjs/testing-library";
import { afterEach, describe, expect, it } from "vitest";
import {
  MAX_RIGHT_GUTTER_SHARE,
  reserveLabelSpace,
  rightGutterFits,
} from "../Chart/labelPlacement";
import { dailyCells } from "../DateAxis";
import { join, map } from "../../fn";
import { type FakeSizer, installFakeSizer } from "../../test-utils/fakeSizer";
import { type CashflowCell, CashflowScrubChart } from "./CashflowScrubChart";

const WIDTHS = [390, 768, 1440];
/** Label text widths in px — a short name, a scenario name, a long one. */
const LABELS = [56, 133, 280];

describe("rightGutterFits — the printed rule", () => {
  it("prints gutter, cap and zone for every width × label", () => {
    const cellOf = (w: number, label: number): string => {
      const labels = [{ width: label, placement: "right" as const }];
      const gutter = reserveLabelSpace(labels).rightGutter;
      const cap = Math.round(MAX_RIGHT_GUTTER_SHARE * (w - gutter));
      const zone = rightGutterFits(labels, w) ? "right" : "below";
      return `${String(label).padStart(3)}px→${String(gutter).padStart(3)} cap ${String(cap).padStart(3)} ${zone.padEnd(5)}`;
    };
    const rowOf = (w: number): string =>
      `${String(w).padStart(5)}  ${join(" | ", map((label: number) => cellOf(w, label), LABELS))}`;
    const table = join("\n", map(rowOf, WIDTHS));
    expect(table).toMatchInlineSnapshot(`
      "  390   56px→ 62 cap  82 right | 133px→139 cap  63 below | 280px→286 cap  26 below
        768   56px→ 62 cap 177 right | 133px→139 cap 157 right | 280px→286 cap 121 below
       1440   56px→ 62 cap 345 right | 133px→139 cap 325 right | 280px→286 cap 289 right"
    `);
  });

  it("keeps the gutter before the frame is measured, and with no right label", () => {
    expect(rightGutterFits([{ width: 280, placement: "right" }], 0)).toBe(true);
    expect(rightGutterFits([{ width: 280, placement: "auto" }], 390)).toBe(true);
  });
});

const d = (iso: string): Date => new Date(`${iso}T00:00:00.000Z`);
const cells = (): CashflowCell[] => {
  let running = 0;
  return map((cell, i: number) => {
    const cashflowCents = (i % 2 === 0 ? 50_000 : -30_000) + i * 100;
    running += cashflowCents;
    return { ...cell, cashflowCents, balanceCents: running };
  }, dailyCells(d("2026-05-01"), d("2026-05-10")));
};

const plotRightOf = (container: HTMLElement): number =>
  Number(
    container.querySelector(".sui-cashflow-scrub-chart__zero-line")!.getAttribute("x2"),
  );

describe("CashflowScrubChart — the capped gutter", () => {
  let sizer: FakeSizer | undefined;
  afterEach(() => sizer?.restore());

  it("drops a long right label below at 390px and keeps it right at 1440px", async () => {
    sizer = installFakeSizer();
    const { container } = render(() => (
      <CashflowScrubChart
        cells={cells()}
        selected={3}
        onScrub={() => {}}
        balanceSeries={[
          {
            id: "scenario",
            label: "Forecast scenario B",
            labelPlacement: "right",
            balanceCents: (c) => c.balanceCents + 20_000,
          },
        ]}
      />
    ));
    const frame = container.querySelector<HTMLElement>(".sui-scrub-chart__frame")!;
    await sizer.resize(frame, { width: 1440, height: 200 });
    expect(plotRightOf(container)).toBeLessThan(1440); // the gutter is bought
    await sizer.resize(frame, { width: 390, height: 200 });
    expect(plotRightOf(container)).toBe(390); // no gutter: the label went below
  });
});
