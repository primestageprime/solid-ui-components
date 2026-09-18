// ============================================
// PairedMutationSliders — mounting tests.
//
// `pairs.test.ts` already proves the projection, and MarkedSlider's
// `geometry.test.ts` proves every number on a dial. What is left to prove here
// is that the DOM carries the one thing this component adds over a row of
// single dials: THE MEASURE INDEX. Both dials must emit, each with its own
// index, on its own scale, through its own formatter; a pin must reach the
// same measure of its peers and no other; and the reserved slots must hold
// their space so nothing jumps under a pointer mid-gesture.
// ============================================
import { fireEvent, render } from "@solidjs/testing-library";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { type FakeSizer, installFakeSizer } from "../../test-utils";
import { ADD_SLOT, ARROW_SLOT } from "../MutationSliders/rows";
import {
  PairedMutationSliders,
  createPairedMutationSliders,
} from "./PairedMutationSliders";
import { PAIR_SLOT, type PairedMutationEntity } from "./pairs";
import type { PairedMeasureAxes } from "./axes";

// Kobalte's Slider measures its track through ResizeObserver; jsdom lacks it.
let sizer: FakeSizer;
beforeAll(() => {
  sizer = installFakeSizer();
});
afterAll(() => sizer.restore());

/**
 * The hourly board's two axes, generically stated: a count on measure 0 and a
 * rate on measure 1. They share no domain, no grid and no formatter, which is
 * the entire reason this component is a sibling of `MutationSliders` rather
 * than a configuration of it.
 */
const AXES: PairedMeasureAxes = [
  { label: "Hrs/wk", domain: [0, 80], snap: 1, format: (n) => `${n}h` },
  { label: "$/hr", domain: [0, 300], snap: 5, format: (n) => `$${n}` },
];

/** Three services: a rise, a fall and an arrival. */
const THREE: readonly PairedMutationEntity[] = [
  {
    id: "design",
    label: "Design",
    measures: [
      { prior: 10, value: 20, range: [0, 40] },
      { prior: 120, value: 150, range: [100, 200] },
    ],
  },
  {
    id: "build",
    label: "Build",
    measures: [
      { prior: 30, value: 25, range: [0, 40] },
      { prior: 90, value: 90, range: [80, 130] },
    ],
  },
  {
    id: "care",
    label: "Care",
    measures: [
      { prior: null, value: 5, range: [0, 40] },
      { prior: null, value: 100, range: [80, 130] },
    ],
  },
];

/** The same three with Design removed: BOTH measures lose their value. */
const WITH_DESIGN_REMOVED: readonly PairedMutationEntity[] = [
  {
    ...THREE[0],
    measures: [
      { ...THREE[0].measures[0], value: null },
      { ...THREE[0].measures[1], value: null },
    ],
  },
  THREE[1],
  THREE[2],
];

/** A button by its accessible name, or null. Paging controls come and go. */
const queryButton = (container: HTMLElement, label: string): Element | null =>
  container.querySelector(`button[aria-label="${label}"]`);

