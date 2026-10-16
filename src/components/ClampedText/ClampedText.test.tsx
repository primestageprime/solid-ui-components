import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { ClampedText } from "./variants";
import { createClampedText, clampLines } from "./ClampedText";

afterEach(cleanup);

describe("clampLines", () => {
  it("prints the cleaned range for each ask", () => {
    const asks = [
      undefined,
      { min: 1, max: 6 },
      { min: 0, max: 3 },
      { min: 4, max: 2 },
      { min: 2.9, max: 5.9 },
      { min: Number.NaN, max: Infinity },
      { max: 3 },
    ];
    expect(asks.map((a) => clampLines(a))).toEqual([
      { min: 1, max: 6 },
      { min: 1, max: 6 },
      { min: 1, max: 3 },
      { min: 4, max: 4 },
      { min: 2, max: 5 },
      { min: 1, max: 6 },
      { min: 1, max: 3 },
    ]);
  });
});

describe("ClampedText", () => {
  it("mounts its text", () => {
    const { container } = render(() => <ClampedText>some notes</ClampedText>);
    expect(container.textContent).toBe("some notes");
  });

  it("is clamped between 1 and 6 lines by default", () => {
    const { container } = render(() => <ClampedText>x</ClampedText>);
    const el = container.firstElementChild as HTMLElement;
    expect(el.classList.contains("sui-clamped-text")).toBe(true);
    expect(el.style.getPropertyValue("--sui-clamped-min")).toBe("1");
    expect(el.style.getPropertyValue("--sui-clamped-max")).toBe("6");
  });

  it("createClampedText bakes another range, and keeps a caller style", () => {
    const Tall = createClampedText({ lines: { min: 2, max: 10 } });
    const { container } = render(() => <Tall style={{ color: "red" }}>x</Tall>);
    const el = container.firstElementChild as HTMLElement;
    expect(el.style.getPropertyValue("--sui-clamped-min")).toBe("2");
    expect(el.style.getPropertyValue("--sui-clamped-max")).toBe("10");
    expect(el.style.color).toBe("red");
  });
});
