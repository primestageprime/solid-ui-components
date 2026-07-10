import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { GapCell, gapSeverity } from "./GapCell";

describe("gapSeverity", () => {
  it("ramps 0 → success, ≤50 → warning, >50 → danger", () => {
    expect(gapSeverity(0)).toBe("success");
    expect(gapSeverity(0.1)).toBe("warning");
    expect(gapSeverity(50)).toBe("warning");
    expect(gapSeverity(50.1)).toBe("danger");
    expect(gapSeverity(100)).toBe("danger");
  });
});

describe("GapCell", () => {
  it("renders an em-dash when total is 0 or remaining is nullish", () => {
    const zero = render(() => <GapCell remaining={5} total={0} />);
    expect(zero.container.textContent).toBe("—");
    const nul = render(() => <GapCell remaining={null} total={100} />);
    expect(nul.container.textContent).toBe("—");
  });

  it("renders count, percentage, and a fill bar sized to completion", () => {
    const { container } = render(() => <GapCell remaining={250} total={1000} />);
    expect(container.textContent).toContain("250");
    expect(container.textContent).toContain("25.0%");
    const fill = container.querySelector(".sui-gap-cell__fill") as HTMLElement;
    expect(fill.style.width).toBe("75%"); // 100 - 25 = completed fraction
  });

  it("applies the severity class from the ramp", () => {
    const done = render(() => <GapCell remaining={0} total={10} />);
    expect(done.container.querySelector(".sui-gap-cell")!.className).toMatch(/--success/);
    const bad = render(() => <GapCell remaining={9} total={10} />);
    expect(bad.container.querySelector(".sui-gap-cell")!.className).toMatch(/--danger/);
  });
});
