// BucketQueue — the live measurement of everything the sizing model reads.
// Extracted from BucketQueue.tsx (2026-07-31) when the collapsible bucket
// pushed that file past the repo's 500-line limit; substance unchanged, see
// git history for its prior home and ./measurement.test.tsx for its tests.
//
// NOTHING HERE ASSUMES A SIZE. `renderItem` and `emptyLabel` are the
// consumer's, so a row may be a one-line row, a two-line card, or anything
// else; the row, the header and the empty strip are each measured live, and
// the ResizeObserver watches THOSE ELEMENTS rather than only the root. That
// distinction is load-bearing: a theme switch, a late web font or a changed
// `renderItem` alters row height without altering the root's size, so a
// root-only observer never re-fired and left every bucket sized from whatever
// was on screen at mount.
import { createSignal, onMount, onCleanup } from "solid-js";
import { flatMap } from "../../fn";
import { retainRowHeights } from "./layout";
import { observeSize } from "../../internal/dom/observeSize";
import type { Bucket } from "./types";

// What `measure()` reads is `offsetHeight` — the BORDER box. ResizeObserver
// defaults to the content box, which does not change when only padding or a
// border does, so a themed row-padding change (or a consumer's renderItem
// swapping its own padding) would resize the row without ever notifying us.
// Observe the same box we measure.
const METRIC_BOX: ResizeObserverOptions = { box: "border-box" };

/** Pre-measure fallback for the header (jsdom / first paint). */
export const HEADER_FALLBACK = 34;

export interface MeasurementDeps {
  /** The declared buckets, in render order. */
  buckets: () => readonly Bucket[];
  /** Their keys, in the same order. */
  bucketKeys: () => string[];
  /** The consumer's explicit `height`, if any. Omitted means "fill the
   *  parent", which is what makes the ROOT worth measuring. */
  height: () => number | undefined;
}

export interface Measurements {
  /** The height the bar has been allotted — the root's, unless `height` is set. */
  availH: () => number;
  /** Measured row height per bucket key. */
  rowHs: () => ReadonlyMap<string, number>;
  /** Measured header height, shared by every bucket. */
  headH: () => number;
  /** Measured empty-strip height, or null before one exists to measure. */
  emptyH: () => number | null;
  trackRoot: (el: HTMLDivElement) => void;
  trackHead: (el: HTMLElement) => void;
  trackEmpty: (el: HTMLElement) => void;
  trackRow: (key: string, el: HTMLDivElement) => void;
  untrackRow: (key: string, el: HTMLDivElement | undefined) => void;
}

