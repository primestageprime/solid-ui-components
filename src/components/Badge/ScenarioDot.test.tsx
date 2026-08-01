import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { ScenarioDot } from "./index";

describe("ScenarioDot", () => {
  it("carries the scenario-dot class + the accent as border colour", () => {
    const { container } = render(() => <ScenarioDot color="rgb(255, 0, 0)" />);
    const dot = container.firstElementChild as HTMLElement;
    expect(dot.className).toMatch(/scenario-dot/);
    expect(dot.style.borderColor).toBe("rgb(255, 0, 0)");
  });

  it("filled → solid disc (background = colour)", () => {
    const { container } = render(() => (
      <ScenarioDot color="rgb(0, 128, 0)" filled />
    ));
    const dot = container.firstElementChild as HTMLElement;
    expect(dot.style.background).toBe("rgb(0, 128, 0)");
  });

  it("hollow (default) → transparent centre", () => {
    const { container } = render(() => <ScenarioDot color="rgb(0, 0, 255)" />);
    const dot = container.firstElementChild as HTMLElement;
    expect(dot.style.background).toBe("transparent");
  });

  it("size sets the outer diameter", () => {
    const { container } = render(() => (
      <ScenarioDot color="#000" size={12} />
    ));
    const dot = container.firstElementChild as HTMLElement;
    expect(dot.style.width).toBe("12px");
    expect(dot.style.height).toBe("12px");
  });
});
