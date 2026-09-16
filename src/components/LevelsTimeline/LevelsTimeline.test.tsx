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
import {
  type Level,
  type Mutation,
  type Series,
  type TimeDomain,
  type Transfer,
  levelsRailGeometry,
} from "./geometry";
import { map } from "../../fn";

const DOMAIN: TimeDomain = [new Date("2025-01-01"), new Date("2026-01-01")];

const MUTATIONS: readonly Mutation[] = [
  { id: "m1", at: new Date("2025-04-01"), label: "1" },
  { id: "m2", at: new Date("2025-07-01"), label: "2" },
  { id: "m3", at: new Date("2025-10-01"), label: "3" },
];

const SERIES: readonly Series[] = [
  {
    id: "peter",
    label: "Peter",
    points: [
      { at: new Date("2025-01-01"), level: 12000 },
      { at: new Date("2025-04-01"), level: 15000 },
    ],
  },
  {
    id: "total",
    label: "Total",
    primary: true,
    points: [
      { at: new Date("2025-01-01"), level: 20000 },
      { at: new Date("2025-10-01"), level: 23500 },
    ],
  },
];

describe("LevelsTimeline", () => {
  it("announces each series and the numbered mutation it stepped at", () => {
    const { container } = render(() => (
      <LevelsTimeline series={SERIES} mutations={MUTATIONS} domain={DOMAIN} />
    ));
    const label = container.querySelector("title")?.textContent ?? "";
    expect(label).toContain("3 marked mutations");
    expect(label).toContain("Peter: 12000, stepping at 1 to 15000.");
    expect(label).toContain("Total: 20000, stepping at 3 to 23500.");
  });

  it("paints one stepped path per series, the primary one last and heavier", () => {
    const { container } = render(() => (
      <LevelsTimeline series={SERIES} mutations={MUTATIONS} domain={DOMAIN} />
    ));
    const paths = container.querySelectorAll(".sui-levels-timeline__line");
    expect(paths).toHaveLength(2);
    expect(
      paths[paths.length - 1].classList.contains(
        "sui-levels-timeline__line--primary",
      ),
    ).toBe(true);
    expect(paths[0].getAttribute("d")).not.toContain("NaN");
  });

  it("drops one rule per mutation and one flag carrying its number", () => {
    const { container, getByText } = render(() => (
      <LevelsTimeline series={SERIES} mutations={MUTATIONS} domain={DOMAIN} />
    ));
    expect(container.querySelectorAll(".sui-levels-timeline__rule")).toHaveLength(
      3,
    );
    expect(getByText("2")).toBeTruthy();
  });

  it("stays a readout when nothing can be selected — no buttons offered", () => {
    const { queryAllByRole } = render(() => (
      <LevelsTimeline series={SERIES} mutations={MUTATIONS} domain={DOMAIN} />
    ));
    expect(queryAllByRole("button")).toHaveLength(0);
  });

  it("offers each flag as a button when selection is wired", () => {
    const onSelect = vi.fn();
    const { getAllByRole } = render(() => (
      <LevelsTimeline
        series={SERIES}
        mutations={MUTATIONS}
        domain={DOMAIN}
        onSelectMutation={onSelect}
      />
    ));
    const flags = getAllByRole("button");
    expect(flags).toHaveLength(3);
    fireEvent.click(flags[1]);
    expect(onSelect).toHaveBeenCalledWith("m2");
  });

  it("activates a flag from the keyboard, not only the mouse", () => {
    const onSelect = vi.fn();
    const { getAllByRole } = render(() => (
      <LevelsTimeline
        series={SERIES}
        mutations={MUTATIONS}
        domain={DOMAIN}
        onSelectMutation={onSelect}
      />
    ));
    const flag = getAllByRole("button")[0];
    flag.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
    );
    expect(onSelect).toHaveBeenCalledWith("m1");
  });

  it("lights the selected flag and its rule, and mutes the rest", () => {
    const [selected, setSelected] = createSignal("m2");
    const { container } = render(() => (
      <LevelsTimeline
        series={SERIES}
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
        series={SERIES}
        mutations={MUTATIONS}
        domain={DOMAIN}
        onSelectMutation={() => undefined}
      />
    ));
    expect(
      container.querySelectorAll(".sui-levels-timeline__flag--muted"),
    ).toHaveLength(0);
  });

  it("renders an empty chart rather than throwing", () => {
    const { container } = render(() => (
      <LevelsTimeline series={[]} mutations={[]} domain={DOMAIN} />
    ));
    expect(container.querySelectorAll(".sui-levels-timeline__line")).toHaveLength(
      0,
    );
  });
});

