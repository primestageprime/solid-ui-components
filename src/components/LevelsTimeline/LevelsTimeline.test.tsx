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
import { map } from "../../fn";

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

  it("draws each rail as a closed BAND, one per contiguous stretch", () => {
    const { container } = renderRails();
    const rails = container.querySelectorAll(".sui-levels-timeline__rail");
    // Four levels, none of them broken by an empty stretch — one band each.
    expect(rails).toHaveLength(4);
    for (const rail of rails) {
      const d = rail.getAttribute("d") ?? "";
      expect(d.startsWith("M ")).toBe(true);
      expect(d.endsWith("Z")).toBe(true);
      expect(d).not.toContain("NaN");
    }
    // A band only CURVES where its own count changes. L6 steps 4 → 2, so it
    // must; a rail that never changes is a straight bar and should stay one.
    const curved = [...rails].filter((rail) =>
      (rail.getAttribute("d") ?? "").includes("C "),
    );
    expect(curved.length).toBeGreaterThan(0);
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

  it("curves each flow instead of dropping a bare vertical", () => {
    const { container } = renderRails();
    const flows = container.querySelectorAll(".sui-levels-timeline__ribbon");
    expect(flows).toHaveLength(1);
    const d = flows[0].getAttribute("d") ?? "";
    expect(d).toContain("C ");
    expect(d.endsWith("Z")).toBe(true);
    expect(d).not.toContain("NaN");
  });

  it("names each rail with the level's own short code", () => {
    const { getByText } = renderRails();
    expect(getByText("L5")).toBeTruthy();
    expect(getByText("L8")).toBeTruthy();
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

  it("graduates every flow from its source's tone to its destination's", () => {
    const { container } = renderOpen();
    const stopsOf = (kind: string) => {
      const fill = container
        .querySelector(`.sui-levels-timeline__ribbon--${kind}`)
        ?.getAttribute("fill");
      const id = (fill ?? "").replace(/^url\(#/, "").replace(/\)$/, "");
      return map(
        (stop: Element) => stop.getAttribute("stop-color"),
        [...(container.querySelector(`#${CSS.escape(id)}`)?.children ?? [])],
      );
    };
    // A move carries both tones; a one-ended flow graduates to nothing.
    expect(stopsOf("move")).toEqual([
      "var(--sui-series-2)",
      "var(--sui-series-3)",
    ]);
    expect(stopsOf("departure")[1]).toBe("transparent");
    expect(stopsOf("hire")[0]).toBe("transparent");
  });

  it("gives every instance its own mask ids, so stacked charts don't collide", () => {
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
