import { describe, it, expect } from "vitest";
import {
  MIN_ARROW_PX,
  H_PADDING_PX,
  V_PADDING_PX,
  BADGE_EXTENT,
  widestNodeWidth,
  tallestNodeHeight,
  widthForDepth,
  fitDepth,
  fitColumnGap,
  fitRows,
} from "./helpers";
import { DEFAULT_SIZE } from "./types";
import type { DAGNode } from "../DagChart/types";

// These are the pure kernels behind SwimlaneChart's responsive collapse. They
// are closed-form and side-effect free, but went untested because the only
// thing that calls them — the container-width memo chain — could not be driven
// under jsdom without a ResizeObserver. The integration side is covered in
// SwimlaneChart.responsive.test.tsx; this file pins the arithmetic directly.

const node = (id: string): DAGNode<unknown> =>
  ({ id, data: {} }) as DAGNode<unknown>;

const [DEFAULT_W, DEFAULT_H] = DEFAULT_SIZE;

describe("widestNodeWidth / tallestNodeHeight", () => {
  it("takes the maximum across nodes", () => {
    const nodes = [node("a"), node("b"), node("c")];
    const sizes: Record<string, [number, number]> = {
      a: [100, 40],
      b: [240, 90],
      c: [180, 60],
    };
    expect(widestNodeWidth(nodes, (n) => sizes[n.id])).toBe(240);
    expect(tallestNodeHeight(nodes, (n) => sizes[n.id])).toBe(90);
  });

  it("floors at the default box rather than returning 0", () => {
    // An empty graph has no maximum; the formulas downstream divide by these,
    // so a 0 would poison every derived gap.
    expect(widestNodeWidth([], () => [0, 0])).toBe(DEFAULT_W);
    expect(tallestNodeHeight([], () => [0, 0])).toBe(DEFAULT_H);
  });

  it("floors at the default when every node measures zero", () => {
    expect(widestNodeWidth([node("a")], () => [0, 0])).toBe(DEFAULT_W);
    expect(tallestNodeHeight([node("a")], () => [0, 0])).toBe(DEFAULT_H);
  });
});

describe("widthForDepth", () => {
  it("reserves symmetric rings plus one node, two badges and two paddings", () => {
    const w = 180;
    const minGap = w + MIN_ARROW_PX; // 230
    expect(widthForDepth(2, w)).toBe(
      2 * 2 * minGap + w + 2 * BADGE_EXTENT + 2 * H_PADDING_PX,
    );
    expect(widthForDepth(2, w)).toBe(1264);
  });

  it("at depth 0 reserves only the centre node, badges and padding", () => {
    expect(widthForDepth(0, 180)).toBe(
      180 + 2 * BADGE_EXTENT + 2 * H_PADDING_PX,
    );
    expect(widthForDepth(0, 180)).toBe(344);
  });

  it("grows linearly in depth", () => {
    const step = widthForDepth(2, 180) - widthForDepth(1, 180);
    expect(widthForDepth(3, 180) - widthForDepth(2, 180)).toBe(step);
  });
});

describe("fitDepth", () => {
  it("returns userMax unchanged when the container is unmeasured", () => {
    // 0 means "no measurement yet", not "no space" — collapsing on an
    // unmeasured container would flash the collapsed form on first paint.
    expect(fitDepth(2, 0, 180)).toBe(2);
    expect(fitDepth(5, 0, 180)).toBe(5);
  });

  it("keeps userMax when it fits exactly", () => {
    expect(fitDepth(2, widthForDepth(2, 180), 180)).toBe(2);
  });

  it("steps down one ring at a time as width is removed", () => {
    expect(fitDepth(2, widthForDepth(2, 180) - 1, 180)).toBe(1);
    expect(fitDepth(2, widthForDepth(1, 180), 180)).toBe(1);
    expect(fitDepth(2, widthForDepth(1, 180) - 1, 180)).toBe(0);
  });

  it("collapses to 0 when not even one ring fits", () => {
    expect(fitDepth(3, 100, 180)).toBe(0);
  });

  it("never exceeds userMax however wide the container", () => {
    expect(fitDepth(1, 100_000, 180)).toBe(1);
  });
});

describe("fitColumnGap", () => {
  const W = 180;
  const MIN_GAP = W + MIN_ARROW_PX; // 230

  it("degenerates to the min gap at depth 0", () => {
    expect(fitColumnGap(0, 5000, W, 260)).toBe(MIN_GAP);
    expect(fitColumnGap(-1, 5000, W, 260)).toBe(MIN_GAP);
  });

  it("caps at the caller's default when there is room to spare", () => {
    expect(fitColumnGap(2, 100_000, W, 260)).toBe(260);
  });

  it("never returns less than the min gap however narrow the container", () => {
    expect(fitColumnGap(2, 0, W, 260)).toBe(MIN_GAP);
    expect(fitColumnGap(2, 200, W, 260)).toBe(MIN_GAP);
  });

  it("interpolates between min and default in the squeezed band", () => {
    // Solve for the width that yields exactly a 245px gap at depth 2.
    const target = 245;
    const width = target * 2 * 2 + W + 2 * BADGE_EXTENT + 2 * H_PADDING_PX;
    expect(fitColumnGap(2, width, W, 260)).toBeCloseTo(target, 6);
    expect(fitColumnGap(2, width, W, 260)).toBeGreaterThan(MIN_GAP);
    expect(fitColumnGap(2, width, W, 260)).toBeLessThan(260);
  });
});

describe("fitRows", () => {
  it("fits one row plus one per whole rowGap of remaining height", () => {
    // usable = 600 - 2*24 - 60 = 492; floor(492/80) = 6; +1 = 7
    expect(fitRows(600, 80, 60)).toBe(7);
  });

  it("returns at least 1 even when the node alone overflows", () => {
    expect(fitRows(0, 80, 60)).toBe(1);
    expect(fitRows(50, 80, 400)).toBe(1);
  });

  it("accounts for vertical padding on both edges", () => {
    const withPadding = fitRows(600, 80, 60);
    const withoutPadding = Math.max(1, Math.floor((600 - 60) / 80) + 1);
    expect(withPadding).toBeLessThanOrEqual(withoutPadding);
    expect(V_PADDING_PX).toBeGreaterThan(0);
  });

  it("adds a row for each additional rowGap of height", () => {
    expect(fitRows(600 + 80, 80, 60)).toBe(fitRows(600, 80, 60) + 1);
  });
});
