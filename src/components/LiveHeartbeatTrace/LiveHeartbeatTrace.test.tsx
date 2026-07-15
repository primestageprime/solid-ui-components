import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render } from "@solidjs/testing-library";
import { LiveHeartbeatTrace } from "./LiveHeartbeatTrace";

describe("LiveHeartbeatTrace", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("derives the connected state from a fresh heartbeat", () => {
    const { container } = render(() => (
      <LiveHeartbeatTrace lastHeartbeatAt={Date.now()} timeoutMs={5000} />
    ));
    const wrap = container.querySelector(".sui-heartbeat")!;
    expect(wrap.classList.contains("sui-heartbeat--connected")).toBe(true);
    expect(wrap.classList.contains("sui-heartbeat--pulse")).toBe(true);
  });

  it("derives disconnected when no heartbeat was ever seen", () => {
    const { container } = render(() => (
      <LiveHeartbeatTrace lastHeartbeatAt={null} timeoutMs={5000} />
    ));
    expect(
      container
        .querySelector(".sui-heartbeat")!
        .classList.contains("sui-heartbeat--disconnected"),
    ).toBe(true);
  });

  it("derives error when errorAt is at/after the last heartbeat", () => {
    const now = Date.now();
    const { container } = render(() => (
      <LiveHeartbeatTrace
        lastHeartbeatAt={now - 100}
        errorAt={now}
        timeoutMs={5000}
      />
    ));
    expect(
      container
        .querySelector(".sui-heartbeat")!
        .classList.contains("sui-heartbeat--error"),
    ).toBe(true);
  });

  it("respects forceState over the derived state", () => {
    const { container } = render(() => (
      <LiveHeartbeatTrace
        lastHeartbeatAt={Date.now()}
        timeoutMs={5000}
        forceState="disconnected"
      />
    ));
    expect(
      container
        .querySelector(".sui-heartbeat")!
        .classList.contains("sui-heartbeat--disconnected"),
    ).toBe(true);
  });

  it("accumulates samples as the tick timer fires", () => {
    const { container } = render(() => (
      <LiveHeartbeatTrace
        lastHeartbeatAt={null}
        timeoutMs={5000}
        tickMs={1000}
      />
    ));
    // A stale/never-seen source samples 1 each tick; the polyline should gain
    // points as the interval advances.
    vi.advanceTimersByTime(3000);
    const line = container.querySelector(".sui-heartbeat__line")!;
    expect(line.getAttribute("points")!.trim().length).toBeGreaterThan(0);
  });
});
