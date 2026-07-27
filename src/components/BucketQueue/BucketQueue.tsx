// BucketQueue — layout-tagged Primitive (Depth 1; EXEMPT-AS-LAYOUT, STYLE_GUIDE
// § Layout Purity). Owns BucketQueue.css: the weighted water-fill sizes each
// bucket in JS, which no CSS rule can express. N always-present buckets stacked
// as one full-height progression bar, bucketing items by `bucketOf`.
//
// Sizing (ruled 2026-07-22): an empty bucket collapses to just its summary line
// (label + count); a populated bucket shrink-wraps to its content; when the
// populated buckets overflow the available height they share it by `weight`,
// each capped at its content, with the surplus from any bucket that shrinks
// redistributed to the ones still short (see ./layout). The bar fills its
// parent's height (or an explicit `height`). Chrome is neutral — the only role
// color is a dot beside each bucket label.
import {
  For,
  Show,
  type JSX,
  createEffect,
  createMemo,
  createSignal,
  onMount,
  onCleanup,
  untrack,
} from "solid-js";
import { allocateHeights } from "./layout";
import { bucketItems } from "./bucketing";
import { createRowKeyboard } from "./keyboard";
import { createSlotMotion } from "./motion";
import { advanceSelection } from "./selection";
import { diffTransfers } from "./transfer";
import { find, findIndex, flatMap, map } from "../../fn";
import type { BucketQueueProps, Bucket } from "./types";
import "./BucketQueue.css";

export type { BucketQueueProps, Bucket } from "./types";

// Pre-measure fallbacks (jsdom / first paint) — real values are measured.
const HEADER_FALLBACK = 34;
const ROW_FALLBACK = 54;
const GAP = 8;

// What `measure()` reads is `offsetHeight` — the BORDER box. ResizeObserver
// defaults to the content box, which does not change when only padding or a
// border does, so a themed row-padding change (or a consumer's renderItem
// swapping its own padding) would resize the row without ever notifying us.
// Observe the same box we measure.
const METRIC_BOX: ResizeObserverOptions = { box: "border-box" };

