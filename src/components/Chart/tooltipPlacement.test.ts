import { describe, it, expect } from "vitest";
import { chartToOverlay, placeTooltipX } from "./tooltipPlacement";

describe("placeTooltipX", () => {
  it("sits to the right of the anchor when it fits", () => {
    // Mirrors Tooltip.test.tsx "sits to the right of the anchor when it fits".
    const x = placeTooltipX({
      anchorX: 36,
      tipWidth: 120,
      offsetX: 12,
      boundsLeft: 0,
      boundsRight: 200,
    });
    expect(x).toBeCloseTo(48, 5);
  });

  it("flips to the left of the anchor rather than overflowing the right bound", () => {
    // Mirrors Tooltip.test.tsx "flips to the left ... overflowing the right edge".
    const x = placeTooltipX({
      anchorX: 192,
      tipWidth: 120,
      offsetX: 12,
      boundsLeft: 0,
      boundsRight: 200,
    });
    expect(x).toBeCloseTo(60, 5);
    expect(x + 120).toBeLessThanOrEqual(200);
  });

  it("flips correctly with a non-zero left bound", () => {
    const x = placeTooltipX({
      anchorX: 500,
      tipWidth: 100,
      offsetX: 10,
      boundsLeft: 40,
      boundsRight: 560,
    });
    // preferred 510 + 100 = 610 > 560 → flips to 500 - 10 - 100 = 390.
    expect(x).toBeCloseTo(390, 5);
  });

  it("pins to boundsLeft when the tooltip is wider than the bounds span", () => {
    const x = placeTooltipX({
      anchorX: 10,
      tipWidth: 300,
      offsetX: 12,
      boundsLeft: 0,
      boundsRight: 200,
    });
    expect(x).toBeCloseTo(0, 5);
  });

  it("pins to the lesser-loss edge when wider than the bounds and boundsLeft is non-zero", () => {
    const x = placeTooltipX({
      anchorX: 50,
      tipWidth: 1000,
      offsetX: 12,
      boundsLeft: 20,
      boundsRight: 200,
    });
    // flipped = 50 - 12 - 1000 = -962, well under boundsLeft (20), so pin to
    // max(boundsLeft, boundsRight - tipWidth) = max(20, -800) = 20.
    expect(x).toBeCloseTo(20, 5);
  });
});

describe("chartToOverlay", () => {
  const box = (left: number, top: number, width: number, height: number) => ({
    left,
    top,
    width,
    height,
  });

  it("maps 1:1 when the svg is drawn at its viewBox size", () => {
    const t = chartToOverlay({
      viewBoxWidth: 200,
      viewBoxHeight: 100,
      svgBox: box(10, 20, 200, 100),
      overlayBox: box(10, 20, 200, 100),
    });
    expect(t).toEqual({ scale: 1, offsetX: 0, offsetY: 0 });
  });

  it("scales by the svg's on-screen size", () => {
    const t = chartToOverlay({
      viewBoxWidth: 200,
      viewBoxHeight: 100,
      svgBox: box(0, 0, 400, 200),
      overlayBox: box(0, 0, 400, 200),
    });
    expect(t).toEqual({ scale: 2, offsetX: 0, offsetY: 0 });
  });

  it("uses the tighter axis and centres the letterbox (xMidYMid meet)", () => {
    // 400 wide x 100 tall box for a 2:1 viewBox: height binds, scale 1,
    // the 200px of spare width splits 100 / 100.
    const t = chartToOverlay({
      viewBoxWidth: 200,
      viewBoxHeight: 100,
      svgBox: box(0, 0, 400, 100),
      overlayBox: box(0, 0, 400, 100),
    });
    expect(t).toEqual({ scale: 1, offsetX: 100, offsetY: 0 });
  });

  it("adds the svg's own offset inside the overlay (a title above it)", () => {
    const t = chartToOverlay({
      viewBoxWidth: 200,
      viewBoxHeight: 100,
      svgBox: box(0, 24, 200, 100),
      overlayBox: box(0, 0, 200, 124),
    });
    expect(t).toEqual({ scale: 1, offsetX: 0, offsetY: 24 });
  });

  it("is the identity for an unmeasured svg", () => {
    const t = chartToOverlay({
      viewBoxWidth: 200,
      viewBoxHeight: 100,
      svgBox: box(0, 0, 0, 0),
      overlayBox: box(0, 0, 0, 0),
    });
    expect(t).toEqual({ scale: 1, offsetX: 0, offsetY: 0 });
  });
});
