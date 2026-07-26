// SplitQueueList — DEPRECATED. A compile shim over ProgressionQueue, kept for
// one release so existing call sites keep working; removed in the next major.
//
// This is NOT a pixel-identical shim: the merged component draws its own
// chrome, so the rendered result is ProgressionQueue's, not the old two-pane
// seam. Migrate to ProgressionQueue directly — declare your sections and bucket
// your items — rather than relying on this mapping.
//
// `static` mode is a separate concern (no queue, no animation) and still
// delegates to StaticSplitLayout, which is NOT deprecated.
import type { JSX } from "solid-js";
import { ProgressionQueue } from "../ProgressionQueue/ProgressionQueue";
import type { ProgressionSection } from "../ProgressionQueue/types";
import { StaticSplitLayout } from "./StaticSplitLayout";
import type { SplitQueueListProps } from "./types";

export type { SplitQueueListProps } from "./types";

const RESOLVED = "resolved";
const UNRESOLVED = "unresolved";

/** @deprecated Use {@link ProgressionQueue}. Removed in the next major. */
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
  const resolvedKeys = () => new Set((props.resolved ?? []).map(keyOf));

  const sections = (): ProgressionSection[] => [
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
    <ProgressionQueue<T>
      sections={sections()}
      items={[...(props.resolved ?? []), ...(props.unresolved ?? [])]}
      bucketOf={(item) => (resolvedKeys().has(keyOf(item)) ? RESOLVED : UNRESOLVED)}
      keyOf={keyOf}
      renderItem={(item) => (props.renderItem ?? (() => null))(item)}
      selectedKey={props.selectedKey}
      onSelect={(k) => props.onSelect?.(k)}
      focusedKey={props.focusedKey}
      onFocusChange={(k) => props.onFocusChange?.(k)}
      checkedKeys={props.selectMode === false ? undefined : props.checkedKeys}
      onToggleCheck={props.onToggleCheck}
      scrollToKey={props.scrollToKey}
      height={props.height}
      class={props.class}
    />
  );
}