export function BucketQueue<T>(props: BucketQueueProps<T>): JSX.Element {
  const bucketKeys = createMemo(() => map((s) => s.key, props.buckets));
  // ONE pass per items change: the per-bucket rows AND the key → bucket map.
  const buckets = createMemo(() =>
    bucketItems(props.items, bucketKeys(), props.bucketOf, props.keyOf),
  );
  const itemsIn = (key: string): T[] => buckets().byBucket.get(key) ?? [];
  // The same bucketing as item KEYS, in render order. The transfer effect needs
  // to compare a bucket's ordering across two frames, and holding on to the
  // previous frame's items would retain consumer objects the consumer has
  // already replaced.
  const keysByBucket = createMemo(
    () =>
      new Map(
        map(
          ([bucket, items]) =>
            [bucket, map((it) => props.keyOf(it), items)] as const,
          [...buckets().byBucket],
        ),
      ),
  );
  const counts = createMemo(() => map((s) => itemsIn(s.key).length, props.buckets));

  // The bar fills its allotted height; each bucket's natural height is
  // deterministic from its row count (one measured row + header) — no
  // per-bucket body measurement, which goes stale when a body unmounts.
  //
  // NOTHING HERE ASSUMES A SIZE. `renderItem` and `emptyLabel` are the
  // consumer's, so a row may be a one-line row, a two-line card, or anything
  // else; the row, the header and the empty strip are each measured live, and
  // the ResizeObserver watches THOSE ELEMENTS rather than only the root. That
  // distinction is load-bearing: a theme switch, a late web font or a changed
  // `renderItem` alters row height without altering the root's size, so a
  // root-only observer never re-fired and left every bucket sized from whatever
  // was on screen at mount.
  let rootRef: HTMLDivElement | undefined;
  let rowRef: HTMLDivElement | undefined;
  let headRef: HTMLDivElement | undefined;
  let emptyRef: HTMLDivElement | undefined;
  let ro: ResizeObserver | undefined;
  const [availH, setAvailH] = createSignal(props.height ?? 0);
  const [rowH, setRowH] = createSignal(ROW_FALLBACK);
  const [headH, setHeadH] = createSignal(HEADER_FALLBACK);
  // null until an empty strip exists to measure; `natural` falls back to rowH.
  const [emptyH, setEmptyH] = createSignal<number | null>(null);

  const measure = () => {
    if (props.height == null && rootRef) setAvailH(rootRef.clientHeight);
    if (rowRef?.offsetHeight) setRowH(rowRef.offsetHeight);
    if (headRef?.offsetHeight) setHeadH(headRef.offsetHeight);
    setEmptyH(emptyRef?.offsetHeight || null);
  };

  // Re-point the observer when the render swaps a measured element out — a new
  // first row after a transfer, a bucket that just emptied. `observe()` fires
  // immediately with the element's current size, so re-pointing re-measures.
  const tracker =
    (get: () => HTMLDivElement | undefined, set: (el: HTMLDivElement) => void) =>
    (el: HTMLDivElement) => {
      const prev = get();
      if (prev === el) return;
      if (prev) ro?.unobserve(prev);
      set(el);
      ro?.observe(el, METRIC_BOX);
    };
  const trackRow = tracker(
    () => rowRef,
    (el) => {
      rowRef = el;
    },
  );
  const trackHead = tracker(
    () => headRef,
    (el) => {
      headRef = el;
    },
  );
  const trackEmpty = tracker(
    () => emptyRef,
    (el) => {
      emptyRef = el;
    },
  );

  onMount(() => {
    measure();
    if (typeof ResizeObserver === "undefined") return; // jsdom/SSR
    ro = new ResizeObserver(() => measure());
    // The root supplies the ALLOTTED height; the row/header/empty strip supply
    // the CONTENT metrics. Both are needed — see the note above.
    for (const el of [rootRef, rowRef, headRef, emptyRef])
      if (el) ro.observe(el, METRIC_BOX);
    // A web font landing after mount re-lays-out the row, which the observer
    // above does catch — but ask directly rather than depend on the timing.
    document.fonts?.ready.then(measure).catch(() => undefined);
    onCleanup(() => {
      ro?.disconnect();
      ro = undefined;
    });
  });

  // The measured row has to EXIST. Bucket 0 is routinely empty (an already
  // cleared queue, a pipeline whose first stage is drained), and measuring the
  // literal first bucket meant measuring nothing and sizing every bucket from
  // ROW_FALLBACK — a constant that is wrong for any consumer whose renderItem
  // is taller or shorter than the one it was tuned against.
  const firstPopulated = createMemo(() => findIndex((c) => c > 0, counts()));
  // Likewise for the empty strip: measure the first one actually rendered.
  const firstEmptyLabelled = createMemo(() =>
    findIndex(
      (c, i) => c === 0 && props.buckets[i]?.emptyLabel != null,
      counts(),
    ),
  );

  const natural = createMemo(() =>
    map((c: number, idx: number) => {
      const bucket = props.buckets[idx];
      // Empty: the summary line, plus the empty strip if declared. The strip is
      // MEASURED, not assumed to be one row tall — `emptyLabel` is consumer
      // JSX and can wrap. rowH is only the fallback for the frame before a
      // strip exists to measure.
      if (c === 0)
        return headH() + (bucket?.emptyLabel != null ? (emptyH() ?? rowH()) : 0) + 2;
      // `capRows` caps the bucket's NATURAL height, so it holds at the cap and
      // its body scrolls; the weighted water-fill below is unchanged.
      const rows =
        bucket?.capRows != null ? Math.min(c, Math.max(1, bucket.capRows)) : c;
      return headH() + rows * rowH() + 2;
    }, counts()),
  );
  const heights = createMemo(() =>
    allocateHeights({
      natural: natural(),
      counts: counts(),
      weights: map((s) => s.weight ?? 1, props.buckets),
      available: props.height ?? availH(),
      gap: GAP,
    }),
  );

  // Select mode is on iff the consumer is managing a checked set. An empty Set
  // means "mode on, nothing checked" — the state select mode starts in.
  const selectModeOn = () => props.checkedKeys != null;
  const checkableIn = (bucket: Bucket) =>
    selectModeOn() && bucket.selectable === true;

  // The single activation branch — shared by click (here) and Enter/Space (the
  // keyboard module). A row either toggles its check or selects; never both.
  const activate = (
    key: string,
    bucket: Bucket,
    modifiers: { shift: boolean; meta: boolean },
  ) => {
    if (checkableIn(bucket)) props.onToggleCheck?.(key, modifiers);
    else props.onSelect?.(key);
  };

  // The bucket a row lives in, for the activation branch (keyboard has only
  // the key; click has the bucket in scope).
  const bucketForKey = (key: string): Bucket | undefined => {
    const bucketKey = buckets().bucketByKey.get(key);
    return find((s) => s.key === bucketKey, props.buckets);
  };

  // A row is interactive iff it can be activated: either the queue has a
  // global onSelect, or the row's own bucket is checkable in select mode.
  // Non-interactive rows still render (data-bq-key, for scrollToKey/transfer)
  // but never join the roving-tabindex sequence.
  const interactiveIn = (bucket: Bucket) =>
    props.onSelect != null || checkableIn(bucket);

  const keyboard = createRowKeyboard({
    getRootEl: () => rootRef,
    allKeys: () =>
      flatMap(
        (s) =>
          interactiveIn(s) ? map((it) => props.keyOf(it), itemsIn(s.key)) : [],
        props.buckets,
      ),
    focusedKey: () => props.focusedKey,
    selectedKey: () => props.selectedKey,
    onActivate: (key) => {
      const bucket = bucketForKey(key);
      if (bucket) activate(key, bucket, { shift: false, meta: false });
    },
    onFocusChange: (key) => props.onFocusChange?.(key),
  });

  // Bring a row into view inside its bucket body. Matched by dataset rather
  // than a `[data-bq-key="…"]` selector so arbitrary key strings (colons,
  // quotes) need no escaping. Deferred one frame so a row that was just added
  // or moved has laid out first. Standalone (not inlined below) — Task 7's
  // transfer animation calls this directly once a moved row settles.
  const revealRow = (key: string) => {
    requestAnimationFrame(() => {
      const candidates = rootRef?.querySelectorAll<HTMLElement>("[data-bq-key]");
      const match =
        candidates && find((n) => n.dataset.bqKey === key, [...candidates]);
      match?.scrollIntoView?.({ block: "nearest" });
    });
  };

  // Reacts on CHANGE of `scrollToKey`, so a consumer can re-request the same
  // key by clearing then re-setting it. No-op when undefined or unmatched.
  createEffect(() => {
    const key = props.scrollToKey;
    if (!key) return;
    revealRow(key);
  });

  // Motion is CURRIED, not a prop (STYLE_GUIDE › Ambient Motion): the queue
  // animates its own transfers with no call-site specification. Swap
  // `createSlotMotion` for a different TransferChoreographer to change the feel.
  const motion = createSlotMotion();

  const reducedMotion = () =>
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

  // Re-snapshot after every paint so a transfer detected on the next change has
  // the previous frame's geometry to animate from.
  createEffect(() => {
    buckets();
    requestAnimationFrame(() => {
      if (rootRef) motion.capture(rootRef);
    });
  });

  // A move is an item whose bucket changed — one atomic `items` mutation, so
  // there is no intermediate frame in which it belongs nowhere.
  let prevBucketByKey: ReadonlyMap<string, string> = new Map();
  let prevKeysByBucket: ReadonlyMap<string, readonly string[]> = new Map();
  createEffect(() => {
    const next = buckets().bucketByKey;
    const nextKeys = keysByBucket();
    const moves = diffTransfers(prevBucketByKey, next, bucketKeys());
    const beforeKeys = prevKeysByBucket;
    prevBucketByKey = next;
    prevKeysByBucket = nextKeys;
    if (moves.length === 0) return;

    // TRIAGE ADVANCE — the user works down one queue, so when THEIR row leaves
    // it, the selection follows to the next item still waiting there rather
    // than trailing the row into the bucket it just landed in; and when that
    // was the last row, the selection clears so the consumer can show its own
    // "queue empty" state. Both go out through the same `onSelect` a click
    // uses, so a consumer needs no extra wiring. See ./selection for the three
    // outcomes and every case that deliberately does nothing.
    //
    // The roving tab stop moves with the selection, or Tab would still land on
    // the row that just left the queue (see createRowKeyboard's precedence).
    // DOM focus is deliberately NOT moved — the component only focuses a row in
    // response to a key the user actually pressed.
    //
    // `untrack` keeps this effect subscribed to `buckets()` alone: reading the
    // controlled selection reactively would re-run the whole transfer diff on
    // every selection change — including the one emitted right here.
    untrack(() => {
      const selectedKey = props.selectedKey;
      const onSelect = props.onSelect;
      if (selectedKey == null || onSelect == null) return;
      const moved = find((m) => m.key === selectedKey, moves);
      if (!moved) return;
      const advance = advanceSelection({
        selectedKey,
        before: beforeKeys.get(moved.from) ?? [],
        after: new Set(nextKeys.get(moved.from) ?? []),
      });
      if (advance.kind === "keep") return;
      const next = advance.kind === "select" ? advance.key : null;
      onSelect(next);
      keyboard.setActiveKey(next);
    });
    queueMicrotask(async () => {
      const root = rootRef;
      if (!root) return;
      const ctx = {
        root,
        rowEl: (key: string) =>
          find((n) => n.dataset.bqKey === key, [
            ...root.querySelectorAll<HTMLElement>("[data-bq-key]"),
          ]),
        reducedMotion: reducedMotion(),
      };
      await motion.play(moves, ctx);
      // Arrival reveal — the general form of SplitQueueList's scroll-pin: you
      // always see where the last-moved row landed.
      revealRow(moves[moves.length - 1].key);
    });
  });

  return (
    <div
      class={`bucket-queue${props.class ? ` ${props.class}` : ""}`}
      ref={(el) => (rootRef = el)}
      style={props.height != null ? { height: `${props.height}px` } : undefined}
    >
      <For each={props.buckets}>
        {(bucket, i) => {
          const count = () => counts()[i()];
          return (
            <div
              class="bucket-queue__bucket"
              data-bq-bucket={bucket.key}
              style={{ height: `${Math.round(heights()[i()] ?? 0)}px` }}
            >
              <div class="bucket-queue__header" ref={(el) => { if (i() === 0) trackHead(el); }}>
                <span class="bucket-queue__title">
                  <span class={`bucket-queue__dot bucket-queue__dot--${bucket.tone}`} />
                  {bucket.label}
                </span>
                <span class="bucket-queue__count">{count()}</span>
              </div>
              <Show
                when={count() > 0}
                fallback={
                  <Show when={bucket.emptyLabel != null}>
                    <div
                      class="bucket-queue__empty"
                      ref={(el) => { if (i() === firstEmptyLabelled()) trackEmpty(el); }}
                    >
                      {bucket.emptyLabel}
                    </div>
                  </Show>
                }
              >
                <div
                  class="bucket-queue__body"
                  role="listbox"
                  aria-label={bucket.label}
                >
                  <For each={itemsIn(bucket.key)}>
                    {(it, ri) => {
                      const key = props.keyOf(it);
                      const interactive = () => interactiveIn(bucket);
                      const selected = () => props.selectedKey != null && props.selectedKey === key;
                      const checked = () => props.checkedKeys?.has(key) === true;
                      return (
                        // biome-ignore lint/a11y/useFocusableInteractive: option rows carry a roving tabindex (0/-1) driven by createRowKeyboard; they are focusable.
                        <div
                          ref={(el) => { if (i() === firstPopulated() && ri() === 0) trackRow(el); }}
                          data-bq-key={key}
                          data-bq-interactive={interactive() ? "" : undefined}
                          class={
                            "bucket-queue__row" +
                            (interactive() ? " bucket-queue__row--interactive" : "") +
                            (selected() ? " bucket-queue__row--selected" : "")
                          }
                          role="option"
                          aria-selected={selected()}
                          tabindex={
                            interactive() && keyboard.tabbableKey() === key ? 0 : -1
                          }
                          classList={{
                            "bucket-queue__row--checked": checkableIn(bucket) && checked(),
                            "bucket-queue__row--focused": props.focusedKey === key,
                          }}
                          onClick={
                            interactive()
                              ? (e: MouseEvent) =>
                                  activate(key, bucket, {
                                    shift: e.shiftKey,
                                    meta: e.metaKey || e.ctrlKey,
                                  })
                              : undefined
                          }
                          onKeyDown={
                            interactive()
                              ? (e: KeyboardEvent) => keyboard.onRowKeyDown(e, key)
                              : undefined
                          }
                          onFocus={interactive() ? () => keyboard.setActiveKey(key) : undefined}
                        >
                          <Show when={checkableIn(bucket)}>
                            <span
                              class="bucket-queue__checkbox"
                              classList={{
                                "bucket-queue__checkbox--checked": checked(),
                              }}
                              aria-hidden="true"
                            >
                              {checked() ? "✓" : ""}
                            </span>
                          </Show>
                          <span class="bucket-queue__content">{props.renderItem(it)}</span>
                        </div>
                      );
                    }}
                  </For>
                </div>
              </Show>
            </div>
          );
        }}
      </For>
    </div>
  );
}
