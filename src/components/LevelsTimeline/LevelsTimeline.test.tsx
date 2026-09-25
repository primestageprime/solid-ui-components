// ============================================
// The chart is a readout that can also be driven: these tests carry the
// announcement, the paint that follows geometry, and the flag interaction.
//
// Geometry has its own suite (geometry.test.ts) and prints its table there.
// Nothing here re-asserts a coordinate — this file only checks that the paint
// follows what geometry decided.
// ============================================
import { fireEvent, render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { describe, expect, it, vi } from "vitest";
import { LevelsTimeline, createLevelsTimeline } from "./LevelsTimeline";
import { isoDayOf, pickDay } from "./geometry";
import type { Level, Mutation, TimeDomain, Transfer } from "./geometry";
import { filter, flatMap, map } from "../../fn";

const DOMAIN: TimeDomain = [new Date("2025-01-01"), new Date("2026-01-01")];

const MUTATIONS: readonly Mutation[] = [
  { id: "m1", at: new Date("2025-04-01"), label: "1" },
  { id: "m2", at: new Date("2025-07-01"), label: "2" },
  { id: "m3", at: new Date("2025-10-01"), label: "3" },
];

const LEVELS: readonly Level[] = [
  {
    id: "l5",
    label: "L5",
    value: 5000,
    points: [
      { at: new Date("2025-01-01"), count: 3 },
      { at: new Date("2025-07-01"), count: 4 },
      { at: new Date("2025-11-15"), count: 5 },
    ],
  },
  {
    id: "l6",
    label: "L6",
    value: 6500,
    points: [
      { at: new Date("2025-01-01"), count: 4 },
      { at: new Date("2025-04-01"), count: 2 },
    ],
  },
  {
    id: "l7",
    label: "L7",
    value: 8000,
    points: [
      { at: new Date("2025-01-01"), count: 2 },
      { at: new Date("2025-04-01"), count: 4 },
    ],
  },
  {
    id: "l8",
    label: "L8",
    value: 10000,
    points: [{ at: new Date("2025-07-01"), count: 1 }],
  },
];

const TRANSFERS: readonly Transfer[] = [
  { at: new Date("2025-04-01"), from: "l6", to: "l7", count: 2 },
];

const renderRails = () =>
  render(() => (
    <LevelsTimeline
      levels={LEVELS}
      transfers={TRANSFERS}
      mutations={MUTATIONS}
      domain={DOMAIN}
    />
  ));

describe("LevelsTimeline — rails", () => {
  it("announces what each level holds and what moved where", () => {
    const { container } = renderRails();
    const label = container.querySelector("desc")?.textContent ?? "";
    expect(label).toContain("Count by level");
    expect(label).toContain("L6: 4, ending at 2.");
    expect(label).toContain("2 moved from L6 to L7 at mutation 1.");
  });

  it("draws each rail as blunt closed BANDS, one per span", () => {
    const { container } = renderRails();
    // Scoped to the rail group: a CONTINUATION also carries the rail class,
    // deliberately, and it IS a curve — that is the next test.
    const rails = container.querySelectorAll(
      ".sui-levels-timeline__rail-group .sui-levels-timeline__rail",
    );
    expect(rails.length).toBeGreaterThan(4);
    for (const rail of rails) {
      const d = rail.getAttribute("d") ?? "";
      expect(d.startsWith("M ")).toBe(true);
      expect(d.endsWith("Z")).toBe(true);
      expect(d).not.toContain("NaN");
      // Nothing in a rail bends. All the curvature belongs to the ribbons.
      expect(d).not.toContain("C ");
    }
  });

  it("carries no stroke-width — a rail's thickness is its SHAPE now", () => {
    // The width lives in the band's own outline. A stroke-width here would be
    // a second, contradicting source of truth for the same number.
    const { container } = renderRails();
    for (const rail of container.querySelectorAll(
      ".sui-levels-timeline__rail",
    )) {
      expect(rail.getAttribute("stroke-width")).toBeNull();
    }
  });

  it("curves every flow, carries included, instead of dropping a vertical", () => {
    const { container } = renderRails();
    const flows = container.querySelectorAll(".sui-levels-timeline__ribbon");
    expect(flows.length).toBeGreaterThan(0);
    for (const flow of flows) {
      const d = flow.getAttribute("d") ?? "";
      expect(d).toContain("C ");
      expect(d.endsWith("Z")).toBe(true);
      expect(d).not.toContain("NaN");
    }
  });

  it("paints an unchanged rail's join with the BAND's own class", () => {
    // The regression this guards: a rail nothing happened to read as dashed —
    // bright band, dim carry, bright band — because the join was painted at
    // ribbon alpha. A continuation must be indistinguishable from the band.
    const { container } = renderRails();
    const band = container.querySelector(
      ".sui-levels-timeline__rail-group .sui-levels-timeline__rail",
    );
    const bandClass = band?.getAttribute("class") ?? "";
    const continuations = [
      ...container.querySelectorAll(".sui-levels-timeline__rail"),
    ].filter((el) => el.closest(".sui-levels-timeline__rail-group") === null);
    expect(continuations.length).toBeGreaterThan(0);
    // Same classes as a band, and no gradient fill to tint it.
    expect(
      continuations.some((el) => el.getAttribute("class") === bandClass),
    ).toBe(true);
    for (const one of continuations) {
      expect(one.getAttribute("fill")).toBeNull();
      expect(one.getAttribute("class")).not.toContain("__ribbon");
    }
  });

  it("still marks a carry across a REAL width change as a ribbon", () => {
    const { container } = renderRails();
    expect(
      container.querySelectorAll(".sui-levels-timeline__ribbon--carry").length,
    ).toBeGreaterThan(0);
  });

  it("puts NO series text on the plot — only ticks and flags", () => {
    // Peter: "don't label the series directly on the plot." Identity is
    // carried by colour and by the announcement, not by ink in the plot area.
    const { container, queryByText } = renderRails();
    expect(queryByText("L5")).toBeNull();
    expect(queryByText("L8")).toBeNull();
    expect(
      container.querySelectorAll(".sui-levels-timeline__rail-label"),
    ).toHaveLength(0);
  });

  it("drops a rule at the lone arrival that carries no flag", () => {
    const { container } = renderRails();
    const droplines = container.querySelectorAll(
      ".sui-levels-timeline__dropline",
    );
    // 2025-11-15 only: the domain start is the frame, and 04/07 wear flags.
    expect(droplines).toHaveLength(1);
  });

  it("draws no dropline where a numbered flag already rules the column", () => {
    const { container } = renderRails();
    const ruleXs = new Set(
      map(
        (rule: Element) => rule.getAttribute("x1"),
        [...container.querySelectorAll(".sui-levels-timeline__rule")],
      ),
    );
    for (const dropline of container.querySelectorAll(
      ".sui-levels-timeline__dropline",
    )) {
      expect(ruleXs.has(dropline.getAttribute("x1"))).toBe(false);
    }
  });

  it("draws nothing across a stretch nobody holds", () => {
    const emptied: readonly Level[] = [
      {
        id: "gone",
        label: "Gone",
        value: 7000,
        points: [
          { at: new Date("2025-01-01"), count: 2 },
          { at: new Date("2025-06-01"), count: 0 },
        ],
      },
    ];
    const { container } = render(() => (
      <LevelsTimeline levels={emptied} mutations={[]} domain={DOMAIN} />
    ));
    expect(
      container.querySelectorAll(".sui-levels-timeline__rail"),
    ).toHaveLength(1);
  });

  it("lights the selected flag and its rule, and mutes the rest", () => {
    // This moved across from the deleted stepped suite: selection is a
    // property of the FLAGS, which outlived the model they were written for,
    // and deleting a path must not quietly delete coverage of what it shared.
    const [selected, setSelected] = createSignal("m2");
    const { container } = render(() => (
      <LevelsTimeline
        levels={LEVELS}
        transfers={TRANSFERS}
        mutations={MUTATIONS}
        domain={DOMAIN}
        selectedMutationId={selected()}
        onSelectMutation={setSelected}
      />
    ));
    const lit = () =>
      container.querySelectorAll(".sui-levels-timeline__rule--selected");
    const muted = () =>
      container.querySelectorAll(".sui-levels-timeline__flag--muted");
    expect(lit()).toHaveLength(1);
    expect(muted()).toHaveLength(2);
    setSelected("m3");
    expect(lit()).toHaveLength(1);
    expect(
      container.querySelectorAll(".sui-levels-timeline__flag--selected"),
    ).toHaveLength(1);
  });

  it("mutes nothing while no mutation is selected", () => {
    const { container } = render(() => (
      <LevelsTimeline
        levels={LEVELS}
        transfers={TRANSFERS}
        mutations={MUTATIONS}
        domain={DOMAIN}
        onSelectMutation={() => undefined}
      />
    ));
    expect(
      container.querySelectorAll(".sui-levels-timeline__flag--muted"),
    ).toHaveLength(0);
  });

  it("stays a readout when nothing can be selected — no buttons offered", () => {
    const { queryAllByRole } = renderRails();
    expect(queryAllByRole("button")).toHaveLength(0);
  });

  it("activates a flag from the keyboard, not only the mouse", () => {
    const onSelect = vi.fn();
    const { getAllByRole } = render(() => (
      <LevelsTimeline
        levels={LEVELS}
        transfers={TRANSFERS}
        mutations={MUTATIONS}
        domain={DOMAIN}
        onSelectMutation={onSelect}
      />
    ));
    getAllByRole("button")[0].dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    );
    expect(onSelect).toHaveBeenCalledWith("m1");
  });

  it("keeps the flags clickable in the rail model too", () => {
    const onSelect = vi.fn();
    const { getAllByRole } = render(() => (
      <LevelsTimeline
        levels={LEVELS}
        transfers={TRANSFERS}
        mutations={MUTATIONS}
        domain={DOMAIN}
        onSelectMutation={onSelect}
      />
    ));
    fireEvent.click(getAllByRole("button")[2]);
    expect(onSelect).toHaveBeenCalledWith("m3");
  });

  it("renders an empty rail chart rather than throwing", () => {
    const { container } = render(() => (
      <LevelsTimeline
        levels={[]}
        transfers={[]}
        mutations={[]}
        domain={DOMAIN}
      />
    ));
    expect(
      container.querySelectorAll(".sui-levels-timeline__rail"),
    ).toHaveLength(0);
  });
});

