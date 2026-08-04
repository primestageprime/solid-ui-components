import { render, cleanup } from "@solidjs/testing-library";
import { afterEach, describe, expect, it } from "vitest";
import { ResponsiveMoney } from "./index";
import {
  installFakeSizer,
  installRects,
  rectOf,
  type FakeSizer,
} from "../../test-utils";

// The shrink ladder needs two things jsdom cannot supply: a width for each
// candidate rendering (every rect is zero) and a container size to compare them
// against (no ResizeObserver exists). Both come from the shared harness.
//
// Candidate widths are derived from the measurement twin's LIVE textContent,
// because ResponsiveMoney measures every candidate through that one node —
// assigning each string in turn and reading the rect back (ResponsiveMoney.tsx:
// 56-61). A static rect would return the same width for all of them and the
// ladder could never step.
const CHAR_PX = 10;
const measureTwin = (el: Element) =>
  el.classList.contains("sui-responsive-money__measure")
    ? rectOf({
        left: 0,
        top: 0,
        width: (el.textContent ?? "").length * CHAR_PX,
        height: 16,
      })
    : null;

// $330,285 → 8 chars → 80px | $330k → 5 chars → 50px
const CENTS = 33_028_500;

let sizer: FakeSizer;
let restoreRects: () => void;

const mount = () => {
  restoreRects = installRects(measureTwin);
  sizer = installFakeSizer();
  const { container } = render(() => <ResponsiveMoney cents={CENTS} />);
  const box = container.querySelector(".sui-responsive-money") as HTMLElement;
  return { container, box };
};

afterEach(() => {
  cleanup();
  sizer?.restore();
  restoreRects?.();
});

// The visible figure is the first Text span; the second is the hidden
// measurement twin (see ResponsiveMoney.tsx), which shares the DOM but must
// be excluded from assertions on what's actually shown.
const visibleText = (container: HTMLElement) =>
  container.querySelector(".sui-responsive-money > span")!.textContent;

describe("ResponsiveMoney", () => {
  it("renders the full (widest) tier before any container width is measured", () => {
    // clientWidth is 0 on mount, so the component falls back to the widest
    // ladder candidate rather than the narrowest.
    const { container } = mount();
    expect(visibleText(container)).toBe("$330,285");
  });

  it("keeps the sign for negative values", () => {
    restoreRects = installRects(measureTwin);
    sizer = installFakeSizer();
    const { container } = render(() => <ResponsiveMoney cents={-33_028_500} />);
    expect(visibleText(container)).toBe("-$330,285");
  });

  it("keeps the full tier when the container has room for it", async () => {
    const { container, box } = mount();
    await sizer.resize(box, { width: 100, height: 16 });
    expect(visibleText(container)).toBe("$330,285");
  });

  it("steps down to the k tier when the full tier no longer fits", async () => {
    const { container, box } = mount();
    await sizer.resize(box, { width: 60, height: 16 });
    expect(visibleText(container)).toBe("$330k");
  });

  it("falls back to the narrowest tier rather than rendering nothing", async () => {
    // 30px fits no candidate — the memo's `fitIndex === -1` branch, which never
    // executed under test before a container size could be delivered.
    const { container, box } = mount();
    await sizer.resize(box, { width: 30, height: 16 });
    expect(visibleText(container)).toBe("$330k");
  });

  it("steps back up when the container grows again", async () => {
    const { container, box } = mount();
    await sizer.resize(box, { width: 60, height: 16 });
    expect(visibleText(container)).toBe("$330k");
    await sizer.resize(box, { width: 200, height: 16 });
    expect(visibleText(container)).toBe("$330,285");
  });

  it("observes the container element itself", () => {
    const { box } = mount();
    expect(sizer.observations.length).toBe(1);
    expect(sizer.observations[0].el).toBe(box);
  });
});
