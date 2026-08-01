import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render } from "@solidjs/testing-library";
import { ConnectionStatus } from "./ConnectionStatus";

describe("ConnectionStatus", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("renders the service name and the sparkline by default", () => {
    const { container, getByText } = render(() => (
      <ConnectionStatus
        name="peter-laptop"
        lastHeartbeatAt={Date.now()}
        timeoutMs={5000}
      />
    ));
    expect(getByText("peter-laptop")).toBeTruthy();
    expect(container.querySelector(".sui-heartbeat")).toBeTruthy();
  });

  it("maps a fresh heartbeat to the connected sparkline state", () => {
    const { container } = render(() => (
      <ConnectionStatus name="src" lastHeartbeatAt={Date.now()} timeoutMs={5000} />
    ));
    expect(
      container
        .querySelector(".sui-heartbeat")!
        .classList.contains("sui-heartbeat--connected"),
    ).toBe(true);
  });

  it("falls back to a status-light dot when showSparkline is false", () => {
    const { container } = render(() => (
      <ConnectionStatus
        name="src"
        lastHeartbeatAt={Date.now()}
        timeoutMs={5000}
        showSparkline={false}
      />
    ));
    expect(container.querySelector(".sui-heartbeat")).toBeNull();
    // StatusLight renders its own element (not a heartbeat sparkline).
    expect(container.querySelector(".sui-status-light")).toBeTruthy();
  });

  it("renders a disconnected/idle indicator when never seen", () => {
    const { container } = render(() => (
      <ConnectionStatus name="src" lastHeartbeatAt={null} timeoutMs={5000} />
    ));
    expect(
      container
        .querySelector(".sui-heartbeat")!
        .classList.contains("sui-heartbeat--disconnected"),
    ).toBe(true);
  });
});
