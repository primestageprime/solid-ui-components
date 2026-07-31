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
const TRANSFER_TO_DISCARD: Transfer = {
  key: "t1",
  from: "todo",
  to: "discard",
  direction: 1,
};

describe("createSlotMotion arrival keyframes", () => {
  it("collapses the row's padding along with its height", async () => {
    const recorded: Recorded[] = [];
    const { root, row } = buildRoot(recorded);
    const motion = createSlotMotion();

    await motion.play([TRANSFER], {
      root,
      rowEl: () => row,
      bucketEl: () => undefined,
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
      bucketEl: () => undefined,
      reducedMotion: true,
    });

    expect(recorded).toEqual([]);
  });
});

// A row moving into a COLLAPSED bucket has no destination element — the
// bucket renders only its header. Two things must still happen: the vacated
// slot in the SOURCE bucket must close (nothing else moves those rows, since
// the departing element is already gone from the DOM), and the pile must be
// seen receiving the row rather than the row simply vanishing.
const stubAnimate = (el: HTMLElement, recorded: Recorded[]) => {
  (el as unknown as { animate: unknown }).animate = (keyframes: Keyframe[]) => {
    recorded.push({ el, keyframes });
    return { finished: Promise.resolve(), cancel: () => {} };
  };
};

const buildCollapsedDestination = (recorded: Recorded[]) => {
  const root = document.createElement("div");

  const source = document.createElement("div");
  source.dataset.bqBucket = "todo";
  const moved = document.createElement("div");
  moved.dataset.bqKey = "t1";
  const stayer = document.createElement("div");
  stayer.dataset.bqKey = "t2";
  stubAnimate(stayer, recorded);
  source.append(moved, stayer);

  const destination = document.createElement("div");
  destination.dataset.bqBucket = "discard";
  const count = document.createElement("span");
  count.className = "bucket-queue__count";
  count.textContent = "1";
  stubAnimate(count, recorded);
  destination.append(count); // collapsed: a header count, no rows

  root.append(source, destination);

  // jsdom reports every rect as zero, so the row that stays behind is given a
  // top that CHANGES between the snapshot and the play — which is exactly what
  // the closing gap does to it.
  let stayerTop = 100;
  stayer.getBoundingClientRect = () => ({ top: stayerTop, height: 54 }) as DOMRect;
  const closeTheGap = () => {
    moved.remove();
    stayerTop = 46;
  };

  const ctx = {
    root,
    rowEl: () => undefined, // the destination row does not exist
    bucketEl: (key: string) =>
      (root.querySelector(`[data-bq-bucket="${key}"]`) as HTMLElement) ?? undefined,
    reducedMotion: false,
  };

  return { root, ctx, count, stayer, closeTheGap };
};

describe("createSlotMotion — a destination that cannot render the arriving row", () => {
  it("still FLIPs the rows the departure displaced", async () => {
    const recorded: Recorded[] = [];
    const { root, ctx, stayer, closeTheGap } = buildCollapsedDestination(recorded);
    const motion = createSlotMotion();

    motion.capture(root);
    closeTheGap();
    await motion.play([TRANSFER_TO_DISCARD], ctx);

    const flip = recorded.find((r) => r.el === stayer);
    expect(flip).toBeDefined();
    expect(flip!.keyframes[0].transform).toBe("translateY(54px)");
  });

  it("cues the collapsed bucket's count so the row is seen being received", async () => {
    const recorded: Recorded[] = [];
    const { root, ctx, count, closeTheGap } = buildCollapsedDestination(recorded);
    const motion = createSlotMotion();

    motion.capture(root);
    closeTheGap();
    await motion.play([TRANSFER_TO_DISCARD], ctx);

    const cue = recorded.find((r) => r.el === count);
    expect(cue).toBeDefined();
    expect(cue!.keyframes.map((k) => k.transform)).toEqual([
      "scale(1)",
      "scale(1.15)",
      "scale(1)",
    ]);
  });

  it("still animates nothing under prefers-reduced-motion", async () => {
    const recorded: Recorded[] = [];
    const { root, ctx, closeTheGap } = buildCollapsedDestination(recorded);
    const motion = createSlotMotion();

    motion.capture(root);
    closeTheGap();
    await motion.play([TRANSFER_TO_DISCARD], { ...ctx, reducedMotion: true });

    expect(recorded).toEqual([]);
  });
});
