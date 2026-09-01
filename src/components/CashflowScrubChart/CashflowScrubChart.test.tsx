import { describe, it, expect, vi } from "vitest";
import { render } from "@solidjs/testing-library";
import { CashflowScrubChart, type CashflowCell } from "./CashflowScrubChart";
import { dailyCells } from "../DateAxis";
import { pointer } from "../../test-utils";

const d = (iso: string): Date => new Date(`${iso}T00:00:00.000Z`);

const makeCells = (count: number): CashflowCell[] => {
  let running = 0;
  return dailyCells(
    d("2026-05-01"),
    d(`2026-05-${String(count).padStart(2, "0")}`),
  ).map((cell, i) => {
    // Alternate +/- so both polarity branches render.
    const cashflowCents = (i % 2 === 0 ? 50_000 : -30_000) + i * 100;
    running += cashflowCents;
    return { ...cell, cashflowCents, balanceCents: running };
  });
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
    expect(
      container.querySelector(".sui-cashflow-scrub-chart__line"),
    ).toBeTruthy();
    expect(
      container.querySelector(".sui-cashflow-scrub-chart__zero-line"),
    ).toBeTruthy();
    expect(
      container.querySelector(".sui-cashflow-scrub-chart__selected-dot"),
    ).toBeTruthy();
    expect(
      container.querySelector(".sui-cashflow-scrub-chart__selected-rule"),
    ).toBeTruthy();
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
      {
        ...dailyCells(d("2026-05-01"), d("2026-05-01"))[0],
        cashflowCents: 125_000,
        balanceCents: 125_000,
      },
      {
        ...dailyCells(d("2026-05-02"), d("2026-05-02"))[0],
        cashflowCents: -98_700,
        balanceCents: 26_300,
      },
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
      {
        ...dailyCells(d("2026-05-01"), d("2026-05-01"))[0],
        cashflowCents: 50_000,
        balanceCents: 50_000,
      },
      {
        ...dailyCells(d("2026-05-02"), d("2026-05-02"))[0],
        cashflowCents: 0,
        balanceCents: 50_000,
      },
      {
        ...dailyCells(d("2026-05-03"), d("2026-05-03"))[0],
        cashflowCents: -20_000,
        balanceCents: 30_000,
      },
    ];
    const { container } = render(() => (
      <CashflowScrubChart cells={cells} selected={0} onScrub={() => {}} />
    ));
    const allCells = container.querySelectorAll(".sui-cashflow-cell");
    expect(allCells.length).toBe(3);

    // Zero-delta cell gets neutral modifier, not positive or negative.
    expect(allCells[1].classList.contains("sui-cashflow-cell--neutral")).toBe(
      true,
    );
    expect(allCells[1].classList.contains("sui-cashflow-cell--positive")).toBe(
      false,
    );
    expect(allCells[1].classList.contains("sui-cashflow-cell--negative")).toBe(
      false,
    );

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
    expect(allCells[0].classList.contains("sui-cashflow-cell--positive")).toBe(
      true,
    );
    expect(allCells[2].classList.contains("sui-cashflow-cell--negative")).toBe(
      true,
    );
  });

  describe("plain mode (scrub=false) — the same chart, scrub layer composed off", () => {
    it("renders the time series WITHOUT the filmstrip ribbon, window band, or selection", () => {
      const cells = makeCells(10);
      const { container } = render(() => (
        <CashflowScrubChart cells={cells} scrub={false} />
      ));
      // The series itself still draws: balance line + zero line.
      expect(
        container.querySelector(".sui-cashflow-scrub-chart__line"),
      ).toBeTruthy();
      expect(
        container.querySelector(".sui-cashflow-scrub-chart__zero-line"),
      ).toBeTruthy();
      // Scrub layer is gone: no day-cell filmstrip, no window-band minimap,
      // no pointer overlay, no selected rule/dot.
      expect(container.querySelector(".sui-date-axis")).toBeNull();
      expect(container.querySelectorAll(".sui-cashflow-cell").length).toBe(0);
      expect(container.querySelector(".sui-scrub-chart__window")).toBeNull();
      expect(container.querySelector(".sui-scrub-chart__overlay")).toBeNull();
      expect(
        container.querySelector(".sui-cashflow-scrub-chart__selected-dot"),
      ).toBeNull();
      expect(
        container.querySelector(".sui-cashflow-scrub-chart__selected-rule"),
      ).toBeNull();
    });

    it("still draws overlay series + deviation bands (the cone composes in plain mode)", () => {
      const cells = makeCells(8);
      const lo = (c: CashflowCell) => c.balanceCents - 10_000;
      const hi = (c: CashflowCell) => c.balanceCents + 10_000;
      const { container } = render(() => (
        <CashflowScrubChart
          cells={cells}
          scrub={false}
          balanceSeries={[
            { id: "range-lo", balanceCents: lo },
            { id: "range-hi", balanceCents: hi, fill: { baseline: lo } },
          ]}
        />
      ));
      expect(
        container.querySelectorAll(".sui-cashflow-scrub-chart__line--series")
          .length,
      ).toBe(2);
      expect(
        container.querySelectorAll(".sui-cashflow-scrub-chart__band").length,
      ).toBeGreaterThan(0);
    });

    it('paints overlay series beneath the primary line, and above it with layer: "over"', () => {
      const cells = makeCells(6);
      const same = (c: CashflowCell) => c.balanceCents;
      // Paint order IS z-order in SVG, so the assertion is about document
      // order of the polylines within the clip group: a coincident dashed
      // scenario is only visible when it comes after the primary line.
      const lineOrder = (container: HTMLElement) =>
        Array.from(
          container.querySelectorAll(".sui-cashflow-scrub-chart__line"),
        ).map((el) =>
          el.classList.contains("sui-cashflow-scrub-chart__line--series")
            ? (el.getAttribute("class")?.split(" ").at(-1) ?? "series")
            : "primary",
        );

      const under = render(() => (
        <CashflowScrubChart
          cells={cells}
          scrub={false}
          balanceSeries={[{ id: "s", class: "dashed", balanceCents: same }]}
        />
      ));
      expect(lineOrder(under.container)).toEqual(["dashed", "primary"]);

      const over = render(() => (
        <CashflowScrubChart
          cells={cells}
          scrub={false}
          balanceSeries={[
            { id: "s", class: "dashed", balanceCents: same, layer: "over" },
          ]}
        />
      ));
      expect(lineOrder(over.container)).toEqual(["primary", "dashed"]);
    });

    it("keeps each layer in array order when the series are split the overlay series", () => {
      const cells = makeCells(6);
      const at = (delta: number) => (c: CashflowCell) => c.balanceCents + delta;
      const { container } = render(() => (
        <CashflowScrubChart
          cells={cells}
          scrub={false}
          balanceSeries={[
            { id: "a", class: "a", balanceCents: at(-1) },
            { id: "b", class: "b", balanceCents: at(1), layer: "over" },
            { id: "c", class: "c", balanceCents: at(-2) },
            { id: "d", class: "d", balanceCents: at(2), layer: "over" },
          ]}
        />
      ));
      const order = Array.from(
        container.querySelectorAll(".sui-cashflow-scrub-chart__line"),
      ).map((el) => el.getAttribute("class")?.split(" ").at(-1));
      // under layer (array order) → primary → over layer (array order)
      expect(order).toEqual([
        "a",
        "c",
        "sui-cashflow-scrub-chart__line",
        "b",
        "d",
      ]);
    });

    it("keeps the full scrub layer by default (scrub omitted)", () => {
      const cells = makeCells(5);
      const { container } = render(() => (
        <CashflowScrubChart cells={cells} selected={2} onScrub={() => {}} />
      ));
      expect(container.querySelector(".sui-date-axis")).toBeTruthy();
      expect(container.querySelector(".sui-scrub-chart__window")).toBeTruthy();
      expect(
        container.querySelector(".sui-cashflow-scrub-chart__selected-dot"),
      ).toBeTruthy();
    });
  });

  describe("plotline markers (the markers prop)", () => {
    it("renders a rule + flag + dot per marker, ring on the selected one", () => {
      const cells = makeCells(10);
      const { container } = render(() => (
        <CashflowScrubChart
          cells={cells}
          selected={3}
          onScrub={() => {}}
          markers={[{ index: 2 }, { index: 6, selected: true }]}
        />
      ));
      const groups = container.querySelectorAll(
        ".sui-cashflow-scrub-chart__marker",
      );
      expect(groups.length).toBe(2);
      expect(
        container.querySelectorAll(".sui-cashflow-scrub-chart__marker-line")
          .length,
      ).toBe(2);
      expect(
        container.querySelectorAll(".sui-cashflow-scrub-chart__marker-dot")
          .length,
      ).toBe(2);
      expect(
        container.querySelectorAll(".sui-cashflow-scrub-chart__marker-flag")
          .length,
      ).toBe(2);
      // Only the chosen instance gets the ring (the whiteboard's circle).
      expect(
        container.querySelectorAll(".sui-cashflow-scrub-chart__marker-ring")
          .length,
      ).toBe(1);
      expect(
        container.querySelectorAll(
          ".sui-cashflow-scrub-chart__marker--selected",
        ).length,
      ).toBe(1);
    });

    it("fires onMarkerClick with the marker's index", () => {
      const onMarkerClick = vi.fn();
      const cells = makeCells(8);
      const { container } = render(() => (
        <CashflowScrubChart
          cells={cells}
          selected={0}
          onScrub={() => {}}
          markers={[{ index: 5 }]}
          onMarkerClick={onMarkerClick}
        />
      ));
      const g = container.querySelector(".sui-cashflow-scrub-chart__marker")!;
      g.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      expect(onMarkerClick).toHaveBeenCalledTimes(1);
      expect(onMarkerClick.mock.calls[0][0]).toBe(5);
      expect(onMarkerClick.mock.calls[0][1]).toBe(cells[5]);
    });

    it("renders a rule-variant marker as a labelled reference rule, not a clickable flag", () => {
      const onMarkerClick = vi.fn();
      const cells = makeCells(10);
      const { container } = render(() => (
        <CashflowScrubChart
          cells={cells}
          scrub={false}
          markers={[{ index: 4, variant: "rule", label: "Today" }]}
          onMarkerClick={onMarkerClick}
        />
      ));
      const g = container.querySelector(
        ".sui-cashflow-scrub-chart__marker--rule",
      )!;
      expect(g).toBeTruthy();
      const label = g.querySelector(".sui-cashflow-scrub-chart__rule-label")!;
      expect(label.textContent).toBe("Today");
      expect(
        g.querySelector(".sui-cashflow-scrub-chart__rule-line"),
      ).toBeTruthy();
      // None of the instance-marker anatomy, and no click affordance.
      expect(
        g.querySelector(".sui-cashflow-scrub-chart__marker-flag"),
      ).toBeNull();
      expect(
        g.querySelector(".sui-cashflow-scrub-chart__marker-dot"),
      ).toBeNull();
      expect(
        g.querySelector(".sui-cashflow-scrub-chart__marker-hit"),
      ).toBeNull();
      expect(g.getAttribute("role")).toBeNull();
      g.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      expect(onMarkerClick).not.toHaveBeenCalled();
    });

    it("renders no marker layer by default, drops out-of-range indices, and composes in plain mode", () => {
      const cells = makeCells(5);
      const none = render(() => (
        <CashflowScrubChart cells={cells} selected={0} onScrub={() => {}} />
      ));
      expect(
        none.container.querySelector(".sui-cashflow-scrub-chart__markers"),
      ).toBeNull();
      const ranged = render(() => (
        <CashflowScrubChart
          cells={cells}
          scrub={false}
          markers={[{ index: 99 }, { index: -1 }, { index: 1 }]}
        />
      ));
      // Out-of-range markers drop; the in-range one renders even in plain mode.
      expect(
        ranged.container.querySelectorAll(".sui-cashflow-scrub-chart__marker")
          .length,
      ).toBe(1);
    });
  });

  describe("marker class", () => {
    it("puts a marker's class on that marker's own line and dot only, not on a sibling marker", () => {
      const cells = makeCells(8);
      const { container } = render(() => (
        <CashflowScrubChart
          cells={cells}
          scrub={false}
          markers={[{ index: 2, class: "marker-a" }, { index: 6 }]}
        />
      ));
      const groups = container.querySelectorAll(
        ".sui-cashflow-scrub-chart__marker",
      );
      expect(groups.length).toBe(2);
      const [classed, plain] = Array.from(groups);
      expect(
        classed
          .querySelector(".sui-cashflow-scrub-chart__marker-line")
          ?.classList.contains("marker-a"),
      ).toBe(true);
      expect(
        classed
          .querySelector(".sui-cashflow-scrub-chart__marker-dot")
          ?.classList.contains("marker-a"),
      ).toBe(true);
      expect(
        plain
          .querySelector(".sui-cashflow-scrub-chart__marker-line")
          ?.classList.contains("marker-a"),
      ).toBe(false);
      expect(
        plain
          .querySelector(".sui-cashflow-scrub-chart__marker-dot")
          ?.classList.contains("marker-a"),
      ).toBe(false);
    });
  });

  describe("marker valueCents", () => {
    // The primary line's plotted y at an index — the source of truth for
    // "old behaviour" (CashflowScrubChart.tsx reads the same lineCells()
    // value for both the line and an unadorned marker dot).
    const primaryLineYAt = (container: HTMLElement, index: number): number =>
      Number(
        (
          container
            .querySelector(".sui-cashflow-scrub-chart__line")!
            .getAttribute("points") ?? ""
        )
          .trim()
          .split(" ")
          [index].split(",")[1],
      );

    it("uses valueCents to place the marker dot off the primary balance line", () => {
      const cells = makeCells(8);
      const { container } = render(() => (
        <CashflowScrubChart
          cells={cells}
          scrub={false}
          markers={[{ index: 3, valueCents: cells[3].balanceCents + 50_000 }]}
        />
      ));
      const dot = container.querySelector(
        ".sui-cashflow-scrub-chart__marker-dot",
      )!;
      expect(Number(dot.getAttribute("cy"))).not.toBe(
        primaryLineYAt(container as HTMLElement, 3),
      );
    });

    it("omits valueCents and keeps the dot at the exact old lineCells().balanceCents position", () => {
      const cells = makeCells(8);
      // The old position, restated as an explicit valueCents equal to the
      // same balance — both paths run through the same yToPlot, so an exact
      // match here proves omitting the field changes nothing.
      const withValueCents = render(() => (
        <CashflowScrubChart
          cells={cells}
          scrub={false}
          markers={[{ index: 3, valueCents: cells[3].balanceCents }]}
        />
      ));
      const withoutValueCents = render(() => (
        <CashflowScrubChart
          cells={cells}
          scrub={false}
          markers={[{ index: 3 }]}
        />
      ));
      const cyOf = (container: HTMLElement) =>
        container
          .querySelector(".sui-cashflow-scrub-chart__marker-dot")!
          .getAttribute("cy");
      expect(cyOf(withoutValueCents.container as HTMLElement)).toBe(
        cyOf(withValueCents.container as HTMLElement),
      );
      expect(
        Number(cyOf(withoutValueCents.container as HTMLElement)),
      ).toBeCloseTo(
        primaryLineYAt(withoutValueCents.container as HTMLElement, 3),
        1,
      );
    });
  });

  describe("over-top indicator (cone overflowing a line-based yMax)", () => {
    it("pins the domain to yMax and marks the cone's off-screen peak", () => {
      const cells = makeCells(8); // balances stay well under 100_000
      const lo = (c: CashflowCell) => c.balanceCents;
      // Hi edge far exceeds the explicit yMax → cone runs off the top.
      // Cents: 400_000_000c = $4,000,000 → compact "$4M".
      const hi = (_c: CashflowCell, i: number) => 400_000_000 + i * 1000;
      const { container } = render(() => (
        <CashflowScrubChart
          cells={cells}
          scrub={false}
          yMax={100_000}
          balanceSeries={[
            { id: "range-lo", balanceCents: lo },
            { id: "range-hi", balanceCents: hi, fill: { baseline: lo } },
          ]}
        />
      ));
      // (a) axis domain stays pinned to yMax: the highest tick label does not
      // jump up to the cone's $4M — it tops out near the pinned $100k.
      const tickLabels = Array.from(
        container.querySelectorAll(".sui-scrub-chart__label--y"),
      ).map((t) => t.textContent ?? "");
      expect(tickLabels.some((t) => t.includes("M"))).toBe(false);
      // (b) the over-top indicator renders with the compact-formatted peak.
      const overtop = container.querySelector(
        ".sui-cashflow-scrub-chart__overtop",
      );
      expect(overtop).toBeTruthy();
      const label = container.querySelector(
        ".sui-cashflow-scrub-chart__overtop-label",
      );
      expect(label?.textContent).toBe("$4M");
      expect(
        container.querySelector(".sui-cashflow-scrub-chart__overtop-chevron"),
      ).toBeTruthy();
      // The plotted content is wrapped in a clip group.
      expect(container.querySelector("clipPath")).toBeTruthy();
    });

    it("shows NO indicator when every series fits under yMax", () => {
      const cells = makeCells(8);
      const lo = (c: CashflowCell) => c.balanceCents - 5_000;
      const hi = (c: CashflowCell) => c.balanceCents + 5_000;
      const { container } = render(() => (
        <CashflowScrubChart
          cells={cells}
          scrub={false}
          yMax={5_000_000}
          balanceSeries={[
            { id: "range-lo", balanceCents: lo },
            { id: "range-hi", balanceCents: hi, fill: { baseline: lo } },
          ]}
        />
      ));
      expect(
        container.querySelector(".sui-cashflow-scrub-chart__overtop"),
      ).toBeNull();
    });
  });

  it("renders empty cleanly when cells is []", () => {
    const { container } = render(() => (
      <CashflowScrubChart cells={[]} selected={0} onScrub={() => {}} />
    ));
    expect(container.querySelector(".sui-scrub-chart")).toBeTruthy();
    expect(container.querySelectorAll(".sui-cashflow-cell").length).toBe(0);
    // No chart svg when there's no data.
    expect(
      container.querySelector(".sui-cashflow-scrub-chart__chart"),
    ).toBeNull();
  });
});

