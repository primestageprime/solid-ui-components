import { createRoot, createSignal } from "solid-js";
import { describe, expect, it } from "vitest";
import {
  createHighWaterMark,
  isHighWaterSettled,
  nextHighWater,
  stepHighWater,
} from "./createHighWaterMark";

describe("nextHighWater — the mark itself", () => {
  it("rises with the peak and holds when the peak falls", () => {
    let state = { epoch: 0, mark: 0 };
    state = nextHighWater(state, 0, 300);
    expect(state.mark).toBe(300);
    state = nextHighWater(state, 0, 200);
    expect(state.mark).toBe(300);
    state = nextHighWater(state, 0, 350);
    expect(state.mark).toBe(350);
  });

  it("drops to the CURRENT peak on a new epoch, then ratchets again", () => {
    let state = { epoch: 0, mark: 300 };
    state = nextHighWater(state, 1, 200);
    expect(state).toEqual({ epoch: 1, mark: 200 });
    state = nextHighWater(state, 1, 150);
    expect(state.mark).toBe(200);
  });
});

describe("stepHighWater — the drawn ceiling", () => {
  it("snaps UP, so the data never pokes out of the plot", () => {
    expect(stepHighWater(100, 300, 16, 240)).toBe(300);
  });

  it("eases DOWN, part of the way per frame", () => {
    const next = stepHighWater(300, 200, 16, 240);
    expect(next).toBeLessThan(300);
    expect(next).toBeGreaterThan(200);
  });

  it("lands exactly on the target once it is close enough", () => {
    expect(isHighWaterSettled(200.1, 200)).toBe(true);
    expect(stepHighWater(200.1, 200, 16, 240)).toBe(200);
  });
});

describe("createHighWaterMark", () => {
  it("rises, holds, and resets to the current peak", () => {
    // Effects queued while a root is being SET UP flush once it returns, so
    // the root only builds the hook and the test drives it from outside.
    const { top, setPeak, dispose } = createRoot((dispose) => {
      const [peak, setPeak] = createSignal(300);
      return {
        top: createHighWaterMark(peak, { transitionMs: false }),
        setPeak,
        dispose,
      };
    });
    expect(top.ceiling()).toBe(300);
    setPeak(200);
    expect(top.mark()).toBe(300);
    expect(top.ceiling()).toBe(300);
    setPeak(400);
    expect(top.ceiling()).toBe(400);
    setPeak(250);
    top.reset();
    expect(top.mark()).toBe(250);
    expect(top.ceiling()).toBe(250);
    dispose();
  });
});
