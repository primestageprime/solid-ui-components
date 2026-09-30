import { createRoot, createSignal } from "solid-js";
import { describe, expect, it } from "vitest";
import { map } from "../../../../src/fn";
import {
  type YAxisFrame,
  type YAxisRow,
  type YDomain,
  checkLock,
  formatYAxisRows,
  observeYAxis,
  stepYAxis,
} from "./chart-strategy";
import { WATER_MARK_HOLD, createAxisWaterMarks } from "./chart-watermarks";
import { createYAxisStrategy } from "./chart-y-axis";

/** One scripted run of the pay data: a rise, a fall, a deeper floor. */
const FITS: readonly YDomain[] = [
  [80, 110],
  [80, 130],
  [80, 100],
  [80, 100],
  [70, 100],
  [90, 105],
];

const frames = (events: Record<number, YAxisFrame["event"]>): YAxisFrame[] =>
  map((fitted: YDomain, index: number) => ({ fitted, event: events[index] }), [...FITS]);

const shownOf = (rows: readonly YAxisRow[]) => map((row: YAxisRow) => row.shown, rows);

const run = (title: string, script: YAxisFrame[]): readonly YAxisRow[] => {
  const rows = observeYAxis(script, WATER_MARK_HOLD);
  console.log(`\n${title}\n${formatYAxisRows(rows)}`);
  return rows;
};

describe("payroll board — y-axis strategy (printed)", () => {
  it("auto (grow, manual shrink): grows at once, holds on a fall, shrinks only on press", () => {
    const rows = run("auto", frames({ 3: { type: "press" } }));
    expect(shownOf(rows)).toEqual([
      [80, 110],
      [80, 130], // grew with the data
      [80, 130], // data fell: held
      [80, 100], // press: shrunk to fit
      [70, 100], // floor deepened at once
      [70, 105], // floor held, ceiling grew
    ]);
    expect(rows[3].intent).toBe("reset");
  });

  it("autoscale: the axis is the fit both ways, and press does nothing", () => {
    const rows = run(
      "autoscale",
      frames({ 0: { type: "setMode", mode: "autoscale" }, 3: { type: "press" } }),
    );
    expect(shownOf(rows)).toEqual(FITS);
    expect(rows[3].intent).toBeNull();
  });

  it("fixed (locked): seeded with the domain on screen, then only the lock moves it", () => {
    const rows = run(
      "fixed",
      frames({
        2: { type: "setMode", mode: "fixed" },
        4: { type: "setLock", lock: [50, 150] },
        5: { type: "press" },
      }),
    );
    expect(shownOf(rows)).toEqual([
      [80, 110],
      [80, 130],
      [80, 130], // seeded with frame 1's shown domain: no jump
      [80, 130],
      [50, 150],
      [50, 150],
    ]);
    expect(rows[2].intent).toBe("openLockDialog");
    expect(rows[5].intent).toBe("openLockDialog");
  });

  it("re-entering auto resets: no stale peak from the autoscale spell", () => {
    const rows = run(
      "autoscale → auto",
      frames({
        0: { type: "setMode", mode: "autoscale" },
        3: { type: "setMode", mode: "auto" },
      }),
    );
    // frame 1's 130 was ratcheted while auto showed; re-entry drops it.
    expect(rows[3].shown).toEqual([80, 100]);
    expect(rows[3].intent).toBe("reset");
  });

  it("choosing the current mode again is a no-op", () => {
    const step = stepYAxis({ mode: "autoscale", lock: null }, { type: "setMode", mode: "autoscale" }, [0, 1]);
    expect(step.intent).toBeNull();
  });
});

describe("payroll board — lock dialog validation", () => {
  it("needs two numbers, min < max", () => {
    expect(checkLock(undefined, 10)).toEqual({
      ok: false,
      minError: "Enter a number",
      maxError: undefined,
    });
    expect(checkLock(Number.NaN, undefined)).toMatchObject({ ok: false });
    expect(checkLock(10, 10)).toEqual({
      ok: false,
      maxError: "Max must be greater than min",
    });
    expect(checkLock(10, 5)).toMatchObject({ ok: false });
    expect(checkLock(-5, 10)).toEqual({ ok: true, lock: [-5, 10] });
  });
});

describe("payroll board — createYAxisStrategy over the water-mark hook", () => {
  it("drives marks.reset and the dialog from intents", () => {
    // Assertions run OUTSIDE the root: inside it Solid batches the writes.
    const { axis, setFit, dispose } = createRoot((dispose) => {
      const [fit, setFit] = createSignal<{ min: number; max: number } | null>({
        min: 80,
        max: 110,
      });
      const marks = createAxisWaterMarks(fit, { transitionMs: false });
      return { axis: createYAxisStrategy(fit, marks), setFit, dispose };
    });
    expect(axis.domain()).toEqual([80, 110]);
    setFit({ min: 80, max: 130 });
    expect(axis.domain()).toEqual([80, 130]);
    setFit({ min: 80, max: 100 });
    expect(axis.domain()).toEqual([80, 130]);
    axis.press();
    expect(axis.domain()).toEqual([80, 100]);
    axis.setMode("autoscale");
    expect(axis.info().disabled).toBe(true);
    axis.setMode("fixed");
    expect(axis.dialogOpen()).toBe(true);
    expect(axis.lock()).toEqual([80, 100]);
    axis.setLock([0, 200]);
    expect(axis.dialogOpen()).toBe(false);
    expect(axis.domain()).toEqual([0, 200]);
    dispose();
  });
});
