import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { Sparkline } from "./Sparkline";

describe("Sparkline", () => {
  it("line mode: one point per value, endpoints span the width", () => {
    const { container } = render(() => (
      <Sparkline values={[1, 3, 2, 5]} width={100} height={20} />
    ));
    const root = container.querySelector(".sui-sparkline")!;
    expect(root.classList.contains("sui-sparkline--line")).toBe(true);
    const pts = root
      .querySelector(".sui-sparkline__line")!
      .getAttribute("points")!
      .split(" ");
    expect(pts.length).toBe(4);
    expect(pts[0].startsWith("0.0,")).toBe(true);
    expect(pts[pts.length - 1].startsWith("100.0,")).toBe(true);
  });

  it("sawtooth mode: drops to baseline between samples", () => {
    const { container } = render(() => (
      <Sparkline values={[10, 20, 30]} mode="sawtooth" width={100} height={20} />
    ));
    const root = container.querySelector(".sui-sparkline")!;
    expect(root.classList.contains("sui-sparkline--sawtooth")).toBe(true);
    const pts = root
      .querySelector(".sui-sparkline__line")!
      .getAttribute("points")!
      .split(" ");
    // per sample: baseline + value point, plus a baseline return between samples
    expect(pts.length).toBe(3 * 2 + 2);
    const baselineY = pts[0].split(",")[1];
    expect(pts[2].endsWith(`,${baselineY}`)).toBe(true);
  });

  it("color prop drives the stroke; defaults to the accent token", () => {
    const { container } = render(() => (
      <>
        <Sparkline values={[1, 2]} color="var(--sui-danger)" />
        <Sparkline values={[1, 2]} />
      </>
    ));
    const lines = container.querySelectorAll(".sui-sparkline__line");
    expect(lines[0].getAttribute("stroke")).toBe("var(--sui-danger)");
    expect(lines[1].getAttribute("stroke")).toBe("var(--sui-accent)");
  });

  it("single value renders a midline; empty renders cleanly", () => {
    const { container } = render(() => (
      <>
        <Sparkline values={[42]} width={80} height={20} />
        <Sparkline values={[]} />
      </>
    ));
    const lines = container.querySelectorAll(".sui-sparkline__line");
    expect(lines[0].getAttribute("points")).toBe("0,10.0 80,10.0");
    expect(lines[1].getAttribute("points")).toBe("");
  });

  it("draws floor and goal rules on the line's scale, and folds them into it", () => {
    const { container } = render(() => (
      <Sparkline values={[100, 200]} floor={0} goal={400} width={100} height={44} endDot />
    ));
    const rules = container.querySelectorAll(".sui-sparkline__rule");
    expect(rules.length).toBe(2);
    const floorY = Number(rules[0]!.getAttribute("y1"));
    const goalY = Number(rules[1]!.getAttribute("y1"));
    // The scale runs 0..400, so the floor sits at the bottom pad and the
    // goal at the top pad, with the line between them.
    expect(floorY).toBeCloseTo(44 - 1.5, 1);
    expect(goalY).toBeCloseTo(1.5, 1);
    expect(rules[0]!.getAttribute("stroke")).toBe("var(--sui-danger)");
    expect(rules[1]!.getAttribute("stroke")).toBe("var(--sui-success)");
    const pts = container.querySelector(".sui-sparkline__line")!.getAttribute("points")!.split(" ");
    const lastY = Number(pts[1].split(",")[1]);
    expect(lastY).toBeGreaterThan(goalY);
    expect(lastY).toBeLessThan(floorY);
    const dot = container.querySelector(".sui-sparkline__end")!;
    expect(dot.getAttribute("cx")).toBe("100");
    expect(Number(dot.getAttribute("cy"))).toBeCloseTo(lastY, 1);
    expect(dot.getAttribute("fill")).toBe("var(--sui-accent)");
  });

  it("draws no rule and no dot unless asked, and none in sawtooth mode", () => {
    const { container } = render(() => (
      <>
        <Sparkline values={[1, 2]} />
        <Sparkline values={[1, 2]} mode="sawtooth" floor={0} goal={3} endDot />
      </>
    ));
    expect(container.querySelectorAll(".sui-sparkline__rule").length).toBe(0);
    expect(container.querySelectorAll(".sui-sparkline__end").length).toBe(0);
  });
});
