// Role groups on MutationSliders (owner, thorcasting payroll builder,
// 2026-10-21): "Roofer × 3" collapsed to one dial, a SHIFT on it, a chevron
// that shows each member (groups.ts, groupDial.tsx).
import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import {
  type FakeSizer,
  installFakeSizer,
  installPointerCapture,
  installRects,
  rectOf,
} from "../../test-utils";
import type { Entity } from "../MarkedSlider/geometry";
import type { MutationSliderGroup } from "./index";
import { MutationSliders } from "./MutationSliders";

let sizer: FakeSizer;
beforeAll(() => {
  sizer = installFakeSizer();
});
afterAll(() => sizer.restore());
afterEach(cleanup);

const BAND: readonly [number, number] = [30_000, 80_000];
const PEOPLE: readonly Entity[] = [
  {
    id: "owner",
    label: "Owner",
    old: 100_000,
    value: 100_000,
    range: [0, 200_000],
  },
  { id: "ana", label: "Ana", old: 50_000, value: 50_000, range: BAND },
  { id: "bo", label: "Bo", old: 55_000, value: 60_000, range: BAND },
  { id: "cy", label: "Cy", old: 78_000, value: 78_000, range: BAND },
  {
    id: "fay",
    label: "Fay",
    old: 90_000,
    value: 90_000,
    range: [70_000, 120_000],
  },
];
const GROUPS: readonly MutationSliderGroup[] = [
  { id: "roof", label: "Roofer", memberIds: ["ana", "bo", "cy"] },
  { id: "fore", label: "Foreman", memberIds: ["fay"] },
];

/** A row that holds its own entities, so a shift moves the group dial too. */
function mount(
  extra: {
    expandedGroups?: ReadonlySet<string>;
    onExpandedChange?: (id: string, open: boolean) => void;
  } = {},
) {
  const [entities, setEntities] = createSignal<readonly Entity[]>(PEOPLE);
  const onChange = vi.fn((id: string, value: number) =>
    setEntities((all) =>
      all.map((entity) => (entity.id === id ? { ...entity, value } : entity)),
    ),
  );
  const onChangeEnd = vi.fn();
  const onReset = vi.fn();
  const utils = render(() => (
    <MutationSliders
      entities={entities()}
      groups={GROUPS}
      domain={[0, 200_000]}
      snap={5_000}
      onChange={onChange}
      onChangeEnd={onChangeEnd}
      onReset={onReset}
      onRemove={() => {}}
      {...extra}
    />
  ));
  const value = (id: string) => entities().find((e) => e.id === id)?.value;
  return { ...utils, onChange, onChangeEnd, onReset, value };
}

const sliderNames = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('[role="slider"]')).map((el) =>
    el.getAttribute("aria-label"),
  );

