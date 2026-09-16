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
import type { Mutation, Series, TimeDomain } from "./geometry";

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
