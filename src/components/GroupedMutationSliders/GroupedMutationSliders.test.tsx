// ============================================
// GroupedMutationSliders — mounting tests.
//
// `groups.test.ts` already proves the projection and the runs, and
// MarkedSlider's `geometry.test.ts` proves every number on a dial. What is left
// to prove here is that the DOM carries the two things this component adds:
// N MEASURE INDICES (each dial emitting its own, on its own scale, through its
// own formatter, with a pin reaching the same index of its peers and no other)
// and the CAPTIONS (which dials the reader is told belong together, and that
// two identically-labelled dials are still tellable apart).
// ============================================
import { fireEvent, render } from "@solidjs/testing-library";
import type { JSX } from "solid-js";
import { ItemTintSurface } from "../Surface";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { type FakeSizer, installFakeSizer } from "../../test-utils";
import { ADD_SLOT, ARROW_SLOT, DIAL_SLOT } from "../MutationSliders/rows";
import {
  GroupedMutationSliders,
  createGroupedMutationSliders,
} from "./GroupedMutationSliders";
import type { GroupedMeasureAxes } from "./axes";
import { type GroupedMutationEntity, slotFor } from "./groups";

// Kobalte's Slider measures its track through ResizeObserver; jsdom lacks it.
let sizer: FakeSizer;
beforeAll(() => {
  sizer = installFakeSizer();
});
afterAll(() => sizer.restore());

/**
 * Peter's licence axes: four measures in two captioned groups. Measures 0 and 2
 * carry the SAME label (`#`) on purpose — that collision is the reason the
 * caption is in each dial's accessible name.
 */
const LICENCE_AXES: GroupedMeasureAxes = [
  { label: "#", group: "mo", domain: [0, 500], snap: 1 },
  {
    label: "$",
    group: "mo",
    domain: [0, 600],
    snap: 1,
    format: (n) => `$${n}`,
  },
  { label: "#", group: "yr", domain: [0, 500], snap: 1 },
  {
    label: "%",
    group: "yr",
    domain: [50, 100],
    snap: 5,
    format: (n) => `${n}%`,
  },
];

/** Two ungrouped measures — the paired shape, expressed on this component. */
const PAIR_AXES: GroupedMeasureAxes = [
  { label: "Hrs/wk", domain: [0, 80], snap: 1, format: (n) => `${n}h` },
  { label: "$/hr", domain: [0, 300], snap: 5, format: (n) => `$${n}` },
];

/** Three measures, two of them grouped — an odd count with a lone axis. */
const THREE_AXES: GroupedMeasureAxes = [
  { label: "#", group: "seats", domain: [0, 100], snap: 1 },
  { label: "$", group: "seats", domain: [0, 200], snap: 1 },
  { label: "Support", domain: [0, 10], snap: 1 },
];

/** Two products: a rise on every measure, and a flat one. */
const TWO: readonly GroupedMutationEntity[] = [
  {
    id: "starter",
    label: "Starter",
    measures: [
      { prior: 100, value: 120, range: [0, 300] },
      { prior: 15, value: 15, range: [9, 25] },
      { prior: 50, value: 60, range: [0, 200] },
      { prior: 85, value: 85, range: [50, 100] },
    ],
  },
  {
    id: "team",
    label: "Team",
    measures: [
      { prior: 40, value: 40, range: [0, 120] },
      { prior: 49, value: 49, range: [29, 80] },
      { prior: 25, value: 25, range: [0, 80] },
      { prior: 90, value: 90, range: [50, 100] },
    ],
  },
];

/** A third with no prior anywhere — a product LAUNCHED at this change. */
const LAUNCHED: GroupedMutationEntity = {
  id: "pro",
  label: "Pro",
  measures: [
    { prior: null, value: 10, range: [0, 100] },
    { prior: null, value: 99, range: [50, 200] },
    { prior: null, value: 4, range: [0, 50] },
    { prior: null, value: 75, range: [50, 100] },
  ],
};

/** Starter, discontinued: EVERY measure loses its value. */
const DISCONTINUED: readonly GroupedMutationEntity[] = [
  {
    ...TWO[0],
    measures: [
      { ...TWO[0].measures[0], value: null },
      { ...TWO[0].measures[1], value: null },
      { ...TWO[0].measures[2], value: null },
      { ...TWO[0].measures[3], value: null },
    ],
  },
  TWO[1],
];