describe("MutationSliders role groups", () => {
  it("collapses a group to one dial, labelled with its count", () => {
    const { container } = mount();
    expect(sliderNames(container)).toEqual(["Owner", "Roofer × 3", "Foreman"]);
  });

  it("the group dial reads the mean, with the spread under the header", () => {
    const { getByLabelText, getByText } = mount();
    // mean 62,667 on the $5K grid
    expect(getByLabelText("Roofer × 3").getAttribute("aria-valuenow")).toBe(
      "65000",
    );
    expect(getByText("avg · 50000–78000")).toBeTruthy();
  });

  it("an arrow key SHIFTS every member, clamped at its band edge", () => {
    const { getByLabelText, onChange, onChangeEnd, value } = mount();
    fireEvent.keyDown(getByLabelText("Roofer × 3"), { key: "ArrowUp" });
    // 65K → 70K: +5K each; Cy stops at the 80K band top.
    expect(onChange.mock.calls).toEqual([
      ["ana", 55_000],
      ["bo", 65_000],
      ["cy", 80_000],
    ]);
    expect([value("ana"), value("bo"), value("cy")]).toEqual([
      55_000, 65_000, 80_000,
    ]);
    // The commit settles each member where it stands — no second shift.
    expect(onChangeEnd.mock.calls).toEqual([
      ["ana", 55_000],
      ["bo", 65_000],
      ["cy", 80_000],
    ]);
  });

  it("the chevron shows each member, with aria-expanded and words", () => {
    const { container, getByLabelText } = mount();
    const chevron = getByLabelText("Show each Roofer");
    expect(chevron.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(chevron);
    expect(sliderNames(container)).toEqual([
      "Owner",
      "Roofer × 3",
      "Ana",
      "Bo",
      "Cy",
      "Foreman",
    ]);
    const open = getByLabelText("Collapse Roofer");
    expect(open.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(open);
    expect(sliderNames(container)).toEqual(["Owner", "Roofer × 3", "Foreman"]);
  });

  it("a group of one has no chevron, and names its person", () => {
    const { queryByLabelText, getByText } = mount();
    expect(queryByLabelText("Show each Foreman")).toBeNull();
    expect(getByText("Fay")).toBeTruthy();
  });

  it("the group's Reset puts back every changed member, and has no Delete", () => {
    const { getByLabelText, queryByLabelText, onChange } = mount();
    expect(queryByLabelText("Delete Roofer × 3")).toBeNull();
    expect(queryByLabelText("Remove Roofer × 3")).toBeNull();
    fireEvent.click(getByLabelText("Reset Roofer × 3"));
    // Only Bo moved off his old amount.
    expect(onChange.mock.calls).toEqual([["bo", 55_000]]);
  });

  it("controlled: expandedGroups opens it, and the chevron only asks", () => {
    const onExpandedChange = vi.fn();
    const { container, getByLabelText } = mount({
      expandedGroups: new Set(["roof"]),
      onExpandedChange,
    });
    expect(sliderNames(container)).toContain("Ana");
    fireEvent.click(getByLabelText("Collapse Roofer"));
    expect(onExpandedChange).toHaveBeenCalledWith("roof", false);
    // Still open: the caller holds the state.
    expect(sliderNames(container)).toContain("Ana");
  });

  it("uncontrolled: reports the toggle too", () => {
    const onExpandedChange = vi.fn();
    const { getByLabelText } = mount({ onExpandedChange });
    fireEvent.click(getByLabelText("Show each Roofer"));
    expect(onExpandedChange).toHaveBeenCalledWith("roof", true);
  });

  it("an entity outside every group is the dial it always was", () => {
    const { getByLabelText, getByText, onChange } = mount();
    expect(getByText("Owner").closest("button")).not.toBeNull();
    fireEvent.keyDown(getByLabelText("Owner"), { key: "ArrowUp" });
    expect(onChange.mock.calls).toEqual([["owner", 105_000]]);
  });

  it("without groups, the row has no group lines at all", () => {
    const { container, queryByText } = render(() => (
      <MutationSliders entities={PEOPLE} onChange={() => {}} />
    ));
    expect(sliderNames(container)).toEqual(["Owner", "Ana", "Bo", "Cy", "Fay"]);
    expect(queryByText(/avg ·/)).toBeNull();
  });

  // Owner report, thorcasting 2026-10-21: after a drag on "Roofer × 3" the
  // members moved but the group dial and its sub-line looked stale. The row
  // reads the group's mean and spread from the CURRENT entities.
  it("the group dial and its sub-line follow the members after a pointer drag", () => {
    const restoreRects = installRects((el) =>
      el.classList?.contains("sui-marked-slider__track")
        ? rectOf({ left: 0, top: 0, width: 22, height: 200 })
        : null,
    );
    const { container, getByLabelText, queryByText, value } = mount();
    const dial = getByLabelText("Roofer × 3");
    const track = dial
      .closest(".sui-marked-slider")
      ?.querySelector(".sui-marked-slider__track") as HTMLElement;
    expect(track).toBeTruthy();
    const capture = installPointerCapture(track);
    fireEvent.pointerDown(track, { clientY: 900, pointerId: 1, button: 0 });
    fireEvent.pointerUp(track, { clientY: 900, pointerId: 1 });
    capture.restore();
    restoreRects();
    const members = [value("ana"), value("bo"), value("cy")] as number[];
    const mean = members.reduce((a, b) => a + b, 0) / members.length;
    expect(
      Number(getByLabelText("Roofer × 3").getAttribute("aria-valuenow")),
    ).toBe(Math.round(mean / 5_000) * 5_000);
    const lo = Math.min(...members);
    const hi = Math.max(...members);
    if (lo === hi) expect(queryByText(/avg ·/)).toBeNull();
    else expect(queryByText(`avg · ${lo}–${hi}`)).toBeTruthy();
    expect(container).toBeTruthy();
  });
});
