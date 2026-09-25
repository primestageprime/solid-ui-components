import { createRoot, createSignal } from "solid-js";
import { describe, expect, it } from "vitest";
import { map } from "../fn";
import {
  NO_HELD_DOMAIN,
  createAxisWaterMarks,
  createHeldFit,
  heldDomainOf,
  holdFitDomain,
  observeAxisWaterMarks,
} from "./createAxisWaterMarks";

describe("holdFitDomain — expand at once, shrink only on reset", () => {
  it("takes the first fit as it is", () => {
    const held = holdFitDomain(NO_HELD_DOMAIN, 0, { min: 80, max: 110 });
    expect(heldDomainOf(held)).toEqual([80, 110]);
  });

  it("expands both ways, and never shrinks without a new epoch", () => {
    let held = holdFitDomain(NO_HELD_DOMAIN, 0, { min: 80, max: 110 });
    held = holdFitDomain(held, 0, { min: 70, max: 130 });
    held = holdFitDomain(held, 0, { min: 90, max: 100 });
    expect(heldDomainOf(held)).toEqual([70, 130]);
    held = holdFitDomain(held, 1, { min: 90, max: 100 });
    expect(heldDomainOf(held)).toEqual([90, 100]);
  });

  it("keeps the marks through a null fit, and forgets them on a reset", () => {
    const held = holdFitDomain(NO_HELD_DOMAIN, 0, { min: 1, max: 2 });
    expect(holdFitDomain(held, 0, null)).toBe(held);
    expect(heldDomainOf(holdFitDomain(held, 1, null))).toBeNull();
  });
});

describe("observeAxisWaterMarks — the headless table", () => {
  it("prints a drag up, a drag down, and a shrink", () => {
    const rows = observeAxisWaterMarks([
      { fitted: { min: 80_000, max: 110_000 } },
      { fitted: { min: 80_000, max: 125_000 } },
      { fitted: { min: 80_000, max: 95_000 } },
      { fitted: { min: 80_000, max: 95_000 }, reset: true },
      { fitted: null },
    ]);
    console.table(rows);
    expect(map((row) => row.heldMax, rows)).toEqual([
      110_000, 125_000, 125_000, 95_000, 95_000,
    ]);
    expect(map((row) => row.heldMin, rows)).toEqual([
      80_000, 80_000, 80_000, 80_000, 80_000,
    ]);
  });
});

describe("createAxisWaterMarks — the reactive hold", () => {
  it("expands with the data, holds on a fall, and fits on reset", () => {
    // As in createHighWaterMark's test: the root only BUILDS the hook, so the
    // effects queued during setup flush before the test drives it.
    const { axis, setFit, dispose } = createRoot((dispose) => {
      const [fit, setFit] = createSignal<{ min: number; max: number } | null>({
        min: 80,
        max: 110,
      });
      return {
        axis: createAxisWaterMarks(fit, { transitionMs: false }),
        setFit,
        dispose,
      };
    });
    expect(axis.domain()).toEqual([80, 110]);
    setFit({ min: 80, max: 130 });
    expect(axis.domain()).toEqual([80, 130]);
    setFit({ min: 85, max: 100 });
    expect(axis.domain()).toEqual([80, 130]);
    axis.reset();
    expect(axis.domain()).toEqual([85, 100]);
    dispose();
  });

  it("createHeldFit holds a fit computed inside another memo", () => {
    createRoot((dispose) => {
      const held = createHeldFit();
      expect(held.hold({ min: 1, max: 5 })).toEqual([1, 5]);
      expect(held.hold({ min: 2, max: 3 })).toEqual([1, 5]);
      held.reset();
      expect(held.hold({ min: 2, max: 3 })).toEqual([2, 3]);
      dispose();
    });
  });
});
