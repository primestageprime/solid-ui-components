// SplitQueueList — DEPRECATED. A compile shim over BucketQueue, kept for
// one release so existing call sites keep working; removed in the next major.
//
// This is NOT a pixel-identical shim: the merged component draws its own
// chrome, so the rendered result is BucketQueue's, not the old two-pane
// seam. Migrate to BucketQueue directly — declare your sections and bucket
// your items — rather than relying on this mapping.
//
// `static` mode is a separate concern (no queue, no animation) and still
// delegates to StaticSplitLayout, which is NOT deprecated.
import { type JSX, createMemo } from "solid-js";
import { BucketQueue } from "../BucketQueue/BucketQueue";
import type { Bucket } from "../BucketQueue/types";
import { StaticSplitLayout } from "./StaticSplitLayout";
import type { SplitQueueListProps } from "./types";

export type { SplitQueueListProps } from "./types";

const RESOLVED = "resolved";
const UNRESOLVED = "unresolved";

/** @deprecated Use {@link BucketQueue}. Removed in the next major. */
export function SplitQueueList<T>(props: SplitQueueListProps<T>): JSX.Element {
  if (props.static)
    return StaticSplitLayout({
      items: props.topItems ?? props.resolved,
      renderItem: props.renderTop ?? props.renderItem,
      bottomContent: props.bottomContent,
      label: props.resolvedLabel,
      emptyLabel: props.allClearLabel,
      capRows: props.topCapRows,
      rowHeight: props.rowHeight,
      height: props.height,
      class: props.class,
    });

  const keyOf = (item: T): string => (props.keyOf ?? ((x) => String(x)))(item);
  // Memoized: bucketOf calls this per item, and without a memo each call would
  // rebuild the Set, turning the shim's bucketing into O(n·m) instead of O(n+m).
  const resolvedKeys = createMemo(() => new Set((props.resolved ?? []).map(keyOf)));

  const buckets = (): Bucket[] => [
    {
      key: RESOLVED,
      label: props.resolvedLabel ?? "Resolved",
      tone: "success",
      // The old top pane capped at 3 rows and scrolled; `capRows` is its
      // successor, so this maps rather than being dropped.
      capRows: props.topCapRows ?? 3,
    },
    {
      key: UNRESOLVED,
      label: props.unresolvedLabel ?? "Unresolved",
      tone: "accent",
      selectable: true,
      emptyLabel: props.allClearLabel ?? "All clear — nothing to process",
    },
  ];

  return (
    <BucketQueue<T>
      buckets={buckets()}
      items={[...(props.resolved ?? []), ...(props.unresolved ?? [])]}
      bucketOf={(item) => (resolvedKeys().has(keyOf(item)) ? RESOLVED : UNRESOLVED)}
      keyOf={keyOf}
      renderItem={(item) => (props.renderItem ?? (() => null))(item)}
      selectedKey={props.selectedKey}
      // BucketQueue also emits `null` here, to say the section being
      // worked just drained. The deprecated prop is `(key: string) => void` and
      // cannot express a deselect, and no existing call site is written to
      // expect one — so the shim swallows it rather than widening the old API.
      // Migrate to BucketQueue to get the "queue empty" signal.
      onSelect={(k) => {
        if (k != null) props.onSelect?.(k);
      }}
      focusedKey={props.focusedKey}
      onFocusChange={(k) => props.onFocusChange?.(k)}
      checkedKeys={props.selectMode ? (props.checkedKeys ?? new Set<string>()) : undefined}
      onToggleCheck={props.onToggleCheck}
      scrollToKey={props.scrollToKey}
      height={props.height}
      class={props.class}
    />
  );
}
