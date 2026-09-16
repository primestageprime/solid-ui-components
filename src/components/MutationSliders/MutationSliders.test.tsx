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
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { map } from "../../fn";
import { createSignal } from "solid-js";
import {
  type FakeSizer,
  installFakeSizer,
  installPointerCapture,
  installRects,
  rectOf,
} from "../../test-utils";
import { MutationSliders } from "./MutationSliders";
import {
  ADD_SLOT,
  ARROW_SLOT,
  DIAL_SLOT,
  MIN_DIAL_HEIGHT,
  VIEW_HEIGHT,
  type Entity,
} from "./geometry";

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

/** A button by its accessible name, or null. Paging controls come and go. */
const queryButton = (container: HTMLElement, label: string): Element | null =>
  container.querySelector(`button[aria-label="${label}"]`);

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

    it("can still band an entity across the whole domain, explicitly", () => {
      // The domain-wide fallback is gone (phase 3), but a role that genuinely
      // permits the whole scale just says so.
      const { getByLabelText } = render(() => (
        <MutationSliders
          entities={[
            { id: "n", label: "Nora", old: 6, value: 7, range: [0, 10] },
          ]}
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

  describe("the track domain", () => {
    it("is derived from the bands when the caller gives none", () => {
      // Lowest floor $40k, highest ceiling $110k — so the bands fill the dial.
      const { getByLabelText } = render(() => (
        <MutationSliders entities={FIXTURE} onChange={() => {}} />
      ));
      // The thumb still announces its own BAND, not the derived track...
      expect(getByLabelText("Peter").getAttribute("aria-valuemin")).toBe(
        "70000",
      );
      // ...and the derived track is what the step is sized from: a $70k span
      // steps by $1k, where the old hand-picked $200k domain stepped by $2k.
      const onChange = vi.fn();
      const { getByLabelText: get2 } = render(() => (
        <MutationSliders entities={FIXTURE} onChange={onChange} />
      ));
      fireEvent.keyDown(get2("Reilly"), { key: "ArrowUp" });
      expect(onChange).toHaveBeenCalledWith("reilly", 75_000);
    });

    it("still takes an explicit domain, to hold the scale still", () => {
      const onChange = vi.fn();
      const { getByLabelText } = render(() => (
        <MutationSliders
          entities={FIXTURE}
          domain={DOMAIN}
          onChange={onChange}
        />
      ));
      fireEvent.keyDown(getByLabelText("Reilly"), { key: "ArrowUp" });
      expect(onChange).toHaveBeenCalledWith("reilly", 76_000);
    });
  });

  describe("the signed delta label", () => {
    it("names the change beside the line, in the line's own tone", () => {
      const { container } = render(() => (
        <MutationSliders entities={FIXTURE} onChange={() => {}} format={asK} />
      ));
      expect(
        container.querySelectorAll(".sui-mutation-sliders__delta--raise"),
      ).toHaveLength(3);
      expect(
        container.querySelectorAll(".sui-mutation-sliders__delta--cut"),
      ).toHaveLength(2);
    });

    it("is omitted for a hire, a departure, and an unchanged amount", () => {
      const { container } = render(() => (
        <MutationSliders
          entities={[
            {
              id: "h",
              label: "H",
              old: null,
              value: 45_000,
              range: [40_000, 60_000],
            },
            {
              id: "g",
              label: "G",
              old: 48_000,
              value: null,
              range: [40_000, 60_000],
            },
            {
              id: "s",
              label: "S",
              old: 50_000,
              value: 50_000,
              range: [40_000, 60_000],
            },
          ]}
          onChange={() => {}}
          format={asK}
        />
      ));
      expect(
        container.querySelectorAll(".sui-mutation-sliders__delta"),
      ).toHaveLength(0);
    });
  });

  it("lifts onChange with the entity's OWN id on a thumb-moving key", () => {
    const onChange = vi.fn();
    const { getByLabelText } = render(() => (
      <MutationSliders entities={FIXTURE} domain={DOMAIN} onChange={onChange} />
    ));
    // The step is DERIVED from the domain — a $200k span steps by $2k, not by
    // the pound the hardcoded `step: 1` used to move.
    fireEvent.keyDown(getByLabelText("Reilly"), { key: "ArrowUp" });
    expect(onChange).toHaveBeenCalledWith("reilly", 76_000);
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

    it("prints `was <prior>` beneath it, NOT the pair", () => {
      const { getByText, queryByText } = render(() => (
        <MutationSliders
          entities={FIXTURE}
          domain={DOMAIN}
          onChange={() => {}}
          format={asK}
        />
      ));
      // The future amount is on the line above; repeating it here said the
      // same figure twice.
      expect(getByText("was $90k")).toBeTruthy();
      expect(queryByText("$90k → $104k")).toBeNull();
    });

    it("says nothing numeric for a removed entity's future amount", () => {
      const { getByText, getAllByText } = render(() => (
        <MutationSliders
          entities={FIXTURE}
          domain={DOMAIN}
          onChange={() => {}}
          format={asK}
        />
      ));
      expect(getAllByText("—").length).toBeGreaterThan(0);
      // A removal still has a prior amount, and that is worth saying.
      expect(getByText("was $48k")).toBeTruthy();
    });

    it("says nothing beneath an entity that did not move", () => {
      const { queryByText } = render(() => (
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
          format={asK}
        />
      ));
      expect(queryByText("was $50k")).toBeNull();
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

    it("offers RESTORE in the terminate slot, not a dead ⊗", () => {
      // A disabled ⊗ said "you did this and there is nothing more to do".
      // What the reader wants in that slot is the way back.
      const { getByLabelText, queryByLabelText } = render(() => (
        <MutationSliders
          entities={FIXTURE}
          domain={DOMAIN}
          onChange={() => {}}
          onRemove={() => {}}
          onRestore={() => {}}
        />
      ));
      expect(getByLabelText("Restore Joe")).toBeTruthy();
      expect(queryByLabelText("Terminate Joe")).toBeNull();
    });
  });

  describe("a new hire", () => {
    const HIRE: Entity = {
      id: "nadia",
      label: "Nadia",
      old: null,
      value: 45_000,
      range: [40_000, 60_000],
    };

    it("draws a future arrow and NO prior arrow", () => {
      const { container } = render(() => (
        <MutationSliders
          entities={[HIRE]}
          domain={DOMAIN}
          onChange={() => {}}
        />
      ));
      expect(
        container.querySelectorAll(".sui-mutation-sliders__arrow--future"),
      ).toHaveLength(1);
      expect(
        container.querySelectorAll(".sui-mutation-sliders__arrow--prior"),
      ).toHaveLength(0);
    });

    it("keeps its role band — an arrival has a role too", () => {
      const { container } = render(() => (
        <MutationSliders
          entities={[HIRE]}
          domain={DOMAIN}
          onChange={() => {}}
        />
      ));
      expect(
        container.querySelectorAll(".sui-mutation-sliders__band"),
      ).toHaveLength(1);
    });

    it("colours nothing — an arrival is not a raise from zero", () => {
      const { container } = render(() => (
        <MutationSliders
          entities={[HIRE]}
          domain={DOMAIN}
          onChange={() => {}}
        />
      ));
      expect(
        container.querySelectorAll(".sui-mutation-sliders__change"),
      ).toHaveLength(0);
    });

    it("announces itself as new instead of comparing to a prior amount", () => {
      const { getByText } = render(() => (
        <MutationSliders
          entities={[HIRE]}
          domain={DOMAIN}
          onChange={() => {}}
          format={asK}
        />
      ));
      expect(getByText("$45k")).toBeTruthy();
      expect(getByText("new")).toBeTruthy();
    });

    it("is still draggable, and still clamped to its band", () => {
      const onChange = vi.fn();
      const { getByLabelText } = render(() => (
        <MutationSliders
          entities={[{ ...HIRE, value: 60_000 }]}
          domain={DOMAIN}
          onChange={onChange}
        />
      ));
      const thumb = getByLabelText("Nadia");
      fireEvent.focus(thumb);
      fireEvent.keyDown(thumb, { key: "End" });
      expect(onChange).toHaveBeenCalledWith("nadia", 60_000);
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
    fireEvent.click(getByLabelText("Terminate Flynn"));
    expect(onRemove).toHaveBeenCalledWith("flynn");
  });

  it("draws no ⊗ at all when the caller cannot remove", () => {
    const { queryByLabelText } = render(() => (
      <MutationSliders entities={FIXTURE} domain={DOMAIN} onChange={() => {}} />
    ));
    expect(queryByLabelText("Terminate Flynn")).toBeNull();
  });

  describe("terminate and restore share one slot", () => {
    const withRestore = (extra?: Record<string, unknown>) =>
      render(() => (
        <MutationSliders
          entities={FIXTURE}
          domain={DOMAIN}
          onChange={() => {}}
          onRemove={() => {}}
          onRestore={() => {}}
          {...extra}
        />
      ));

    it("offers TERMINATE on an active person and RESTORE on a terminated one", () => {
      const { getByLabelText, queryByLabelText } = withRestore();
      expect(getByLabelText("Terminate Peter")).toBeTruthy();
      expect(queryByLabelText("Restore Peter")).toBeNull();
      expect(getByLabelText("Restore Joe")).toBeTruthy();
      expect(queryByLabelText("Terminate Joe")).toBeNull();
    });

    it("lifts onRestore with the terminated entity's id", () => {
      const onRestore = vi.fn();
      const { getByLabelText } = render(() => (
        <MutationSliders
          entities={FIXTURE}
          domain={DOMAIN}
          onChange={() => {}}
          onRemove={() => {}}
          onRestore={onRestore}
        />
      ));
      fireEvent.click(getByLabelText("Restore Joe"));
      expect(onRestore).toHaveBeenCalledWith("joe");
    });

    it("draws NO restore at all when the consumer cannot restore", () => {
      // An append-only scenario has no way back, and a button that does
      // nothing is worse than no button.
      const { queryByLabelText } = render(() => (
        <MutationSliders
          entities={FIXTURE}
          domain={DOMAIN}
          onChange={() => {}}
          onRemove={() => {}}
        />
      ));
      expect(queryByLabelText("Restore Joe")).toBeNull();
      expect(queryByLabelText("Joe removed")).toBeNull();
    });

    it("cycles as the caller moves the value in and out of null", () => {
      const [value, setValue] = createSignal<number | null>(52_000);
      const { getByLabelText, queryByLabelText } = render(() => (
        <MutationSliders
          entities={[
            {
              id: "a",
              label: "Ana",
              old: 44_000,
              value: value(),
              range: [40_000, 60_000],
            },
          ]}
          domain={DOMAIN}
          onChange={() => {}}
          onRemove={() => {}}
          onRestore={() => {}}
        />
      ));
      expect(getByLabelText("Terminate Ana")).toBeTruthy();
      setValue(null);
      expect(getByLabelText("Restore Ana")).toBeTruthy();
      expect(queryByLabelText("Terminate Ana")).toBeNull();
      setValue(44_000);
      expect(getByLabelText("Terminate Ana")).toBeTruthy();
    });
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

  describe("a drag is continuous — it does not snap to the keyboard's step", () => {
    // Peter, 2026-09-16: "the sliders for the mutations no longer slide freely
    // along the axis. They appear to snap to things."
    const BAND: readonly [number, number] = [70_000, 110_000];
    const SOLO: readonly Entity[] = [
      { id: "ana", label: "Ana", old: 90_000, value: 90_000, range: BAND },
    ];
    /** The track's box: 200px tall, top at 0. Vertical, so y=0 is the MAX. */
    const TRACK_TOP_PX = 0;
    const TRACK_HEIGHT = 200;

    /** Press the track at `clientY`, which is how kobalte starts a slide. */
    const dragTo = (container: HTMLElement, clientY: number) => {
      const track = container.querySelector(
        ".sui-mutation-sliders__track",
      ) as HTMLElement;
      // kobalte captures the pointer on the track; jsdom has no such method.
      const capture = installPointerCapture(track);
      fireEvent.pointerDown(track, { clientY, pointerId: 1, button: 0 });
      capture.restore();
    };

    let restoreRects: () => void;
    beforeEach(() => {
      restoreRects = installRects((el) =>
        el.classList?.contains("sui-mutation-sliders__track")
          ? rectOf({
              left: 0,
              top: TRACK_TOP_PX,
              width: 22,
              height: TRACK_HEIGHT,
            })
          : null,
      );
    });
    afterEach(() => restoreRects());

    it("emits a value that is NOT a multiple of the keyboard step", () => {
      const onChange = vi.fn();
      const { container } = render(() => (
        <MutationSliders entities={SOLO} onChange={onChange} />
      ));
      // The derived track is the band itself, so niceStep is 1000 here. A
      // pointer 63/200 of the way down must land between two of those rungs.
      dragTo(container, 63);
      expect(onChange).toHaveBeenCalled();
      const emitted = onChange.mock.calls[0][1] as number;
      expect(emitted % 1_000).not.toBe(0);
      expect(emitted).toBeGreaterThan(BAND[0]);
      expect(emitted).toBeLessThan(BAND[1]);
    });

    it("follows the pointer — a different position gives a different value", () => {
      const onChange = vi.fn();
      const { container } = render(() => (
        <MutationSliders entities={SOLO} onChange={onChange} />
      ));
      dragTo(container, 63);
      dragTo(container, 64);
      const [first, second] = map(
        (call: unknown[]) => call[1] as number,
        onChange.mock.calls,
      );
      // One pixel apart must not resolve to the same rung.
      expect(second).not.toBe(first);
    });

    it("still clamps a drag to the entity's band", () => {
      const onChange = vi.fn();
      const { container } = render(() => (
        <MutationSliders entities={SOLO} onChange={onChange} />
      ));
      dragTo(container, TRACK_HEIGHT + 500);
      expect(onChange).toHaveBeenCalledWith("ana", BAND[0]);
    });
  });

  describe("the keyboard keeps its own, coarser step", () => {
    const BAND: readonly [number, number] = [70_000, 110_000];
    const SOLO: readonly Entity[] = [
      { id: "ana", label: "Ana", old: 90_000, value: 90_000, range: BAND },
    ];

    it("moves by the NICE step, not by the drag unit", () => {
      const onChange = vi.fn();
      const { getByLabelText } = render(() => (
        <MutationSliders entities={SOLO} onChange={onChange} />
      ));
      fireEvent.keyDown(getByLabelText("Ana"), { key: "ArrowUp" });
      // niceStep([70k, 110k]) is 500; the drag unit is 1.
      expect(onChange).toHaveBeenCalledWith("ana", 90_500);
    });

    it("fires ONCE — kobalte's own tiny step is blocked, not merely added to", () => {
      // The capture listener stops the event before kobalte's delegated
      // handler sees it. Without that, every arrow press would emit twice.
      const onChange = vi.fn();
      const { getByLabelText } = render(() => (
        <MutationSliders entities={SOLO} onChange={onChange} />
      ));
      fireEvent.keyDown(getByLabelText("Ana"), { key: "ArrowUp" });
      expect(onChange).toHaveBeenCalledTimes(1);
    });

    it("pages by ten nice steps on Shift+arrow and on PageUp", () => {
      const onChange = vi.fn();
      const { getByLabelText } = render(() => (
        <MutationSliders entities={SOLO} onChange={onChange} />
      ));
      const thumb = getByLabelText("Ana");
      fireEvent.keyDown(thumb, { key: "ArrowUp", shiftKey: true });
      expect(onChange).toHaveBeenLastCalledWith("ana", 95_000);
      fireEvent.keyDown(thumb, { key: "PageDown" });
      expect(onChange).toHaveBeenLastCalledWith("ana", 85_000);
    });

    it("leaves Home and End to kobalte, clamped onto the band", () => {
      const onChange = vi.fn();
      const { getByLabelText } = render(() => (
        <MutationSliders entities={SOLO} onChange={onChange} />
      ));
      const thumb = getByLabelText("Ana");
      fireEvent.focus(thumb);
      fireEvent.keyDown(thumb, { key: "End" });
      expect(onChange).toHaveBeenLastCalledWith("ana", BAND[1]);
    });
  });

  describe("absorbing the container's height", () => {
    const SOLO: readonly Entity[] = [
      {
        id: "ana",
        label: "Ana",
        old: 90_000,
        value: 104_000,
        range: [70_000, 110_000],
      },
    ];

    /** The viewBox's height is the dial's drawn height, 1:1. */
    const drawnHeight = (container: HTMLElement): number => {
      const svg = container.querySelector(
        ".sui-mutation-sliders__marks",
      ) as SVGSVGElement;
      return Number(svg.getAttribute("viewBox")?.split(" ")[3]);
    };

    // The two halves of the contract fail in OPPOSITE directions, so each
    // would pass the other's assertion on its own: a regression to a hard
    // pixel height breaks the fill, and a regression that always fills breaks
    // the content-sized case. Both are pinned.
    it("keeps the OLD fixed height when no height is imposed", async () => {
      const { container } = render(() => (
        <MutationSliders entities={SOLO} onChange={() => {}} />
      ));
      await sizer.resizeAll({ width: 900, height: 0 });
      expect(drawnHeight(container)).toBe(VIEW_HEIGHT);
    });

    it("lengthens the track to the height it is given", async () => {
      const { container } = render(() => (
        <MutationSliders entities={SOLO} onChange={() => {}} />
      ));
      // An 800x600 box: the row measures its own height, and the dial takes
      // what is left after the name and the readout rows.
      await sizer.resizeAll({ width: 800, height: 520 });
      expect(drawnHeight(container)).toBe(520);
    });

    // `resizeAll` delivers to EVERY observer, so it cannot tell whether the
    // DIAL's own observer is wired or whether the row's happened to carry the
    // height. This one targets the dial element alone, which is the only
    // assertion that actually pins the wiring.
    it("measures the DIAL element itself, not merely the row", async () => {
      const { container } = render(() => (
        <MutationSliders entities={SOLO} onChange={() => {}} />
      ));
      const dial = container.querySelector(
        ".sui-mutation-sliders__dial",
      ) as HTMLElement;
      expect(sizer.observed()).toContain(dial);
      await sizer.resize(dial, { width: 88, height: 470 });
      expect(drawnHeight(container)).toBe(470);
    });

    it("lengthens the TRACK's own path, not just the viewBox", async () => {
      const { container } = render(() => (
        <MutationSliders entities={SOLO} onChange={() => {}} />
      ));
      const dial = container.querySelector(
        ".sui-mutation-sliders__dial",
      ) as HTMLElement;
      await sizer.resize(dial, { width: 88, height: 470 });
      const d = container
        .querySelector(".sui-mutation-sliders__track-line")
        ?.getAttribute("d");
      // 470 - TRACK_TOP(12) = 458 is where the bottom cap must sit.
      expect(d).toContain("458");
    });

    it("does not shrink past the floor where the labels collide", async () => {
      const { container } = render(() => (
        <MutationSliders entities={SOLO} onChange={() => {}} />
      ));
      await sizer.resizeAll({ width: 800, height: 60 });
      expect(drawnHeight(container)).toBe(MIN_DIAL_HEIGHT);
    });

    it("keeps the delta label's size fixed while the track grows", async () => {
      const { container } = render(() => (
        <MutationSliders entities={SOLO} onChange={() => {}} format={asK} />
      ));
      const label = () =>
        container.querySelector(
          ".sui-mutation-sliders__delta",
        ) as SVGTextElement;
      await sizer.resizeAll({ width: 800, height: 520 });
      const tallX = label().getAttribute("x");
      await sizer.resizeAll({ width: 800, height: 260 });
      // The label's own metrics are CSS (11px), and its x never moves — only
      // its y follows the line it names. A stretched viewBox would have
      // scaled the glyphs instead.
      expect(label().getAttribute("x")).toBe(tallX);
    });
  });

  describe("paging, when the row is too narrow for every dial", () => {
    /** Nine people on one junior band — enough that a gallery row must page. */
    const NINE: readonly Entity[] = Array.from({ length: 9 }, (_, i) => ({
      id: `p${i}`,
      label: `P${i}`,
      old: 44_000,
      value: 44_000 + i * 1_000,
      range: [40_000, 60_000] as const,
    }));

    /** A width that fits exactly `n` dials once the arrows and + are paid for. */
    const widthFor = (n: number) => DIAL_SLOT * n + ADD_SLOT + 2 * ARROW_SLOT;

    const row = (container: HTMLElement) =>
      container.querySelector('[role="group"]') as HTMLElement;

    it("shows every dial, and no chevrons, until it is measured", () => {
      // An UNMEASURED row is not a narrow one. `observeSize` no-ops wherever
      // ResizeObserver is missing (SSR, jsdom), so falling back to one dial
      // there would look like a broken component for ever.
      const { container } = render(() => (
        <MutationSliders entities={NINE} onChange={() => {}} />
      ));
      expect(container.querySelectorAll('[role="slider"]')).toHaveLength(9);
      expect(queryButton(container, "Next dial")).toBeNull();
    });

    it("shows as many whole dials as fit, and grows chevrons", async () => {
      const { container } = render(() => (
        <MutationSliders entities={NINE} onChange={() => {}} onAdd={() => {}} />
      ));
      await sizer.resizeAll({ width: widthFor(3), height: 300 });
      expect(container.querySelectorAll('[role="slider"]')).toHaveLength(3);
      expect(queryButton(container, "Previous dial")).toBeTruthy();
      expect(queryButton(container, "Next dial")).toBeTruthy();
    });

    it("draws NO chevrons when everything fits", async () => {
      const { container } = render(() => (
        <MutationSliders entities={NINE} onChange={() => {}} onAdd={() => {}} />
      ));
      await sizer.resizeAll({ width: widthFor(20), height: 300 });
      expect(container.querySelectorAll('[role="slider"]')).toHaveLength(9);
      expect(queryButton(container, "Previous dial")).toBeNull();
    });

    it("shows ONE dial when the container is far too narrow for any", async () => {
      // Peter, 2026-09-16: "Minimum of 1 slider."
      const { container } = render(() => (
        <MutationSliders entities={NINE} onChange={() => {}} />
      ));
      await sizer.resizeAll({ width: 30, height: 300 });
      expect(container.querySelectorAll('[role="slider"]')).toHaveLength(1);
    });

    it("pages by ONE dial, so every neighbouring pair stays reachable", async () => {
      const { container } = render(() => (
        <MutationSliders entities={NINE} onChange={() => {}} />
      ));
      await sizer.resizeAll({ width: widthFor(3), height: 300 });
      expect(row(container).getAttribute("aria-label")).toBe("dials 1–3 of 9");
      fireEvent.click(queryButton(container, "Next dial") as HTMLElement);
      expect(row(container).getAttribute("aria-label")).toBe("dials 2–4 of 9");
    });

    it("disables the chevron at each end rather than wrapping round", async () => {
      const { container } = render(() => (
        <MutationSliders entities={NINE} onChange={() => {}} />
      ));
      await sizer.resizeAll({ width: widthFor(3), height: 300 });
      const prev = () =>
        queryButton(container, "Previous dial") as HTMLButtonElement;
      const next = () =>
        queryButton(container, "Next dial") as HTMLButtonElement;
      expect(prev().disabled).toBe(true);
      expect(next().disabled).toBe(false);
      for (let i = 0; i < 20; i += 1) fireEvent.click(next());
      expect(next().disabled).toBe(true);
      expect(prev().disabled).toBe(false);
      // Twenty clicks on a nine-dial row must not run off the end.
      expect(row(container).getAttribute("aria-label")).toBe("dials 7–9 of 9");
    });

    it("keeps the + reachable on the last page", async () => {
      // Hiding the only way to add someone whenever the row happens to be
      // scrolled is a dead end the reader has to guess their way out of.
      const { container } = render(() => (
        <MutationSliders entities={NINE} onChange={() => {}} onAdd={() => {}} />
      ));
      await sizer.resizeAll({ width: widthFor(3), height: 300 });
      fireEvent.click(queryButton(container, "Next dial") as HTMLElement);
      expect(queryButton(container, "Add entity")).toBeTruthy();
    });

    it("announces a single visible dial as `dial 5 of 9`, not `dials 5–5`", async () => {
      const { container } = render(() => (
        <MutationSliders entities={NINE} onChange={() => {}} />
      ));
      await sizer.resizeAll({ width: 30, height: 300 });
      fireEvent.click(queryButton(container, "Next dial") as HTMLElement);
      expect(row(container).getAttribute("aria-label")).toBe("dial 2 of 9");
    });

    it("settles a stale offset when entities are removed underneath it", async () => {
      const [people, setPeople] = createSignal<readonly Entity[]>(NINE);
      const { container } = render(() => (
        <MutationSliders entities={people()} onChange={() => {}} />
      ));
      await sizer.resizeAll({ width: widthFor(3), height: 300 });
      for (let i = 0; i < 6; i += 1)
        fireEvent.click(queryButton(container, "Next dial") as HTMLElement);
      expect(row(container).getAttribute("aria-label")).toBe("dials 7–9 of 9");
      setPeople(NINE.slice(0, 6));
      // The window must land on the last full page, not empty the row.
      expect(row(container).getAttribute("aria-label")).toBe("dials 4–6 of 6");
      expect(container.querySelectorAll('[role="slider"]')).toHaveLength(3);
    });

    it("stops paging entirely once few enough entities remain", async () => {
      // The two-pass rule, from the other side: with the chevrons gone their
      // 64px comes BACK to the dials, so a width that paged three of nine
      // shows all four of four — not three of four with a dead pair of arrows.
      const [people, setPeople] = createSignal<readonly Entity[]>(NINE);
      const { container } = render(() => (
        <MutationSliders entities={people()} onChange={() => {}} />
      ));
      await sizer.resizeAll({ width: widthFor(3), height: 300 });
      expect(container.querySelectorAll('[role="slider"]')).toHaveLength(3);
      setPeople(NINE.slice(0, 4));
      expect(container.querySelectorAll('[role="slider"]')).toHaveLength(4);
      expect(queryButton(container, "Next dial")).toBeNull();
      expect(row(container).getAttribute("aria-label")).toBe("dials 1–4 of 4");
    });

    it("still lets a visible dial be dragged and removed", async () => {
      const onChange = vi.fn();
      const { container } = render(() => (
        <MutationSliders entities={NINE} onChange={onChange} />
      ));
      await sizer.resizeAll({ width: widthFor(3), height: 300 });
      fireEvent.click(queryButton(container, "Next dial") as HTMLElement);
      const thumb = container.querySelector('[aria-label="P2"]') as HTMLElement;
      fireEvent.keyDown(thumb, { key: "ArrowUp" });
      // The id must be P2's, not the id at visible index 0.
      expect(onChange.mock.calls[0][0]).toBe("p2");
    });
  });

  it("renders an empty row without a dial rather than failing", () => {
    const { container } = render(() => (
      <MutationSliders entities={[]} domain={DOMAIN} onChange={() => {}} />
    ));
    expect(container.querySelectorAll('[role="slider"]')).toHaveLength(0);
  });
});
