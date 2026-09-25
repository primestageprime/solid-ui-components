// The y-axis strategy, read headless: every scripted run prints as a table
// (the observation), and the reactive wrapper is driven over the REAL
// `createAxisWaterMarks`.
import { createRoot, createSignal } from "solid-js";
import { describe, expect, it } from "vitest";
import { map } from "../fn";
import { type FitDomain, createAxisWaterMarks } from "./createAxisWaterMarks";
import {
  type YAxisDomain,
  type YAxisFrame,
  type YAxisRow,
  checkLock,
  createYAxisStrategy,
  formatYAxisRows,
  observeYAxis,
  stepYAxis,
} from "./createYAxisStrategy";

/** One scripted run of pay data: a rise, a fall, a deeper floor. */
const FITS: readonly YAxisDomain[] = [
  [80, 110],
  [80, 130],
  [80, 100],
  [80, 100],
  [70, 100],
  [90, 105],
];

const frames = (events: Record<number, YAxisFrame["event"]>): YAxisFrame[] =>
  map((fitted: YAxisDomain, index: number) => ({ fitted, event: events[index] }), [...FITS]);

const shownOf = (rows: readonly YAxisRow[]) => map((row: YAxisRow) => row.shown, rows);

describe("createYAxisStrategy — the printed runs", () => {
  it("auto (grow, manual shrink): grows at once, holds on a fall, shrinks only on press", () => {
    const rows = observeYAxis(frames({ 3: { type: "press" } }));
    expect(formatYAxisRows(rows)).toMatchInlineSnapshot(`
      "frame | event            | mode       | intent         | fitted   | shown
          0 |                  | auto       |                | 80..110  | 80..110
          1 |                  | auto       |                | 80..130  | 80..130
          2 |                  | auto       |                | 80..100  | 80..130
          3 | press            | auto       | reset          | 80..100  | 80..100
          4 |                  | auto       |                | 70..100  | 70..100
          5 |                  | auto       |                | 90..105  | 70..105"
    `);
    expect(shownOf(rows)).toEqual([
      [80, 110],
      [80, 130],
      [80, 130],
      [80, 100],
      [70, 100],
      [70, 105],
    ]);
  });

  it("autoscale: the axis is the fit both ways, and press does nothing", () => {
    const rows = observeYAxis(
      frames({ 0: { type: "setMode", mode: "autoscale" }, 3: { type: "press" } }),
    );
    expect(formatYAxisRows(rows)).toMatchInlineSnapshot(`
      "frame | event            | mode       | intent         | fitted   | shown
          0 | mode→autoscale   | autoscale  |                | 80..110  | 80..110
          1 |                  | autoscale  |                | 80..130  | 80..130
          2 |                  | autoscale  |                | 80..100  | 80..100
          3 | press            | autoscale  |                | 80..100  | 80..100
          4 |                  | autoscale  |                | 70..100  | 70..100
          5 |                  | autoscale  |                | 90..105  | 90..105"
    `);
    expect(shownOf(rows)).toEqual(FITS);
  });

  it("fixed (locked): seeded with the domain on screen, then only the lock moves it", () => {
    const rows = observeYAxis(
      frames({
        2: { type: "setMode", mode: "fixed" },
        4: { type: "setLock", lock: [50, 150] },
        5: { type: "press" },
      }),
    );
    expect(formatYAxisRows(rows)).toMatchInlineSnapshot(`
      "frame | event            | mode       | intent         | fitted   | shown
          0 |                  | auto       |                | 80..110  | 80..110
          1 |                  | auto       |                | 80..130  | 80..130
          2 | mode→fixed       | fixed      | openLockDialog | 80..100  | 80..130
          3 |                  | fixed      |                | 80..100  | 80..130
          4 | lock 50..150     | fixed      |                | 70..100  | 50..150
          5 | press            | fixed      | openLockDialog | 90..105  | 50..150"
    `);
  });

  it("re-entering auto resets: no stale peak from the autoscale spell", () => {
    const rows = observeYAxis(
      frames({
        0: { type: "setMode", mode: "autoscale" },
        3: { type: "setMode", mode: "auto" },
      }),
    );
    expect(rows[3].shown).toEqual([80, 100]);
    expect(rows[3].intent).toBe("reset");
  });

  it("choosing the current mode again is a no-op", () => {
    const step = stepYAxis(
      { mode: "autoscale", lock: null },
      { type: "setMode", mode: "autoscale" },
      [0, 1],
    );
    expect(step.intent).toBeNull();
  });
});

describe("checkLock", () => {
  it("needs two numbers, min < max — errors per field", () => {
    expect(checkLock(undefined, 10)).toEqual({
      ok: false,
      minError: "notANumber",
      maxError: undefined,
    });
    expect(checkLock(Number.NaN, undefined)).toMatchObject({
      ok: false,
      minError: "notANumber",
      maxError: "notANumber",
    });
    expect(checkLock(10, 10)).toEqual({ ok: false, maxError: "notAboveMin" });
    expect(checkLock(10, 5)).toMatchObject({ ok: false });
    expect(checkLock(-5, 10)).toEqual({ ok: true, lock: [-5, 10] });
  });
});

describe("createYAxisStrategy over createAxisWaterMarks", () => {
  it("drives marks.reset and the dialog from intents", () => {
    // Assertions run OUTSIDE the root: inside it Solid batches the writes.
    const { axis, setFit, dispose } = createRoot((dispose) => {
      const [fit, setFit] = createSignal<FitDomain | null>({ min: 80, max: 110 });
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