describe("CashflowScrubChart hover", () => {
  // clientY 30 is inside this chart's plot rect; the shared driver requires the
  // coordinate rather than inferring one, since under jsdom the frame's rect is
  // all zeros and an inferred point would land outside the plot.
  const hoverMove = (container: HTMLElement, clientX: number) => {
    pointer(container.querySelector(".sui-scrub-chart__frame")!).move({
      clientX,
      clientY: 30,
    });
  };

  it("draws a hover rule and a hollow dot per line, plus the tooltip body", () => {
    const cells = makeCells(10);
    const series = [
      { id: "s1", balanceCents: (c: CashflowCell) => c.balanceCents + 5000 },
    ];
    const { container } = render(() => (
      <CashflowScrubChart
        cells={cells}
        scrub={false}
        hover
        balanceSeries={series}
        renderHoverTooltip={(_cell, index) => (
          <div data-testid="tt">idx {index}</div>
        )}
      />
    ));
    // Nothing until hovering.
    expect(
      container.querySelector(".sui-cashflow-scrub-chart__hover-rule"),
    ).toBeNull();
    hoverMove(container, 200);
    expect(
      container.querySelector(".sui-cashflow-scrub-chart__hover-rule"),
    ).toBeTruthy();
    // One dot for the primary line + one per balanceSeries = 2.
    expect(
      container.querySelectorAll(".sui-cashflow-scrub-chart__hover-dot").length,
    ).toBe(2);
    expect(container.querySelector("[data-testid=tt]")).toBeTruthy();
  });

  it("draws nothing on hover when hover is off", () => {
    const cells = makeCells(6);
    const { container } = render(() => (
      <CashflowScrubChart cells={cells} scrub={false} />
    ));
    hoverMove(container, 160);
    expect(
      container.querySelector(".sui-cashflow-scrub-chart__hover-rule"),
    ).toBeNull();
  });

  // ── balanceLineCells: decouple the balance LINE from the ribbon ──────────
  const constCells = (count: number, balanceCents: number): CashflowCell[] =>
    dailyCells(
      d("2026-05-01"),
      d(`2026-05-${String(count).padStart(2, "0")}`),
    ).map((cell) => ({ ...cell, cashflowCents: 0, balanceCents }));

  const rampCells = (count: number): CashflowCell[] =>
    dailyCells(
      d("2026-05-01"),
      d(`2026-05-${String(count).padStart(2, "0")}`),
    ).map((cell, i) => ({
      ...cell,
      cashflowCents: 0,
      balanceCents: i * 10_000,
    }));

  const lineYs = (container: HTMLElement): number[] =>
    (
      container
        .querySelector(".sui-cashflow-scrub-chart__line")!
        .getAttribute("points") ?? ""
    )
      .trim()
      .split(" ")
      .filter(Boolean)
      .map((p) => Number(p.split(",")[1]));

  it("derives the balance LINE from balanceLineCells while the ribbon stays on cells", () => {
    // Flat ribbon (constant balance) + a rising line source. If the line came
    // from the ribbon it would be flat; from balanceLineCells it rises.
    const ribbon = constCells(8, 5_000);
    const line = rampCells(8);
    const { container } = render(() => (
      <CashflowScrubChart
        cells={ribbon}
        balanceLineCells={line}
        selected={0}
        onScrub={() => {}}
      />
    ));
    // Ribbon cell count follows `cells`.
    expect(container.querySelectorAll(".sui-cashflow-cell").length).toBe(8);
    // The line's y-coordinates vary → it followed the ramp, not the flat ribbon.
    expect(new Set(lineYs(container as HTMLElement)).size).toBeGreaterThan(1);
  });

  it("falls back to cells for the LINE when balanceLineCells is absent (flat cells → flat line)", () => {
    const ribbon = constCells(8, 5_000);
    const { container } = render(() => (
      <CashflowScrubChart cells={ribbon} selected={0} onScrub={() => {}} />
    ));
    // No decoupling → line follows the flat ribbon → one distinct y.
    expect(new Set(lineYs(container as HTMLElement)).size).toBe(1);
  });

  // ── stripAccent: a 1px accent border around the whole ribbon ─────────────
  const ribbonEl = (container: HTMLElement): HTMLElement =>
    container.querySelector(".sui-scrub-chart__ribbon") as HTMLElement;

  it("wraps the ribbon in a 1px SOLID accent border by default", () => {
    const cells = makeCells(6);
    const { container } = render(() => (
      <CashflowScrubChart
        cells={cells}
        selected={0}
        onScrub={() => {}}
        stripAccent="rgb(10, 20, 30)"
      />
    ));
    const border = ribbonEl(container as HTMLElement).style.border;
    expect(border).toContain("rgb(10, 20, 30)");
    expect(border).toContain("1px");
    expect(border).toContain("solid");
  });

  it("dashes the ribbon border when stripAccentDashed is set (matches a dashed line)", () => {
    const cells = makeCells(6);
    const { container } = render(() => (
      <CashflowScrubChart
        cells={cells}
        selected={0}
        onScrub={() => {}}
        stripAccent="rgb(10, 20, 30)"
        stripAccentDashed
      />
    ));
    const border = ribbonEl(container as HTMLElement).style.border;
    expect(border).toContain("1px");
    expect(border).toContain("dashed");
  });

  it("leaves the ribbon border unstyled when stripAccent is absent", () => {
    const cells = makeCells(6);
    const { container } = render(() => (
      <CashflowScrubChart cells={cells} selected={0} onScrub={() => {}} />
    ));
    expect(ribbonEl(container as HTMLElement).style.border).toBe("");
  });
});

