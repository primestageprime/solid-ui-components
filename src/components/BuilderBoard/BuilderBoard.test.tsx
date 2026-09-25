// ============================================
// BuilderBoard — the frame chain, pinned.
//
// The component IS the nesting order of five Layout/Surface variants, so the
// tests assert that order on the rendered DOM: which box holds which slot,
// and that every size-bearing declaration is one a variant baked — nothing a
// page could have written. The numbers themselves are geometry.test.ts's.
// ============================================
import { render } from "@solidjs/testing-library";
import { afterEach, describe, expect, it } from "vitest";
import { type FakeSizer, installFakeSizer } from "../../test-utils/fakeSizer";
import { NATURAL_GAUGE_WIDTH } from "../RateGauge/geometry";
import { BuilderBoard, createBuilderBoard } from "./BuilderBoard";
import { C_STACKED_HEIGHT, D_STACKED_HEIGHT } from "./geometry";

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

describe("BuilderBoard — panel D's box", () => {
  let sizer: FakeSizer | undefined;
  afterEach(() => sizer?.restore());

  it("hands a render function the rail width, then the measured box, without remounting", async () => {
    sizer = installFakeSizer();
    let mounts = 0;
    const { container } = render(() => (
      <BuilderBoard
        panelA={<span>a</span>}
        panelB={<span>b</span>}
        panelC={<span>c</span>}
        panelD={(box) => {
          mounts += 1;
          return <span>{`${box().width}x${box().height}`}</span>;
        }}
      />
    ));
    const card = panel(container, "d");
    // jsdom lays nothing out: the stated box is the rail's width, height 0.
    expect(card.textContent).toBe(`${NATURAL_GAUGE_WIDTH}x0`);
    Object.defineProperty(card, "clientWidth", { value: 292 });
    Object.defineProperty(card, "clientHeight", { value: 300 });
    card.style.padding = "8px";
    await sizer.resize(card, { width: 292, height: 300 });
    expect(card.textContent).toBe("276x284");
    expect(mounts).toBe(1);
  });

  it("measures nothing for a plain element", () => {
    sizer = installFakeSizer();
    const { container } = board();
    // The board observes its own width (single column); D's card is never
    // observed for a plain element.
    expect(sizer.observed()).not.toContain(panel(container, "d"));
    expect(panel(container, "d").textContent).toBe("gauge");
  });
});

describe("BuilderBoard — single column on a narrow board", () => {
  let sizer: FakeSizer | undefined;
  afterEach(() => sizer?.restore());

  it("goes single column under 600px and back, without remounting a panel", async () => {
    sizer = installFakeSizer();
    const { container } = board();
    const root = container.querySelector<HTMLElement>("[data-builder-board]")!;
    expect(root.dataset.layout).toBeUndefined(); // unmeasured: split, as before
    await sizer.resize(root, { width: 390, height: 760 });
    expect(root.dataset.layout).toBe("stacked");
    expect(container.querySelector('[data-builder-board-half="bottom"]')).toBeNull();
    const heights = Array.from(
      root.querySelectorAll<HTMLElement>("[data-builder-board-panel]"),
      (el) => [el.dataset.builderBoardPanel, el.parentElement!.style.height],
    );
    expect(heights).toEqual([
      ["a", "240px"],
      ["b", "240px"],
      ["c", `${C_STACKED_HEIGHT}px`],
      ["d", `${D_STACKED_HEIGHT}px`],
    ]);
    const gauge = panel(container, "d").firstElementChild;
    await sizer.resize(root, { width: 420, height: 760 });
    expect(panel(container, "d").firstElementChild).toBe(gauge);
    await sizer.resize(root, { width: 1200, height: 700 });
    expect(root.dataset.layout).toBeUndefined();
    expect(container.querySelector('[data-builder-board-half="bottom"]')).toBeTruthy();
  });
});