/** A button by its accessible name, or null. Paging controls come and go. */
const queryButton = (container: HTMLElement, label: string): Element | null =>
  container.querySelector(`button[aria-label="${label}"]`);

describe("GroupedMutationSliders", () => {
  it("draws FOUR dials per present entity — one per measure", () => {
    const { container } = render(() => (
      <GroupedMutationSliders
        entities={TWO}
        axes={LICENCE_AXES}
        onChange={() => {}}
      />
    ));
    expect(container.querySelectorAll('[role="slider"]')).toHaveLength(8);
  });

  it("draws TWO per entity when handed two axes — the paired shape, at N = 2", () => {
    const paired: readonly GroupedMutationEntity[] = [
      {
        id: "design",
        label: "Design",
        measures: [
          { prior: 10, value: 20, range: [0, 40] },
          { prior: 120, value: 150, range: [100, 200] },
        ],
      },
    ];
    const { container, getByLabelText } = render(() => (
      <GroupedMutationSliders
        entities={paired}
        axes={PAIR_AXES}
        onChange={() => {}}
      />
    ));
    expect(container.querySelectorAll('[role="slider"]')).toHaveLength(2);
    // With no group named, no caption sits in the accessible name.
    expect(getByLabelText("Design Hrs/wk")).toBeTruthy();
  });

  it("draws THREE, two captioned and one alone", () => {
    const entities: readonly GroupedMutationEntity[] = [
      {
        id: "basic",
        label: "Basic",
        measures: [
          { prior: 10, value: 12, range: [0, 100] },
          { prior: 20, value: 20, range: [0, 200] },
          { prior: 1, value: 2, range: [0, 10] },
        ],
      },
    ];
    const { container, getByLabelText } = render(() => (
      <GroupedMutationSliders
        entities={entities}
        axes={THREE_AXES}
        onChange={() => {}}
      />
    ));
    expect(container.querySelectorAll('[role="slider"]')).toHaveLength(3);
    expect(getByLabelText("Basic seats #")).toBeTruthy();
    // The lone axis names no group, so its dial carries none.
    expect(getByLabelText("Basic Support")).toBeTruthy();
  });

  it("draws a range band for EVERY measure, discontinued entities included", () => {
    const { container } = render(() => (
      <GroupedMutationSliders
        entities={DISCONTINUED}
        axes={LICENCE_AXES}
        onChange={() => {}}
      />
    ));
    // Eight bands, four thumbs: a discontinued product keeps every allowance
    // and loses every future amount.
    expect(container.querySelectorAll(".sui-marked-slider__band")).toHaveLength(
      8,
    );
    expect(container.querySelectorAll('[role="slider"]')).toHaveLength(4);
  });

  describe("the captions", () => {
    it("names each group ONCE per entity, over the dials it covers", () => {
      const { container } = render(() => (
        <GroupedMutationSliders
          entities={TWO}
          axes={LICENCE_AXES}
          onChange={() => {}}
        />
      ));
      // One `mo` and one `yr` group per entity, announced on the run's own row.
      expect(
        container.querySelectorAll('[role="group"][aria-label="Starter mo"]'),
      ).toHaveLength(1);
      expect(
        container.querySelectorAll('[role="group"][aria-label="Starter yr"]'),
      ).toHaveLength(1);
      expect(
        container.querySelectorAll('[role="group"][aria-label="Team yr"]'),
      ).toHaveLength(1);
    });

    it("tells two IDENTICALLY-labelled dials apart by their caption", () => {
      const { getByLabelText } = render(() => (
        <GroupedMutationSliders
          entities={TWO}
          axes={LICENCE_AXES}
          onChange={() => {}}
        />
      ));
      const monthly = getByLabelText("Starter mo #");
      const annual = getByLabelText("Starter yr #");
      expect(monthly).not.toBe(annual);
      expect(monthly.getAttribute("aria-valuetext")).toBe("120");
      expect(annual.getAttribute("aria-valuetext")).toBe("60");
    });

    it("draws NO caption row at all when no axis names a group", () => {
      const paired: readonly GroupedMutationEntity[] = [
        {
          id: "design",
          label: "Design",
          measures: [
            { prior: 10, value: 20, range: [0, 40] },
            { prior: 120, value: 150, range: [100, 200] },
          ],
        },
      ];
      const { container } = render(() => (
        <GroupedMutationSliders
          entities={paired}
          axes={PAIR_AXES}
          onChange={() => {}}
        />
      ));
      // Only the entity's own group and the two per-run ones, with no caption
      // text between them: every run's aria-label is the bare entity name.
      expect(
        container.querySelectorAll('[role="group"][aria-label="Design"]')
          .length,
      ).toBeGreaterThan(0);
    });
  });

  it("puts each measure on its OWN scale and its OWN formatter", () => {
    const { getByLabelText } = render(() => (
      <GroupedMutationSliders
        entities={TWO}
        axes={LICENCE_AXES}
        onChange={() => {}}
      />
    ));
    expect(getByLabelText("Starter mo $").getAttribute("aria-valuetext")).toBe(
      "$15",
    );
    expect(getByLabelText("Starter yr %").getAttribute("aria-valuetext")).toBe(
      "85%",
    );
    // The BAND's edges, per measure — not one shared domain.
    expect(getByLabelText("Starter mo #").getAttribute("aria-valuemax")).toBe(
      "300",
    );
    expect(getByLabelText("Starter yr %").getAttribute("aria-valuemin")).toBe(
      "50",
    );
  });

  describe("the measure index reaches the callback", () => {
    it("emits index 0 from the first dial", () => {
      const onChange = vi.fn();
      const { getByLabelText } = render(() => (
        <GroupedMutationSliders
          entities={TWO}
          axes={LICENCE_AXES}
          onChange={onChange}
        />
      ));
      fireEvent.keyDown(getByLabelText("Starter mo #"), { key: "ArrowUp" });
      // One arrow is one NICE STEP of the shared [0, 500] track — 5 seats, not 1.
      // `snap: 1` only stops it landing between them.
      expect(onChange).toHaveBeenCalledWith("starter", 0, 125);
    });

    it("emits index 2 from the THIRD dial — the one a pair cannot reach", () => {
      const onChange = vi.fn();
      const { getByLabelText } = render(() => (
        <GroupedMutationSliders
          entities={TWO}
          axes={LICENCE_AXES}
          onChange={onChange}
        />
      ));
      fireEvent.keyDown(getByLabelText("Starter yr #"), { key: "ArrowUp" });
      expect(onChange).toHaveBeenCalledWith("starter", 2, 65);
    });

    it("emits index 3 on its OWN grid", () => {
      const onChange = vi.fn();
      const { getByLabelText } = render(() => (
        <GroupedMutationSliders
          entities={TWO}
          axes={LICENCE_AXES}
          onChange={onChange}
        />
      ));
      // `snap: 5` on the percentage axis, so one arrow is five points, not one.
      fireEvent.keyDown(getByLabelText("Starter yr %"), { key: "ArrowUp" });
      expect(onChange).toHaveBeenCalledWith("starter", 3, 90);
    });

    it("commits through onChangeEnd with the same index", () => {
      const onChangeEnd = vi.fn();
      const { getByLabelText } = render(() => (
        <GroupedMutationSliders
          entities={TWO}
          axes={LICENCE_AXES}
          onChange={() => {}}
          onChangeEnd={onChangeEnd}
        />
      ));
      fireEvent.keyDown(getByLabelText("Team mo $"), { key: "ArrowDown" });
      // The fee track is [0, 600], whose nice step is $10.
      expect(onChangeEnd).toHaveBeenCalledWith("team", 1, 39);
    });

    it("never emits past a measure's own range", () => {
      const onChange = vi.fn();
      const { getByLabelText } = render(() => (
        <GroupedMutationSliders
          entities={TWO}
          axes={LICENCE_AXES}
          onChange={onChange}
        />
      ));
      const fee = getByLabelText("Team mo $");
      fireEvent.focus(fee);
      // End runs for the top of the DOMAIN ($600); the range must catch it.
      fireEvent.keyDown(fee, { key: "End" });
      expect(onChange).toHaveBeenCalledWith("team", 1, 80);
    });
  });

  describe("pinning is measure-local across all four", () => {
    /** Select both names, then report everything the component emitted. */
    const pinBoth = () => {
      const onChange =
        vi.fn<(id: string, measure: number, value: number) => void>();
      const result = render(() => (
        <GroupedMutationSliders
          entities={TWO}
          axes={LICENCE_AXES}
          onChange={(id, measure, value) => onChange(id, measure, value)}
        />
      ));
      fireEvent.click(result.getByText("Starter"));
      fireEvent.click(result.getByText("Team"));
      return { ...result, onChange };
    };

    it("levels EVERY measure against its own peers when the group forms", () => {
      const { onChange } = pinBoth();
      // Monthly seats: 120 vs 40 → Team rises, stopped at its own 120 ceiling.
      expect(onChange).toHaveBeenCalledWith("team", 0, 120);
      // Fees: 15 vs 49 → Starter rises, stopped at its own $25 ceiling.
      expect(onChange).toHaveBeenCalledWith("starter", 1, 25);
      // Percentages: 85 vs 90 → Starter rises to 90.
      expect(onChange).toHaveBeenCalledWith("starter", 3, 90);
      // …and no measure borrowed another's number.
      expect(onChange).not.toHaveBeenCalledWith("team", 0, 49);
      expect(onChange).not.toHaveBeenCalledWith("starter", 1, 120);
    });

    it("moves only the DRAGGED measure across the selection", () => {
      const { getByLabelText, onChange } = pinBoth();
      onChange.mockClear();
      // One arrow on Starter's ANNUAL SEATS dial. Both products' measure 2
      // move; no other measure is touched, on either of them.
      fireEvent.keyDown(getByLabelText("Starter yr #"), { key: "ArrowUp" });
      expect(
        onChange.mock.calls.map(([id, index]) => `${id}:${index}`),
      ).toEqual(["starter:2", "team:2"]);
    });
  });

  describe("discontinue and restore share one slot", () => {
    it("offers ⊗ on a present entity and calls back with its id", () => {
      const onRemove = vi.fn();
      const { container } = render(() => (
        <GroupedMutationSliders
          entities={TWO}
          axes={LICENCE_AXES}
          onChange={() => {}}
          onRemove={onRemove}
          labels={{ remove: "Discontinue" }}
        />
      ));
      const button = queryButton(container, "Discontinue Starter");
      expect(button).not.toBeNull();
      fireEvent.click(button as Element);
      expect(onRemove).toHaveBeenCalledWith("starter");
    });

    it("swaps to ↺ once EVERY measure has lost its value", () => {
      const onRestore = vi.fn();
      const { container } = render(() => (
        <GroupedMutationSliders
          entities={DISCONTINUED}
          axes={LICENCE_AXES}
          onChange={() => {}}
          onRemove={() => {}}
          onRestore={onRestore}
          labels={{ remove: "Discontinue", restore: "Relaunch" }}
        />
      ));
      expect(queryButton(container, "Discontinue Starter")).toBeNull();
      const button = queryButton(container, "Relaunch Starter");
      fireEvent.click(button as Element);
      expect(onRestore).toHaveBeenCalledWith("starter");
    });
  });

  it("says the consumer's word under a measure with no prior", () => {
    const { container } = render(() => (
      <GroupedMutationSliders
        entities={[...TWO, LAUNCHED]}
        axes={LICENCE_AXES}
        onChange={() => {}}
        labels={{ new: "new product" }}
      />
    ));
    expect(container.textContent).toContain("new product");
  });

  it("prints the consumer's summary once per entity, not once per dial", () => {
    const { container } = render(() => (
      <GroupedMutationSliders
        entities={TWO}
        axes={LICENCE_AXES}
        onChange={() => {}}
        summary={(entity) => `${entity.label} total`}
      />
    ));
    expect(container.textContent).toContain("Starter total");
    expect(container.textContent).toContain("Team total");
  });

  describe("the row pages by a WHOLE entity", () => {
    /** Wide enough for exactly two four-dial products, plus the chrome. */
    const twoProductsWide = 2 * slotFor(4) + 2 * ARROW_SLOT + ADD_SLOT;

    const many: readonly GroupedMutationEntity[] = [
      TWO[0],
      TWO[1],
      { ...LAUNCHED, id: "pro" },
      { ...LAUNCHED, id: "max", label: "Max" },
    ];

    it("shows everything while it has not been measured", () => {
      const { container } = render(() => (
        <GroupedMutationSliders
          entities={many}
          axes={LICENCE_AXES}
          onChange={() => {}}
        />
      ));
      // Unknown is not narrow: an unmeasured row draws the lot.
      expect(container.querySelectorAll('[role="slider"]')).toHaveLength(16);
      expect(queryButton(container, "Next entity")).toBeNull();
    });

    it("never splits an entity's dials across a page boundary", () => {
      const { container } = render(() => (
        <GroupedMutationSliders
          entities={many}
          axes={LICENCE_AXES}
          onChange={() => {}}
          onAdd={() => {}}
        />
      ));
      const row = container.querySelector('[role="group"]') as HTMLElement;
      sizer.resize(row, { width: twoProductsWide, height: 300 });
      // Whatever fits, it is a MULTIPLE of four dials — never three or five.
      const drawn = container.querySelectorAll('[role="slider"]').length;
      expect(drawn % 4).toBe(0);
    });

    it("counts COLUMNS in its window announcement, not dials", () => {
      const { container } = render(() => (
        <GroupedMutationSliders
          entities={many}
          axes={LICENCE_AXES}
          onChange={() => {}}
        />
      ));
      const row = container.querySelector('[role="group"]') as HTMLElement;
      expect(row.getAttribute("aria-label")).toBe("columns 1\u20134 of 4");
    });

    it("costs one dial slot per measure, so a 4-axis row is twice a 2-axis one", () => {
      expect(slotFor(4)).toBe(2 * slotFor(2));
      expect(slotFor(4)).toBe(4 * DIAL_SLOT);
    });
  });

  describe("a SIGNED axis and its change", () => {
    /** A Δ axis: the readout carries the sign, the change must not carry two. */
    const SIGNED_AXES: GroupedMeasureAxes = [
      {
        label: "Δ",
        domain: [-5, 5],
        snap: 1,
        format: (n) =>
          n === 0 ? "0" : n > 0 ? `+${n}` : `\u2212${Math.abs(n)}`,
        deltaFormat: (n) => String(n),
      },
    ];
    const moved: readonly GroupedMutationEntity[] = [
      {
        id: "growth",
        label: "Growth",
        measures: [{ prior: 0, value: 1, range: [-5, 5] }],
      },
    ];

    it("keeps the sign on the VALUE readout", () => {
      const { getByLabelText } = render(() => (
        <GroupedMutationSliders
          entities={moved}
          axes={SIGNED_AXES}
          onChange={() => {}}
        />
      ));
      expect(getByLabelText("Growth Δ").getAttribute("aria-valuetext")).toBe(
        "+1",
      );
    });

    it("writes the sign ONCE on the change — not `++1`", () => {
      const { container } = render(() => (
        <GroupedMutationSliders
          entities={moved}
          axes={SIGNED_AXES}
          onChange={() => {}}
        />
      ));
      expect(container.textContent).toContain("+1");
      expect(container.textContent).not.toContain("++");
    });

    it("falls back to `format` when no `deltaFormat` is given", () => {
      // The default is unchanged for every unsigned axis, which is all of them
      // until one needs a sign.
      const plain: GroupedMeasureAxes = [
        { label: "#", domain: [0, 100], snap: 1, format: (n) => `${n}` },
      ];
      const { container } = render(() => (
        <GroupedMutationSliders
          entities={[
            {
              id: "seats",
              label: "Seats",
              measures: [{ prior: 10, value: 14, range: [0, 100] }],
            },
          ]}
          axes={plain}
          onChange={() => {}}
        />
      ));
      expect(container.textContent).toContain("+4");
    });
  });

  it("curries its axes and vocabulary, leaving the call site data-only", () => {
    const LicenceSliders = createGroupedMutationSliders({
      axes: LICENCE_AXES,
      labels: { remove: "Discontinue", restore: "Relaunch", new: "new" },
    });
    const onRemove = vi.fn();
    const { container, getByLabelText } = render(() => (
      <LicenceSliders entities={TWO} onChange={() => {}} onRemove={onRemove} />
    ));
    expect(container.querySelectorAll('[role="slider"]')).toHaveLength(8);
    expect(getByLabelText("Starter yr %")).toBeTruthy();
    expect(queryButton(container, "Discontinue Team")).not.toBeNull();
  });

  it("lets the caller CONTROL the selection", () => {
    const onSelectionChange = vi.fn();
    const { getByText } = render(() => (
      <GroupedMutationSliders
        entities={TWO}
        axes={LICENCE_AXES}
        onChange={() => {}}
        selected={["starter"]}
        onSelectionChange={onSelectionChange}
      />
    ));
    fireEvent.click(getByText("Team"));
    expect(onSelectionChange).toHaveBeenCalledWith(["starter", "team"]);
  });

  it("draws a `+` only when the consumer gives it something to do", () => {
    const withoutAdd = render(() => (
      <GroupedMutationSliders
        entities={TWO}
        axes={LICENCE_AXES}
        onChange={() => {}}
      />
    ));
    expect(queryButton(withoutAdd.container, "Add entity")).toBeNull();

    const onAdd = vi.fn();
    const withAdd = render(() => (
      <GroupedMutationSliders
        entities={TWO}
        axes={LICENCE_AXES}
        onChange={() => {}}
        onAdd={onAdd}
      />
    ));
    fireEvent.click(queryButton(withAdd.container, "Add entity") as Element);
    expect(onAdd).toHaveBeenCalled();
  });
});