export function createMeasurements(deps: MeasurementDeps): Measurements {
  let rootRef: HTMLDivElement | undefined;
  let headRef: HTMLElement | undefined;
  let emptyRef: HTMLElement | undefined;
  // ONE MEASURED ROW PER BUCKET, keyed by bucket key. A single global sample
  // silently assumed every bucket's rows were the same height, which a queue is
  // not entitled to assume: `renderItem` is the consumer's, and pairing
  // one-line rows in one bucket with two-line rows in the next is ordinary.
  // The queue then sized the taller bucket from the shorter one's row and left
  // the difference as dead space at the bottom.
  const rowRefs = new Map<string, HTMLDivElement>();
  const [availH, setAvailH] = createSignal(deps.height() ?? 0);
  const [rowHs, setRowHs] = createSignal<ReadonlyMap<string, number>>(new Map());
  const [headH, setHeadH] = createSignal(HEADER_FALLBACK);
  // null until an empty strip exists to measure; `natural` falls back to a row.
  const [emptyH, setEmptyH] = createSignal<number | null>(null);

  const measure = () => {
    if (deps.height() == null && rootRef) setAvailH(rootRef.clientHeight);
    if (headRef?.offsetHeight) setHeadH(headRef.offsetHeight);
    setEmptyH(emptyRef?.offsetHeight || null);
    // Folded over what we already hold, in BUCKET ORDER — see retainRowHeights
    // for why a bucket keeps its last height rather than dropping out.
    const live = new Map(
      flatMap((s: Bucket) => {
        const h = rowRefs.get(s.key)?.offsetHeight;
        return h ? [[s.key, h] as const] : [];
      }, deps.buckets()),
    );
    setRowHs((prev) => retainRowHeights(deps.bucketKeys(), live, prev));
  };

  // `observeSize` owns ONE observer per element and hands back a disposer, so
  // re-pointing disposes the old element's observation and starts a fresh one
  // rather than unobserve/observe against a shared observer. Each slot keeps
  // its own disposer; a fresh observation always delivers its first
  // measurement (nothing to change-guard against yet), so re-pointing still
  // re-measures — a frame later, like every other write in the library.
  // Fixed slots plus one per BUCKET row — `row:<bucketKey>` — because the row
  // sample is per bucket, not global.
  type Slot = "root" | "head" | "empty" | `row:${string}`;
  const disposers = new Map<Slot, () => void>();
  let observing = false;
  const observeSlot = (slot: Slot, el: HTMLElement) => {
    disposers.get(slot)?.();
    disposers.set(slot, observeSize(el, () => measure(), METRIC_BOX));
  };
  const releaseSlot = (slot: Slot) => {
    disposers.get(slot)?.();
    disposers.delete(slot);
  };

  // Re-point when the render swaps a measured element out — a new first row
  // after a transfer, a bucket that just emptied. Refs fire during render,
  // before mount, so pre-mount calls only record the element; onMount observes
  // whatever is present by then.
  const tracker =
    (
      slot: Slot,
      get: () => HTMLElement | undefined,
      set: (el: HTMLElement) => void,
    ) =>
    (el: HTMLElement) => {
      const prev = get();
      if (prev === el) return;
      set(el);
      if (observing) observeSlot(slot, el);
    };
  // The per-bucket form of the same re-pointing, over the row map. Disposing
  // the previous observation is what `unobserve` did on the shared observer.
  const trackRow = (key: string, el: HTMLDivElement) => {
    const prev = rowRefs.get(key);
    if (prev === el) return;
    rowRefs.set(key, el);
    if (observing) observeSlot(`row:${key}`, el);
  };
  // Runs when a tracked row unmounts. Guarded on IDENTITY because a replaced
  // first row disposes at a moment of Solid's choosing relative to its
  // replacement's ref — if the slot has already been re-claimed, this is the
  // outgoing row and there is nothing to release. The bucket's last measured
  // height deliberately SURVIVES this (see `measure`); only the element being
  // watched is released.
  const untrackRow = (key: string, el: HTMLDivElement | undefined) => {
    if (!el || rowRefs.get(key) !== el) return;
    releaseSlot(`row:${key}`);
    rowRefs.delete(key);
  };
  const trackRoot = (el: HTMLDivElement) => {
    rootRef = el;
  };
  const trackHead = tracker(
    "head",
    () => headRef,
    (el) => {
      headRef = el;
    },
  );
  const trackEmpty = tracker(
    "empty",
    () => emptyRef,
    (el) => {
      emptyRef = el;
    },
  );

  onMount(() => {
    measure();
    observing = true;
    // The root supplies the ALLOTTED height; the row/header/empty strip supply
    // the CONTENT metrics. Both are needed — see the note above.
    const fixed: [Slot, HTMLElement | undefined][] = [
      ["root", rootRef],
      ["head", headRef],
      ["empty", emptyRef],
    ];
    for (const [slot, el] of fixed) if (el) observeSlot(slot, el);
    for (const [key, el] of rowRefs) if (el) observeSlot(`row:${key}`, el);
    // A web font landing after mount re-lays-out the row, which the observers
    // above do catch — but ask directly rather than depend on the timing.
    document.fonts?.ready.then(measure).catch(() => undefined);
    onCleanup(() => {
      observing = false;
      for (const dispose of disposers.values()) dispose();
      disposers.clear();
    });
  });

  return {
    availH,
    rowHs,
    headH,
    emptyH,
    trackRoot,
    trackHead,
    trackEmpty,
    trackRow,
    untrackRow,
  };
}
