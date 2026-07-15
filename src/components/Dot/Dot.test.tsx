import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { Dot } from "./index";

describe("Dot", () => {
  it("renders an aria-hidden span with the caller color and default 8px size", () => {
    const { container } = render(() => <Dot color="#ff0000" />);
    const dot = container.querySelector(".sui-dot") as HTMLElement;
    expect(dot).toBeTruthy();
    expect(dot.getAttribute("aria-hidden")).toBe("true");
    expect(dot.style.backgroundColor).toBe("rgb(255, 0, 0)");
    expect(dot.style.width).toBe("8px");
    expect(dot.style.height).toBe("8px");
  });

  it("coerces a numeric size to px", () => {
    const { container } = render(() => <Dot color="blue" size={16} />);
    const dot = container.querySelector(".sui-dot") as HTMLElement;
    expect(dot.style.width).toBe("16px");
    expect(dot.style.height).toBe("16px");
  });

  it("passes a string size through as a raw CSS length", () => {
    const { container } = render(() => <Dot color="blue" size="1.5rem" />);
    const dot = container.querySelector(".sui-dot") as HTMLElement;
    expect(dot.style.width).toBe("1.5rem");
    expect(dot.style.height).toBe("1.5rem");
  });

  it("merges an extra class while keeping sui-dot", () => {
    const { container } = render(() => <Dot color="green" class="severity" />);
    const dot = container.querySelector(".sui-dot") as HTMLElement;
    expect(dot.classList.contains("severity")).toBe(true);
  });
});
