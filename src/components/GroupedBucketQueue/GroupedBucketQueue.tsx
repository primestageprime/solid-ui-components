// GroupedBucketQueue — Composite (Depth 2): composes BucketQueue's row/
// selection/keyboard semantics (imported directly from its internal
// ./keyboard and ./selection modules) over a nested group tree rather than
// BucketQueue's own flat bucket list. A NESTED-header list over BucketQueue's
// row model. One always-visible header per group node (Direction, Category, Type — or
// any depth), each collapsible with a rolled-up count, and a flat `items`
// list bucketed into LEAF groups via `bucketOf`. Rows keep BucketQueue's
// selection, roving-tabindex keyboard nav (Up/Down/Home/End over every
// visible interactive row, no wrap), and triage-advance (the selection
// follows a row that leaves its leaf group to the next survivor there, and
// clears when that group empties) — see ../BucketQueue/keyboard and
// ../BucketQueue/selection, imported directly rather than re-derived, so a
// fix there never has to be ported here by hand.
//
// Unlike BucketQueue this is a plain scrollable list, not a water-filled bar:
// nested headers have no fixed-height sizing problem to solve, so there is no
// ./layout or ./measurement equivalent. `naturalHeights`/`allocateHeights`
// stay BucketQueue-only.
import {
  For,
  Show,
  createEffect,
  createMemo,
  createSignal,
  createUniqueId,
  type JSX,
} from "solid-js";
import { filter, find, flatMap, map, pipe } from "../../fn";
import { bucketItems } from "../BucketQueue/bucketing";
import { createRowKeyboard } from "../BucketQueue/keyboard";
import { advanceSelection } from "../BucketQueue/selection";
import "../BucketQueue/BucketQueue.css";
import "./GroupedBucketQueue.css";
import {
  collectLeafBucketKeys,
  flattenGroupHeaders,
  leafNodesByKey,
  toggleGroupCollapse,
  type FlatGroupHeader,
  type GroupCollapseOverrides,
} from "./groupTree";
import type { GroupedBucketQueueProps } from "./types";

export type { GroupedBucketQueueProps } from "./types";
export type { GroupNode } from "./groupTree";

const Chevron = (): JSX.Element => (
  <svg width="7" height="9" viewBox="0 0 7 9" fill="none" aria-hidden="true">
    <path
      d="M1 1l4 3.5L1 8"
      stroke="currentColor"
      stroke-width="1.6"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
);

