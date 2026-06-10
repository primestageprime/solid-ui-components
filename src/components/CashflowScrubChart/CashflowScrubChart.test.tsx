import { describe, it, expect, vi } from "vitest";
import { render } from "@solidjs/testing-library";
import { CashflowScrubChart, type CashflowCell } from "./CashflowScrubChart";
import { dailyCells } from "../DateAxis";

const d = (iso: string): Date => new Date(`${iso}T00:00:00.000Z`);

const makeCells = (count: number): CashflowCell[] => {
  let running = 0;
  return dailyCells(d("2026-05-01"), d(`2026-05-${String(count).padStart(2, "0")}`)).map(
    (cell, i) => {
      // Alternate +/- so both polarity branches render.
      const cashflowCents = (i % 2 === 0 ? 50_000 : -30_000) + i * 100;
      running += cashflowCents;
      return { ...cell, cashflowCents, balanceCents: running };
    },
  );
};

describe("CashflowScrubChart", () => {
  it("renders the inner ScrubChart frame + axis + cashflow cells", () => {
    const cells = makeCells(10);
    const { container } = render(() => (
      <CashflowScrubChart cells={cells} selected={3} onScrub={() => {}} />
    ));
    expect(container.querySelector(".sui-scrub-chart")).toBeTruthy();
    expect(container.querySelector(".sui-scrub-chart__window")).toBeTruthy();
    expect(container.querySelector(".sui-date-axis")).toBeTruthy();
    // One cashflow cell per data cell.
    expect(container.querySelectorAll(".sui-cashflow-cell").length).toBe(10);
    // Both polarity classes appear in this mixed-sign dataset.
    expect(
      container.querySelectorAll(".sui-cashflow-cell--positive").length,
    ).toBeGreaterThan(0);
    expect(
      container.querySelectorAll(".sui-cashflow-cell--negative").length,
    ).toBeGreaterThan(0);
  });

  it("draws the running-balance line + selected-dot + zero line", () => {
    const cells = makeCells(8);
    const { container } = render(() => (
      <CashflowScrubChart cells={cells} selected={4} onScrub={() => {}} />
    ));
    expect(container.querySelector(".sui-cashflow-scrub-chart__line")).toBeTruthy();
    expect(container.querySelector(".sui-cashflow-scrub-chart__zero-line")).toBeTruthy();
    expect(container.querySelector(".sui-cashflow-scrub-chart__selected-dot")).toBeTruthy();
    expect(container.querySelector(".sui-cashflow-scrub-chart__selected-rule")).toBeTruthy();
  });

  it("forwards onScrub when an axis cell is clicked", () => {
    const onScrub = vi.fn();
    const cells = makeCells(5);
    const { container } = render(() => (
      <CashflowScrubChart cells={cells} selected={0} onScrub={onScrub} />
    ));
    const firstCell = container.querySelectorAll(".sui-date-axis__cell")[2]!;
    firstCell.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(onScrub).toHaveBeenCalledTimes(1);
    expect(onScrub.mock.calls[0][0]).toBe(2);
    expect(onScrub.mock.calls[0][1]).toBe(cells[2]);
  });

  it("formats the dollar amount with thousands separators and a sign", () => {
    const cells: CashflowCell[] = [
      { ...dailyCells(d("2026-05-01"), d("2026-05-01"))[0], cashflowCents: 125_000, balanceCents: 125_000 },
      { ...dailyCells(d("2026-05-02"), d("2026-05-02"))[0], cashflowCents: -98_700, balanceCents: 26_300 },
    ];
    const { container } = render(() => (
      <CashflowScrubChart cells={cells} selected={0} onScrub={() => {}} />
    ));
    const amounts = Array.from(
      container.querySelectorAll(".sui-cashflow-cell__amount"),
    ).map((el) => el.textContent);
    expect(amounts[0]).toBe("+$1,250");
    expect(amounts[1]).toBe("−$987");
  });

  it("renders zero-delta days as neutral — no amount label, no bar, midline kept", () => {
    const cells: CashflowCell[] = [
      { ...dailyCells(d("2026-05-01"), d("2026-05-01"))[0], cashflowCents: 50_000, balanceCents: 50_000 },
      { ...dailyCells(d("2026-05-02"), d("2026-05-02"))[0], cashflowCents: 0, balanceCents: 50_000 },
      { ...dailyCells(d("2026-05-03"), d("2026-05-03"))[0], cashflowCents: -20_000, balanceCents: 30_000 },
    ];
    const { container } = render(() => (
      <CashflowScrubChart cells={cells} selected={0} onScrub={() => {}} />
    ));
    const allCells = container.querySelectorAll(".sui-cashflow-cell");
    expect(allCells.length).toBe(3);

    // Zero-delta cell gets neutral modifier, not positive or negative.
    expect(allCells[1].classList.contains("sui-cashflow-cell--neutral")).toBe(true);
    expect(allCells[1].classList.contains("sui-cashflow-cell--positive")).toBe(false);
    expect(allCells[1].classList.contains("sui-cashflow-cell--negative")).toBe(false);

    // Zero-delta cell has no amount label.
    expect(allCells[1].querySelector(".sui-cashflow-cell__amount")).toBeNull();

    // Zero-delta cell has no bar element.
    expect(allCells[1].querySelector(".sui-cashflow-cell__bar")).toBeNull();

    // The midline (per-cell zero/baseline) IS present on EVERY cell — neutral
    // included — so it reads as one continuous line across the strip.
    allCells.forEach((c) => {
      expect(c.querySelector(".sui-cashflow-cell__zero")).toBeTruthy();
    });

    // Neutral cells carry an invisible amount-row spacer so the bar-track —
    // and the midline at its 50% mark — keeps the same height as in
    // value-bearing cells (midline continuity is geometric, not just DOM
    // presence).
    expect(
      allCells[1].querySelector(".sui-cashflow-cell__amount-spacer"),
    ).toBeTruthy();
    expect(
      allCells[0].querySelector(".sui-cashflow-cell__amount-spacer"),
    ).toBeNull();

    // Non-zero cells still get their polarity classes.
    expect(allCells[0].classList.contains("sui-cashflow-cell--positive")).toBe(true);
    expect(allCells[2].classList.contains("sui-cashflow-cell--negative")).toBe(true);
  });

  it("renders empty cleanly when cells is []", () => {
    const { container } = render(() => (
      <CashflowScrubChart cells={[]} selected={0} onScrub={() => {}} />
    ));
    expect(container.querySelector(".sui-scrub-chart")).toBeTruthy();
    expect(container.querySelectorAll(".sui-cashflow-cell").length).toBe(0);
    // No chart svg when there's no data.
    expect(container.querySelector(".sui-cashflow-scrub-chart__chart")).toBeNull();
  });
});