describe("CashflowScrubChart lineClass", () => {
  // The primary line is the polyline that carries the base class WITHOUT the
  // overlay-series modifier.
  const primaryLineEl = (container: HTMLElement): Element | undefined =>
    Array.from(
      container.querySelectorAll(".sui-cashflow-scrub-chart__line"),
    ).find(
      (el) => !el.classList.contains("sui-cashflow-scrub-chart__line--series"),
    );

  it("adds lineClass to the primary balance polyline", () => {
    const cells = makeCells(6);
    const { container } = render(() => (
      <CashflowScrubChart
        cells={cells}
        scrub={false}
        lineClass="demo-draft-line"
      />
    ));
    const primary = primaryLineEl(container as HTMLElement);
    expect(primary?.getAttribute("class")).toBe(
      "sui-cashflow-scrub-chart__line demo-draft-line",
    );
  });

  it("leaves overlay series untouched when lineClass is set", () => {
    const cells = makeCells(6);
    const { container } = render(() => (
      <CashflowScrubChart
        cells={cells}
        scrub={false}
        lineClass="demo-draft-line"
        balanceSeries={[
          {
            id: "s",
            class: "demo-series-line",
            balanceCents: (c: CashflowCell) => c.balanceCents,
          },
        ]}
      />
    ));
    const series = container.querySelector(
      ".sui-cashflow-scrub-chart__line--series",
    );
    expect(series?.getAttribute("class")).toBe(
      "sui-cashflow-scrub-chart__line sui-cashflow-scrub-chart__line--series demo-series-line",
    );
    expect(series?.classList.contains("demo-draft-line")).toBe(false);
  });

  it("keeps the default class exactly when lineClass is omitted", () => {
    const cells = makeCells(6);
    const { container } = render(() => (
      <CashflowScrubChart cells={cells} scrub={false} />
    ));
    const primary = primaryLineEl(container as HTMLElement);
    expect(primary?.getAttribute("class")).toBe(
      "sui-cashflow-scrub-chart__line",
    );
  });
});