// ============================================
// The RAIL model. The old stepped tests above stay green on purpose: `series`
// is deprecated but still shipped while scenario-board consumes it, so a
// regression there is a broken consumer, not a stale test.
// ============================================

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

  it("draws one stroke per held span, each as thick as its headcount", () => {
    const { container } = renderRails();
    const rails = container.querySelectorAll(".sui-levels-timeline__rail");
    // 3 + 2 + 2 + 1 spans.
    expect(rails).toHaveLength(8);
    const widths = map(
      (rail: Element) => Number(rail.getAttribute("stroke-width")),
      [...rails],
    );
    for (const width of widths) expect(width).toBeGreaterThan(0);
  });

  it("thins the source rail and thickens the destination across a raise", () => {
    const { container } = renderRails();
    const widthsAt = (y: number) =>
      map(
        (rail: Element) => Number(rail.getAttribute("stroke-width")),
        [
          ...container.querySelectorAll(
            `.sui-levels-timeline__rail[y1="${y}"]`,
          ),
        ],
      );
    const geometry = levelsRailGeometry({
      levels: LEVELS,
      transfers: TRANSFERS,
      mutations: MUTATIONS,
      domain: DOMAIN,
    });
    const [l6Before, l6After] = widthsAt(geometry.rails[1].y);
    expect(l6After).toBeLessThan(l6Before);
    const [l7Before, l7After] = widthsAt(geometry.rails[2].y);
    expect(l7After).toBeGreaterThan(l7Before);
  });

  it("runs a flow ribbon between the two rails at the moment of the move", () => {
    const { container } = renderRails();
    const ribbons = container.querySelectorAll(".sui-levels-timeline__ribbon");
    expect(ribbons).toHaveLength(1);
    expect(Number(ribbons[0].getAttribute("height"))).toBeGreaterThan(0);
    expect(Number(ribbons[0].getAttribute("width"))).toBeGreaterThan(0);
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

  it("keeps the flags selectable in the rail model too", () => {
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

  it("prefers levels over the deprecated series when both are passed", () => {
    const { container } = render(() => (
      <LevelsTimeline
        levels={LEVELS}
        series={SERIES}
        mutations={MUTATIONS}
        domain={DOMAIN}
      />
    ));
    expect(
      container.querySelectorAll(".sui-levels-timeline__line"),
    ).toHaveLength(0);
    expect(
      container.querySelectorAll(".sui-levels-timeline__rail").length,
    ).toBeGreaterThan(0);
  });

  it("renders an empty rail chart rather than throwing", () => {
    const { container } = render(() => (
      <LevelsTimeline levels={[]} transfers={[]} mutations={[]} domain={DOMAIN} />
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

  it("fades an open-ended flow through a mask, and leaves a move solid", () => {
    const { container } = renderOpen();
    const maskOf = (kind: string) =>
      container
        .querySelector(`.sui-levels-timeline__ribbon--${kind}`)
        ?.getAttribute("mask");
    expect(maskOf("departure")).toContain("url(#");
    expect(maskOf("hire")).toContain("url(#");
    expect(maskOf("move")).toBeNull();
  });

  it("gives every instance its own mask ids, so stacked charts don't collide", () => {
    const { container } = render(() => (
      <>
        <LevelsTimeline levels={LEVELS} transfers={OPEN} mutations={[]} domain={DOMAIN} />
        <LevelsTimeline levels={LEVELS} transfers={OPEN} mutations={[]} domain={DOMAIN} />
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
