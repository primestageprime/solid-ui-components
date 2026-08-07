import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { render } from "@solidjs/testing-library";
import { ScrollRegion, ScrollRegionMd, createScrollRegion } from "./index";
import { installFakeSizer, type FakeSizer } from "../../test-utils";

// jsdom does not implement ResizeObserver/MutationObserver layout, and reports 0
// for scrollHeight/clientHeight. The sizer stays silent — `resize` is never
// called — and the geometry is driven instead by defining the scroll metrics on
// the viewport and firing a scroll event, which is the same recompute path the
// component uses at runtime.
let sizer: FakeSizer;
beforeAll(() => {
  sizer = installFakeSizer();
});
afterAll(() => sizer.restore());

const viewportOf = (container: HTMLElement) =>
  container.querySelector(".sui-scroll-region__viewport") as HTMLDivElement;
const topFade = (container: HTMLElement) =>
  container.querySelector(".sui-scroll-region__fade--top") as HTMLElement;
const bottomFade = (container: HTMLElement) =>
  container.querySelector(".sui-scroll-region__fade--bottom") as HTMLElement;

/** Stamp scroll geometry onto the viewport and trigger the recompute. */
const setGeometry = (
  el: HTMLElement,
  geom: { scrollTop: number; clientHeight: number; scrollHeight: number },
) => {
  Object.defineProperty(el, "scrollTop", {
    value: geom.scrollTop,
    configurable: true,
  });
  Object.defineProperty(el, "clientHeight", {
    value: geom.clientHeight,
    configurable: true,
  });
  Object.defineProperty(el, "scrollHeight", {
    value: geom.scrollHeight,
    configurable: true,
  });
  el.dispatchEvent(new Event("scroll"));
};

describe("ScrollRegion", () => {
  it("renders the BEM frame, viewport, content and both fades", () => {
    const { container } = render(() => (
      <ScrollRegion>
        <div>row</div>
      </ScrollRegion>
    ));
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toMatch(/sui-scroll-region/);
    expect(
      container.querySelector(".sui-scroll-region__viewport"),
    ).not.toBeNull();
    expect(
      container.querySelector(".sui-scroll-region__content"),
    ).not.toBeNull();
    expect(topFade(container)).not.toBeNull();
    expect(bottomFade(container)).not.toBeNull();
  });

  it("renders children inside the scroll content", () => {
    const { getByText } = render(() => (
      <ScrollRegion>
        <div>visible row</div>
      </ScrollRegion>
    ));
    expect(getByText("visible row")).toBeTruthy();
  });

  it("hides BOTH fades when content fits (no overflow)", () => {
    const { container } = render(() => <ScrollRegion>fits</ScrollRegion>);
    // clientHeight >= scrollHeight → not overflowing.
    setGeometry(viewportOf(container), {
      scrollTop: 0,
      clientHeight: 200,
      scrollHeight: 200,
    });
    expect(topFade(container).classList.contains("is-visible")).toBe(false);
    expect(bottomFade(container).classList.contains("is-visible")).toBe(false);
  });

  it("shows ONLY the bottom fade when overflowing and scrolled to top", () => {
    const { container } = render(() => <ScrollRegion>tall</ScrollRegion>);
    setGeometry(viewportOf(container), {
      scrollTop: 0,
      clientHeight: 100,
      scrollHeight: 500,
    });
    expect(topFade(container).classList.contains("is-visible")).toBe(false);
    expect(bottomFade(container).classList.contains("is-visible")).toBe(true);
  });

  it("shows ONLY the top fade when overflowing and scrolled to bottom", () => {
    const { container } = render(() => <ScrollRegion>tall</ScrollRegion>);
    setGeometry(viewportOf(container), {
      scrollTop: 400,
      clientHeight: 100,
      scrollHeight: 500,
    });
    expect(topFade(container).classList.contains("is-visible")).toBe(true);
    expect(bottomFade(container).classList.contains("is-visible")).toBe(false);
  });

  it("shows BOTH fades when overflowing and scrolled to the middle", () => {
    const { container } = render(() => <ScrollRegion>tall</ScrollRegion>);
    setGeometry(viewportOf(container), {
      scrollTop: 200,
      clientHeight: 100,
      scrollHeight: 500,
    });
    expect(topFade(container).classList.contains("is-visible")).toBe(true);
    expect(bottomFade(container).classList.contains("is-visible")).toBe(true);
  });

  it("respects a custom threshold for the overflow check", () => {
    // scrollHeight only 1px over clientHeight; threshold 4 → treated as fitting.
    const { container } = render(() => (
      <ScrollRegion threshold={4}>tall</ScrollRegion>
    ));
    setGeometry(viewportOf(container), {
      scrollTop: 0,
      clientHeight: 100,
      scrollHeight: 101,
    });
    expect(bottomFade(container).classList.contains("is-visible")).toBe(false);
  });

  it("createScrollRegion / ScrollRegionMd bake a viewport max-height preset", () => {
    const { container } = render(() => <ScrollRegionMd>x</ScrollRegionMd>);
    expect(viewportOf(container).style.maxHeight).toBe("240px");

    const Custom = createScrollRegion({ style: { "max-height": "120px" } });
    const c = render(() => <Custom>x</Custom>);
    expect(viewportOf(c.container).style.maxHeight).toBe("120px");
  });
});
