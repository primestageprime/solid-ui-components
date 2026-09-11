import { describe, it, expect, afterEach } from "vitest";
import { render } from "@solidjs/testing-library";
import { ScrubChart } from "./ScrubChart";
import { ScrubChartTooltip } from "./ScrubChartTooltip";
import { dailyCells, type Cell } from "../DateAxis";

const cells = dailyCells(new Date("2026-05-01"), new Date("2026-05-10"));

// jsdom lays nothing out, so offsetWidth is always 0. Stub the prototype
// getter to give the component a rendered width to react to — the same
// technique Chart/Tooltip.test.tsx uses, since this adapter calls the same
// core.
let restoreWidth: (() => void) | null = null;
const stubTooltipWidth = (px: number) => {
  const original = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    "offsetWidth",
  );
  Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
    configurable: true,
    get: () => px,
  });
  restoreWidth = () => {
    if (original) {
      Object.defineProperty(HTMLElement.prototype, "offsetWidth", original);
    } else {
      delete (HTMLElement.prototype as { offsetWidth?: number }).offsetWidth;
    }
  };
};

afterEach(() => {
  restoreWidth?.();
  restoreWidth = null;
});

/** Renders one `<ScrubChartTooltip>` inside a real `ScrubChart` frame
 *  (`chartWidth` fixed by `ScrubChart`'s `DEFAULT_CHART_WIDTH` = 1200, since
 *  no ResizeObserver fires under jsdom) and hands back the container and the
 *  card element. */
const renderCard = (
  props: Omit<
    Parameters<typeof ScrubChartTooltip<Cell>>[0],
    "ctx" | "children"
  >,
) => {
  const result = render(() => (
    <ScrubChart<Cell>
      cells={cells}
      selected={0}
      onScrub={() => {}}
      renderCell={() => <span />}
      renderChart={(ctx) => (
        <svg viewBox={`0 0 ${ctx.width} ${ctx.height}`}>
          <ScrubChartTooltip ctx={ctx} class="card" {...props}>
            <span data-testid="row">content</span>
          </ScrubChartTooltip>
        </svg>
      )}
    />
  ));
  const card = () => result.container.querySelector(".card") as HTMLElement;
  return { ...result, card };
};

describe("ScrubChartTooltip — the ScrubChart adapter", () => {
  it("renders its children", () => {
    const { getByTestId } = renderCard({ anchorX: 100, anchorY: 20 });
    expect(getByTestId("row").textContent).toBe("content");
  });

  it("sits offsetX right of the anchor when it fits (default offset 12, 0)", () => {
    stubTooltipWidth(120);
    const { card } = renderCard({ anchorX: 100, anchorY: 20 });
    expect(parseFloat(card().style.left)).toBeCloseTo(112, 1);
    expect(parseFloat(card().style.top)).toBeCloseTo(20, 1);
  });

  it("flips to the left of the anchor rather than overflowing the frame's right edge", () => {
    // Frame width is 1200 (DEFAULT_CHART_WIDTH). anchorX near the edge, at
    // 1150: preferred 1162 + 120 = 1282 > 1200, so it flips to
    // 1150 - 12 - 120 = 1018.
    stubTooltipWidth(120);
    const { card } = renderCard({ anchorX: 1150, anchorY: 20 });
    expect(parseFloat(card().style.left)).toBeCloseTo(1018, 1);
    expect(parseFloat(card().style.left) + 120).toBeLessThanOrEqual(1200);
  });

  it("pins to the frame's left edge when the card is wider than the frame", () => {
    stubTooltipWidth(1300);
    const { card } = renderCard({ anchorX: 1150, anchorY: 20 });
    expect(parseFloat(card().style.left)).toBeCloseTo(0, 1);
  });

  it("honours a custom offset", () => {
    stubTooltipWidth(50);
    const { card } = renderCard({
      anchorX: 100,
      anchorY: 20,
      offset: { x: 5, y: 8 },
    });
    expect(parseFloat(card().style.left)).toBeCloseTo(105, 1);
    expect(parseFloat(card().style.top)).toBeCloseTo(28, 1);
  });
});
