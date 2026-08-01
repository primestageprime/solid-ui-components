import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import {
  AreaFocusGrid,
  createAreaFocusGrid,
  type AreaFocusGridArea,
} from "./AreaFocusGrid";

const AREAS: AreaFocusGridArea[] = [
  {
    id: "a1",
    label: "Area One",
    focuses: [
      { id: "f1", label: "Focus 1" },
      { id: "f2", label: "Focus 2" },
    ],
  },
  {
    id: "a2",
    label: "Area Two",
    focuses: [{ id: "f3", label: "Focus 3" }],
  },
];

const renderers = {
  renderAreaHeader: (a: AreaFocusGridArea) => <span>{a.label}</span>,
  renderFocusLabel: (k: { focus: { label: string } }) => (
    <span>{k.focus.label}</span>
  ),
  renderAboveCell: (k: { focus: { id: string } }) => (
    <span>above-{k.focus.id}</span>
  ),
  renderBelowCell: (k: { focus: { id: string } }) => (
    <span>below-{k.focus.id}</span>
  ),
};

describe("AreaFocusGrid", () => {
  it("renders one header per area and one label/cell per sub-column", () => {
    const { container, getByText } = render(() => (
      <AreaFocusGrid areas={AREAS} {...renderers} />
    ));
    const root = container.querySelector(".sui-area-focus-grid")!;
    expect(root).toBeTruthy();
    expect(root.querySelectorAll(".sui-area-focus-grid__area-header").length).toBe(
      2,
    );
    // 3 sub-columns total across the two areas.
    expect(root.querySelectorAll(".sui-area-focus-grid__focus").length).toBe(3);
    // Above + below cell stacks: one each per sub-column.
    expect(
      root.querySelectorAll(".sui-area-focus-grid__cell-stack").length,
    ).toBe(6);
    expect(getByText("Area One")).toBeTruthy();
    expect(getByText("Focus 3")).toBeTruthy();
    expect(getByText("above-f1")).toBeTruthy();
    expect(getByText("below-f3")).toBeTruthy();
  });

  it("draws a major separator between adjacent areas", () => {
    const { container } = render(() => (
      <AreaFocusGrid areas={AREAS} {...renderers} />
    ));
    const root = container.querySelector(".sui-area-focus-grid")!;
    expect(
      root.querySelectorAll(".sui-area-focus-grid__sep--major").length,
    ).toBeGreaterThan(0);
  });

  it("skips areas with no focuses", () => {
    const withEmpty: AreaFocusGridArea[] = [
      ...AREAS,
      { id: "a3", label: "Empty", focuses: [] },
    ];
    const { container, queryByText } = render(() => (
      <AreaFocusGrid areas={withEmpty} {...renderers} />
    ));
    const root = container.querySelector(".sui-area-focus-grid")!;
    // Still 2 headers — the empty area is dropped by buildLayout.
    expect(root.querySelectorAll(".sui-area-focus-grid__area-header").length).toBe(
      2,
    );
    expect(queryByText("Empty")).toBeNull();
  });

  it("applies a caller class alongside the base class", () => {
    const { container } = render(() => (
      <AreaFocusGrid areas={AREAS} class="my-grid" {...renderers} />
    ));
    const root = container.querySelector(".sui-area-focus-grid")!;
    expect(root.classList.contains("my-grid")).toBe(true);
  });

  it("createAreaFocusGrid bakes sizing overrides and exposes only data props", () => {
    const Curried = createAreaFocusGrid({
      subColumnMinWidth: "200px",
      cellRowMinHeight: "120px",
    });
    const { container } = render(() => (
      <Curried areas={AREAS} {...renderers} />
    ));
    const root = container.querySelector(".sui-area-focus-grid") as HTMLElement;
    expect(root).toBeTruthy();
    // The override flows into the inline grid-template-columns track sizing.
    expect(root.style.getPropertyValue("grid-template-columns")).toContain(
      "200px",
    );
  });
});
