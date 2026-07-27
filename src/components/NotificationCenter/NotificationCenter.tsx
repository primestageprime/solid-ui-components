// lastReviewedAt: 2026-07-27
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
// canon for this surface.
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
import { Icon, type IconName } from "../Icon/Icon";
import { CountBadge } from "../Badge/CountBadge";
import { TagPill } from "../Badge/TagPill";
import { PopoverSurface } from "../Surface/variants";
import { Divider } from "../Divider/Divider";
import {
  FillColumn,
  ScrollColumn,
  SpreadRow,
  ClusterRow,
  TopClusterRow,
  GrowTightStack,
} from "../Layout/variants";
import { TextTitle, MutedBody, TextSublabel } from "../Text/variants";
import { TextButton } from "../Button/variants";
import { Link } from "../Navigation/Link";
import "./NotificationCenter.css";

export type NotificationTone = "info" | "task" | "warning";

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
  tone?: NotificationTone;
  /** Pre-formatted relative time ("2m", "1d"). SUI ships no date formatter —
   *  the consumer owns humanization and its locale. */
  when?: string;
  /** Already seen. Read items lose the unread dot and leave the badge count. */
  read?: boolean;
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
  /** Supplying this renders the pinned footer action; omit it and the footer
   *  (and its divider) never mount — the panel has no dead affordance. */
  onMarkAllRead?: () => void;
  markAllReadLabel?: string;
}

// Tone → glyph. `task` reads as pending work, so it borrows the clock rather
// than a status glyph; an item with no tone is plain information.
const TONE_ICON: Record<NotificationTone, IconName> = {
  info: "info",
  task: "clock",
  warning: "warning",
};

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

  const triggerClass = () =>
    isOpen()
      ? "sui-notification-center__trigger sui-notification-center__trigger--open"
      : "sui-notification-center__trigger";

  const rowClass = (item: NotificationItem) => {
    const c = ["sui-notification-center__row"];
    c.push(`sui-notification-center__row--${item.tone ?? "info"}`);
    return c.join(" ");
  };

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
                        // Media-object row: unread gutter · tone well · text
                        // column. Unboxed until hover — the well is what makes
                        // it read as a unit at rest.
                        <TopClusterRow class={rowClass(item())}>
                          <span
                            class={
                              item().read || item().transient
                                ? "sui-notification-center__unread"
                                : "sui-notification-center__unread sui-notification-center__unread--on"
                            }
                            aria-hidden="true"
                          />
                          <span class="sui-notification-center__well">
                            <Icon
                              name={
                                item().transient
                                  ? "spinner"
                                  : TONE_ICON[item().tone ?? "info"]
                              }
                              size="sm"
                              aria-hidden="true"
                            />
                          </span>
                          <GrowTightStack>
                            <SpreadRow>
                              <TextTitle>{item().title}</TextTitle>
                              <Show when={item().when}>
                                <TextSublabel class="sui-notification-center__when">
                                  {item().when}
                                </TextSublabel>
                              </Show>
                            </SpreadRow>
                            <Show when={item().detail}>
                              <TextSublabel>{item().detail}</TextSublabel>
                            </Show>
                            <Show when={item().action && !item().transient}>
                              {(() => {
                                const it = item();
                                const a = it.action as NotificationAction;
                                return (
                                  // Left-packed row so the CTA sizes to its
                                  // content and starts at the text column's
                                  // edge. Both branches are inline-flex and
                                  // would otherwise stretch as column children
                                  // and centre their own labels — which is why
                                  // the link and button branches used to sit at
                                  // different indents.
                                  <ClusterRow>
                                    <Show
                                      when={a.href}
                                      fallback={
                                        // Peer of the anchor's accent colour — a
                                        // semantic tone prop on Button's public API,
                                        // not a raw style override. Label sits directly
                                        // in the button (symmetric with the Link
                                        // branch), so the interactive element owns it.
                                        <TextButton
                                          tone="accent"
                                          onClick={() => activate(it)}
                                        >
                                          {`${a.label} →`}
                                        </TextButton>
                                      }
                                    >
                                      {/* `Link`, not `NavLink`: NavLink is a nav-RAIL
                                          item and bakes padding-left:16px, which indented
                                          the anchor branch ~16px past the button branch.
                                          Link is the unpadded accent anchor — the right
                                          atom for an inline CTA. */}
                                      <Link
                                        href={a.href}
                                        onClick={(e) => activate(it, e)}
                                      >
                                        {`${a.label} →`}
                                      </Link>
                                    </Show>
                                  </ClusterRow>
                                );
                              })()}
                            </Show>
                          </GrowTightStack>
                        </TopClusterRow>
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
