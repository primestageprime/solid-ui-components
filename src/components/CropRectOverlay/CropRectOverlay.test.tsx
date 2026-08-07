import { render } from "@solidjs/testing-library";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CropRectOverlay } from "./CropRectOverlay";

// The overlay converts between screen and image coordinates via
// getBoundingClientRect, which jsdom reports as all-zeros — and a zero-sized
// frame is treated as "no content box yet", so nothing renders. Stubbing it
// with a real frame is what lets the rects exist at all in a test.
const FRAME = { x: 0, y: 0, top: 0, left: 0, right: 400, bottom: 300, width: 400, height: 300 };
const originalRect = HTMLElement.prototype.getBoundingClientRect;
beforeAll(() => {
  HTMLElement.prototype.getBoundingClientRect = function () {
    return { ...FRAME, toJSON: () => FRAME } as DOMRect;
  };
});
afterAll(() => {
  HTMLElement.prototype.getBoundingClientRect = originalRect;
});

const rects = [
  { x: 0, y: 0, width: 100, height: 100 },
  { x: 200, y: 100, width: 150, height: 120 },
];

const renderOverlay = (selectedIndex: number | null) =>
  render(() => (
    <CropRectOverlay
      naturalWidth={800}
      naturalHeight={600}
      rects={rects}
      onRectsChange={() => {}}
      selectedIndex={selectedIndex}
      onSelectedIndexChange={() => {}}
    />
  ));

describe("CropRectOverlay", () => {
  it("renders one box per rect, numbered in order", () => {
    const { container } = renderOverlay(null);
    const boxes = container.querySelectorAll(".sui-crop-overlay__rect");
    expect(boxes.length).toBe(2);
    expect(
      Array.from(container.querySelectorAll(".sui-crop-overlay__badge")).map((b) => b.textContent),
    ).toEqual(["1", "2"]);
  });

  it("positions a rect by scaling image space into the letterboxed content box", () => {
    // 800x600 inside a 400x300 frame scales by exactly 0.5, with no
    // letterboxing (matching aspect ratios) — so a 100px rect at the origin
    // lands at 0,0 and measures 50px.
    const { container } = renderOverlay(null);
    const first = container.querySelector<HTMLElement>(".sui-crop-overlay__rect");
    expect(first?.style.left).toBe("0px");
    expect(first?.style.top).toBe("0px");
    expect(first?.style.width).toBe("50px");
    expect(first?.style.height).toBe("50px");
  });

  it("shows resize handles only on the selected rect", () => {
    const { container } = renderOverlay(1);
    const boxes = container.querySelectorAll(".sui-crop-overlay__rect");
    expect(boxes[0].querySelectorAll(".sui-crop-overlay__handle").length).toBe(0);
    expect(boxes[1].querySelectorAll(".sui-crop-overlay__handle").length).toBe(4);
  });
});
