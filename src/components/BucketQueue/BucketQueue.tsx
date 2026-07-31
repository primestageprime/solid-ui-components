// BucketQueue — layout-tagged Primitive (Depth 1; EXEMPT-AS-LAYOUT, STYLE_GUIDE
// § Layout Purity). Owns BucketQueue.css: the weighted water-fill sizes each
// bucket in JS, which no CSS rule can express. N always-present buckets stacked
// as one full-height progression bar, bucketing items by `bucketOf`.
//
// Sizing (ruled 2026-07-22): an empty bucket collapses to just its summary line
// (label + count); a populated bucket shrink-wraps to its content; when the
// populated buckets overflow the available height they share it by `weight`,
// each capped at its content, with the surplus from any bucket that shrinks
// redistributed to the ones still short (see ./layout). A bucket may opt out of
// shrink-wrapping with `fill`, taking the height nobody else wanted rather than
// leaving it as a dead band. A bucket may also declare `collapsible`, which
// lets the user collapse it to that same summary line while it still HAS items,
// and expand it again; that choice is this component's own state and sticks
// once made (see ./collapse). The bar fills its parent's height (or an explicit
// `height`). Chrome is neutral — the only role color is a dot beside each
// bucket label (a chevron, on a collapsible one).
import {
  For,
  Show,
  type JSX,
  createEffect,
  createMemo,
  createSignal,
  createUniqueId,
  onCleanup,
  untrack,
} from "solid-js";
import { allocateHeights, naturalHeights } from "./layout";
import { BucketHeader } from "./BucketHeader";
import { bucketItems } from "./bucketing";
import { createMeasurements } from "./measurement";
import { collapsedFlags, toggleCollapse, type CollapseOverrides } from "./collapse";
import { createRowKeyboard } from "./keyboard";
import { createSlotMotion } from "./motion";
import { advanceSelection } from "./selection";
import { diffTransfers } from "./transfer";
import { filter, find, findIndex, flatMap, map, pipe } from "../../fn";
import type { BucketQueueProps, Bucket } from "./types";
import "./BucketQueue.css";

export type { BucketQueueProps, Bucket } from "./types";

// Pre-measure fallback for a row (jsdom / first paint); the header's lives in
// ./measurement, which owns the elements it applies to.
const ROW_FALLBACK = 54;
const GAP = 8;

