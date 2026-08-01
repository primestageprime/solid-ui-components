import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { HeartbeatSparkline } from "./index";

describe("HeartbeatSparkline", () => {
  it("renders the state modifier class and default svg dimensions", () => {
    const { container } = render(() => (
      <HeartbeatSparkline state="connected" samples={[0.2, 0.5, 0.8]} />
    ));
    const root = container.querySelector(".sui-heartbeat")!;
    expect(root.classList.contains("sui-heartbeat--connected")).toBe(true);
    const svg = container.querySelector(".sui-heartbeat__svg")!;
    expect(svg.getAttribute("width")).toBe("48");
    expect(svg.getAttribute("height")).toBe("12");
  });

  it("adds the pulse modifier when pulse is set", () => {
    const { container } = render(() => (
      <HeartbeatSparkline state="connected" samples={[0.1]} pulse />
    ));
    expect(
      container.querySelector(".sui-heartbeat")!.classList.contains(
        "sui-heartbeat--pulse",
      ),
    ).toBe(true);
  });

  it("right-anchors the latest sample at the full width", () => {
    const { container } = render(() => (
      <HeartbeatSparkline
        state="disconnected"
        samples={[0, 0.5, 1]}
        width={100}
        height={20}
        capacity={3}
      />
    ));
    const pts = container
      .querySelector(".sui-heartbeat__line")!
      .getAttribute("points")!
      .split(" ");
    expect(pts.length).toBe(3);
    expect(pts[pts.length - 1].startsWith("100.00")).toBe(true);
  });

  it("trims to the latest `capacity` samples", () => {
    const samples = Array.from({ length: 200 }, (_, i) => (i % 10) / 10);
    const { container } = render(() => (
      <HeartbeatSparkline state="connected" samples={samples} capacity={30} />
    ));
    const pts = container
      .querySelector(".sui-heartbeat__line")!
      .getAttribute("points")!
      .split(" ");
    expect(pts.length).toBe(30);
  });

  it("renders empty samples cleanly (no polyline points)", () => {
    const { container } = render(() => (
      <HeartbeatSparkline state="error" samples={[]} />
    ));
    expect(
      container.querySelector(".sui-heartbeat__line")!.getAttribute("points"),
    ).toBe("");
  });
});