describe("LevelsTimeline — departures and arrivals", () => {
  const OPEN: readonly Transfer[] = [
    { at: new Date("2025-04-01"), from: "l6", to: "l7", count: 2 },
    { at: new Date("2025-07-01"), from: "l7", count: 1 },
    { at: new Date("2025-07-01"), to: "l8", count: 1 },
  ];

  const renderOpen = () =>
    render(() => (
      <LevelsTimeline
        levels={LEVELS}
        transfers={OPEN}
        mutations={MUTATIONS}
        domain={DOMAIN}
      />
    ));

  it("draws all three flow kinds, each marked as what it is", () => {
    const { container } = renderOpen();
    expect(
      container.querySelectorAll(".sui-levels-timeline__ribbon--move"),
    ).toHaveLength(1);
    expect(
      container.querySelectorAll(".sui-levels-timeline__ribbon--departure"),
    ).toHaveLength(1);
    expect(
      container.querySelectorAll(".sui-levels-timeline__ribbon--arrival"),
    ).toHaveLength(1);
  });

  it("fades ONLY the open-ended flows, and by opacity rather than colour", () => {
    // The chart is one colour now, so a departure and an arrival are the same
    // shape in the same ink — the fade is the whole of what tells them apart.
    const { container } = renderOpen();
    const stopsOf = (kind: string) => {
      const fill = container
        .querySelector(`.sui-levels-timeline__ribbon--${kind}`)
        ?.getAttribute("fill");
      const id = (fill ?? "").replace(/^url\(#/, "").replace(/\)$/, "");
      return map(
        (stop: Element) => stop.getAttribute("stop-opacity"),
        [...(container.querySelector(`#${CSS.escape(id)}`)?.children ?? [])],
      );
    };
    expect(stopsOf("departure")).toEqual(["1", "0"]);
    expect(stopsOf("arrival")).toEqual(["0", "1"]);
    // A move needs no gradient at all — it is solid, one colour end to end.
    expect(
      container
        .querySelector(".sui-levels-timeline__ribbon--move")
        ?.getAttribute("fill"),
    ).toBeNull();
  });

  it("puts no series colour anywhere — identity is vertical position", () => {
    const { container } = renderOpen();
    for (const path of container.querySelectorAll("path")) {
      expect(path.getAttribute("class") ?? "").not.toContain("__tone-");
    }
  });

  it("gives every instance its own gradient ids, so stacked charts don't collide", () => {
    const { container } = render(() => (
      <>
        <LevelsTimeline
          levels={LEVELS}
          transfers={OPEN}
          mutations={[]}
          domain={DOMAIN}
        />
        <LevelsTimeline
          levels={LEVELS}
          transfers={OPEN}
          mutations={[]}
          domain={DOMAIN}
        />
      </>
    ));
    const ids = map(
      (mask: Element) => mask.getAttribute("id"),
      [...container.querySelectorAll("mask")],
    );
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("announces a departure and an arrival as what they are", () => {
    const { container } = renderOpen();
    const label = container.querySelector("desc")?.textContent ?? "";
    expect(label).toContain("1 left from L7");
    expect(label).toContain("1 joined at L8");
  });
});

describe("LevelsTimeline — fill-height", () => {
  /**
   * jsdom has no layout and no ResizeObserver, so the only way to exercise the
   * measuring path is to supply one. This stub reports the box it is told
   * about, synchronously, which is enough — `observeSize` defers with rAF only
   * when rAF exists, and vitest's environment provides it.
   */
  const withObservedBox = async (
    box: { width: number; height: number },
    run: () => void,
  ) => {
    const original = globalThis.ResizeObserver;
    class Stub {
      constructor(private readonly cb: ResizeObserverCallback) {}
      observe(target: Element) {
        this.cb(
          [
            {
              target,
              contentRect: box,
              borderBoxSize: [],
              contentBoxSize: [],
              devicePixelContentBoxSize: [],
            } as unknown as ResizeObserverEntry,
          ],
          this as unknown as ResizeObserver,
        );
      }
      unobserve() {}
      disconnect() {}
    }
    globalThis.ResizeObserver = Stub as unknown as typeof ResizeObserver;
    try {
      run();
      await new Promise((resolve) => requestAnimationFrame(resolve));
    } finally {
      globalThis.ResizeObserver = original;
    }
  };

  it("keeps the old aspect when nothing measures it", () => {
    const { container } = renderRails();
    expect(container.querySelector("svg")?.getAttribute("viewBox")).toBe(
      "0 0 640 232",
    );
  });

  it("rebuilds its viewBox to BE the box it was given, one unit per pixel", async () => {
    let container!: HTMLElement;
    await withObservedBox({ width: 800, height: 320 }, () => {
      container = renderRails().container;
    });
    expect(container.querySelector("svg")?.getAttribute("viewBox")).toBe(
      "0 0 800 320",
    );
  });

  it("keeps every rail and the axis inside the height it was given", async () => {
    let container!: HTMLElement;
    await withObservedBox({ width: 800, height: 320 }, () => {
      container = renderRails().container;
    });
    const viewHeight = 320;
    // Every command in these paths takes x,y PAIRS (M and L one, C three), so
    // the y values are the odd-indexed numbers. Taking all of them would sweep
    // in the x's, which legitimately run to 626 and would fail this.
    //
    // Guarded below: an empty `ys` would make the loop vacuous and this test
    // would pass while asserting nothing.
    const ys = flatMap(
      (el: Element) => {
        const numbers = map(
          (m: RegExpMatchArray) => Number(m[0]),
          [...(el.getAttribute("d") ?? "").matchAll(/-?\d+(?:\.\d+)?/g)],
        );
        return filter((_n: number, i: number) => i % 2 === 1, numbers);
      },
      [...container.querySelectorAll(".sui-levels-timeline__rail")],
    );
    expect(ys.length).toBeGreaterThan(0);
    // Every coordinate a band paints is inside the viewBox, top and bottom.
    for (const y of ys) {
      expect(y).toBeLessThanOrEqual(viewHeight);
      expect(y).toBeGreaterThanOrEqual(0);
    }
    const axisLabel = container.querySelector(
      ".sui-levels-timeline__tick-label",
    );
    expect(Number(axisLabel?.getAttribute("y"))).toBeLessThanOrEqual(
      viewHeight,
    );
  });
});

describe("LevelsTimeline — hover and pick", () => {
  /** jsdom gives every element a zero-size box, so fake the one we measure. */
  const withPlotBox = (run: () => void) => {
    const original = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = function rect(this: Element) {
      return this.tagName.toLowerCase() === "svg"
        ? ({ left: 0, top: 0, width: 640, height: 232 } as DOMRect)
        : ({ left: 0, top: 0, width: 0, height: 0 } as DOMRect);
    };
    try {
      run();
    } finally {
      Element.prototype.getBoundingClientRect = original;
    }
  };

  const surfaceOf = (container: HTMLElement) =>
    container.querySelector(".sui-levels-timeline__surface") as Element;

  it("offers no pick cursor when the consumer cannot pick", () => {
    const { container } = renderRails();
    expect(surfaceOf(container).getAttribute("class")).not.toContain(
      "--pickable",
    );
  });

  it("fires onPick with the SNAPPED date, not the raw pointer date", () => {
    const onPick = vi.fn();
    let container!: HTMLElement;
    withPlotBox(() => {
      container = render(() => (
        <LevelsTimeline
          levels={LEVELS}
          transfers={TRANSFERS}
          mutations={MUTATIONS}
          domain={DOMAIN}
          onPick={onPick}
        />
      )).container;
      // Half way across a one-year domain lands in early July.
      fireEvent.click(surfaceOf(container), { clientX: 320, clientY: 100 });
    });
    expect(onPick).toHaveBeenCalledTimes(1);
    const at = onPick.mock.calls[0][0] as number;
    expect(new Date(at).toISOString().slice(0, 10)).toBe("2025-07-01");
    expect(surfaceOf(container).getAttribute("class")).toContain("--pickable");
  });

  it("does not fire onPick when a flag is clicked — that is selection", () => {
    const onPick = vi.fn();
    const onSelect = vi.fn();
    const { getAllByRole } = render(() => (
      <LevelsTimeline
        levels={LEVELS}
        transfers={TRANSFERS}
        mutations={MUTATIONS}
        domain={DOMAIN}
        onPick={onPick}
        onSelectMutation={onSelect}
      />
    ));
    fireEvent.click(getAllByRole("button")[0]);
    expect(onSelect).toHaveBeenCalledWith("m1");
    expect(onPick).not.toHaveBeenCalled();
  });

  it("shows a crosshair and a table of value against count on hover", () => {
    let container!: HTMLElement;
    withPlotBox(() => {
      container = render(() => (
        <LevelsTimeline
          levels={LEVELS}
          transfers={TRANSFERS}
          mutations={MUTATIONS}
          domain={DOMAIN}
          formatValue={(value) => `$${value / 1000}k`}
        />
      )).container;
      fireEvent.pointerMove(surfaceOf(container), {
        clientX: 400,
        clientY: 100,
      });
    });
    expect(
      container.querySelectorAll(".sui-levels-timeline__crosshair"),
    ).toHaveLength(1);
    const cells = map(
      (el: Element) => el.textContent,
      [...container.querySelectorAll(".sui-levels-timeline__panel-cell")],
    );
    // Highest value first, and the consumer's formatter used for that column.
    expect(cells[0]).toBe("$10k");
    // x=400 of 640 is ~60% across the PLOT, whose left edge is now the value
    // axis' gutter rather than the bare margin — mid-August, snapped back to
    // the nearer month boundary.
    expect(
      container.querySelector(".sui-levels-timeline__panel-date")?.textContent,
    ).toBe("Aug 2025");
  });

  it("clears the readout when the pointer leaves the plot", () => {
    let container!: HTMLElement;
    withPlotBox(() => {
      container = renderRails().container;
      fireEvent.pointerMove(surfaceOf(container), {
        clientX: 400,
        clientY: 100,
      });
      fireEvent.pointerLeave(surfaceOf(container));
    });
    expect(
      container.querySelectorAll(".sui-levels-timeline__crosshair"),
    ).toHaveLength(0);
  });
});

describe("LevelsTimeline — compact chrome in a short box", () => {
  /** A count of one per level, seven levels, unevenly spaced. */
  const BOARD: readonly Level[] = map(
    (figure: number) => ({
      id: `L${figure}`,
      label: `L${figure}`,
      value: figure,
      points: [{ at: new Date("2025-01-01"), count: 1 }],
    }),
    [2000, 3000, 4000, 6000, 7000, 9000, 10000],
  );

  const withObservedBox = async (
    box: { width: number; height: number },
    run: () => void,
  ) => {
    const original = globalThis.ResizeObserver;
    class Stub {
      constructor(private readonly cb: ResizeObserverCallback) {}
      observe(target: Element) {
        this.cb(
          [{ target, contentRect: box } as unknown as ResizeObserverEntry],
          this as unknown as ResizeObserver,
        );
      }
      unobserve() {}
      disconnect() {}
    }
    globalThis.ResizeObserver = Stub as unknown as typeof ResizeObserver;
    try {
      run();
      await new Promise((resolve) => requestAnimationFrame(resolve));
    } finally {
      globalThis.ResizeObserver = original;
    }
  };

  const renderIn = async (box: { width: number; height: number }) => {
    let container!: HTMLElement;
    await withObservedBox(box, () => {
      container = render(() => (
        <LevelsTimeline levels={BOARD} mutations={MUTATIONS} domain={DOMAIN} />
      )).container;
    });
    return container;
  };

  it("DRAWS RAILS in an 800x156 box — the reported regression", async () => {
    const container = await renderIn({ width: 800, height: 156 });
    const rails = container.querySelectorAll(
      ".sui-levels-timeline__rail-group .sui-levels-timeline__rail",
    );
    expect(rails.length).toBeGreaterThan(0);
    for (const rail of rails) {
      const d = rail.getAttribute("d") ?? "";
      expect(d).not.toContain("NaN");
      // A band of zero height would repeat its y — the old bug drew exactly
      // that, and it is what made the chart look empty.
      const ys = filter(
        (_n: number, i: number) => i % 2 === 1,
        map(
          (m: RegExpMatchArray) => Number(m[0]),
          [...d.matchAll(/-?\d+(?:\.\d+)?/g)],
        ),
      );
      expect(new Set(ys).size).toBeGreaterThan(1);
    }
  });

  it("keeps the viewBox aspect equal to the box's, so nothing letterboxes", async () => {
    const container = await renderIn({ width: 2202, height: 116 });
    const viewBox = container.querySelector("svg")?.getAttribute("viewBox");
    const [, , w, h] = (viewBox ?? "").split(" ").map(Number);
    expect(w / h).toBeCloseTo(2202 / 116, 3);
    // Widened, because the height hit its floor.
    expect(w).toBeGreaterThan(640);
  });

  it("puts the hover surface across the WHOLE plot, not a centred strip", async () => {
    // This is what stopped onPick firing on the board: the pickable surface
    // was the letterboxed strip rather than the plot the reader sees.
    const container = await renderIn({ width: 2202, height: 116 });
    const surface = container.querySelector(".sui-levels-timeline__surface");
    const viewBox = container.querySelector("svg")?.getAttribute("viewBox");
    const [, , w] = (viewBox ?? "").split(" ").map(Number);
    // The right margin is still the bare one; the LEFT is the value axis'
    // gutter, so the surface is the plot between them.
    const plotLeft = Number(surface?.getAttribute("x"));
    expect(plotLeft).toBeGreaterThan(14);
    expect(Number(surface?.getAttribute("width"))).toBe(w - 14 - plotLeft);
  });

  it("labels the axis with exact days — a one-year domain ticks each month", async () => {
    // Peter, 2026-09-24: dated labels, the year only on the first and at a
    // year change; a year's span ticks monthly. The flags fall on month
    // starts, so every flag date is labelled.
    const container = await renderIn({ width: 800, height: 320 });
    const labels = map(
      (el: Element) => el.textContent,
      [...container.querySelectorAll(".sui-levels-timeline__tick-label")],
    );
    expect(labels[0]).toBe("2025-01-01");
    expect(labels).toContain("04-01");
    expect(labels).toContain("07-01");
    expect(labels).toContain("10-01");
    expect(
      container.querySelectorAll(".sui-levels-timeline__tick"),
    ).toHaveLength(13);
  });

  it("paints the date labels flat, and a longer tick at every flag date", async () => {
    const container = await renderIn({ width: 800, height: 320 });
    const label = container.querySelector(".sui-levels-timeline__tick-label");
    expect(label?.getAttribute("transform")).toBeNull();
    expect(
      container.querySelectorAll(".sui-levels-timeline__tick--event"),
    ).toHaveLength(3);
  });
});

describe("LevelsTimeline — the board's wide short cell", () => {
  const withObservedBox = async (
    box: { width: number; height: number },
    run: () => void,
  ) => {
    const original = globalThis.ResizeObserver;
    class Stub {
      constructor(private readonly cb: ResizeObserverCallback) {}
      observe(target: Element) {
        this.cb(
          [{ target, contentRect: box } as unknown as ResizeObserverEntry],
          this as unknown as ResizeObserver,
        );
      }
      unobserve() {}
      disconnect() {}
    }
    globalThis.ResizeObserver = Stub as unknown as typeof ResizeObserver;
    try {
      run();
      await new Promise((resolve) => requestAnimationFrame(resolve));
    } finally {
      globalThis.ResizeObserver = original;
    }
  };

  const renderIn = async (box: { width: number; height: number }) => {
    let container!: HTMLElement;
    await withObservedBox(box, () => {
      container = render(() => (
        <LevelsTimeline
          levels={LEVELS}
          transfers={TRANSFERS}
          mutations={MUTATIONS}
          domain={DOMAIN}
          onPick={() => undefined}
        />
      )).container;
    });
    const viewBox = container.querySelector("svg")?.getAttribute("viewBox");
    const [, , width, height] = (viewBox ?? "").split(" ").map(Number);
    return { container, width, height };
  };

  it("matches 2218x134 within 2% and gives the pick surface the whole width", async () => {
    // The board's cell. The old fixed-640 viewBox was 2.76:1 against a 16.6:1
    // box, so `meet` drew the chart into 16% of the width — which is why the
    // board could neither see the rails nor click them.
    const { container, width, height } = await renderIn({
      width: 2218,
      height: 134,
    });
    expect(Math.abs(width / height / (2218 / 134) - 1)).toBeLessThan(0.02);
    const surface = container.querySelector(".sui-levels-timeline__surface");
    const covered = Number(surface?.getAttribute("width")) / width;
    expect(covered).toBeGreaterThanOrEqual(0.95);
  });

  it("leaves a 718x260 card looking as it did — one unit was already ~one px", async () => {
    const { container, width, height } = await renderIn({
      width: 718,
      height: 260,
    });
    expect([width, height]).toEqual([718, 260]);
    // A year of months: every tick drawn, labels as many as fit flat.
    expect(
      container.querySelectorAll(".sui-levels-timeline__tick"),
    ).toHaveLength(13);
    expect(
      container.querySelectorAll(".sui-levels-timeline__tick-label").length,
    ).toBeGreaterThanOrEqual(5);
    expect(
      container.querySelectorAll(
        ".sui-levels-timeline__rail-group .sui-levels-timeline__rail",
      ).length,
    ).toBeGreaterThan(0);
  });

  it("keeps chrome the same PIXEL size on a narrow card and a wide one", async () => {
    // The zoom fault: the same label used to paint at 10px on a bench card and
    // 31px on the board, because the unit changed size with the card.
    const narrow = await renderIn({ width: 718, height: 260 });
    const wide = await renderIn({ width: 2218, height: 260 });
    const fontOf = (c: HTMLElement) =>
      c.querySelector(".sui-levels-timeline__flag-box")?.getAttribute("height");
    expect(fontOf(narrow.container)).toBe(fontOf(wide.container));
    expect(narrow.width / 718).toBe(wide.width / 2218);
  });
});

describe("LevelsTimeline — a zero box must never latch", () => {
  /**
   * A harness that can SEQUENCE observations, which is what this needs: the
   * board's failure was a first delivery of 0×0 followed by a real size, and a
   * single-shot stub cannot express that.
   */
  const withSequencedBoxes = async (
    boxes: readonly { width: number; height: number }[],
    run: () => void,
  ) => {
    const originalRO = globalThis.ResizeObserver;
    const originalRect = Element.prototype.getBoundingClientRect;
    let deliver: ((box: { width: number; height: number }) => void) | undefined;
    // The element's own rect follows the latest delivered box, so a
    // re-measurement after a zero sees what layout would have settled on.
    let current = boxes[boxes.length - 1];
    Element.prototype.getBoundingClientRect = function rect(this: Element) {
      return this.classList?.contains("sui-levels-timeline")
        ? ({ left: 0, top: 0, ...current } as DOMRect)
        : ({ left: 0, top: 0, width: 0, height: 0 } as DOMRect);
    };
    class Stub {
      constructor(private readonly cb: ResizeObserverCallback) {}
      observe(target: Element) {
        deliver = (box) =>
          this.cb(
            [{ target, contentRect: box } as unknown as ResizeObserverEntry],
            this as unknown as ResizeObserver,
          );
      }
      unobserve() {}
      disconnect() {}
    }
    globalThis.ResizeObserver = Stub as unknown as typeof ResizeObserver;
    try {
      // Mount with the FIRST box already in place as the element's rect, so
      // the on-mount measurement sees the same thing the observer will.
      current = boxes[0];
      run();
      for (const box of boxes) {
        current = box;
        deliver?.(box);
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
    } finally {
      globalThis.ResizeObserver = originalRO;
      Element.prototype.getBoundingClientRect = originalRect;
    }
  };

  const viewBoxOf = (container: HTMLElement) =>
    container.querySelector("svg")?.getAttribute("viewBox");

  it("recovers when the FIRST observation is 0x0 and the next is real", async () => {
    // The board's chain: viewport calc → three flex columns with min-height: 0
    // → card → grow box. Nothing in it has a height when the innermost child
    // first mounts, so 0×0 is a legitimate first answer — and latching it left
    // the chart at its default size in a 2218×134 cell forever.
    let container!: HTMLElement;
    await withSequencedBoxes(
      [
        { width: 0, height: 0 },
        { width: 2218, height: 134 },
      ],
      () => {
        container = render(() => (
          <LevelsTimeline
            levels={LEVELS}
            mutations={MUTATIONS}
            domain={DOMAIN}
            onPick={() => undefined}
          />
        )).container;
      },
    );
    expect(viewBoxOf(container)).toBe("0 0 2218 134");
  });

  it("ignores a zero rather than storing it, so the default survives intact", async () => {
    let container!: HTMLElement;
    await withSequencedBoxes([{ width: 0, height: 0 }], () => {
      container = render(() => (
        <LevelsTimeline levels={LEVELS} mutations={MUTATIONS} domain={DOMAIN} />
      )).container;
    });
    // Never measured, so the width-driven default — not a collapsed viewBox.
    expect(viewBoxOf(container)).toBe("0 0 640 232");
  });

  it("lets the LATEST non-zero observation win, however many arrive", async () => {
    let container!: HTMLElement;
    await withSequencedBoxes(
      [
        { width: 0, height: 0 },
        { width: 800, height: 300 },
        { width: 0, height: 0 },
        { width: 2218, height: 134 },
      ],
      () => {
        container = render(() => (
          <LevelsTimeline
            levels={LEVELS}
            mutations={MUTATIONS}
            domain={DOMAIN}
          />
        )).container;
      },
    );
    expect(viewBoxOf(container)).toBe("0 0 2218 134");
  });

  it("re-measures when the ONLY observation is a zero but layout has settled", async () => {
    // THE board's actual mechanism, and the one case the old code could not
    // recover from: the observer fires once, early, with 0×0; layout then
    // settles; and because the element never changes size again, no second
    // observation ever arrives. Storing that zero left the chart at its
    // default forever. Here the element's own rect is real while the only
    // delivery is a zero — so the ONLY way to reach the right answer is to go
    // and look at the element instead of believing the delivery.
    const originalRO = globalThis.ResizeObserver;
    const originalRect = Element.prototype.getBoundingClientRect;
    const real = { width: 2218, height: 134 };
    Element.prototype.getBoundingClientRect = function rect(this: Element) {
      return this.classList?.contains("sui-levels-timeline")
        ? ({ left: 0, top: 0, ...real } as DOMRect)
        : ({ left: 0, top: 0, width: 0, height: 0 } as DOMRect);
    };
    class ZeroOnce {
      constructor(private readonly cb: ResizeObserverCallback) {}
      observe(target: Element) {
        this.cb(
          [
            {
              target,
              contentRect: { width: 0, height: 0 },
            } as unknown as ResizeObserverEntry,
          ],
          this as unknown as ResizeObserver,
        );
      }
      unobserve() {}
      disconnect() {}
    }
    globalThis.ResizeObserver = ZeroOnce as unknown as typeof ResizeObserver;
    let container!: HTMLElement;
    try {
      container = render(() => (
        <LevelsTimeline levels={LEVELS} mutations={MUTATIONS} domain={DOMAIN} />
      )).container;
      await new Promise((resolve) => requestAnimationFrame(resolve));
    } finally {
      globalThis.ResizeObserver = originalRO;
      Element.prototype.getBoundingClientRect = originalRect;
    }
    expect(viewBoxOf(container)).toBe("0 0 2218 134");
  });

  it("measures the HOST, not the svg it draws into", async () => {
    // The svg is `height: 100%` of the host, so measuring the svg would
    // measure our own output and tell us nothing about the consumer's box.
    let container!: HTMLElement;
    await withSequencedBoxes([{ width: 2218, height: 134 }], () => {
      container = render(() => (
        <LevelsTimeline levels={LEVELS} mutations={MUTATIONS} domain={DOMAIN} />
      )).container;
    });
    const host = container.querySelector(".sui-levels-timeline");
    expect(host?.tagName.toLowerCase()).toBe("div");
    expect(viewBoxOf(container)).toBe("0 0 2218 134");
  });
});

describe("LevelsTimeline — updates must not recreate the DOM", () => {
  /** A level set whose VALUE moves, as a consumer's drag moves it. */
  const movingLevels = (step: number): readonly Level[] => [
    {
      id: "a",
      label: "A",
      value: 5000,
      points: [{ at: new Date("2025-01-01"), count: 2 }],
    },
    {
      id: "b",
      label: "B",
      value: 7000 + step * 100,
      points: [{ at: new Date("2025-01-01"), count: 1 }],
    },
    {
      id: "c",
      label: "C",
      value: 10000,
      points: [
        { at: new Date("2025-01-01"), count: 1 },
        { at: new Date("2025-07-01"), count: 2 },
      ],
    },
  ];

  const railsIn = (container: HTMLElement) => [
    ...container.querySelectorAll(
      ".sui-levels-timeline__rail-group .sui-levels-timeline__rail",
    ),
  ];
  const defIdsIn = (container: HTMLElement) =>
    map(
      (el: Element) => el.getAttribute("id"),
      [...container.querySelectorAll("linearGradient")],
    );

  it("keeps the SAME rail nodes across ten moving updates", () => {
    // The flicker: every update rebuilt the geometry into fresh objects, and a
    // keyed `For` treats fresh objects as new rows — so every band and every
    // ribbon was unmounted and remounted on each drag step, which is a flash.
    const [levels, setLevels] = createSignal(movingLevels(0));
    const { container } = render(() => (
      <LevelsTimeline
        levels={levels()}
        transfers={TRANSFERS}
        mutations={MUTATIONS}
        domain={DOMAIN}
      />
    ));
    const before = railsIn(container);
    expect(before.length).toBeGreaterThan(0);
    for (let step = 1; step <= 10; step += 1) setLevels(movingLevels(step));
    const after = railsIn(container);
    expect(after).toHaveLength(before.length);
    for (const [index, node] of after.entries()) {
      expect(node).toBe(before[index]);
    }
  });

  it("updates the rail's `d` in place — the shape moves, the node does not", () => {
    const [levels, setLevels] = createSignal(movingLevels(0));
    const { container } = render(() => (
      <LevelsTimeline levels={levels()} mutations={MUTATIONS} domain={DOMAIN} />
    ));
    // The SECOND rail group is level "b", the one whose value moves. Indexing
    // the flat rail list would land on level "a", which does not move —
    // every rail is split at every change, so the flat list interleaves.
    const groupOf = (index: number) =>
      container.querySelectorAll(".sui-levels-timeline__rail-group")[index];
    const node = groupOf(1).querySelector(".sui-levels-timeline__rail");
    const before = node?.getAttribute("d");
    setLevels(movingLevels(9));
    expect(groupOf(1).querySelector(".sui-levels-timeline__rail")).toBe(node);
    expect(node?.getAttribute("d")).not.toBe(before);
  });

  it("keeps the gradient ids stable, so defs do not churn", () => {
    const [levels, setLevels] = createSignal(movingLevels(0));
    const { container } = render(() => (
      <LevelsTimeline
        levels={levels()}
        transfers={[
          { at: new Date("2025-07-01"), from: "a", to: "c", count: 1 },
          { at: new Date("2025-07-01"), from: "b", count: 1 },
        ]}
        mutations={MUTATIONS}
        domain={DOMAIN}
      />
    ));
    const before = defIdsIn(container);
    expect(before.length).toBeGreaterThan(0);
    for (let step = 1; step <= 10; step += 1) setLevels(movingLevels(step));
    expect(defIdsIn(container)).toEqual(before);
  });

  it("keeps the flag nodes across updates too", () => {
    const [levels, setLevels] = createSignal(movingLevels(0));
    const { container } = render(() => (
      <LevelsTimeline levels={levels()} mutations={MUTATIONS} domain={DOMAIN} />
    ));
    const before = [
      ...container.querySelectorAll(".sui-levels-timeline__flag"),
    ];
    for (let step = 1; step <= 10; step += 1) setLevels(movingLevels(step));
    const after = [...container.querySelectorAll(".sui-levels-timeline__flag")];
    for (const [index, node] of after.entries()) {
      expect(node).toBe(before[index]);
    }
  });
});

describe("LevelsTimeline — the first frame must already be right", () => {
  it("has the MEASURED viewBox on first render, with no rAF and no observer", () => {
    // The sliders agent's finding, checked here: a `ref` runs before the
    // element is in the document, so anything that measures from a ref reads
    // zero and only recovers when observeSize's rAF-deferred delivery lands —
    // one wrong frame on a visible screen, and a frozen wrong chart in a
    // hidden tab where rAF may never run at all.
    //
    // This asserts the synchronous path: a ResizeObserver that NEVER delivers,
    // no rAF awaited, and the viewBox is still the measured one. If the first
    // measurement were deferred, this would read the 640x232 default.
    const originalRO = globalThis.ResizeObserver;
    const originalRect = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = function rect(this: Element) {
      return this.classList?.contains("sui-levels-timeline")
        ? ({ left: 0, top: 0, width: 2218, height: 134 } as DOMRect)
        : ({ left: 0, top: 0, width: 0, height: 0 } as DOMRect);
    };
    class NeverDelivers {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    globalThis.ResizeObserver =
      NeverDelivers as unknown as typeof ResizeObserver;
    try {
      const { container } = render(() => (
        <LevelsTimeline levels={LEVELS} mutations={MUTATIONS} domain={DOMAIN} />
      ));
      // Read IMMEDIATELY — no await, no frame.
      expect(container.querySelector("svg")?.getAttribute("viewBox")).toBe(
        "0 0 2218 134",
      );
    } finally {
      globalThis.ResizeObserver = originalRO;
      Element.prototype.getBoundingClientRect = originalRect;
    }
  });

  it("does not re-measure on a data update — only a resize moves the viewBox", () => {
    // If a prop change triggered a re-measure cycle, every drag step would
    // resize the viewBox and that is its own flicker.
    const originalRect = Element.prototype.getBoundingClientRect;
    let reads = 0;
    Element.prototype.getBoundingClientRect = function rect(this: Element) {
      if (this.classList?.contains("sui-levels-timeline")) {
        reads += 1;
        return { left: 0, top: 0, width: 2218, height: 134 } as DOMRect;
      }
      return { left: 0, top: 0, width: 0, height: 0 } as DOMRect;
    };
    try {
      const [levels, setLevels] = createSignal(LEVELS);
      const { container } = render(() => (
        <LevelsTimeline
          levels={levels()}
          mutations={MUTATIONS}
          domain={DOMAIN}
        />
      ));
      const afterMount = reads;
      const viewBox = container.querySelector("svg")?.getAttribute("viewBox");
      for (let step = 0; step < 10; step += 1) {
        setLevels([...LEVELS]);
      }
      expect(reads).toBe(afterMount);
      expect(container.querySelector("svg")?.getAttribute("viewBox")).toBe(
        viewBox,
      );
    } finally {
      Element.prototype.getBoundingClientRect = originalRect;
    }
  });
});

describe("LevelsTimeline — the hover readout must not grow", () => {
  const withTextMetrics = async (run: () => Promise<void> | void) => {
    const proto = globalThis.SVGElement?.prototype as unknown as {
      getComputedTextLength?: () => number;
    };
    const original = proto?.getComputedTextLength;
    // Give every text a width proportional to its content, as a browser would.
    if (proto !== undefined) {
      proto.getComputedTextLength = function length(this: Element) {
        return (this.textContent ?? "").length * 5;
      };
    }
    const originalRect = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = function rect(this: Element) {
      return this.tagName.toLowerCase() === "svg"
        ? ({ left: 0, top: 0, width: 640, height: 232 } as DOMRect)
        : ({ left: 0, top: 0, width: 0, height: 0 } as DOMRect);
    };
    // A browser's getBBox on the panel GROUP returns the union of its
    // children, so it includes the background rect whose width is the value
    // being computed. Without this the feedback loop cannot be reproduced —
    // jsdom has no getBBox at all, so the buggy code silently measured zero.
    const originalBBox = (
      proto as unknown as { getBBox?: () => { width: number } }
    )?.getBBox;
    if (proto !== undefined) {
      (proto as unknown as { getBBox: () => DOMRect }).getBBox = function bbox(
        this: Element,
      ) {
        const widths = [...this.querySelectorAll<Element>("rect, text")].map(
          (child) =>
            child.tagName.toLowerCase() === "rect"
              ? Number(child.getAttribute("width") ?? 0)
              : (child.textContent ?? "").length * 5,
        );
        return {
          x: 0,
          y: 0,
          width: widths.length === 0 ? 0 : Math.max(...widths),
          height: 0,
        } as DOMRect;
      };
    }
    try {
      // Awaited INSIDE the stubbed window: the measurement is deferred a
      // microtask, and flushing it after the stubs came down was why this
      // harness could not reproduce the growth it exists to catch.
      await run();
    } finally {
      if (proto !== undefined) {
        proto.getComputedTextLength = original;
        (proto as unknown as { getBBox?: unknown }).getBBox = originalBBox;
      }
      Element.prototype.getBoundingClientRect = originalRect;
    }
  };

  const panelWidthIn = (container: HTMLElement) =>
    container
      .querySelector(".sui-levels-timeline__panel-box")
      ?.getAttribute("width");

  it("holds ONE width across twenty hovers at the same x", async () => {
    // Peter: "the tooltip widens until it's off the screen". The panel used to
    // measure its own GROUP, which contains the background rect whose width is
    // the value being set — so each move added the padding again.
    let container!: HTMLElement;
    let first: string | null | undefined;
    await withTextMetrics(async () => {
      container = render(() => (
        <LevelsTimeline
          levels={LEVELS}
          transfers={TRANSFERS}
          mutations={MUTATIONS}
          domain={DOMAIN}
          formatValue={(value) => `$${value / 1000}k`}
        />
      )).container;
      const surface = container.querySelector(
        ".sui-levels-timeline__surface",
      ) as Element;
      const hover = async () => {
        fireEvent.pointerMove(surface, { clientX: 300, clientY: 100 });
        await new Promise((resolve) => setTimeout(resolve, 0));
      };
      await hover();
      first = panelWidthIn(container);
      for (let move = 0; move < 20; move += 1) await hover();
      expect(panelWidthIn(container)).toBe(first);
    });
  });

  it("keeps the panel inside the plot when hovering near the right edge", async () => {
    let container!: HTMLElement;
    await withTextMetrics(async () => {
      container = render(() => (
        <LevelsTimeline
          levels={LEVELS}
          transfers={TRANSFERS}
          mutations={MUTATIONS}
          domain={DOMAIN}
          formatValue={(value) => `$${value / 1000}k`}
        />
      )).container;
      const surface = container.querySelector(
        ".sui-levels-timeline__surface",
      ) as Element;
      fireEvent.pointerMove(surface, { clientX: 636, clientY: 100 });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    const panel = container.querySelector(".sui-levels-timeline__panel");
    const transform = panel?.getAttribute("transform") ?? "";
    const left = Number(/translate\(([-\d.]+)/.exec(transform)?.[1]);
    const width = Number(panelWidthIn(container));
    // Flipped to the left of the anchor, and its right edge inside the plot.
    expect(left + width).toBeLessThanOrEqual(640 - 14 + 0.001);
  });
});

describe("LevelsTimeline — the SVG title is a name, not a paragraph", () => {
  it("keeps <title> short — a browser paints it as a native tooltip", () => {
    const { container } = renderRails();
    const title = container.querySelector("title")?.textContent ?? "";
    expect(title.length).toBeLessThan(40);
    expect(title).not.toContain("Count by level");
  });

  it("puts the announcement in <desc>, which is never painted", () => {
    const { container } = renderRails();
    const desc = container.querySelector("desc")?.textContent ?? "";
    expect(desc).toContain("Count by level");
    expect(desc.length).toBeGreaterThan(40);
  });
});

describe("LevelsTimeline — a consumer-PINNED value domain", () => {
  /**
   * Three levels, the TOP one climbing. Derived, the y range widens with it
   * and the middle rail slides even though its own value never changed.
   * Pinned, the middle rail holds still — which is the whole point of the
   * prop for a consumer watching one value move against a fixed axis.
   */
  const climbingLevels = (top: number): readonly Level[] => [
    {
      id: "a",
      label: "A",
      value: 5000,
      points: [{ at: new Date("2025-01-01"), count: 1 }],
    },
    {
      id: "b",
      label: "B",
      value: 7000,
      points: [{ at: new Date("2025-01-01"), count: 1 }],
    },
    {
      id: "c",
      label: "C",
      value: top,
      points: [{ at: new Date("2025-01-01"), count: 1 }],
    },
  ];

  const middleRailPath = (container: HTMLElement): string | null | undefined =>
    container
      .querySelectorAll(".sui-levels-timeline__rail-group")[1]
      ?.querySelector(".sui-levels-timeline__rail")
      ?.getAttribute("d");

  it("holds the other rails still while one value climbs", () => {
    const [levels, setLevels] = createSignal(climbingLevels(10000));
    const { container } = render(() => (
      <LevelsTimeline
        levels={levels()}
        mutations={MUTATIONS}
        domain={DOMAIN}
        valueDomain={[0, 20000]}
      />
    ));
    const before = middleRailPath(container);
    expect(before).toBeTruthy();
    setLevels(climbingLevels(16000));
    expect(middleRailPath(container)).toBe(before);
  });

  it("without the pin, the same climb slides the rail that did not move", () => {
    const [levels, setLevels] = createSignal(climbingLevels(10000));
    const { container } = render(() => (
      <LevelsTimeline levels={levels()} mutations={MUTATIONS} domain={DOMAIN} />
    ));
    const before = middleRailPath(container);
    setLevels(climbingLevels(16000));
    expect(middleRailPath(container)).not.toBe(before);
  });

  it("clamps a level outside the pinned range rather than widening it", () => {
    const inside = render(() => (
      <LevelsTimeline
        levels={climbingLevels(9000)}
        mutations={MUTATIONS}
        domain={DOMAIN}
        valueDomain={[5000, 9000]}
      />
    )).container;
    const outside = render(() => (
      <LevelsTimeline
        levels={climbingLevels(30000)}
        mutations={MUTATIONS}
        domain={DOMAIN}
        valueDomain={[5000, 9000]}
      />
    )).container;
    // The middle rail is untouched by the level that ran off the top.
    expect(middleRailPath(outside)).toBe(middleRailPath(inside));
  });
});

describe("LevelsTimeline — the value axis is painted", () => {
  const renderWithAxis = () =>
    render(() => (
      <LevelsTimeline
        levels={LEVELS}
        transfers={TRANSFERS}
        mutations={MUTATIONS}
        domain={DOMAIN}
        valueDomain={[4000, 12000]}
        formatValue={(value) => `$${value / 1000}k`}
      />
    )).container;

  it("draws an axis line and a tick per nice value", () => {
    const container = renderWithAxis();
    expect(
      container.querySelectorAll(".sui-levels-timeline__y-axis-line"),
    ).toHaveLength(1);
    expect(
      container.querySelectorAll(".sui-levels-timeline__y-tick").length,
    ).toBeGreaterThanOrEqual(2);
  });

  it("labels the ticks with the consumer's formatter", () => {
    const container = renderWithAxis();
    const labels = map(
      (el: Element) => el.textContent,
      [...container.querySelectorAll(".sui-levels-timeline__y-tick-label")],
    );
    expect(labels).toContain("$8k");
    // …and every label is inside the gutter, to the LEFT of the plot.
    const surface = container.querySelector(".sui-levels-timeline__surface");
    const plotLeft = Number(surface?.getAttribute("x"));
    const xs = map(
      (el: Element) => Number(el.getAttribute("x")),
      [...container.querySelectorAll(".sui-levels-timeline__y-tick-label")],
    );
    for (const x of xs) expect(x).toBeLessThan(plotLeft);
  });
});

describe("LevelsTimeline — numbered, hoverable, draggable flags", () => {
  /** jsdom gives every element a zero-size box; one viewBox unit = one px. */
  const withSvgBox = (run: () => void) => {
    const original = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = function rect(this: Element) {
      return this.tagName.toLowerCase() === "svg"
        ? ({ left: 0, top: 0, width: 640, height: 232 } as DOMRect)
        : ({ left: 0, top: 0, width: 0, height: 0 } as DOMRect);
    };
    try {
      run();
    } finally {
      Element.prototype.getBoundingClientRect = original;
    }
  };

  const DATED: readonly Mutation[] = [
    // A consumer passing DATES as labels — thorcasting's shape.
    {
      id: "b",
      at: new Date("2025-10-15"),
      label: "10-15",
      details: ["Person 2"],
    },
    {
      id: "a",
      at: new Date("2025-09-01"),
      label: "09-01",
      details: ["Payroll 1", "Person 3"],
    },
    { id: "c", at: new Date("2025-12-01"), label: "12-01" },
  ];
  const FALL: TimeDomain = [new Date("2025-08-01"), new Date("2026-01-01")];

  const flagOf = (container: HTMLElement, id: string) =>
    container.querySelector(`[data-mutation-id="${id}"]`) as Element;
  const numbersOf = (container: HTMLElement) =>
    map(
      (el: Element) => el.textContent,
      [...container.querySelectorAll(".sui-levels-timeline__flag-label")],
    );

  it("paints each flag's NUMBER in time order, never the consumer's label", () => {
    const { container } = render(() => (
      <LevelsTimeline levels={LEVELS} mutations={DATED} domain={FALL} />
    ));
    expect(numbersOf(container)).toEqual(["1", "2", "3"]);
    const boxes = map(
      (el: Element) => el.getAttribute("width"),
      [...container.querySelectorAll(".sui-levels-timeline__flag-box")],
    );
    expect(new Set(boxes).size).toBe(1);
  });

  it("names a flag by number, label and exact day", () => {
    const { getAllByRole } = render(() => (
      <LevelsTimeline
        levels={LEVELS}
        mutations={DATED}
        domain={FALL}
        onSelectMutation={() => {}}
      />
    ));
    expect(getAllByRole("button")[1].getAttribute("aria-label")).toBe(
      "Mutation 2, 10-15, 2025-10-15",
    );
  });

  it("shows the exact day and the changes on hover, and hides them after", () => {
    const { container } = render(() => (
      <LevelsTimeline levels={LEVELS} mutations={DATED} domain={FALL} />
    ));
    expect(
      container.querySelector(".sui-levels-timeline__flag-tip"),
    ).toBeNull();
    fireEvent.pointerEnter(flagOf(container, "a"));
    const tip = container.querySelector(".sui-levels-timeline__flag-tip");
    expect(
      tip?.querySelector(".sui-levels-timeline__panel-date")?.textContent,
    ).toBe("2025-09-01");
    expect(
      map(
        (el: Element) => el.textContent,
        [...(tip?.querySelectorAll(".sui-levels-timeline__panel-cell") ?? [])],
      ),
    ).toEqual(["Payroll 1", "Person 3"]);
    fireEvent.pointerLeave(flagOf(container, "a"));
    expect(
      container.querySelector(".sui-levels-timeline__flag-tip"),
    ).toBeNull();
  });

  /** A controlled harness: the consumer moves the event when told to. */
  const renderDraggable = () => {
    const onSelect = vi.fn();
    const moves: string[] = [];
    const [mutations, setMutations] = createSignal<readonly Mutation[]>(DATED);
    let container!: HTMLElement;
    withSvgBox(() => {
      container = render(() => (
        <LevelsTimeline
          levels={LEVELS}
          mutations={mutations()}
          domain={FALL}
          onSelectMutation={onSelect}
          onMoveMutation={(id, at) => {
            moves.push(`${id}@${isoDayOf(at)}`);
            setMutations((before) =>
              map(
                (one: Mutation) => (one.id === id ? { ...one, at } : one),
                before,
              ),
            );
          }}
        />
      )).container;
    });
    return { container, onSelect, moves, mutations };
  };

  it("drags a flag to a new day, clamped a day short of its neighbour", () => {
    const { container, onSelect, moves } = renderDraggable();
    withSvgBox(() => {
      const flag = flagOf(container, "a");
      const x = Number(
        container
          .querySelector('[data-mutation-id="a"] text')
          ?.getAttribute("x"),
      );
      fireEvent.pointerDown(flag, { button: 0, pointerId: 1, clientX: x });
      // Far past the 10-15 neighbour.
      fireEvent.pointerMove(flag, { pointerId: 1, clientX: 600 });
      expect(
        container
          .querySelector(".sui-levels-timeline")
          ?.getAttribute("data-dragging-mutation"),
      ).toBe("a");
      fireEvent.pointerUp(flag, { pointerId: 1, clientX: 600 });
      fireEvent.click(flag);
    });
    expect(moves).toEqual(["a@2025-10-14"]);
    // The trailing click of a drag does not select.
    expect(onSelect).not.toHaveBeenCalled();
    // Still numbered 1: the clamp keeps time order.
    expect(numbersOf(container)).toEqual(["1", "2", "3"]);
  });

  it("treats a press that barely moves as a click, which selects", () => {
    const { container, onSelect, moves } = renderDraggable();
    withSvgBox(() => {
      const flag = flagOf(container, "b");
      fireEvent.pointerDown(flag, { button: 0, pointerId: 1, clientX: 300 });
      fireEvent.pointerMove(flag, { pointerId: 1, clientX: 301 });
      fireEvent.pointerUp(flag, { pointerId: 1, clientX: 301 });
      fireEvent.click(flag);
    });
    expect(moves).toEqual([]);
    expect(onSelect).toHaveBeenCalledWith("b");
  });

  it("nudges a day with the arrow keys, under the same clamp", () => {
    const { container, moves } = renderDraggable();
    fireEvent.keyDown(flagOf(container, "b"), { key: "ArrowLeft" });
    expect(moves).toEqual(["b@2025-10-14"]);
  });

  it("draws a leader for a flag nudged off its rule by a close neighbour", () => {
    const close: readonly Mutation[] = [
      { id: "a", at: new Date("2025-10-01"), label: "a" },
      { id: "b", at: new Date("2025-10-02"), label: "b" },
    ];
    const { container } = render(() => (
      <LevelsTimeline levels={LEVELS} mutations={close} domain={FALL} />
    ));
    expect(
      container.querySelectorAll(".sui-levels-timeline__leader"),
    ).toHaveLength(2);
  });

  it("does not drag when the consumer cannot move events", () => {
    const { container } = render(() => (
      <LevelsTimeline levels={LEVELS} mutations={DATED} domain={FALL} />
    ));
    expect(flagOf(container, "a").getAttribute("class")).not.toContain(
      "--draggable",
    );
  });
});

describe("LevelsTimeline — a curried pick strategy decides what onPick reports", () => {
  const withSvgBox = (run: () => void) => {
    const original = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = function rect(this: Element) {
      return this.tagName.toLowerCase() === "svg"
        ? ({ left: 0, top: 0, width: 640, height: 232 } as DOMRect)
        : ({ left: 0, top: 0, width: 0, height: 0 } as DOMRect);
    };
    try {
      run();
    } finally {
      Element.prototype.getBoundingClientRect = original;
    }
  };
  const surfaceOf = (container: HTMLElement) =>
    container.querySelector(".sui-levels-timeline__surface") as Element;
  const DayPickTimeline = createLevelsTimeline({ pickAt: pickDay });

  it("reports the whole DAY with pickDay, and the MONTH without a strategy", () => {
    const picked: string[] = [];
    withSvgBox(() => {
      const byDay = render(() => (
        <DayPickTimeline
          levels={LEVELS}
          mutations={[]}
          domain={DOMAIN}
          onPick={(at) => picked.push(`day ${isoDayOf(at)}`)}
        />
      )).container;
      const byMonth = render(() => (
        <LevelsTimeline
          levels={LEVELS}
          mutations={[]}
          domain={DOMAIN}
          onPick={(at) => picked.push(`month ${isoDayOf(at)}`)}
        />
      )).container;
      // Mid-plot: x 320 of 640, a moment in early July 2025.
      fireEvent.click(surfaceOf(byDay), { clientX: 320, clientY: 100 });
      fireEvent.click(surfaceOf(byMonth), { clientX: 320, clientY: 100 });
    });
    expect(picked).toHaveLength(2);
    const [day, month] = picked;
    expect(day).toMatch(/^day 2025-0[67]-\d\d$/);
    expect(day).not.toBe("day 2025-07-01");
    expect(month).toBe("month 2025-07-01");
  });

  it("refreshes the hover readout when the data changes under a still pointer", () => {
    const [levels, setLevels] = createSignal<readonly Level[]>(LEVELS);
    let container!: HTMLElement;
    withSvgBox(() => {
      container = render(() => (
        <DayPickTimeline levels={levels()} mutations={[]} domain={DOMAIN} />
      )).container;
      fireEvent.pointerMove(surfaceOf(container), {
        clientX: 320,
        clientY: 100,
      });
    });
    const counts = () =>
      map(
        (el: Element) => el.textContent,
        [
          ...container.querySelectorAll(
            ".sui-levels-timeline__panel-cell--count",
          ),
        ],
      );
    const before = counts();
    expect(before.length).toBeGreaterThan(0);
    setLevels(
      map(
        (level: Level) => ({ ...level, points: [{ at: DOMAIN[0], count: 9 }] }),
        LEVELS,
      ),
    );
    expect(counts()).not.toEqual(before);
    expect(new Set(counts())).toEqual(new Set(["9"]));
  });
});
