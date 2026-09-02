import { describe, it, expect, vi, afterEach } from "vitest";
import { render } from "@solidjs/testing-library";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
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

  describe("highlight bands (the highlights prop)", () => {
    it("forwards each band to the inner ScrubChart, with its own class", () => {
      const cells = makeCells(10);
      const { container } = render(() => (
        <CashflowScrubChart
          cells={cells}
          selected={3}
          onScrub={() => {}}
          highlights={[
            { from: 1, to: 3, class: "funding-gap" },
            { from: 8, to: 9 },
          ]}
        />
      ));
      const rects = container.querySelectorAll(".sui-scrub-chart__highlight");
      expect(rects.length).toBe(2);
      expect(rects[0].getAttribute("class")).toContain("funding-gap");
      // Band 0 starts left of band 1 — the ranges keep their order.
      expect(Number(rects[0].getAttribute("x"))).toBeLessThan(
        Number(rects[1].getAttribute("x")),
      );
    });

    it("draws no highlight layer when the prop is absent", () => {
      const cells = makeCells(10);
      const { container } = render(() => (
        <CashflowScrubChart cells={cells} selected={3} onScrub={() => {}} />
      ));
      expect(
        container.querySelector(".sui-scrub-chart__highlights"),
      ).toBeNull();
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

  it("puts each line's own class on its own hover dot", () => {
    // Regression for "an invisible series keeps a visible dot": the dot used
    // to carry one fixed class, so a consumer that hid a series through its
    // own class still saw that series' circle on the crosshair.
    const cells = makeCells(10);
    const series = [
      {
        id: "ghost",
        class: "my-ghost",
        balanceCents: (c: CashflowCell) => c.balanceCents + 5000,
      },
      {
        id: "plain",
        balanceCents: (c: CashflowCell) => c.balanceCents - 5000,
      },
    ];
    const { container } = render(() => (
      <CashflowScrubChart
        cells={cells}
        scrub={false}
        hover
        lineClass="my-primary"
        balanceSeries={series}
      />
    ));
    hoverMove(container, 200);
    const dots = Array.from(
      container.querySelectorAll(".sui-cashflow-scrub-chart__hover-dot"),
    ).map((el) => el.getAttribute("class"));
    // Primary first, then the series in array order — each dot reachable
    // through the same class that styles its line.
    expect(dots).toEqual([
      "sui-cashflow-scrub-chart__hover-dot my-primary",
      "sui-cashflow-scrub-chart__hover-dot my-ghost",
      // A series without a class keeps the base class alone.
      "sui-cashflow-scrub-chart__hover-dot",
    ]);
  });

  it("defaults the hover dot to tokens the theme actually defines", () => {
    // The dot's fill and stroke are presentation attributes, so every token
    // they name must exist: a var() chain that resolves to nothing falls back
    // to the property's INITIAL value — `stroke: none`, `fill: black` — and the
    // dot disappears against a dark plot rather than degrading to something
    // readable. `--sui-text` looked like a token and never was one; the CSS
    // rule this replaced only ever rendered through its hex fallback.
    const cells = makeCells(10);
    const { container } = render(() => (
      <CashflowScrubChart cells={cells} scrub={false} hover />
    ));
    hoverMove(container, 200);
    const dot = container.querySelector(
      ".sui-cashflow-scrub-chart__hover-dot",
    )!;
    const theme = readFileSync(
      join(
        dirname(fileURLToPath(import.meta.url)),
        "..",
        "..",
        "themes",
        "default.css",
      ),
      "utf8",
    );
    const named = [dot.getAttribute("fill"), dot.getAttribute("stroke")]
      .join(" ")
      .matchAll(/var\(\s*(--[a-z0-9-]+)/g);
    const tokens = Array.from(named, (m) => m[1]);
    // Two attributes, each naming an override var and a theme token under it.
    expect(tokens.length).toBe(4);
    for (const token of tokens) {
      // The override vars are consumer-supplied and undefined by design; every
      // token they fall back to must be a real one.
      if (token.startsWith("--sui-cashflow-hover-dot-")) continue;
      expect(theme).toContain(`${token}:`);
    }
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

  // ── The three behaviours the showcase demonstrates ──────────────────
  // dev/showcases/cashflow-scrub-chart.tsx draws one chart per rung of the
  // ladder. These lock what each of those charts claims to show, so a change
  // that silently moves a label makes the showcase wrong AND fails here.

  /** The zone class suffix of the label with this text, or null when dropped. */
  const zoneOfLabel = (container: HTMLElement, text: string): string | null => {
    const found = Array.from(
      container.querySelectorAll(".sui-cashflow-scrub-chart__label"),
    ).find((el) => el.textContent === text);
    const zone = ["body", "right", "below"].find((z) =>
      found?.classList.contains(`sui-cashflow-scrub-chart__label--${z}`),
    );
    return zone ?? null;
  };

  /** A line that stops at `lastIndex`, so its last point sits inside the plot. */
  const stoppingAt =
    (lastIndex: number, offsetCents: number) =>
    (c: CashflowCell, i: number): number | null =>
      i > lastIndex ? null : c.balanceCents + offsetCents;

  it('keeps every "auto" label in the body and buys no gutter for them', () => {
    const { container } = render(() => (
      <CashflowScrubChart
        cells={makeCells(16)}
        selected={3}
        onScrub={() => {}}
        balanceSeries={[
          // No `labelPlacement` anywhere: every label is "auto". Both lines
          // stop early, so each last point has clear space beside it.
          {
            id: "upside",
            label: "Up",
            balanceCents: stoppingAt(6, 60_000),
          },
          {
            id: "downside",
            label: "Down",
            balanceCents: stoppingAt(11, -60_000),
          },
        ]}
      />
    ));
    expect(zoneOfLabel(container, "Up")).toBe("body");
    expect(zoneOfLabel(container, "Down")).toBe("body");
    // The body rung costs nothing, so the plot keeps the full chart width —
    // pixel-identical to the same chart with no labels at all.
    expect(plotRightOf(container)).toBe(chartWidthOf(container));
  });

  it('lets an "auto" label use the gutter an explicit label bought', () => {
    const flat = (): number => 0;
    const series = (placement: "auto" | "right") => [
      {
        id: "optimistic",
        label: "Optimistic",
        labelPlacement: placement,
        balanceCents: (c: CashflowCell) => c.balanceCents + 200_000,
      },
      {
        // Runs to the right edge, so the body box leaves the plot on one side
        // and this line's own flat run fills it on the other. The body rung
        // therefore refuses it and it falls to the gutter.
        id: "flat",
        label: "Flat",
        balanceCents: flat,
      },
    ];
    const bought = render(() => (
      <CashflowScrubChart
        cells={makeCells(16)}
        selected={3}
        onScrub={() => {}}
        balanceSeries={series("right")}
      />
    ));
    expect(zoneOfLabel(bought.container, "Optimistic")).toBe("right");
    expect(zoneOfLabel(bought.container, "Flat")).toBe("right");

    // Same two labels, nothing explicit: no gutter exists to fall into, so
    // both are dropped. An "auto" label never reaches a rung it did not buy.
    const unbought = render(() => (
      <CashflowScrubChart
        cells={makeCells(16)}
        selected={3}
        onScrub={() => {}}
        balanceSeries={series("auto")}
      />
    ));
    expect(zoneOfLabel(unbought.container, "Optimistic")).toBeNull();
    expect(zoneOfLabel(unbought.container, "Flat")).toBeNull();
    expect(plotRightOf(unbought.container)).toBe(
      chartWidthOf(unbought.container),
    );
  });

  it("honours a commanded zone on both the right and the below rung", () => {
    const { container } = render(() => (
      <CashflowScrubChart
        cells={makeCells(16)}
        selected={3}
        onScrub={() => {}}
        balanceSeries={[
          {
            id: "optimistic",
            label: "Optimistic",
            labelPlacement: "right",
            balanceCents: (c) => c.balanceCents + 200_000,
          },
          {
            id: "pessimistic",
            label: "Pessimistic",
            labelPlacement: "below",
            balanceCents: (c) => c.balanceCents - 200_000,
          },
        ]}
      />
    ));
    expect(zoneOfLabel(container, "Optimistic")).toBe("right");
    // "below" skips the body rung it could otherwise have taken.
    expect(zoneOfLabel(container, "Pessimistic")).toBe("below");
  });

  // ── Label hover → line emphasis ─────────────────────────────────────
  // A label names one line and the chart ships no legend, so pointing at a
  // label is the only way to read the pairing. `pointerenter` and
  // `pointerleave` do not bubble, so each test sends them straight to the
  // label group. jsdom ships no `PointerEvent`, so a `MouseEvent` carries
  // them — the same convention the shared `pointer` driver uses.

  /** The label group whose text reads `text`. */
  const labelGroup = (container: HTMLElement, text: string): Element =>
    Array.from(
      container.querySelectorAll(".sui-cashflow-scrub-chart__label-group"),
    ).find(
      (g) =>
        g.querySelector(".sui-cashflow-scrub-chart__label")?.textContent ===
        text,
    )!;

  /** Send one non-bubbling pointer event to `el`. */
  const hover = (el: Element, type: "pointerenter" | "pointerleave"): void => {
    el.dispatchEvent(new MouseEvent(type));
  };

  /**
   * Give the chart's lines a real stroke for one test.
   *
   * jsdom loads no stylesheet of its own, so every line resolves an empty
   * stroke and the chart reads that as a line which paints nothing. The
   * emphasis machinery then mutes nothing, by design. A hover test therefore
   * has to state the colours the browser would have supplied.
   */
  const paint = (css: string): void => {
    const style = document.createElement("style");
    style.setAttribute("data-test-paint", "");
    style.textContent = css;
    document.head.appendChild(style);
  };

  /** Take every painted rule away, so one test's colours never reach another. */
  afterEach(() => {
    for (const el of Array.from(
      document.head.querySelectorAll("style[data-test-paint]"),
    )) {
      el.remove();
    }
  });

  /** Every drawn line, in one colour — what the shipped stylesheet does. */
  const PAINT_LINES = ".sui-cashflow-scrub-chart__line { stroke: rgb(9,9,9); }";

  /** Whether `selector` matches an element carrying `modifier`. */
  const hasClass = (
    container: HTMLElement,
    selector: string,
    modifier: string,
  ): boolean => container.querySelector(selector)!.classList.contains(modifier);

  const HIGHLIGHTED = "sui-cashflow-scrub-chart__line--highlighted";
  const MUTED = "sui-cashflow-scrub-chart__line--muted";
  /** The running-balance line, which no label names. */
  const PRIMARY =
    ".sui-cashflow-scrub-chart__line:not(.sui-cashflow-scrub-chart__line--series)";

  /**
   * Two labelled lines beside the primary line. Both stop early, so each last
   * point has clear space and both labels take the body rung.
   */
  const twoLabelledLines = () => (
    <CashflowScrubChart
      cells={makeCells(16)}
      selected={3}
      onScrub={() => {}}
      balanceSeries={[
        {
          id: "upside",
          label: "Up",
          class: "up-line",
          balanceCents: stoppingAt(6, 60_000),
        },
        {
          id: "downside",
          label: "Down",
          class: "down-line",
          balanceCents: stoppingAt(11, -60_000),
        },
      ]}
    />
  );

  it("highlights the hovered label's line and mutes every other line", () => {
    paint(PAINT_LINES);
    const { container } = render(twoLabelledLines);
    hover(labelGroup(container, "Up"), "pointerenter");
    expect(hasClass(container, ".up-line", HIGHLIGHTED)).toBe(true);
    expect(hasClass(container, ".down-line", MUTED)).toBe(true);
    // No `lineLabel` here, so no label names the primary line and it can only
    // step back.
    expect(hasClass(container, PRIMARY, MUTED)).toBe(true);
    // The hovered label's own text takes the highlight too.
    expect(
      labelGroup(container, "Up")
        .querySelector(".sui-cashflow-scrub-chart__label")!
        .classList.contains("sui-cashflow-scrub-chart__label--highlighted"),
    ).toBe(true);
  });

  it("clears every emphasis class when the pointer leaves the label", () => {
    paint(PAINT_LINES);
    const { container } = render(twoLabelledLines);
    hover(labelGroup(container, "Up"), "pointerenter");
    hover(labelGroup(container, "Up"), "pointerleave");
    expect(hasClass(container, ".up-line", HIGHLIGHTED)).toBe(false);
    expect(hasClass(container, ".down-line", MUTED)).toBe(false);
    expect(hasClass(container, PRIMARY, MUTED)).toBe(false);
  });

  it("leaves the resting chart free of every emphasis class", () => {
    const { container } = render(twoLabelledLines);
    expect(container.querySelectorAll('[class*="--highlighted"]').length).toBe(
      0,
    );
    expect(container.querySelectorAll('[class*="--muted"]').length).toBe(0);
  });

  it("highlights the marker a hovered marker label names", () => {
    paint(".sui-cashflow-scrub-chart__marker-line { stroke: rgb(9,9,9); }");
    const { container } = render(() => (
      <CashflowScrubChart
        cells={makeCells(16)}
        selected={3}
        onScrub={() => {}}
        // An explicit zone hands the caption to the ladder, which is what
        // makes the marker answer to a label id at all.
        markers={[{ index: 8, label: "Raise", labelPlacement: "right" }]}
      />
    ));
    hover(labelGroup(container, "Raise"), "pointerenter");
    expect(
      hasClass(
        container,
        ".sui-cashflow-scrub-chart__marker",
        "sui-cashflow-scrub-chart__marker--highlighted",
      ),
    ).toBe(true);
  });

  // ── Label colour, read back from the drawn line ─────────────────────
  // The chart reads each line's RESOLVED stroke from the DOM and writes it on
  // the label as an INLINE STYLE. jsdom loads no CSS file, so
  // `getComputedStyle(...).stroke` is empty here and no colour ever resolves.
  // These tests lock the two halves that DO run under jsdom: the lines carry
  // the attributes the effect queries, and a label with no colour keeps the
  // exact render it had before this feature.

  it("tags every series line with its own series id", () => {
    const { container } = render(twoLabelledLines);
    const ids = Array.from(container.querySelectorAll("[data-series-id]")).map(
      (el) => el.getAttribute("data-series-id"),
    );
    expect(ids).toEqual(["upside", "downside"]);
    // The primary line is no series, so it carries its own attribute instead.
    const primary = container.querySelector(PRIMARY)!;
    expect(primary.hasAttribute("data-series-id")).toBe(false);
    expect(primary.getAttribute("data-primary-line")).toBe("primary");
  });

  it("tags every marker line with its own marker index", () => {
    const { container } = render(() => (
      <CashflowScrubChart
        cells={makeCells(16)}
        scrub={false}
        markers={[{ index: 3 }, { index: 8, variant: "rule", label: "Today" }]}
      />
    ));
    expect(
      container
        .querySelector(".sui-cashflow-scrub-chart__marker-line")!
        .getAttribute("data-marker-index"),
    ).toBe("3");
    expect(
      container
        .querySelector(".sui-cashflow-scrub-chart__rule-line")!
        .getAttribute("data-marker-index"),
    ).toBe("8");
  });

  /** The `<text>` of the label whose text reads `text`. */
  const labelText = (container: HTMLElement, text: string): SVGTextElement =>
    labelGroup(container, text).querySelector(
      ".sui-cashflow-scrub-chart__label",
    ) as SVGTextElement;

  it("gives a label NO colour of its own when its line resolves none", () => {
    const { container } = render(twoLabelledLines);
    const labels = Array.from(
      container.querySelectorAll(".sui-cashflow-scrub-chart__label"),
    );
    expect(labels.length).toBe(2);
    for (const label of labels) {
      // Neither carrier: the stylesheet's own default paints the label.
      expect(label.hasAttribute("fill")).toBe(false);
      expect((label as SVGTextElement).style.fill).toBe("");
    }
  });

  it("paints a label in the resolved colour of the line it names", () => {
    // jsdom resolves `stroke` from a real style sheet, so one <style> gives
    // the series a colour the effect can read. No harness, no fake DOM.
    paint(".up-line { stroke: rgb(1, 2, 3); }");
    const { container } = render(twoLabelledLines);
    // The colour rides on the INLINE STYLE, never on a `fill` attribute.
    expect(labelText(container, "Up").style.fill).toBe("rgb(1, 2, 3)");
    expect(labelText(container, "Up").hasAttribute("fill")).toBe(false);
    // The other line resolves no colour, so its label keeps the CSS default.
    expect(labelText(container, "Down").style.fill).toBe("");
  });

  it("keeps the label colour under a plain label rule from a stale stylesheet", () => {
    // The defect this guards: a consumer imports the package's `index.css`,
    // `package.json` maps that to `dist/index.css` even while the `source`
    // condition is active, and a SECOND copy of the label rule reaches the
    // page. A `fill` presentation attribute loses to that rule, so every
    // label drew in the default grey. An inline style wins instead.
    paint(
      ".up-line { stroke: rgb(1, 2, 3); }" +
        " .sui-cashflow-scrub-chart__label { fill: rgb(9, 9, 9); }",
    );
    const { container } = render(twoLabelledLines);
    const computed = (text: string): string =>
      getComputedStyle(labelText(container, text)).getPropertyValue("fill");
    expect(computed("Up")).toBe("rgb(1, 2, 3)");
    // The label with no colour of its own takes the stale rule, as it must.
    expect(computed("Down")).toBe("rgb(9, 9, 9)");
  });

  it("gives every drawn label a hit box to point at", () => {
    const { container } = render(twoLabelledLines);
    // The component always passes `onHoverLabel`, so the layer always draws
    // the box. One box per drawn label, and no box without a label.
    expect(
      container.querySelectorAll(".sui-cashflow-scrub-chart__label-hit").length,
    ).toBe(2);
    expect(
      container.querySelectorAll(".sui-cashflow-scrub-chart__label").length,
    ).toBe(2);
  });
  // ── The primary line's own label (the `lineLabel` prop) ─────────────

  /** A chart that names the primary line and one overlay series. */
  const labelledPrimary = () => (
    <CashflowScrubChart
      cells={makeCells(16)}
      selected={3}
      onScrub={() => {}}
      lineLabel="Balance"
      lineLabelPlacement="right"
      balanceSeries={[
        {
          id: "upside",
          label: "Up",
          class: "up-line",
          balanceCents: stoppingAt(6, 60_000),
        },
      ]}
    />
  );

  it("draws a label for the primary line when `lineLabel` names one", () => {
    const { container } = render(labelledPrimary);
    const texts = Array.from(
      container.querySelectorAll(".sui-cashflow-scrub-chart__label"),
    ).map((el) => el.textContent);
    expect(texts).toContain("Balance");
  });

  it("highlights the primary line and mutes the series lines on its label", () => {
    paint(PAINT_LINES);
    const { container } = render(labelledPrimary);
    hover(labelGroup(container, "Balance"), "pointerenter");
    expect(hasClass(container, PRIMARY, HIGHLIGHTED)).toBe(true);
    expect(hasClass(container, ".up-line", MUTED)).toBe(true);
  });

  it("draws NO primary label, and no emphasis, without `lineLabel`", () => {
    const { container } = render(() => (
      <CashflowScrubChart
        cells={makeCells(16)}
        selected={3}
        onScrub={() => {}}
      />
    ));
    // No label reaches the ladder, so the layer never draws.
    expect(
      container.querySelectorAll(".sui-cashflow-scrub-chart__label").length,
    ).toBe(0);
    expect(
      container.querySelector(".sui-cashflow-scrub-chart__label-overlay"),
    ).toBeNull();
    // The primary line keeps the class list it had before this prop existed.
    expect(container.querySelector(PRIMARY)!.getAttribute("class")).toBe(
      "sui-cashflow-scrub-chart__line",
    );
  });

  it("mutes NOTHING when the hovered label names a line that paints nothing", () => {
    // The consumer's own class draws no stroke — the carrier series pattern.
    // The other line paints, so the chart could mute it, and must not.
    paint(".up-line { stroke: none; } .down-line { stroke: rgb(9,9,9); }");
    const { container } = render(twoLabelledLines);
    hover(labelGroup(container, "Up"), "pointerenter");
    expect(hasClass(container, ".up-line", HIGHLIGHTED)).toBe(false);
    expect(hasClass(container, ".down-line", MUTED)).toBe(false);
    expect(hasClass(container, PRIMARY, MUTED)).toBe(false);
    expect(container.querySelectorAll('[class*="--muted"]').length).toBe(0);
  });

  // ── The highlight rule, read from the stylesheet ────────────────────
  // jsdom applies no imported stylesheet, so a computed-style assertion would
  // pass whatever the CSS says. Reading the rule is the honest gate — the same
  // method `BucketQueue/styling.test.ts` uses.

  it("restores full strength on the highlighted line", () => {
    const css = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "./CashflowScrubChart.css"),
      "utf8",
    );
    const body = (selector: string): string =>
      css.slice(css.indexOf(selector) + selector.length).split("}")[0];
    const line = body(
      ".sui-cashflow-scrub-chart__line.sui-cashflow-scrub-chart__line--highlighted {",
    );
    // A consumer's series class dims its line with `stroke-opacity`, so width
    // alone leaves the highlighted line faded.
    expect(line).toContain("stroke-width: 3");
    expect(line).toContain("stroke-opacity: 1");
    expect(line).toContain("opacity: 1");
  });

  it("gives a highlighted band no rule, so it looks exactly as it does at rest", () => {
    const css = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "./CashflowScrubChart.css"),
      "utf8",
    );
    // The band is context around the highlighted line, not the subject of the
    // highlight. It only has to escape the muting rule. A rule that forced
    // `fill-opacity: 1` painted a range cone as a solid slab over the plot.
    expect(/__band--highlighted\s*\{/.test(css)).toBe(false);
    // The muting rule still names the band, so the modifier keeps its job.
    expect(css).toContain("sui-cashflow-scrub-chart__band--muted");
  });

  it("marks the hovered series' band highlighted without restyling it", () => {
    paint(PAINT_LINES);
    const { container } = render(() => (
      <CashflowScrubChart
        cells={makeCells(16)}
        scrub={false}
        balanceSeries={[
          {
            id: "upside",
            label: "Up",
            class: "up-line",
            balanceCents: (c: CashflowCell) => c.balanceCents + 60_000,
            fill: {},
          },
        ]}
      />
    ));
    hover(labelGroup(container, "Up"), "pointerenter");
    const band = container.querySelector(
      ".sui-cashflow-scrub-chart__band",
    ) as Element;
    expect(
      band.classList.contains("sui-cashflow-scrub-chart__band--highlighted"),
    ).toBe(true);
    // The band keeps its resting classes, so the resting rule still paints it.
    expect(band.classList.contains("sui-cashflow-scrub-chart__band")).toBe(
      true,
    );
  });

  it("suppresses the hover readout while the pointer rests on a label", () => {
    const { container } = render(() => (
      <CashflowScrubChart
        cells={makeCells(16)}
        scrub={false}
        hover
        renderHoverTooltip={(_cell, index) => (
          <div data-testid="label-tt">idx {index}</div>
        )}
        balanceSeries={[
          {
            id: "upside",
            label: "Up",
            class: "up-line",
            balanceCents: stoppingAt(6, 60_000),
          },
        ]}
      />
    ));
    // A pointer over the plot draws the readout.
    pointer(container.querySelector(".sui-scrub-chart__frame") as Element).move(
      {
        clientX: 200,
        clientY: 30,
      },
    );
    expect(
      container.querySelector(".sui-cashflow-scrub-chart__hover-rule"),
    ).toBeTruthy();
    expect(container.querySelector("[data-testid=label-tt]")).toBeTruthy();
    // A pointer on a label reads the label, not the day. The readout goes.
    hover(labelGroup(container, "Up"), "pointerenter");
    expect(
      container.querySelector(".sui-cashflow-scrub-chart__hover-rule"),
    ).toBeNull();
    expect(container.querySelector("[data-testid=label-tt]")).toBeNull();
  });
});