export function GroupedBucketQueue<T>(
  props: GroupedBucketQueueProps<T>,
): JSX.Element {
  let rootRef: HTMLDivElement | undefined;

  const leafBucketKeys = createMemo(() => collectLeafBucketKeys(props.groups));
  const leafByKey = createMemo(() => leafNodesByKey(props.groups));
  const buckets = createMemo(() =>
    bucketItems(props.items, leafBucketKeys(), props.bucketOf, props.keyOf),
  );
  const itemsIn = (bucketKey: string): T[] =>
    buckets().byBucket.get(bucketKey) ?? [];
  const countFor = (bucketKey: string): number => itemsIn(bucketKey).length;

  // Collapse is component-owned chrome, exactly like BucketQueue's — a map of
  // only the nodes the user has TOUCHED (see ./groupTree).
  const [overrides, setOverrides] = createSignal<GroupCollapseOverrides>(
    new Map(),
  );
  const flat = createMemo<FlatGroupHeader[]>(() =>
    flattenGroupHeaders(props.groups, countFor, overrides()),
  );

  // Select mode / per-row activation — identical branch structure to
  // BucketQueue's, just keyed off a GroupNode leaf instead of a Bucket.
  const selectModeOn = () => props.checkedKeys != null;
  const checkableIn = (h: FlatGroupHeader) =>
    selectModeOn() && h.isLeaf && leafByKey().get(h.key)?.selectable === true;
  const blockedIn = (item: T, h: FlatGroupHeader) =>
    checkableIn(h) && props.isCheckable?.(item) === false;
  const interactiveIn = (h: FlatGroupHeader) =>
    props.onSelect != null || checkableIn(h);

  const activate = (
    key: string,
    item: T,
    h: FlatGroupHeader,
    modifiers: { shift: boolean; meta: boolean },
  ) => {
    if (checkableIn(h)) {
      if (!blockedIn(item, h)) props.onToggleCheck?.(key, modifiers);
    } else props.onSelect?.(key);
  };

  const rowForKey = (
    key: string,
  ): { item: T; leaf: FlatGroupHeader } | undefined => {
    const bucketKey = buckets().bucketByKey.get(key);
    if (bucketKey == null) return undefined;
    const leaf = find((h) => h.isLeaf && h.bucketKey === bucketKey, flat());
    if (leaf === undefined) return undefined;
    const item = find((it) => props.keyOf(it) === key, itemsIn(bucketKey));
    return item === undefined ? undefined : { item, leaf };
  };

  const keyboard = createRowKeyboard({
    getRootEl: () => rootRef,
    // Visible interactive rows, in render order — `flat()` already prunes a
    // collapsed branch's descendants, so a leaf hidden behind a collapsed
    // ancestor contributes nothing here. A collapsed LEAF also contributes
    // nothing: its own rows are unmounted, same rule as BucketQueue.
    allKeys: () =>
      pipe(
        flat(),
        filter((h: FlatGroupHeader) => h.isLeaf && !h.collapsed && interactiveIn(h)),
        flatMap((h) => itemsIn(h.bucketKey as string)),
        map((it) => props.keyOf(it)),
      ),
    focusedKey: () => props.focusedKey,
    selectedKey: () => props.selectedKey,
    onActivate: (key) => {
      const row = rowForKey(key);
      if (row) activate(key, row.item, row.leaf, { shift: false, meta: false });
    },
    onFocusChange: (key) => props.onFocusChange?.(key),
  });

  const revealRow = (key: string) => {
    requestAnimationFrame(() => {
      const candidates =
        rootRef?.querySelectorAll<HTMLElement>("[data-gbq-key]");
      const match =
        candidates && find((n) => n.dataset.gbqKey === key, [...candidates]);
      match?.scrollIntoView?.({ block: "nearest" });
    });
  };

  createEffect(() => {
    const key = props.scrollToKey;
    if (!key) return;
    revealRow(key);
  });

  // Triage advance (no motion/animation — this is a plain list, not a water-
  // filled bar): when an item's LEAF bucket changes, and that item was the
  // selection, advance it within its former leaf's ordering exactly as
  // BucketQueue does. `untrack`-free here because this effect only reacts to
  // `buckets()`/`flat()`, and reads the controlled selection through the
  // props object directly rather than a tracked signal read.
  let prevBucketByKey: ReadonlyMap<string, string> = new Map();
  let prevItemKeysByBucket: ReadonlyMap<string, readonly string[]> = new Map();
  createEffect(() => {
    const nextBucketByKey = buckets().bucketByKey;
    const nextItemKeysByBucket = new Map(
      map(
        (bk: string) =>
          [bk, map((it: T) => props.keyOf(it), itemsIn(bk))] as const,
        leafBucketKeys(),
      ),
    );
    const selectedKey = props.selectedKey;
    const onSelect = props.onSelect;
    if (selectedKey != null && onSelect != null) {
      const prevBucket = prevBucketByKey.get(selectedKey);
      const nextBucket = nextBucketByKey.get(selectedKey);
      if (prevBucket != null && prevBucket !== nextBucket) {
        const advance = advanceSelection({
          selectedKey,
          before: prevItemKeysByBucket.get(prevBucket) ?? [],
          after: new Set(nextItemKeysByBucket.get(prevBucket) ?? []),
        });
        if (advance.kind !== "keep") {
          const next = advance.kind === "select" ? advance.key : null;
          onSelect(next);
          keyboard.setActiveKey(next);
        }
      }
    }
    prevBucketByKey = nextBucketByKey;
    prevItemKeysByBucket = nextItemKeysByBucket;
  });

  return (
    <div
      class={`grouped-bucket-queue${props.class ? ` ${props.class}` : ""}`}
      ref={(el) => {
        rootRef = el;
      }}
    >
      <For each={flat()}>
        {(h) => {
          const bodyId = createUniqueId();
          const leafNode = () =>
            h.isLeaf ? leafByKey().get(h.key) : undefined;
          return (
            <div
              class={`grouped-bucket-queue__node${h.isLeaf ? " grouped-bucket-queue__node--leaf" : ""}`}
              data-gbq-node={h.key}
              style={{ "--gbq-depth": h.depth }}
            >
              <Show
                when={h.toggleable}
                fallback={
                  <div class="bucket-queue__header grouped-bucket-queue__header">
                    <span class="bucket-queue__title">
                      <span
                        class={`bucket-queue__dot bucket-queue__dot--${h.tone ?? "muted"}`}
                      />
                      {h.label}
                    </span>
                    <span class="bucket-queue__count">{h.count}</span>
                  </div>
                }
              >
                <button
                  type="button"
                  class="bucket-queue__header bucket-queue__header--toggle grouped-bucket-queue__header"
                  aria-expanded={!h.collapsed}
                  aria-controls={bodyId}
                  onClick={() =>
                    setOverrides((prev) =>
                      toggleGroupCollapse(prev, h.key, h.collapsed),
                    )
                  }
                >
                  <span class="bucket-queue__title">
                    <span
                      class={`bucket-queue__chevron bucket-queue__chevron--${h.tone ?? "muted"}`}
                      classList={{
                        "bucket-queue__chevron--expanded": !h.collapsed,
                      }}
                      aria-hidden="true"
                    >
                      <Chevron />
                    </span>
                    {h.label}
                  </span>
                  <span class="bucket-queue__count">{h.count}</span>
                </button>
              </Show>
              <Show when={h.isLeaf && !h.collapsed}>
                <Show
                  when={h.count > 0}
                  fallback={
                    <Show when={leafNode()?.emptyLabel != null}>
                      <div class="bucket-queue__empty grouped-bucket-queue__empty">
                        {leafNode()?.emptyLabel}
                      </div>
                    </Show>
                  }
                >
                  <div
                    class="bucket-queue__body grouped-bucket-queue__body"
                    id={bodyId}
                    role="listbox"
                    aria-label={h.label}
                  >
                    <For each={itemsIn(h.bucketKey as string)}>
                      {(it) => {
                        const key = props.keyOf(it);
                        const blocked = () => blockedIn(it, h);
                        const focusable = () => interactiveIn(h);
                        const activatable = () => focusable() && !blocked();
                        const selected = () =>
                          props.selectedKey != null &&
                          props.selectedKey === key;
                        const checked = () =>
                          props.checkedKeys?.has(key) === true;
                        return (
                          // biome-ignore lint/a11y/useFocusableInteractive: option rows carry a roving tabindex (0/-1) driven by createRowKeyboard; they are focusable.
                          <div
                            data-gbq-key={key}
                            data-bq-key={key}
                            data-bq-interactive={focusable() ? "" : undefined}
                            class={
                              "bucket-queue__row" +
                              (activatable()
                                ? " bucket-queue__row--interactive"
                                : "") +
                              (selected() ? " bucket-queue__row--selected" : "")
                            }
                            role="option"
                            aria-selected={selected()}
                            aria-disabled={blocked() ? true : undefined}
                            title={
                              blocked()
                                ? props.uncheckableReason?.(it)
                                : undefined
                            }
                            tabindex={
                              focusable() && keyboard.tabbableKey() === key
                                ? 0
                                : -1
                            }
                            classList={{
                              "bucket-queue__row--checked":
                                checkableIn(h) && checked(),
                              "bucket-queue__row--focused":
                                props.focusedKey === key,
                              "bucket-queue__row--uncheckable": blocked(),
                            }}
                            onClick={
                              activatable()
                                ? (e: MouseEvent) =>
                                    activate(key, it, h, {
                                      shift: e.shiftKey,
                                      meta: e.metaKey || e.ctrlKey,
                                    })
                                : undefined
                            }
                            onKeyDown={
                              focusable()
                                ? (e: KeyboardEvent) =>
                                    keyboard.onRowKeyDown(e, key)
                                : undefined
                            }
                            onFocus={
                              focusable()
                                ? () => keyboard.setActiveKey(key)
                                : undefined
                            }
                          >
                            <Show when={checkableIn(h)}>
                              <span
                                class="bucket-queue__checkbox"
                                classList={{
                                  "bucket-queue__checkbox--checked": checked(),
                                  "bucket-queue__checkbox--disabled": blocked(),
                                }}
                                aria-hidden="true"
                              >
                                {checked() ? "✓" : ""}
                              </span>
                            </Show>
                            <span class="bucket-queue__content">
                              {props.renderItem(it)}
                            </span>
                          </div>
                        );
                      }}
                    </For>
                  </div>
                </Show>
              </Show>
            </div>
          );
        }}
      </For>
    </div>
  );
}
