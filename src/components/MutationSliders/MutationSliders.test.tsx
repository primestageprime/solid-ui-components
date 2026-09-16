// ============================================
// MutationSliders — mounting tests.
//
// geometry.test.ts already proves every number. What is left to prove here is
// that the DOM carries them: that the band clamps what the dial announces AND
// what `onChange` emits, that the change line is toned by direction, that a
// removed entity keeps its band and loses its future arrow, and that the
// readout is the future amount through the caller's own `format`.
// ============================================
import { fireEvent, render } from "@solidjs/testing-library";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createSignal } from "solid-js";
import { type FakeSizer, installFakeSizer } from "../../test-utils";
import { MutationSliders } from "./MutationSliders";
import type { Entity } from "./geometry";

// Kobalte's Slider measures its track through ResizeObserver; jsdom lacks it.
let sizer: FakeSizer;
beforeAll(() => {
  sizer = installFakeSizer();
});
afterAll(() => sizer.restore());

const DOMAIN: readonly [number, number] = [0, 200_000];

/** The sketch, in salary: three raises, two cuts, Joe removed. */
const FIXTURE: readonly Entity[] = [
  {
    id: "peter",
    label: "Peter",
    old: 90_000,
    value: 104_000,
    range: [70_000, 110_000],
  },
  {
    id: "adlai",
    label: "Adlai",
    old: 44_000,
    value: 52_000,
    range: [40_000, 60_000],
  },
  {
    id: "elaina",
    label: "Elaina",
    old: 62_000,
    value: 80_000,
    range: [55_000, 80_000],
  },
  {
    id: "reilly",
    label: "Reilly",
    old: 105_000,
    value: 74_000,
    range: [70_000, 110_000],
  },
  {
    id: "flynn",
    label: "Flynn",
    old: 78_000,
    value: 55_000,
    range: [55_000, 80_000],
  },
  {
    id: "joe",
    label: "Joe",
    old: 48_000,
    value: null,
    range: [40_000, 60_000],
  },
];

/** Thousands, the way a pay table is read. */
const asK = (n: number): string => `$${Math.round(n / 1000)}k`;

