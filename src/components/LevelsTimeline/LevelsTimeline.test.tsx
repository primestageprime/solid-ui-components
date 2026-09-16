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
import { LevelsTimeline } from "./LevelsTimeline";
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
  it("announces the headcounts and who moved where", () => {
    const { container } = renderRails();
    const label = container.querySelector("title")?.textContent ?? "";
    expect(label).toContain("Headcount by pay level");
    expect(label).toContain("L6: 4 people, ending at 2.");
    expect(label).toContain("2 people moved from L6 to L7 at mutation 1.");
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
    expect(continuations.some((el) => el.getAttribute("class") === bandClass)).toBe(
      true,
    );
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

  it("drops a rule at the lone hire that carries no flag", () => {
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

describe("LevelsTimeline — departures and hires", () => {
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
      container.querySelectorAll(".sui-levels-timeline__ribbon--hire"),
    ).toHaveLength(1);
  });

  it("fades ONLY the open-ended flows, and by opacity rather than colour", () => {
    // The chart is one colour now, so a departure and a hire are the same
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
    expect(stopsOf("hire")).toEqual(["0", "1"]);
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

  it("announces a departure and a hire as what they are", () => {
    const { container } = renderOpen();
    const label = container.querySelector("title")?.textContent ?? "";
    expect(label).toContain("1 person left from L7");
    expect(label).toContain("1 person joined at L8");
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

  it("rebuilds its viewBox to the aspect of a box that HAS a height", async () => {
    let container!: HTMLElement;
    await withObservedBox({ width: 800, height: 320 }, () => {
      container = renderRails().container;
    });
    // 800x320 is 2.5:1, so a 640-wide viewBox wants to be 256 tall.
    expect(container.querySelector("svg")?.getAttribute("viewBox")).toBe(
      "0 0 640 256",
    );
  });

  it("keeps every rail and the axis inside the height it was given", async () => {
    let container!: HTMLElement;
    await withObservedBox({ width: 800, height: 320 }, () => {
      container = renderRails().container;
    });
    const viewHeight = 256;
    // Every command in these paths takes x,y PAIRS (M and L one, C three), so
    // the y values are the odd-indexed numbers. Taking all of them would sweep
    // in the x's, which legitimately run to 626 and would fail this.
    //
    // Guarded below: an empty `ys` would make the loop vacuous and this test
    // would pass while asserting nothing.
    const ys = flatMap((el: Element) => {
      const numbers = map(
        (m: RegExpMatchArray) => Number(m[0]),
        [...((el.getAttribute("d") ?? "").matchAll(/-?\d+(?:\.\d+)?/g))],
      );
      return filter((_n: number, i: number) => i % 2 === 1, numbers);
    }, [...container.querySelectorAll(".sui-levels-timeline__rail")]);
    expect(ys.length).toBeGreaterThan(0);
    // Every coordinate a band paints is inside the viewBox, top and bottom.
    for (const y of ys) {
      expect(y).toBeLessThanOrEqual(viewHeight);
      expect(y).toBeGreaterThanOrEqual(0);
    }
    const axisLabel = container.querySelector(
      ".sui-levels-timeline__tick-label",
    );
    expect(Number(axisLabel?.getAttribute("y"))).toBeLessThanOrEqual(viewHeight);
  });
});
