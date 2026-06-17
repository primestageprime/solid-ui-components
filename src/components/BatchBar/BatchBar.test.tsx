import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { BatchBar, createBatchBar } from "./BatchBar";

const styleOf = (el: Element) => (el as HTMLElement).getAttribute("style") ?? "";

describe("BatchBar", () => {
  it("renders with the expected class", () => {
    const { container } = render(() => (
      <BatchBar donePct={0} inFlightPct={0} batches={[]} />
    ));
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toMatch(/sui-batch-bar/);
  });

  it("sizes the done segment to donePct", () => {
    const { container } = render(() => (
      <BatchBar donePct={40} inFlightPct={20} batches={[]} />
    ));
    const done = container.querySelector(".sui-batch-bar__done")!;
    expect(styleOf(done)).toMatch(/width:\s*40%/);
  });

  it("sizes the in-flight region to inFlightPct", () => {
    const { container } = render(() => (
      <BatchBar donePct={40} inFlightPct={25} batches={[]} />
    ));
    const inflight = container.querySelector(".sui-batch-bar__inflight")!;
    expect(styleOf(inflight)).toMatch(/width:\s*25%/);
  });

  it("renders one stripe per batch", () => {
    const { container } = render(() => (
      <BatchBar donePct={10} inFlightPct={40} batches={[0.1, 0.5, 0.9, 1]} />
    ));
    expect(container.querySelectorAll(".sui-batch-bar__stripe").length).toBe(4);
  });

  it("fills each stripe to its batch fraction via scaleX", () => {
    const { container } = render(() => (
      <BatchBar donePct={0} inFlightPct={50} batches={[0.3, 0.75]} />
    ));
    const fills = container.querySelectorAll(".sui-batch-bar__stripe-fill");
    expect(styleOf(fills[0])).toMatch(/scaleX\(0\.3\)/);
    expect(styleOf(fills[1])).toMatch(/scaleX\(0\.75\)/);
  });

  it("clamps stripe fractions to [0, 1]", () => {
    const { container } = render(() => (
      <BatchBar donePct={0} inFlightPct={50} batches={[-0.5, 2]} />
    ));
    const fills = container.querySelectorAll(".sui-batch-bar__stripe-fill");
    expect(styleOf(fills[0])).toMatch(/scaleX\(0\)/);
    expect(styleOf(fills[1])).toMatch(/scaleX\(1\)/);
  });

  it("clamps in-flight so done + in-flight never exceeds 100%", () => {
    const { container } = render(() => (
      <BatchBar donePct={80} inFlightPct={40} batches={[]} />
    ));
    const inflight = container.querySelector(".sui-batch-bar__inflight")!;
    // 80 + 40 would be 120; in-flight is capped to the remaining 20%.
    expect(styleOf(inflight)).toMatch(/width:\s*20%/);
  });

  it("createBatchBar bakes in visual defaults and exposes data props", () => {
    const TableBatchBar = createBatchBar({
      height: 12,
      doneColor: "rgb(0, 255, 0)",
    });
    const { container } = render(() => (
      <TableBatchBar donePct={50} inFlightPct={25} batches={[0.5]} />
    ));
    const root = container.firstElementChild as HTMLElement;
    expect(styleOf(root)).toMatch(/height:\s*12px/);
    const done = container.querySelector(".sui-batch-bar__done")!;
    expect(styleOf(done)).toMatch(/rgb\(0,\s*255,\s*0\)/);
  });
});