describe("MutationSliders", () => {
  it("draws one dial per entity that is still present", () => {
    const { container } = render(() => (
      <MutationSliders entities={FIXTURE} domain={DOMAIN} onChange={() => {}} />
    ));
    // Five, not six: Joe is removed and has no future amount to drag.
    expect(container.querySelectorAll('[role="slider"]')).toHaveLength(5);
    expect(
      container.querySelectorAll('[data-orientation="vertical"]').length,
    ).toBeGreaterThan(0);
  });

  it("draws a role band for EVERY entity, removed ones included", () => {
    const { container } = render(() => (
      <MutationSliders entities={FIXTURE} domain={DOMAIN} onChange={() => {}} />
    ));
    expect(
      container.querySelectorAll(".sui-mutation-sliders__band"),
    ).toHaveLength(6);
  });

  it("draws a prior arrow for every entity and a future arrow for the present ones", () => {
    const { container } = render(() => (
      <MutationSliders entities={FIXTURE} domain={DOMAIN} onChange={() => {}} />
    ));
    expect(
      container.querySelectorAll(".sui-mutation-sliders__arrow--prior"),
    ).toHaveLength(6);
    expect(
      container.querySelectorAll(".sui-mutation-sliders__arrow--future"),
    ).toHaveLength(5);
  });

  describe("the change line", () => {
    it("is green for a raise and red for a cut", () => {
      const { container } = render(() => (
        <MutationSliders
          entities={FIXTURE}
          domain={DOMAIN}
          onChange={() => {}}
        />
      ));
      expect(
        container.querySelectorAll(".sui-mutation-sliders__change--raise"),
      ).toHaveLength(3);
      expect(
        container.querySelectorAll(".sui-mutation-sliders__change--cut"),
      ).toHaveLength(2);
    });

    it("is absent when the amount did not move", () => {
      const { container } = render(() => (
        <MutationSliders
          entities={[
            {
              id: "s",
              label: "Sam",
              old: 50_000,
              value: 50_000,
              range: [40_000, 60_000],
            },
          ]}
          domain={DOMAIN}
          onChange={() => {}}
        />
      ));
      expect(
        container.querySelectorAll(".sui-mutation-sliders__change"),
      ).toHaveLength(0);
    });
  });

  describe("the role band is the clamp", () => {
    // The spec's own case: a fixture value above its band must DRAW at the
    // ceiling and ANNOUNCE the clamped figure, not the raw one.
    const OVER: Entity = {
      id: "over",
      label: "Over",
      old: 60_000,
      value: 150_000,
      range: [55_000, 80_000],
    };

    it("announces the clamped amount, not the raw one", () => {
      const { getByLabelText } = render(() => (
        <MutationSliders
          entities={[OVER]}
          domain={DOMAIN}
          onChange={() => {}}
          format={asK}
        />
      ));
      const thumb = getByLabelText("Over");
      expect(thumb.getAttribute("aria-valuenow")).toBe("80000");
      expect(thumb.getAttribute("aria-valuetext")).toBe("$80k");
    });

    it("reads out the clamped amount, not the raw one", () => {
      const { getByText } = render(() => (
        <MutationSliders
          entities={[OVER]}
          domain={DOMAIN}
          onChange={() => {}}
          format={asK}
        />
      ));
      expect(getByText("$80k")).toBeTruthy();
    });

    it("announces the BAND's edges, not the shared domain's", () => {
      const { getByLabelText } = render(() => (
        <MutationSliders
          entities={[OVER]}
          domain={DOMAIN}
          onChange={() => {}}
        />
      ));
      const thumb = getByLabelText("Over");
      expect(thumb.getAttribute("aria-valuemin")).toBe("55000");
      expect(thumb.getAttribute("aria-valuemax")).toBe("80000");
    });

    it("never emits above the band — the thumb stops at the ceiling", () => {
      const onChange = vi.fn();
      const { getByLabelText } = render(() => (
        <MutationSliders
          entities={[{ ...OVER, value: 80_000 }]}
          domain={DOMAIN}
          onChange={onChange}
        />
      ));
      // Home/End only move a FOCUSED thumb (kobalte reads `focusedThumb`),
      // so the focus is part of the gesture, not test ceremony.
      const thumb = getByLabelText("Over");
      fireEvent.focus(thumb);
      // End runs for the top of the DOMAIN; the band must catch it.
      fireEvent.keyDown(thumb, { key: "End" });
      expect(onChange).toHaveBeenCalledWith("over", 80_000);
    });

    it("never emits below the band — the thumb stops at the floor", () => {
      const onChange = vi.fn();
      const { getByLabelText } = render(() => (
        <MutationSliders
          entities={[{ ...OVER, value: 55_000 }]}
          domain={DOMAIN}
          onChange={onChange}
        />
      ));
      const thumb = getByLabelText("Over");
      fireEvent.focus(thumb);
      fireEvent.keyDown(thumb, { key: "Home" });
      expect(onChange).toHaveBeenCalledWith("over", 55_000);
    });

    it("falls back to the whole domain for an entity with no band", () => {
      // ADDITIVE: a consumer that has not adopted `range` is untouched.
      const { getByLabelText } = render(() => (
        <MutationSliders
          entities={[{ id: "n", label: "Nora", old: 6, value: 7 }]}
          domain={[0, 10]}
          onChange={() => {}}
        />
      ));
      const thumb = getByLabelText("Nora");
      expect(thumb.getAttribute("aria-valuemin")).toBe("0");
      expect(thumb.getAttribute("aria-valuemax")).toBe("10");
      expect(thumb.getAttribute("aria-valuenow")).toBe("7");
    });
  });

  it("lifts onChange with the entity's OWN id on a thumb-moving key", () => {
    const onChange = vi.fn();
    const { getByLabelText } = render(() => (
      <MutationSliders entities={FIXTURE} domain={DOMAIN} onChange={onChange} />
    ));
    fireEvent.keyDown(getByLabelText("Reilly"), { key: "ArrowUp" });
    expect(onChange).toHaveBeenCalledWith("reilly", 74_001);
  });

  // The same trap Slider pins: a dial that emitted at mount would write its
  // own starting value over the caller's stored one.
  it("does NOT emit onChange at mount", () => {
    const onChange = vi.fn();
    render(() => (
      <MutationSliders entities={FIXTURE} domain={DOMAIN} onChange={onChange} />
    ));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("moves the readout live when the caller moves the value", () => {
    const [pay, setPay] = createSignal(60_000);
    const { getByLabelText, getByText } = render(() => (
      <MutationSliders
        entities={[
          {
            id: "a",
            label: "Ana",
            old: 58_000,
            value: pay(),
            range: [55_000, 80_000],
          },
        ]}
        domain={DOMAIN}
        onChange={() => {}}
        format={asK}
      />
    ));
    expect(getByLabelText("Ana").getAttribute("aria-valuenow")).toBe("60000");
    setPay(72_000);
    expect(getByLabelText("Ana").getAttribute("aria-valuenow")).toBe("72000");
    expect(getByText("$72k")).toBeTruthy();
  });

  describe("the readout", () => {
    it("prints the FUTURE amount through the caller's format", () => {
      const { getByText } = render(() => (
        <MutationSliders
          entities={FIXTURE}
          domain={DOMAIN}
          onChange={() => {}}
          format={asK}
        />
      ));
      expect(getByText("$104k")).toBeTruthy();
    });

    it("prints the prior→future pair beneath it", () => {
      const { getByText } = render(() => (
        <MutationSliders
          entities={FIXTURE}
          domain={DOMAIN}
          onChange={() => {}}
          format={asK}
        />
      ));
      expect(getByText("$90k → $104k")).toBeTruthy();
    });

    it("says nothing numeric for a removed entity's future amount", () => {
      const { getByText } = render(() => (
        <MutationSliders
          entities={FIXTURE}
          domain={DOMAIN}
          onChange={() => {}}
          format={asK}
        />
      ));
      expect(getByText("$48k → —")).toBeTruthy();
    });
  });

  describe("a removed entity", () => {
    it("strikes its name through and keeps its dial", () => {
      const { getByText, container } = render(() => (
        <MutationSliders
          entities={FIXTURE}
          domain={DOMAIN}
          onChange={() => {}}
        />
      ));
      expect(getByText("Joe").className).toContain(
        "sui-mutation-sliders__name--removed",
      );
      expect(container.querySelectorAll("[data-removed]").length).toBe(1);
    });

    it("draws the ⊗ marker, disabled — there is nothing left to remove", () => {
      const { getByLabelText } = render(() => (
        <MutationSliders
          entities={FIXTURE}
          domain={DOMAIN}
          onChange={() => {}}
          onRemove={() => {}}
        />
      ));
      expect(
        (getByLabelText("Joe removed") as HTMLButtonElement).disabled,
      ).toBe(true);
    });
  });

  it("lifts onRemove with the entity's id when its ⊗ is pressed", () => {
    const onRemove = vi.fn();
    const { getByLabelText } = render(() => (
      <MutationSliders
        entities={FIXTURE}
        domain={DOMAIN}
        onChange={() => {}}
        onRemove={onRemove}
      />
    ));
    fireEvent.click(getByLabelText("Remove Flynn"));
    expect(onRemove).toHaveBeenCalledWith("flynn");
  });

  it("draws no ⊗ at all when the caller cannot remove", () => {
    const { queryByLabelText } = render(() => (
      <MutationSliders entities={FIXTURE} domain={DOMAIN} onChange={() => {}} />
    ));
    expect(queryByLabelText("Remove Flynn")).toBeNull();
  });

  it("calls onAdd from the + at the end of the row", () => {
    const onAdd = vi.fn();
    const { getByLabelText } = render(() => (
      <MutationSliders
        entities={FIXTURE}
        domain={DOMAIN}
        onChange={() => {}}
        onAdd={onAdd}
      />
    ));
    fireEvent.click(getByLabelText("Add entity"));
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it("draws no + when the caller cannot add", () => {
    const { queryByLabelText } = render(() => (
      <MutationSliders entities={FIXTURE} domain={DOMAIN} onChange={() => {}} />
    ));
    expect(queryByLabelText("Add entity")).toBeNull();
  });

  it("renders an empty row without a dial rather than failing", () => {
    const { container } = render(() => (
      <MutationSliders entities={[]} domain={DOMAIN} onChange={() => {}} />
    ));
    expect(container.querySelectorAll('[role="slider"]')).toHaveLength(0);
  });
});
