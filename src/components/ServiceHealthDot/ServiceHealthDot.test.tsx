import { describe, it, expect } from "vitest";
import { render, fireEvent } from "@solidjs/testing-library";
import { ServiceHealthDot } from "./ServiceHealthDot";

describe("ServiceHealthDot", () => {
  it("alive: success tone, opacity decays with age", () => {
    const { container } = render(() => (
      <ServiceHealthDot name="broker" ageMs={7_500} staleThresholdMs={15_000} samples={[0.1, 0.5]} />
    ));
    const root = container.querySelector(".sui-service-health-dot")!;
    expect(root.className).toMatch(/--alive/);
    const dot = container.querySelector(".sui-service-health-dot__dot") as HTMLElement;
    expect(parseFloat(dot.style.opacity)).toBeCloseTo(0.575, 2); // 1 - 0.5*0.85
  });
  it("dead: danger tone at full opacity (ageMs=null, never seen)", () => {
    const { container } = render(() => (
      <ServiceHealthDot name="broker" ageMs={null} samples={[]} />
    ));
    expect(container.querySelector(".sui-service-health-dot")!.className).toMatch(/--dead/);
    const dot = container.querySelector(".sui-service-health-dot__dot") as HTMLElement;
    expect(parseFloat(dot.style.opacity)).toBe(1);
  });
  it("dead: ageMs at the threshold boundary is stale", () => {
    const { container } = render(() => (
      <ServiceHealthDot name="broker" ageMs={15_000} staleThresholdMs={15_000} samples={[1]} />
    ));
    expect(container.querySelector(".sui-service-health-dot")!.className).toMatch(/--dead/);
    const dot = container.querySelector(".sui-service-health-dot__dot") as HTMLElement;
    expect(parseFloat(dot.style.opacity)).toBe(1);
  });
  it("dead: ageMs over the threshold is stale", () => {
    const { container } = render(() => (
      <ServiceHealthDot name="broker" ageMs={20_000} staleThresholdMs={15_000} samples={[1, 1]} />
    ));
    expect(container.querySelector(".sui-service-health-dot")!.className).toMatch(/--dead/);
    const dot = container.querySelector(".sui-service-health-dot__dot") as HTMLElement;
    expect(parseFloat(dot.style.opacity)).toBe(1);
  });
  it("alive: negative ageMs (clock skew) clamps opacity to 1", () => {
    const { container } = render(() => (
      <ServiceHealthDot name="broker" ageMs={-2_000} staleThresholdMs={15_000} samples={[0]} />
    ));
    expect(container.querySelector(".sui-service-health-dot")!.className).toMatch(/--alive/);
    const dot = container.querySelector(".sui-service-health-dot__dot") as HTMLElement;
    expect(parseFloat(dot.style.opacity)).toBe(1);
  });
  it("hover reveals the sparkline popover", () => {
    const { container } = render(() => (
      <ServiceHealthDot name="broker" ageMs={1000} samples={[0.1, 0.2]} />
    ));
    fireEvent.mouseEnter(container.querySelector(".sui-service-health-dot")!);
    expect(container.querySelector(".sui-service-health-dot__popover")).toBeTruthy();
  });
  it("keyboard focus reveals the popover, blur hides it", () => {
    const { container } = render(() => (
      <ServiceHealthDot name="broker" ageMs={1000} samples={[0.1, 0.2]} />
    ));
    const root = container.querySelector(".sui-service-health-dot") as HTMLElement;
    fireEvent.focus(root);
    expect(container.querySelector(".sui-service-health-dot__popover")).toBeTruthy();
    fireEvent.blur(root);
    expect(container.querySelector(".sui-service-health-dot__popover")).toBeNull();
  });
  it("the root is focusable and announces its disclosure state", () => {
    const { container } = render(() => (
      <ServiceHealthDot name="broker" ageMs={1000} samples={[0.1, 0.2]} />
    ));
    const root = container.querySelector(".sui-service-health-dot") as HTMLElement;
    // A real <button> — reachable in the tab order with no tabindex juggling.
    expect(root.tagName).toBe("BUTTON");
    expect(root.getAttribute("type")).toBe("button");
    expect(root.getAttribute("aria-expanded")).toBe("false");
    fireEvent.focus(root);
    expect(root.getAttribute("aria-expanded")).toBe("true");
  });
});
