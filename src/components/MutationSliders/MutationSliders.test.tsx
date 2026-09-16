// ============================================
// MutationSliders — mounting tests.
//
// geometry.test.ts already proves every number. What is left to prove here is
// that the DOM carries them: that a keyboard change lifts `onChange` with the
// entity's OWN id, that a removed entity draws its marker and no thumb, and
// that the `+` calls `onAdd`.
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

const DOMAIN: readonly [number, number] = [0, 10];

/** The sketch: three raised a little, two lowered a lot, Joe removed. */
const FIXTURE: readonly Entity[] = [
  { id: "peter", label: "Peter", old: 6, value: 7 },
  { id: "adlai", label: "Adlai", old: 5, value: 6 },
  { id: "elaina", label: "Elaina", old: 7, value: 8 },
  { id: "reilly", label: "Reilly", old: 7, value: 2 },
  { id: "flynn", label: "Flynn", old: 8, value: 1 },
  { id: "joe", label: "Joe", old: 5, value: null },
];

describe("MutationSliders", () => {
  it("draws one vertical dial per entity that is still present", () => {
    const { container } = render(() => (
      <MutationSliders entities={FIXTURE} domain={DOMAIN} onChange={() => {}} />
    ));
    const thumbs = container.querySelectorAll('[role="slider"]');
    // Five, not six: Joe is removed and has no new level to drag.
    expect(thumbs).toHaveLength(5);
    expect(
      container.querySelectorAll('[data-orientation="vertical"]').length,
    ).toBeGreaterThan(0);
  });

  it("announces each dial's own domain and value", () => {
    const { getByLabelText } = render(() => (
      <MutationSliders entities={FIXTURE} domain={DOMAIN} onChange={() => {}} />
    ));
    const peter = getByLabelText("Peter");
    expect(peter.getAttribute("aria-valuenow")).toBe("7");
    expect(peter.getAttribute("aria-valuemin")).toBe("0");
    expect(peter.getAttribute("aria-valuemax")).toBe("10");
  });

  it("announces the value through `format`, not as a percentage", () => {
    const { getByLabelText } = render(() => (
      <MutationSliders
        entities={FIXTURE}
        domain={DOMAIN}
        onChange={() => {}}
        format={(n) => `level ${n}`}
      />
    ));
    expect(getByLabelText("Adlai").getAttribute("aria-valuetext")).toBe(
      "level 6",
    );
  });

  it("lifts onChange with the entity's OWN id on a thumb-moving key", () => {
    const onChange = vi.fn();
    const { getByLabelText } = render(() => (
      <MutationSliders entities={FIXTURE} domain={DOMAIN} onChange={onChange} />
    ));
    fireEvent.keyDown(getByLabelText("Reilly"), { key: "ArrowUp" });
    expect(onChange).toHaveBeenCalledWith("reilly", 3);
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

  it("redraws a dial when the caller moves its value", () => {
    const [level, setLevel] = createSignal(2);
    const { getByLabelText } = render(() => (
      <MutationSliders
        entities={[{ id: "a", label: "Ana", old: 5, value: level() }]}
        domain={DOMAIN}
        onChange={() => {}}
      />
    ));
    expect(getByLabelText("Ana").getAttribute("aria-valuenow")).toBe("2");
    setLevel(9);
    expect(getByLabelText("Ana").getAttribute("aria-valuenow")).toBe("9");
  });

  it("prints the old → new readout under each dial", () => {
    const { getByText } = render(() => (
      <MutationSliders
        entities={FIXTURE}
        domain={DOMAIN}
        onChange={() => {}}
        format={(n) => `L${n}`}
      />
    ));
    expect(getByText("L7 → L8")).toBeTruthy();
    // A removal has no new level, so the readout says so rather than printing
    // a number the entity does not have.
    expect(getByText("L5 → —")).toBeTruthy();
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
      const onRemove = vi.fn();
      const { getByLabelText } = render(() => (
        <MutationSliders
          entities={FIXTURE}
          domain={DOMAIN}
          onChange={() => {}}
          onRemove={onRemove}
        />
      ));
      const marker = getByLabelText("Joe removed") as HTMLButtonElement;
      expect(marker.disabled).toBe(true);
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
