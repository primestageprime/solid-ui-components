// The arrival keyframes are the one part of the choreography that a rendering
// test cannot observe (jsdom has no Web Animations engine), so it is asserted
// here against a stubbed `animate` that records what it was handed.
import { describe, it, expect } from "vitest";
import { createSlotMotion } from "./motion";
import type { Transfer } from "./transfer";

interface Recorded {
  el: HTMLElement;
  keyframes: Keyframe[];
}

// A row with the padding the stylesheet gives it, and an `animate` that records
// its keyframes and resolves immediately.
const buildRoot = (recorded: Recorded[]) => {
  const root = document.createElement("div");
  const bucket = document.createElement("div");
  bucket.dataset.bqBucket = "done";
  root.append(bucket);

  const row = document.createElement("div");
  row.dataset.bqKey = "t1";
  row.style.boxSizing = "border-box";
  row.style.padding = "6px 12px";
  (row as unknown as { animate: unknown }).animate = (keyframes: Keyframe[]) => {
    recorded.push({ el: row, keyframes });
    return { finished: Promise.resolve(), cancel: () => {} };
  };
  bucket.append(row);

  return { root, row };
};

const TRANSFER: Transfer = { key: "t1", from: "todo", to: "done", direction: -1 };

describe("createSlotMotion arrival keyframes", () => {
  it("collapses the row's padding along with its height", async () => {
    const recorded: Recorded[] = [];
    const { root, row } = buildRoot(recorded);
    const motion = createSlotMotion();

    await motion.play([TRANSFER], {
      root,
      rowEl: () => row,
      reducedMotion: false,
    });

    expect(recorded).toHaveLength(1);
    const [from, to] = recorded[0].keyframes;
    // A padded box cannot be shorter than its own padding: without these, a
    // `height: 0` first keyframe still leaves the row 12px tall, so the slot
    // pops open from a stub instead of opening from nothing.
    expect(from.height).toBe("0px");
    expect(from.paddingTop).toBe("0px");
    expect(from.paddingBottom).toBe("0px");
    // …and the last keyframe must restore the row's REAL padding, not a
    // hardcoded guess, or the settled row would not match the stylesheet.
    expect(to.paddingTop).toBe("6px");
    expect(to.paddingBottom).toBe("6px");
  });

  it("animates nothing under prefers-reduced-motion", async () => {
    const recorded: Recorded[] = [];
    const { root, row } = buildRoot(recorded);

    await createSlotMotion().play([TRANSFER], {
      root,
      rowEl: () => row,
      reducedMotion: true,
    });

    expect(recorded).toEqual([]);
  });
});
