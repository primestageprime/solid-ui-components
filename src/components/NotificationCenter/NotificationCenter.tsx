// lastReviewedAt: 2026-07-28
// lastReviewedBy: adlai.arnold
// ============================================
// NotificationCenter — Composed (Depth 3, overlay control)
// Owns NotificationCenter.css for overlay chrome ONLY — the static positioning
// of the trigger + its corner overlays (the same carve-out PopoverMenu/Dropdown
// take), plus the trigger's open/hover skin and the row's intrinsic decoration
// (glyph well, unread dot, hover wash). All content arrangement composes Icon,
// CountBadge, TagPill, PopoverSurface, Layout/Text/Button variants + Link;
// no hand-rolled geometry. The dynamic panel position rides inline via the
// computed panelStyle() (overlay anchor).
//
// The panel is an INBOX, not a card stack (design-decision-tree precedent
// 2026-07-27): pinned header (title + count), scrolling rows, pinned footer
// action — the FillColumn/ScrollColumn pinned-action-row idiom. Rows are
// unboxed until hover but still read as units via the leading tone well, so a
// long feed stays quiet at rest. Supersedes the 2026-07-24 CompactSurface card
// canon for this surface. The row itself lives in NotificationRow.tsx; this
// file owns the trigger, the overlay positioning, and the panel shell.
//
// Router-agnostic + domain-agnostic: consumer supplies items (including the
// pre-formatted `when` string — no date library in SUI) and navigates via
// onAction. See docs/superpowers/plans/2026-07-24-sui-notification-center.md
// ============================================
import {
  type Component,
  type JSX,
  Index,
  Show,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
} from "solid-js";
import { Portal } from "solid-js/web";
import { Icon } from "../Icon/Icon";
import { CountBadge } from "../Badge/CountBadge";
import { TagPill } from "../Badge/TagPill";
import { PopoverSurface } from "../Surface/variants";
import { Divider } from "../Divider/Divider";
import { FillColumn, ScrollColumn, SpreadRow } from "../Layout/variants";
import { TextTitle, MutedBody } from "../Text/variants";
import { TextButton } from "../Button/variants";
import { NotificationRow } from "./NotificationRow";
import type {
  NotificationAction,
  NotificationCenterProps,
  NotificationItem,
} from "./types";
import "./NotificationCenter.css";

// Re-exported so `from "./NotificationCenter"` keeps resolving the types it
// used to declare — the split is internal, not a consumer-visible move.
export type {
  NotificationAction,
  NotificationActionTone,
  NotificationCenterProps,
  NotificationItem,
  NotificationTone,
} from "./types";

