// ============================================
// BuilderBoard — the frame chain, pinned.
//
// The component IS the nesting order of five Layout/Surface variants, so the
// tests assert that order on the rendered DOM: which box holds which slot,
// and that every size-bearing declaration is one a variant baked — nothing a
// page could have written. The numbers themselves are geometry.test.ts's.
// ============================================
import { render } from "@solidjs/testing-library";
import { describe, expect, it } from "vitest";
import { NATURAL_GAUGE_WIDTH } from "../RateGauge/geometry";
import { BuilderBoard, createBuilderBoard } from "./BuilderBoard";

const board = () =>
  render(() => (
    <BuilderBoard
      panelA={<span>cashflow</span>}
      panelB={<span>series</span>}
      panelC={<span>changes</span>}
      panelD={<span>gauge</span>}
    />
  ));

const panel = (root: HTMLElement, id: string): HTMLElement => {
  const el = root.querySelector<HTMLElement>(`[data-builder-board-panel="${id}"]`);
  if (el === null) throw new Error(`no panel ${id}`);
  return el;
};

describe("BuilderBoard", () => {
  it("is a ViewportColumn holding two HalfFillColumns", () => {
    const { container } = board();
    const root = container.firstElementChild as HTMLElement;
    expect(root.dataset.builderBoard).toBe("");
    expect(root.className).toMatch(/stack--fill/);
    expect(root.className).toMatch(/stack--gap-sm/);
    const halves = Array.from(root.children) as HTMLElement[];
    expect(halves.map((h) => h.dataset.builderBoardHalf)).toEqual(["top", "bottom"]);
    // `flex: 1 1 0` is what HalfFillColumn bakes; jsdom's style parser drops
    // the unitless basis, so the class and the min-height are what a DOM test
    // can see of it. The zero basis is pinned by the variant, not re-tested.
    for (const half of halves) {
      expect(half.className).toBe("stack stack--gap-xs");
      expect(half.style.minHeight).toBe("0px");
    }
  });

  it("stacks A over B in the top half, each a fill card in its own HalfFillColumn", () => {
    const { container } = board();
    const a = panel(container, "a");
    const b = panel(container, "b");
    expect(a.nextElementSibling).toBe(b);
    expect(a.parentElement?.dataset.builderBoardHalf).toBe("top");
    for (const cell of [a, b]) {
      expect(cell.className).toBe("stack stack--gap-xs");
      expect(cell.style.minHeight).toBe("0px");
      const card = cell.firstElementChild as HTMLElement;
      expect(card.className).toMatch(/surface/);
      expect(card.style.height).toBe("100%");
    }
    expect(a.textContent).toBe("cashflow");
    expect(b.textContent).toBe("series");
  });

  it("puts C beside D in a FillPaneRailGrid whose rail is the gauge's natural width", () => {
    const { container } = board();
    const c = panel(container, "c");
    const d = panel(container, "d");
    expect(c.nextElementSibling).toBe(d);
    const grid = c.parentElement as HTMLElement;
    expect(grid.className).toMatch(/grid/);
    expect(grid.style.gridTemplateColumns).toBe(`minmax(0, 1fr) ${NATURAL_GAUGE_WIDTH}px`);
    expect(grid.style.gridTemplateRows).toBe("minmax(0, 1fr)");
    expect(grid.parentElement?.dataset.builderBoardHalf).toBe("bottom");
    expect(d.textContent).toBe("gauge");
  });

  it("gives C, and only C, an internal scroll region", () => {
    const { container } = board();
    // The card's own inner fill stack comes first; the scroll region is the
    // one box under it that states an overflow.
    const scroll = panel(container, "c").querySelector<HTMLElement>("[style*='overflow']");
    if (scroll === null) throw new Error("C has no scroll region");
    expect(scroll.style.overflow).toBe("auto");
    expect(scroll.style.minHeight).toBe("0px");
    expect(scroll.textContent).toBe("changes");
    for (const id of ["a", "b", "d"]) {
      expect(panel(container, id).querySelector("[style*='overflow']")).toBeNull();
    }
  });

  it("takes every size from a variant — no consumer pixel reaches the DOM", () => {
    const { container } = board();
    const html = container.innerHTML;
    // The rail track is the ONLY px literal the frame emits, and it is the
    // gauge's own number.
    const px = html.match(/\d+px/g) ?? [];
    expect(new Set(px)).toEqual(new Set([`${NATURAL_GAUGE_WIDTH}px`, "0px"]));
  });

  it("createBuilderBoard locks the rail token", () => {
    const Board = createBuilderBoard({ rail: "gauge" });
    const { container } = render(() => (
      <Board panelA="a" panelB="b" panelC="c" panelD="d" />
    ));
    expect(container.querySelector("[data-builder-board]")).not.toBeNull();
  });
});