export function BucketQueue<T>(props: BucketQueueProps<T>): JSX.Element {
  let rootRef: HTMLDivElement | undefined;
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

  // Expand/collapse is pure UI chrome — it never needs to survive outside this
  // component or round-trip to a server — so it is component-owned rather than
  // a controlled prop pair. The controlled surface (`selectedKey`,
  // `checkedKeys`) stays reserved for state that genuinely needs external
  // ownership. The map holds only buckets the user has TOUCHED; see ./collapse
  // for why an absent entry is not the same as one toggled open.
  const [collapseOverrides, setCollapseOverrides] =
    createSignal<CollapseOverrides>(new Map());
  const collapsed = createMemo(() =>
    collapsedFlags({
      buckets: props.buckets,
      counts: counts(),
      overrides: collapseOverrides(),
    }),
  );
  // The same decision keyed by bucket, for the keyboard sequence below, which
  // has a bucket in hand rather than an index.
  const collapsedKeys = createMemo(() => {
    const flags = collapsed();
    return new Set(
      pipe(
        props.buckets,
        map((s: Bucket, i: number) => (flags[i] === true ? s.key : null)),
        filter((k): k is string => k !== null),
      ),
    );
  });

  // The bar fills its allotted height; each bucket's natural height is
  // deterministic from its row count (one measured row + header) — no
  // per-bucket body measurement, which goes stale when a body unmounts. The
  // live measurement of the row, the header and the empty strip — and the
  // ResizeObserver wiring that keeps them fresh across a theme switch or a
  // late web font — is ./measurement.
  const {
    availH,
    rowHs,
    headH,
    emptyH,
    trackRoot,
    trackHead,
    trackEmpty,
    trackRow,
    untrackRow,
  } = createMeasurements({
    buckets: () => props.buckets,
    bucketKeys,
    height: () => props.height,
  });

  // The measured empty strip has to EXIST: measure the first one actually
  // rendered, not bucket 0's, which routinely has no strip to measure. (Rows
  // get this per-bucket via `rowRefs` above, so they need no such index.)
  const firstEmptyLabelled = createMemo(() =>
    findIndex(
      (c, i) => c === 0 && props.buckets[i]?.emptyLabel != null,
      counts(),
    ),
  );

  const natural = createMemo(() =>
    naturalHeights({
      counts: counts(),
      rowHeights: map((s) => rowHs().get(s.key) ?? null, props.buckets),
      capRows: map((s) => s.capRows ?? null, props.buckets),
      hasEmptyLabel: map((s) => s.emptyLabel != null, props.buckets),
      collapsed: collapsed(),
      headH: headH(),
      emptyH: emptyH(),
      rowFallback: ROW_FALLBACK,
    }),
  );
  const heights = createMemo(() =>
    allocateHeights({
      natural: natural(),
      counts: counts(),
      weights: map((s) => s.weight ?? 1, props.buckets),
      available: props.height ?? availH(),
      gap: GAP,
      fills: map((s) => s.fill === true, props.buckets),
      collapsed: collapsed(),
    }),
  );

  // Select mode is on iff the consumer is managing a checked set. An empty Set
  // means "mode on, nothing checked" — the state select mode starts in.
  const selectModeOn = () => props.checkedKeys != null;
  const checkableIn = (bucket: Bucket) =>
    selectModeOn() && bucket.selectable === true;

  // A PER-ITEM veto on checking, consulted only where the bucket already allows
  // it. Nesting it inside `checkableIn` is what keeps this from becoming a
  // general row-disable: it can never make a row that would have SELECTED
  // inert, and it is never consulted outside select mode. An absent predicate
  // blocks nothing — the prop is deliberately fail-OPEN (see types.ts).
  const blockedIn = (item: T, bucket: Bucket) =>
    checkableIn(bucket) && props.isCheckable?.(item) === false;

  // The single activation branch — shared by click (here) and Enter/Space (the
  // keyboard module). A row either toggles its check, selects, or — when the
  // consumer's per-item veto refused it — does NOTHING. Both paths funnel
  // through here, which is why the veto needs no change in ./keyboard at all.
  const activate = (
    key: string,
    item: T,
    bucket: Bucket,
    modifiers: { shift: boolean; meta: boolean },
  ) => {
    if (checkableIn(bucket)) {
      // Deliberately no fall-through to onSelect for a refused row: that would
      // swap the consumer's detail pane in response to a click the user meant
      // as a check. In select mode a selectable bucket's rows toggle or do
      // nothing — never a third, unrequested action.
      if (!blockedIn(item, bucket)) props.onToggleCheck?.(key, modifiers);
    } else props.onSelect?.(key);
  };

  // The item AND bucket a row belongs to, for the activation branch — the
  // keyboard has only the key in hand, where a click has both in scope.
  const rowForKey = (key: string): { item: T; bucket: Bucket } | undefined => {
    const bucketKey = buckets().bucketByKey.get(key);
    if (bucketKey == null) return undefined;
    const bucket = find((s) => s.key === bucketKey, props.buckets);
    if (bucket === undefined) return undefined;
    const item = find((it) => props.keyOf(it) === key, itemsIn(bucketKey));
    return item === undefined ? undefined : { item, bucket };
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
          // A collapsed bucket's rows are NOT on the page. Leaving them here
          // lets the single tab stop be assigned to a row that renders
          // nowhere, which puts NO row in the tab order at all.
          interactiveIn(s) && !collapsedKeys().has(s.key)
            ? map((it) => props.keyOf(it), itemsIn(s.key))
            : [],
        props.buckets,
      ),
    focusedKey: () => props.focusedKey,
    selectedKey: () => props.selectedKey,
    onActivate: (key) => {
      const row = rowForKey(key);
      if (row) activate(key, row.item, row.bucket, { shift: false, meta: false });
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
        bucketEl: (bucketKey: string) =>
          find((n) => n.dataset.bqBucket === bucketKey, [
            ...root.querySelectorAll<HTMLElement>("[data-bq-bucket]"),
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
      ref={(el) => { rootRef = el; trackRoot(el); }}
      style={props.height != null ? { height: `${props.height}px` } : undefined}
    >
      <For each={props.buckets}>
        {(bucket, i) => {
          const count = () => counts()[i()];
          const isCollapsed = () => collapsed()[i()] === true;
          // Declared collapsible AND populated — an empty bucket has nothing
          // to expand into, so it renders as a plain header.
          const toggleable = () => bucket.collapsible === true && count() > 0;
          const bodyId = createUniqueId();
          return (
            <div
              class="bucket-queue__bucket"
              data-bq-bucket={bucket.key}
              style={{ height: `${Math.round(heights()[i()] ?? 0)}px` }}
            >
              <BucketHeader
                bucket={bucket}
                count={count()}
                toggleable={toggleable()}
                collapsed={isCollapsed()}
                bodyId={bodyId}
                onToggle={() =>
                  setCollapseOverrides((prev) =>
                    toggleCollapse(prev, bucket.key, isCollapsed()),
                  )
                }
                ref={(el) => { if (i() === 0) trackHead(el); }}
              />
              <Show
                when={count() > 0 && !isCollapsed()}
                fallback={
                  // `count() === 0` guard: a COLLAPSED bucket is populated, so
                  // it must never show the "nothing here" strip.
                  <Show when={count() === 0 && bucket.emptyLabel != null}>
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
                  id={bodyId}
                  role="listbox"
                  aria-label={bucket.label}
                >
                  <For each={itemsIn(bucket.key)}>
                    {(it, ri) => {
                      const key = props.keyOf(it);
                      // This bucket's measured row, if this is the one.
                      let myRow: HTMLDivElement | undefined;
                      onCleanup(() => untrackRow(bucket.key, myRow));
                      const interactive = () => interactiveIn(bucket);
                      const selected = () => props.selectedKey != null && props.selectedKey === key;
                      const checked = () => props.checkedKeys?.has(key) === true;
                      return (
                        // biome-ignore lint/a11y/useFocusableInteractive: option rows carry a roving tabindex (0/-1) driven by createRowKeyboard; they are focusable.
                        <div
                          ref={(el) => { if (ri() === 0) { myRow = el; trackRow(bucket.key, el); } }}
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
                                  activate(key, it, bucket, {
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
