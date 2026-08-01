import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { createProgressCheck } from "./ProgressCheck";
import { ProgressCheck, LargeProgressCheck } from "./variants";

describe("ProgressCheck", () => {
  it("renders an accessible img with a percent label", () => {
    const { container } = render(() => <ProgressCheck progress={0.5} />);
    const el = container.querySelector(".sui-progress-check")!;
    expect(el.getAttribute("role")).toBe("img");
    expect(el.getAttribute("aria-label")).toBe("50% complete");
    expect(el.querySelector("svg")).toBeTruthy();
  });

  it("defaults to the small size modifier", () => {
    const { container } = render(() => <ProgressCheck progress={0} />);
    expect(
      container
        .querySelector(".sui-progress-check")!
        .classList.contains("sui-progress-check--sm"),
    ).toBe(true);
  });

  it("empty state (progress<=0) draws an outline rect, not a check", () => {
    const { container } = render(() => <ProgressCheck progress={0} />);
    const html = container.querySelector(".sui-progress-check")!.innerHTML;
    expect(html).toContain("<rect");
    expect(html).not.toContain("<path");
  });

  it("complete state (progress>=1) draws the circle + check path", () => {
    const { container } = render(() => <ProgressCheck progress={1} />);
    const html = container.querySelector(".sui-progress-check")!.innerHTML;
    expect(html).toContain("<circle");
    expect(html).toContain("<path");
  });

  it("LargeProgressCheck bakes the lg size override", () => {
    const { container } = render(() => <LargeProgressCheck progress={0.3} />);
    expect(
      container
        .querySelector(".sui-progress-check")!
        .classList.contains("sui-progress-check--lg"),
    ).toBe(true);
  });

  it("createProgressCheck bakes a size default", () => {
    const Md = createProgressCheck({ size: "md" });
    const { container } = render(() => <Md progress={0.9} />);
    expect(
      container
        .querySelector(".sui-progress-check")!
        .classList.contains("sui-progress-check--md"),
    ).toBe(true);
  });
});
