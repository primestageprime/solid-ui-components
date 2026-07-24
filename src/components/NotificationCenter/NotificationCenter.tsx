// lastReviewedAt: 2026-07-24
// lastReviewedBy: adlai.arnold
// ============================================
// NotificationCenter — Composed (Depth 3)
// Zero CSS. Composes Icon, CountBadge, PopoverSurface, Layout/Text/Button
// variants + NavLink. Declares ONLY overlay position anchoring (Portal +
// fixed, measured from the trigger — the overlay carve-out of Layout Purity).
// Router-agnostic + domain-agnostic: consumer supplies items and navigates
// via onAction. See docs/superpowers/plans/2026-07-24-sui-notification-center.md
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
import { PopoverSurface } from "../Surface/variants";
import { TightStack, ClusterRow, ScrollColumn } from "../Layout/variants";
import { TextValue, MutedBody } from "../Text/variants";
import { TextButton } from "../Button/variants";
import { NavLink } from "../Navigation/NavLink";

export interface NotificationAction {
  label: string;
  href?: string;
}
export interface NotificationItem {
  id: string;
  title: string;
  detail?: string;
  action?: NotificationAction;
  transient?: boolean;
  tone?: "info" | "task" | "warning";
}
export interface NotificationCenterProps {
  items: NotificationItem[];
  badgeCount?: number;
  busy?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onAction?: (item: NotificationItem) => void;
  emptyLabel?: string;
  label?: string;
  badgeTone?: "accent" | "neutral" | "danger";
}

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

  const badge = () =>
    props.badgeCount ?? props.items.filter((i) => !i.transient).length;
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

  const activate = (item: NotificationItem, e?: MouseEvent) => {
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

  return (
    <span
      ref={containerRef}
      style={{ position: "relative", display: "inline-block" }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-label={label()}
        aria-haspopup="true"
        aria-expanded={isOpen()}
        aria-busy={props.busy ? "true" : undefined}
        onClick={toggle}
        style={{
          position: "relative",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: "var(--sui-text-secondary)",
        }}
      >
        <Icon name="bell" size="md" />
        <Show when={props.busy}>
          <span style={{ position: "absolute", top: "-2px", right: "-2px" }}>
            <Icon name="spinner" size="xs" />
          </span>
        </Show>
        <Show when={badge() > 0}>
          <span style={{ position: "absolute", top: "-4px", right: "-4px" }}>
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
                      <TightStack>
                        <ClusterRow>
                          <Show when={item().transient}>
                            <Icon name="spinner" size="sm" aria-hidden="true" />
                          </Show>
                          <TextValue>{item().title}</TextValue>
                        </ClusterRow>
                        <Show when={item().detail}>
                          <MutedBody>{item().detail}</MutedBody>
                        </Show>
                        <Show when={item().action && !item().transient}>
                          {(() => {
                            const it = item();
                            const a = it.action as NotificationAction;
                            return (
                              <Show
                                when={a.href}
                                fallback={
                                  // Peer of the anchor's `color="accent"` — a
                                  // semantic tone prop on Button's public API,
                                  // not a raw style override. Label sits directly
                                  // in the button (symmetric with the NavLink
                                  // branch), so the interactive element owns it.
                                  <TextButton
                                    tone="accent"
                                    onClick={() => activate(it)}
                                  >
                                    {`${a.label} →`}
                                  </TextButton>
                                }
                              >
                                <NavLink
                                  color="accent"
                                  href={a.href}
                                  onClick={(e) => activate(it, e)}
                                >
                                  {`${a.label} →`}
                                </NavLink>
                              </Show>
                            );
                          })()}
                        </Show>
                      </TightStack>
                    )}
                  </Index>
                </ScrollColumn>
              </Show>
            </PopoverSurface>
          </section>
        </Portal>
      </Show>
    </span>
  );
};