export const NotificationCenter: Component<NotificationCenterProps> = (
  props,
) => {
  const [internalOpen, setInternalOpen] = createSignal(false);
  const [pos, setPos] = createSignal<{ top: number; right: number }>();
  let containerRef: HTMLSpanElement | undefined;
  let triggerRef: HTMLButtonElement | undefined;
  let panelRef: HTMLElement | undefined;

  const isControlled = () => props.open !== undefined;
  const isOpen = () => (isControlled() ? !!props.open : internalOpen());

  // Unread drives the count: transient rows are progress, not mail, and a row
  // the consumer has marked `read` has already been accounted for. Items that
  // never set `read` stay counted, so the derivation is unchanged for consumers
  // that don't track read state.
  const badge = () =>
    props.badgeCount ??
    props.items.filter((i) => !i.transient && !i.read).length;
  const label = () => props.label ?? "Notifications";
  const empty = () => props.items.length === 0;
  const announce = createMemo(() => {
    const transients = props.items
      .filter((i) => i.transient)
      .map((i) => i.title);
    if (transients.length) return transients.join(", ");
    return props.busy ? "Working…" : "";
  });

  const computePosition = () => {
    if (!triggerRef) return;
    const r = triggerRef.getBoundingClientRect();
    setPos({ top: r.bottom + 6, right: window.innerWidth - r.right });
  };
  const panelStyle = (): JSX.CSSProperties => {
    const p = pos();
    return p
      ? {
          position: "fixed",
          top: `${p.top}px`,
          right: `${p.right}px`,
          "z-index": "50",
        }
      : { position: "fixed" };
  };

  // Single choke point for every open/close intent. Emits onOpenChange always;
  // mutates internal state ONLY when uncontrolled (never fight the consumer).
  const requestOpen = (next: boolean) => {
    props.onOpenChange?.(next);
    if (!isControlled()) setInternalOpen(next);
  };

  const onDocMouseDown = (e: MouseEvent) => {
    const t = e.target as Node;
    if (!containerRef?.contains(t) && !panelRef?.contains(t))
      requestOpen(false);
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") requestOpen(false);
  };
  const reposition = () => computePosition();
  const setupListeners = () => {
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
  };
  const teardownListeners = () => {
    document.removeEventListener("mousedown", onDocMouseDown);
    document.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("scroll", reposition, true);
    window.removeEventListener("resize", reposition);
  };
  onCleanup(teardownListeners);

  // Keep listeners + position in sync with the resolved open state (covers
  // controlled opens the consumer drives, e.g. auto-open). Side effects live in
  // an effect, not a memo — the render reads `isOpen()` for the panel directly.
  createEffect(() => {
    if (isOpen()) {
      computePosition();
      setupListeners();
    } else {
      teardownListeners();
    }
  });

  const toggle = () => requestOpen(!isOpen());

  const activate = (
    item: NotificationItem,
    _action: NotificationAction,
    e?: MouseEvent,
  ) => {
    // Preserve new-tab gestures on anchors; SPA-navigate on plain left click.
    if (
      e &&
      (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0)
    )
      return;
    e?.preventDefault();
    props.onAction?.(item);
    requestOpen(false);
  };

  const triggerClass = () =>
    isOpen()
      ? "sui-notification-center__trigger sui-notification-center__trigger--open"
      : "sui-notification-center__trigger";

  return (
    <span ref={containerRef} class="sui-notification-center">
      <button
        ref={triggerRef}
        type="button"
        class={triggerClass()}
        aria-label={label()}
        aria-haspopup="true"
        aria-expanded={isOpen()}
        aria-busy={props.busy ? "true" : undefined}
        onClick={toggle}
      >
        {/* The glyph FILLS while open — a second, colour-independent signal
            alongside the tinted well, so the state survives a monochrome or
            colourblind theme. */}
        <Icon name="bell" size="md" variant={isOpen() ? "solid" : "outline"} />
        <Show when={props.busy}>
          <span class="sui-notification-center__corner sui-notification-center__corner--busy">
            <Icon name="spinner" size="xs" />
          </span>
        </Show>
        <Show when={badge() > 0}>
          <span class="sui-notification-center__corner sui-notification-center__corner--badge">
            <CountBadge count={badge()} aria-hidden="true" />
          </span>
        </Show>
      </button>

      <span class="sui-sr-only" aria-live="polite" aria-atomic="true">
        {announce()}
      </span>

      <Show when={isOpen()}>
        <Portal>
          {/* A named <section> is implicitly a region landmark — same semantics
              as role="region", without the explicit ARIA role. This raw
              positioned wrapper is the overlay carve-out (Portal + fixed anchor). */}
          <section ref={panelRef} style={panelStyle()} aria-label={label()}>
            <PopoverSurface>
              {/* Inbox shell: pinned header, scrolling body, pinned footer —
                  the FillColumn + ScrollColumn + last-child idiom the tree
                  specifies for panels with a persistent action row. */}
              <FillColumn class="sui-notification-center__panel">
                <SpreadRow>
                  <TextTitle>{label()}</TextTitle>
                  {/* Count as the thematic number lozenge, de-emphasized —
                      the label carries the weight (tree › categorized counts). */}
                  <Show when={badge() > 0}>
                    <TagPill tag={{ label: String(badge()) }} />
                  </Show>
                </SpreadRow>
                <Divider spacing="sm" />

                <Show
                  when={!empty()}
                  fallback={
                    <MutedBody>
                      {props.emptyLabel ?? "You're all caught up."}
                    </MutedBody>
                  }
                >
                  <ScrollColumn>
                    <Index each={props.items}>
                      {(item) => (
                        <NotificationRow
                          item={item()}
                          onActivateAction={activate}
                        />
                      )}
                    </Index>
                  </ScrollColumn>
                </Show>

                <Show when={props.onMarkAllRead}>
                  <Divider spacing="sm" />
                  <TextButton
                    tone="accent"
                    onClick={() => props.onMarkAllRead?.()}
                  >
                    {props.markAllReadLabel ?? "Mark all as read"}
                  </TextButton>
                </Show>
              </FillColumn>
            </PopoverSurface>
          </section>
        </Portal>
      </Show>
    </span>
  );
};