describe("PairedMutationSliders", () => {
  it("draws TWO dials per present entity — one per measure", () => {
    const { container } = render(() => (
      <PairedMutationSliders entities={THREE} axes={AXES} onChange={() => {}} />
    ));
    expect(container.querySelectorAll('[role="slider"]')).toHaveLength(6);
  });

  it("draws a range band for EVERY measure of every entity, removed ones included", () => {
    const { container } = render(() => (
      <PairedMutationSliders
        entities={WITH_DESIGN_REMOVED}
        axes={AXES}
        onChange={() => {}}
      />
    ));
    // Six bands, four thumbs: a removed entity keeps both allowances and
    // loses both future amounts.
    expect(container.querySelectorAll(".sui-marked-slider__band")).toHaveLength(
      6,
    );
    expect(container.querySelectorAll('[role="slider"]')).toHaveLength(4);
  });

  it("puts each measure on its OWN scale and its OWN formatter", () => {
    const { getByLabelText } = render(() => (
      <PairedMutationSliders entities={THREE} axes={AXES} onChange={() => {}} />
    ));
    const hours = getByLabelText("Design Hrs/wk");
    const rate = getByLabelText("Design $/hr");
    expect(hours.getAttribute("aria-valuetext")).toBe("20h");
    expect(rate.getAttribute("aria-valuetext")).toBe("$150");
    // The BAND's edges, per measure — not one shared domain.
    expect(hours.getAttribute("aria-valuemax")).toBe("40");
    expect(rate.getAttribute("aria-valuemin")).toBe("100");
  });

  describe("the measure index reaches the callback", () => {
    it("emits index 0 from the first dial", () => {
      const onChange = vi.fn();
      const { getByLabelText } = render(() => (
        <PairedMutationSliders
          entities={THREE}
          axes={AXES}
          onChange={onChange}
        />
      ));
      fireEvent.keyDown(getByLabelText("Design Hrs/wk"), { key: "ArrowUp" });
      expect(onChange).toHaveBeenCalledWith("design", 0, 21);
    });

    it("emits index 1 from the second dial, on the second grid", () => {
      const onChange = vi.fn();
      const { getByLabelText } = render(() => (
        <PairedMutationSliders
          entities={THREE}
          axes={AXES}
          onChange={onChange}
        />
      ));
      // `snap: 5` on the rate axis, so one arrow is five dollars, not one.
      fireEvent.keyDown(getByLabelText("Design $/hr"), { key: "ArrowUp" });
      expect(onChange).toHaveBeenCalledWith("design", 1, 155);
    });

    it("commits through onChangeEnd with the same index", () => {
      const onChangeEnd = vi.fn();
      const { getByLabelText } = render(() => (
        <PairedMutationSliders
          entities={THREE}
          axes={AXES}
          onChange={() => {}}
          onChangeEnd={onChangeEnd}
        />
      ));
      fireEvent.keyDown(getByLabelText("Build $/hr"), { key: "ArrowDown" });
      expect(onChangeEnd).toHaveBeenCalledWith("build", 1, 85);
    });

    it("never emits past a measure's own range", () => {
      const onChange = vi.fn();
      const { getByLabelText } = render(() => (
        <PairedMutationSliders
          entities={THREE}
          axes={AXES}
          onChange={onChange}
        />
      ));
      const rate = getByLabelText("Build $/hr");
      fireEvent.focus(rate);
      // End runs for the top of the DOMAIN ($300); the range must catch it.
      fireEvent.keyDown(rate, { key: "End" });
      expect(onChange).toHaveBeenCalledWith("build", 1, 130);
    });
  });

  describe("pinning is measure-local", () => {
    /** Select two names, then report everything the component emitted. */
    const pinTwo = () => {
      const onChange =
        vi.fn<(id: string, measure: 0 | 1, value: number) => void>();
      const result = render(() => (
        <PairedMutationSliders
          entities={THREE}
          axes={AXES}
          onChange={(id, measure, value) => onChange(id, measure, value)}
        />
      ));
      fireEvent.click(result.getByText("Design"));
      fireEvent.click(result.getByText("Build"));
      return { ...result, onChange };
    };

    it("levels EACH measure against its own peers when the group forms", () => {
      const { onChange } = pinTwo();
      // Hours: 20 vs 25 → Design rises to 25 and nothing else moves.
      expect(onChange).toHaveBeenCalledWith("design", 0, 25);
      // Rates: 150 vs 90 → Build rises, stopped at its own $130 ceiling.
      expect(onChange).toHaveBeenCalledWith("build", 1, 130);
      // ...and neither measure borrowed the other's number.
      expect(onChange).not.toHaveBeenCalledWith("design", 0, 150);
      expect(onChange).not.toHaveBeenCalledWith("build", 0, 130);
    });

    it("moves only the DRAGGED measure across the selection", () => {
      const { getByLabelText, onChange } = pinTwo();
      onChange.mockClear();
      // One arrow on Design's HOURS dial. BOTH selected entities' hours move;
      // neither entity's RATE is touched, on either of them.
      fireEvent.keyDown(getByLabelText("Design Hrs/wk"), { key: "ArrowUp" });
      const moved = onChange.mock.calls;
      expect(moved.map(([id, index]) => `${id}:${index}`)).toEqual([
        "design:0",
        "build:0",
      ]);
    });
  });

  describe("remove and restore share one slot", () => {
    it("offers ⊗ on a present entity and calls back with its id", () => {
      const onRemove = vi.fn();
      const { container } = render(() => (
        <PairedMutationSliders
          entities={THREE}
          axes={AXES}
          onChange={() => {}}
          onRemove={onRemove}
        />
      ));
      const button = queryButton(container, "Remove Design") as HTMLElement;
      expect(button).toBeTruthy();
      fireEvent.click(button);
      expect(onRemove).toHaveBeenCalledWith("design");
    });

    it("offers ↺ in the SAME slot once both measures are null", () => {
      const onRestore = vi.fn();
      const { container } = render(() => (
        <PairedMutationSliders
          entities={WITH_DESIGN_REMOVED}
          axes={AXES}
          onChange={() => {}}
          onRemove={() => {}}
          onRestore={onRestore}
        />
      ));
      expect(queryButton(container, "Remove Design")).toBeNull();
      fireEvent.click(queryButton(container, "Restore Design") as HTMLElement);
      expect(onRestore).toHaveBeenCalledWith("design");
      // The other two are untouched — removal is per entity, not per row.
      expect(queryButton(container, "Remove Build")).toBeTruthy();
    });

    it("takes the consumer's own verbs", () => {
      const { container } = render(() => (
        <PairedMutationSliders
          entities={THREE}
          axes={AXES}
          onChange={() => {}}
          onRemove={() => {}}
          labels={{ remove: "Drop" }}
        />
      ));
      expect(queryButton(container, "Drop Design")).toBeTruthy();
      expect(queryButton(container, "Remove Design")).toBeNull();
    });
  });

  describe("the reserved slots hold their space", () => {
    it("renders the footer button even when the consumer gave it nothing to do", () => {
      const { container } = render(() => (
        <PairedMutationSliders
          entities={THREE}
          axes={AXES}
          onChange={() => {}}
        />
      ));
      // One hidden placeholder per entity: the row must stand at the same
      // height whether or not it can be edited.
      expect(
        container.querySelectorAll('button[aria-hidden="true"][disabled]'),
      ).toHaveLength(3);
    });

    it("keeps the axis line for a NEW measure, which says so instead", () => {
      const { getAllByText, container } = render(() => (
        <PairedMutationSliders
          entities={THREE}
          axes={AXES}
          onChange={() => {}}
          labels={{ new: "added" }}
        />
      ));
      // Care has no prior on either measure, so both of its meta lines read
      // the consumer's word — and the OTHER four still read the axis name, so
      // the count of lines never changes.
      expect(getAllByText("added")).toHaveLength(2);
      expect(getAllByText("Hrs/wk")).toHaveLength(2);
      // SIX meta lines either way — two per entity, whichever word each says.
      expect(container.querySelectorAll(".text--sublabel")).toHaveLength(6);
    });

    it("draws the summary line only when the consumer computes one, and keeps it when empty", () => {
      const bare = render(() => (
        <PairedMutationSliders
          entities={[THREE[0]]}
          axes={AXES}
          onChange={() => {}}
        />
      ));
      const withSummary = render(() => (
        <PairedMutationSliders
          entities={[THREE[0]]}
          axes={AXES}
          summary={() => "$15k"}
          onChange={() => {}}
        />
      ));
      const empty = render(() => (
        <PairedMutationSliders
          entities={[THREE[0]]}
          axes={AXES}
          summary={() => ""}
          onChange={() => {}}
        />
      ));
      const lines = (r: { container: HTMLElement }) =>
        r.container.querySelectorAll(".text--value").length;
      expect(withSummary.getByText("$15k")).toBeTruthy();
      // Two per-measure readouts with no summary; three with one — and an
      // EMPTY summary still occupies its line, so nothing jumps.
      expect(lines(bare)).toBe(2);
      expect(lines(withSummary)).toBe(3);
      expect(lines(empty)).toBe(3);
    });
  });

  describe("paging moves by whole PAIRS", () => {
    /** Nine services, all on one band — enough that a row must page. */
    const NINE: readonly PairedMutationEntity[] = Array.from(
      { length: 9 },
      (_, i) => ({
        id: `s${i}`,
        label: `S${i}`,
        measures: [
          { prior: 10, value: 10 + i, range: [0, 40] as const },
          { prior: 100, value: 100, range: [80, 130] as const },
        ],
      }),
    );

    /** A width that fits exactly `n` PAIRS once the arrows and + are paid for. */
    const widthFor = (n: number) => PAIR_SLOT * n + ADD_SLOT + 2 * ARROW_SLOT;

    it("shows every pair, and no chevrons, until it is measured", () => {
      // An UNMEASURED row is not a narrow one. `observeSize` no-ops wherever
      // ResizeObserver is missing (SSR, jsdom), so falling back to one entity
      // there would look like a broken component for ever.
      const { container } = render(() => (
        <PairedMutationSliders
          entities={NINE}
          axes={AXES}
          onChange={() => {}}
        />
      ));
      expect(container.querySelectorAll('[role="slider"]')).toHaveLength(18);
      expect(queryButton(container, "Next entity")).toBeNull();
    });

    it("never splits a pair — the dial count is always even", async () => {
      const { container } = render(() => (
        <PairedMutationSliders
          entities={NINE}
          axes={AXES}
          onChange={() => {}}
          onAdd={() => {}}
        />
      ));
      await sizer.resizeAll({ width: widthFor(3), height: 300 });
      expect(container.querySelectorAll('[role="slider"]')).toHaveLength(6);
      expect(queryButton(container, "Previous entity")).toBeTruthy();
      expect(queryButton(container, "Next entity")).toBeTruthy();
    });

    it("announces the window in PAIRS, agreeing with its own controls", async () => {
      // The count is ENTITIES and the dials on screen number twice it, so
      // "dials 1\u20133 of 9" would be both the wrong noun and the wrong number —
      // and it would contradict the row's own "Next entity" button.
      const { container } = render(() => (
        <PairedMutationSliders
          entities={NINE}
          axes={AXES}
          onChange={() => {}}
        />
      ));
      await sizer.resizeAll({ width: widthFor(3), height: 300 });
      expect(
        container.querySelector('[role="group"]')?.getAttribute("aria-label"),
      ).toBe("pairs 1\u20133 of 9");
    });

    it("pages by ONE entity, so every neighbouring pair stays reachable", async () => {
      const { container, queryByText } = render(() => (
        <PairedMutationSliders
          entities={NINE}
          axes={AXES}
          onChange={() => {}}
        />
      ));
      await sizer.resizeAll({ width: widthFor(3), height: 300 });
      expect(queryByText("S0")).toBeTruthy();
      fireEvent.click(queryButton(container, "Next entity") as HTMLElement);
      expect(queryByText("S0")).toBeNull();
      expect(queryByText("S1")).toBeTruthy();
    });

    it("shows ONE whole pair when the container is far too narrow for any", async () => {
      const { container } = render(() => (
        <PairedMutationSliders
          entities={NINE}
          axes={AXES}
          onChange={() => {}}
        />
      ));
      await sizer.resizeAll({ width: 30, height: 300 });
      expect(container.querySelectorAll('[role="slider"]')).toHaveLength(2);
    });

    it("draws NO chevrons when everything fits", async () => {
      const { container } = render(() => (
        <PairedMutationSliders
          entities={NINE}
          axes={AXES}
          onChange={() => {}}
          onAdd={() => {}}
        />
      ));
      await sizer.resizeAll({ width: widthFor(20), height: 300 });
      expect(container.querySelectorAll('[role="slider"]')).toHaveLength(18);
      expect(queryButton(container, "Previous entity")).toBeNull();
      // The `+` stays whatever the offset — it is the only way to add one.
      expect(queryButton(container, "Add entity")).toBeTruthy();
    });
  });

  describe("the factory", () => {
    it("curries both axes and the vocabulary, leaving data at the call site", () => {
      const Hourly = createPairedMutationSliders({
        axes: AXES,
        labels: { remove: "Drop" },
      });
      const { getByLabelText, container } = render(() => (
        <Hourly entities={THREE} onChange={() => {}} onRemove={() => {}} />
      ));
      expect(getByLabelText("Design $/hr").getAttribute("aria-valuetext")).toBe(
        "$150",
      );
      expect(queryButton(container, "Drop Design")).toBeTruthy();
    });
  });

  it("derives each measure's track from its own ranges when no domain is given", () => {
    const { getByLabelText } = render(() => (
      <PairedMutationSliders
        entities={THREE}
        axes={[{ label: "Hrs/wk" }, { label: "$/hr" }]}
        onChange={() => {}}
      />
    ));
    // Hours ranges bracket 0–40, rates 80–200 — two tracks, derived apart.
    expect(getByLabelText("Design Hrs/wk").getAttribute("aria-valuemin")).toBe(
      "0",
    );
    expect(getByLabelText("Build $/hr").getAttribute("aria-valuemax")).toBe(
      "130",
    );
  });
});