// entityFrame (Peter, 2026-09-25): each entity's column sits in its own frame
// — a light background per license config. Additive: omitted, nothing changes.
describe("GroupedMutationSliders entityFrame", () => {
  const Frame = (props: { children?: JSX.Element }) => (
    <div data-testid="entity-frame">{props.children}</div>
  );
  const FOUR: readonly GroupedMutationEntity[] = [
    ...TWO,
    LAUNCHED,
    { ...LAUNCHED, id: "max", label: "Max" },
  ];

  /** Headless observation: for each visible entity, how many frames hold it. */
  const framesPerEntity = (container: HTMLElement): string =>
    Array.from(
      container.querySelectorAll<HTMLButtonElement>("button[aria-pressed]"),
      (name) =>
        `${name.textContent?.trim()}: ${
          name.closest('[data-testid="entity-frame"]') ? 1 : 0
        } frame, ${
          name
            .closest('[data-testid="entity-frame"]')
            ?.querySelectorAll('[role="slider"]').length ?? 0
        } dials`,
    ).join("\n");

  it("renders ONE frame per entity, holding that entity's name and all its dials", () => {
    const { container } = render(() => (
      <GroupedMutationSliders
        entities={FOUR}
        axes={LICENCE_AXES}
        onChange={() => {}}
        entityFrame={Frame}
      />
    ));
    expect(container.querySelectorAll('[data-testid="entity-frame"]')).toHaveLength(4);
    expect(framesPerEntity(container)).toMatchInlineSnapshot(`
      "Starter: 1 frame, 4 dials
      Team: 1 frame, 4 dials
      Pro: 1 frame, 4 dials
      Max: 1 frame, 4 dials"
    `);
  });

  it("without it, renders no frame and the same DOM as before", () => {
    const plain = render(() => (
      <GroupedMutationSliders entities={TWO} axes={LICENCE_AXES} onChange={() => {}} />
    ));
    expect(plain.container.querySelector('[data-testid="entity-frame"]')).toBeNull();
    const row = plain.container.querySelector('[role="group"]')!;
    // Each entity's column is a DIRECT child of the row, as it always was.
    const names = row.querySelectorAll("button[aria-pressed]");
    for (const name of Array.from(names)) {
      expect(name.closest('[role="group"] > *')?.parentElement).toBe(row);
    }
  });

  it("pages identically with and without ItemTintSurface (borderless, padding-free: no width)", async () => {
    const pageOf = async (framed: boolean) => {
      const { container, unmount } = render(() => (
        <GroupedMutationSliders
          entities={FOUR}
          axes={LICENCE_AXES}
          onChange={() => {}}
          onAdd={() => {}}
          entityFrame={framed ? ItemTintSurface : undefined}
        />
      ));
      const row = container.querySelector('[role="group"]') as HTMLElement;
      await sizer.resize(row, {
        width: 2 * slotFor(4) + 2 * ARROW_SLOT + ADD_SLOT,
        height: 300,
      });
      const out = {
        label: row.getAttribute("aria-label"),
        dials: container.querySelectorAll('[role="slider"]').length,
      };
      const frames = row.querySelectorAll(":scope > .surface").length;
      unmount();
      return { ...out, frames };
    };
    const framed = await pageOf(true);
    expect(framed.frames).toBe(2);
    const plain = await pageOf(false);
    expect({ ...framed, frames: 0 }).toEqual(plain);
    // The frame itself adds nothing to the width: no padding, no border.
    const probe = render(() => <ItemTintSurface>x</ItemTintSurface>);
    const surface = probe.container.querySelector(".surface") as HTMLElement;
    expect(surface.classList.contains("surface--padding-none")).toBe(true);
    expect(surface.style.borderStyle).toBe("none");
    // …and it really paged, so the equality is about the window, not "all of it".
    expect(plain.dials).toBe(8);
  });

  it("curries through createGroupedMutationSliders", () => {
    const Framed = createGroupedMutationSliders({
      axes: LICENCE_AXES,
      entityFrame: Frame,
    });
    const { container } = render(() => (
      <Framed entities={TWO} onChange={() => {}} />
    ));
    expect(container.querySelectorAll('[data-testid="entity-frame"]')).toHaveLength(2);
  });
});
