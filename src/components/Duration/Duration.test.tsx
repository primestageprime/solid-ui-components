import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { Duration } from "./index";

describe("Duration", () => {
  it("renders a dash for null/undefined ms", () => {
    const { container } = render(() => <Duration ms={null} />);
    expect(container.textContent).toBe("--");
  });

  it("shows sub-second durations in ms", () => {
    const { container } = render(() => <Duration ms={123} />);
    expect(container.textContent).toBe("123ms");
  });

  it("shows one-decimal seconds under 10s", () => {
    const { container } = render(() => <Duration ms={2500} />);
    expect(container.textContent).toBe("2.5s");
  });

  it("shows minutes-and-seconds for multi-minute spans", () => {
    const { container } = render(() => <Duration ms={248_000} />);
    expect(container.textContent).toBe("4m 8s");
  });

  it("shows hours-and-minutes past an hour", () => {
    const { container } = render(() => <Duration ms={8_000_000} />);
    expect(container.textContent).toBe("2h 13m");
  });

  it("verbose forces the full format even for short spans", () => {
    const { container } = render(() => <Duration ms={2500} verbose />);
    expect(container.textContent).toBe("2s");
  });
});