describe("CashflowScrubChart gridlines", () => {
  it("draws no gridlines by default", () => {
    const { container } = render(() => (
      <CashflowScrubChart
        cells={makeCells(10)}
        selected={3}
        onScrub={() => {}}
      />
    ));
    expect(container.querySelector(".sui-scrub-chart__grid-line")).toBeNull();
  });

  it("forwards showGridlines to the inner ScrubChart", () => {
    const { container } = render(() => (
      <CashflowScrubChart
        cells={makeCells(10)}
        selected={3}
        onScrub={() => {}}
        showGridlines
      />
    ));
    const lines = container.querySelectorAll(".sui-scrub-chart__grid-line");
    const labels = container.querySelectorAll(".sui-scrub-chart__label--y");
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.length).toBe(labels.length);
    // Undashed — every short dash pattern here already means another line.
    for (const line of lines) {
      expect(line.getAttribute("stroke-dasharray")).toBeNull();
    }
  });

  it("paints the gridlines beneath the balance line", () => {
    const { container } = render(() => (
      <CashflowScrubChart
        cells={makeCells(10)}
        selected={3}
        onScrub={() => {}}
        showGridlines
      />
    ));
    const frame = container.querySelector(".sui-scrub-chart__frame")!;
    const nodes = Array.from(frame.children);
    const grid = nodes.findIndex((n) =>
      n.classList.contains("sui-scrub-chart__grid"),
    );
    const series = nodes.findIndex((n) =>
      n.querySelector(".sui-cashflow-scrub-chart__line"),
    );
    expect(grid).toBeGreaterThanOrEqual(0);
    expect(series).toBeGreaterThan(grid);
  });

  // ── Line + marker labels ───────────────────────────────────────────
  // `measureLabelWidth` reads `text.length * 7` here: src/test-setup.ts
  // installs a stub 2D context on purpose, so the real canvas path runs and
  // the per-character fallback never fires.

  /** The plot's right edge, which the zero line is drawn to. */
  const plotRightOf = (container: HTMLElement): string =>
    container
      .querySelector(".sui-cashflow-scrub-chart__zero-line")!
      .getAttribute("x2")!;

  /** The chart frame's full width, from the chart svg's viewBox. */
  const chartWidthOf = (container: HTMLElement): string =>
    container
      .querySelector("svg.sui-cashflow-scrub-chart__chart")!
      .getAttribute("viewBox")!
      .split(" ")[2];

  it("keeps plotRight at the chart width when no label prefers the right", () => {
    const { container } = render(() => (
      <CashflowScrubChart
        cells={makeCells(10)}
        selected={3}
        onScrub={() => {}}
      />
    ));
    expect(plotRightOf(container)).toBe(chartWidthOf(container));
  });

  it("draws a series label when one is given", () => {
    const cells = makeCells(10);
    const { container } = render(() => (
      <CashflowScrubChart
        cells={cells}
        selected={3}
        onScrub={() => {}}
        balanceSeries={[
          {
            id: "forecast",
            // No `labelPlacement`: "auto" starts at the body rung, and 4
            // characters at 7px each clear the last point with room to spare.
            label: "Cash",
            balanceCents: (c) => c.balanceCents + 20_000,
          },
        ]}
      />
    ));
    const label = container.querySelector(".sui-cashflow-scrub-chart__label");
    expect(label).toBeTruthy();
    expect(label!.textContent).toBe("Cash");
  });

  it("buys a right gutter for an explicit right label only", () => {
    const series = (placement: "auto" | "right") => [
      {
        id: "forecast",
        label: "Forecast",
        labelPlacement: placement,
        balanceCents: (c: CashflowCell) => c.balanceCents + 20_000,
      },
    ];
    const auto = render(() => (
      <CashflowScrubChart
        cells={makeCells(10)}
        selected={3}
        onScrub={() => {}}
        balanceSeries={series("auto")}
      />
    ));
    expect(plotRightOf(auto.container)).toBe(chartWidthOf(auto.container));

    const right = render(() => (
      <CashflowScrubChart
        cells={makeCells(10)}
        selected={3}
        onScrub={() => {}}
        balanceSeries={series("right")}
      />
    ));
    // "Forecast" measures 8 * 7 = 56, plus the 6px gutter gap.
    expect(Number(plotRightOf(right.container))).toBe(
      Number(chartWidthOf(right.container)) - 62,
    );
  });

  it("drops a label that fits nowhere, in silence", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { container } = render(() => (
      <CashflowScrubChart
        cells={makeCells(10)}
        selected={3}
        onScrub={() => {}}
        balanceSeries={[
          {
            id: "wide",
            // Wider than the whole chart, so no rung can hold it, and "body"
            // buys no gutter and no row to fall back on.
            label: "x".repeat(400),
            labelPlacement: "body",
            balanceCents: (c) => c.balanceCents,
          },
        ]}
      />
    ));
    expect(
      container.querySelector(".sui-cashflow-scrub-chart__label"),
    ).toBeNull();
    expect(warn).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
    warn.mockRestore();
    error.mockRestore();
  });
});
