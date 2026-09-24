// BuilderBoardBelowChart — the frame chain, and the one stated number: the
// C|D row takes exactly the `lowerHeight` the pure core computed.
import { render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { describe, expect, it } from "vitest";
import {
  BuilderBoardBelowChart,
  builderBoardBelowChart,
  createBuilderBoardBelowChart,
} from "./index";

describe("BuilderBoardBelowChart", () => {
  it("draws B over a C|D row sized from the pure core, and no panel A", () => {
    const rects = builderBoardBelowChart({
      viewport: { width: 1440, height: 900 },
      tabBarH: 48,
      chartH: 256,
      legendH: 20,
    });
    const { container } = render(() => (
      <BuilderBoardBelowChart
        panelB={<span>series</span>}
        panelC={<span>changes</span>}
        panelD={<span>gauge</span>}
        lowerHeight={rects.lowerHeight}
      />
    ));
    const root = container.firstElementChild as HTMLElement;
    expect(root.dataset.builderBoard).toBe("below-chart");
    expect(container.querySelector('[data-builder-board-panel="a"]')).toBeNull();
    const [b, bottom] = Array.from(root.children) as HTMLElement[];
    expect(b.dataset.builderBoardPanel).toBe("b");
    expect(b.textContent).toBe("series");
    expect(bottom.dataset.builderBoardHalf).toBe("bottom");
    expect(bottom.style.height).toBe(`${rects.lowerHeight}px`);
    expect(bottom.querySelector('[data-builder-board-panel="c"]')?.textContent).toBe("changes");
    expect(bottom.querySelector('[data-builder-board-panel="d"]')?.textContent).toBe("gauge");
  });

  it("follows a new lowerHeight (a window resize) without remounting B", () => {
    const [h, setH] = createSignal(400);
    const Board = createBuilderBoardBelowChart({ rail: "gauge" });
    const { container } = render(() => (
      <Board panelB={<i>b</i>} panelC={<i>c</i>} panelD={<i>d</i>} lowerHeight={h()} />
    ));
    const bNode = container.querySelector("i");
    setH(300);
    const bottom = container.querySelector<HTMLElement>('[data-builder-board-half="bottom"]')!;
    expect(bottom.style.height).toBe("300px");
    expect(container.querySelector("i")).toBe(bNode);
  });
});
