import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { createRoot } from "solid-js";
import { BatchBar, createBatchBar } from "./BatchBar";
import { useProgressEngine } from "../../internal/progress/useProgressEngine";
import type { ProgressClock } from "../../internal/progress/useProgressEngine";

const styleOf = (el: Element) =>
  (el as HTMLElement).getAttribute("style") ?? "";

/** A deterministic clock: `now()` reads `t`, frames fire when `flush()` is
 *  called (so tests step the rAF loop manually). */
function fakeClock() {
  let t = 0;
  let pending: ((now: number) => void) | null = null;
  const clock: ProgressClock = {
    now: () => t,
    raf: (cb) => {
      pending = cb;
      return 1;
    },
    cancel: () => {
      pending = null;
    },
  };
  return {
    clock,
    set: (ms: number) => (t = ms),
    flush: () => {
      const cb = pending;
      pending = null;
      cb?.(t);
    },
  };
}

const scaleX = (el: Element | null) => {
  const m = styleOf(el!).match(/scaleX\(([\d.]+)\)/);
  return m ? parseFloat(m[1]) : NaN;
};

describe("BatchBar — declarative API", () => {
  it("renders a single eased fill (no stacked stripes)", () => {
    const { clock } = fakeClock();
    const { container } = render(() => (
      <BatchBar
        clock={clock}
        totalRows={1000}
        committedRows={0}
        batches={[{ rows: 1000, state: "running" }]}
      />
    ));
    expect(container.querySelector(".sui-batch-bar__fill")).not.toBeNull();
    expect(container.querySelector(".sui-batch-bar__stripe")).toBeNull();
  });

  it("committed rows alone set the baseline fill (a pending batch adds nothing)", () => {
    const { clock } = fakeClock();
    const { container } = render(() => (
      <BatchBar
        clock={clock}
        totalRows={1000}
        committedRows={400}
        batches={[{ rows: 600, state: "pending" }]}
      />
    ));
    // 400/1000 committed, pending batch eases to 0.
    expect(scaleX(container.querySelector(".sui-batch-bar__fill"))).toBeCloseTo(
      0.4,
      2,
    );
  });

  it("a running batch advances the fill over frames but never reaches 1.0", () => {
    const fc = fakeClock();
    const { container } = render(() => (
      <BatchBar
        clock={fc.clock}
        totalRows={1000}
        committedRows={0}
        batches={[{ rows: 1000, state: "running" }]}
      />
    ));
    const fill = () => scaleX(container.querySelector(".sui-batch-bar__fill"));
    const p0 = fill();
    fc.set(60_000);
    fc.flush();
    const p1 = fill();
    expect(p1).toBeGreaterThan(p0);
    expect(p1).toBeLessThan(1);
  });

  it("createBatchBar bakes visual defaults and still drives the declarative fill", () => {
    const fc = fakeClock();
    const TableBatchBar = createBatchBar({
      height: 12,
      doneColor: "rgb(0,255,0)",
    });
    const { container } = render(() => (
      <TableBatchBar
        clock={fc.clock}
        totalRows={100}
        committedRows={50}
        batches={[{ rows: 50, state: "pending" }]}
      />
    ));
    const root = container.firstElementChild as HTMLElement;
    expect(styleOf(root)).toMatch(/height:\s*12px/);
    expect(scaleX(container.querySelector(".sui-batch-bar__fill"))).toBeCloseTo(
      0.5,
      2,
    );
  });
});

describe("BatchBar — shared controller", () => {
  it("two bars sharing one controller learn into a single model", () => {
    createRoot((dispose) => {
      const fc = fakeClock();
      const ctrl = useProgressEngine(fc.clock);
      const before = ctrl.engine.model.n;
      fc.set(0);
      ctrl.observe([{ id: "A#0", rows: 5000, state: "running" }]);
      fc.set(3000);
      ctrl.observe([{ id: "A#0", rows: 5000, state: "done" }]);
      // The shared model recorded the duration sample.
      expect(ctrl.engine.model.n).toBe(before + 1);
      dispose();
    });
  });
});

describe("BatchBar — legacy numeric API", () => {
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
