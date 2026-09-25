// BuilderBoardBelowChart — both layouts, drawn from the rects the pure core
// returned: split (B fills, C|D at lowerHeight) and stacked (one column, each
// card at its stated height).
import { render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { afterEach, describe, expect, it } from "vitest";
import { type FakeSizer, installFakeSizer } from "../../test-utils/fakeSizer";
import {
  BuilderBoardBelowChart,
  builderBoardBelowChart,
  createBuilderBoardBelowChart,
  type BuilderBoardBelowChartRects,
  builderBoardPanelBoxOf,
} from "./index";

const rectsFor = (width: number, height: number) =>
  builderBoardBelowChart({
    viewport: { width, height },
    tabBarH: 48,
    chartH: 0.3 * (height - 48),
    legendH: 20,
  });

const mount = (rects: () => BuilderBoardBelowChartRects) =>
  render(() => (
    <BuilderBoardBelowChart
      panelB={<i>series</i>}
      panelC={<i>changes</i>}
      panelD={<i>gauge</i>}
      rects={rects()}
    />
  ));

const panel = (root: HTMLElement, id: string) =>
  root.querySelector<HTMLElement>(`[data-builder-board-panel="${id}"]`);

describe("BuilderBoardBelowChart", () => {
  it("split: B over a C|D row at lowerHeight, and no panel A", () => {
    const rects = rectsFor(1920, 1080);
    expect(rects.layout).toBe("split");
    const { container } = mount(() => rects);
    const root = container.firstElementChild as HTMLElement;
    expect(root.dataset.layout).toBe("split");
    expect(panel(container, "a")).toBeNull();
    const bottom = container.querySelector<HTMLElement>('[data-builder-board-half="bottom"]')!;
    expect(bottom.style.height).toBe(`${rects.lowerHeight}px`);
    expect(panel(bottom, "c")?.textContent).toBe("changes");
    expect(panel(bottom, "d")?.textContent).toBe("gauge");
    expect(panel(container, "b")?.textContent).toBe("series");
  });

  it("stacked: one column, each card holding the height the core stated", () => {
    const rects = rectsFor(1366, 700);
    expect(rects.layout).toBe("stacked");
    const { container } = mount(() => rects);
    const root = container.firstElementChild as HTMLElement;
    expect(root.dataset.layout).toBe("stacked");
    const heights = (Array.from(root.children) as HTMLElement[]).map((c) => c.style.height);
    expect(heights).toEqual([
      `${rects.b.height}px`,
      `${rects.c.height}px`,
      `${rects.d.height}px`,
    ]);
    expect(container.querySelector('[data-builder-board-half="bottom"]')).toBeNull();
    expect(["b", "c", "d"].map((id) => panel(container, id)?.textContent)).toEqual([
      "series",
      "changes",
      "gauge",
    ]);
  });

  it("follows a resize within split without remounting B", () => {
    const [h, setH] = createSignal(1080);
    const Board = createBuilderBoardBelowChart({ rail: "gauge" });
    const { container } = render(() => (
      <Board panelB={<i>b</i>} panelC={<i>c</i>} panelD={<i>d</i>} rects={rectsFor(1920, h())} />
    ));
    const bNode = container.querySelector("i");
    setH(1200);
    const bottom = container.querySelector<HTMLElement>('[data-builder-board-half="bottom"]')!;
    expect(bottom.style.height).toBe(`${rectsFor(1920, 1200).lowerHeight}px`);
    expect(container.querySelector("i")).toBe(bNode);
  });
});

describe("BuilderBoardBelowChart — panel D's box", () => {
  let sizer: FakeSizer | undefined;
  afterEach(() => sizer?.restore());

  it("prints which box D sees: measured once laid out, else the stated rect", () => {
    const stated = { width: 292, height: 426 };
    const rows = [
      ["unmeasured", undefined],
      ["zero (not laid out)", { width: 0, height: 0 }],
      ["measured", { width: 276, height: 410 }],
    ] as const;
    const table = rows
      .map(([name, m]) => {
        const b = builderBoardPanelBoxOf(m, stated);
        return `${name.padEnd(20)} ${String(b.width).padStart(4)} ${String(b.height).padStart(4)}`;
      })
      .join("\n");
    expect(table).toMatchInlineSnapshot(`
      "unmeasured            292  426
      zero (not laid out)   292  426
      measured              276  410"
    `);
  });

  it("hands a render function the stated rect, then the measured box, without remounting", async () => {
    sizer = installFakeSizer();
    const rects = rectsFor(1920, 1080);
    let mounts = 0;
    const { container } = render(() => (
      <BuilderBoardBelowChart
        panelB={<i>b</i>}
        panelC={<i>c</i>}
        panelD={(box) => {
          mounts += 1;
          return <i>{`${box().width}x${box().height}`}</i>;
        }}
        rects={rects}
      />
    ));
    const card = panel(container, "d")!;
    // jsdom lays nothing out: the first box is the core's stated rect.
    expect(card.textContent).toBe(`${rects.d.width}x${rects.d.height}`);
    // The card is laid out: 292 wide with 8px padding a side.
    Object.defineProperty(card, "clientWidth", { value: 292 });
    Object.defineProperty(card, "clientHeight", { value: 426 });
    card.style.padding = "8px";
    await sizer.resize(card, { width: 292, height: 426 });
    expect(card.textContent).toBe("276x410");
    expect(mounts).toBe(1);
  });

  it("measures nothing for a plain element", () => {
    sizer = installFakeSizer();
    mount(() => rectsFor(1920, 1080));
    expect(sizer.observed()).toHaveLength(0);
  });
});
