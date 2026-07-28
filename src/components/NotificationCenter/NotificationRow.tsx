// ============================================
// NotificationRow — Depth 3 support (internal)
// One inbox row: unread gutter · tone well · text column. Unboxed at rest,
// washed on hover — the leading well is what keeps it reading as a unit.
// Owns no CSS; the row's intrinsic decoration lives in NotificationCenter.css
// alongside the overlay chrome it belongs to.
//
// Exported from the module for direct testing, NOT from the package barrel —
// the public surface stays `NotificationCenter` plus its types and builders.
// ============================================
import { type Component, Index, Show } from "solid-js";
import { Icon, type IconName } from "../Icon/Icon";
import {
  GrowTightStack,
  SpreadRow,
  TopClusterRow,
  WrapRow,
} from "../Layout/variants";
import { TextTitle, TextSublabel } from "../Text/variants";
import { TextButton } from "../Button/variants";
import { Link } from "../Navigation/Link";
import { resolveActions } from "./actions";
import type {
  NotificationAction,
  NotificationItem,
  NotificationTone,
} from "./types";

// Tone → glyph. `task` reads as pending work, so it borrows the clock rather
// than a status glyph; an item with no tone is plain information.
const TONE_ICON: Record<NotificationTone, IconName> = {
  info: "info",
  task: "clock",
  warning: "warning",
};

export interface NotificationRowProps {
  item: NotificationItem;
  /** Fires one action. The parent owns the panel-close decision. */
  onActivateAction: (
    item: NotificationItem,
    action: NotificationAction,
    e?: MouseEvent,
  ) => void;
  /** Supplying this is what MAKES the row body activatable. Omit it and the
   *  row carries no role, no tab stop, and no handlers. */
  onActivateRow?: (item: NotificationItem) => void;
}

const rowClass = (item: NotificationItem) =>
  [
    "sui-notification-center__row",
    `sui-notification-center__row--${item.tone ?? "info"}`,
  ].join(" ");

export const NotificationRow: Component<NotificationRowProps> = (props) => {
  const item = () => props.item;
  const actions = () => resolveActions(item());

  return (
    // Media-object row: unread gutter · tone well · text column. Unboxed until
    // hover — the well is what makes it read as a unit at rest.
    <TopClusterRow
      class={rowClass(item())}
      // Conditionally interactive — wired ONLY when the consumer supplied a row
      // handler, so a row without one carries no misleading affordance. Same
      // dual-mode pattern as FocusLabelBand and HeatStream.
      role={props.onActivateRow ? "button" : undefined}
      tabIndex={props.onActivateRow ? 0 : undefined}
      onClick={() => props.onActivateRow?.(item())}
      onKeyDown={(e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        // Enter on a focused action button must not double-fire the row.
        if (e.target !== e.currentTarget) return;
        e.preventDefault();
        props.onActivateRow?.(item());
      }}
    >
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
          name={item().transient ? "spinner" : TONE_ICON[item().tone ?? "info"]}
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
        {/* Consumer-owned region. The chrome above (gutter, well, title,
            timestamp) and below (actions) is invariant, which is what keeps a
            heterogeneous feed scanning as one inbox rather than a pile of
            cards. Invoked HERE, inside the row's reactive scope — that is the
            whole point of taking a thunk (see types.ts). */}
        <Show when={item().body}>{(body) => <>{body()()}</>}</Show>
        <Show when={!item().transient && actions().length > 0}>
          {/* Wrapping row — Toast's action-row geometry. Several actions on one
              notification wrap rather than growing an overflow menu; six
              actions on a notification is a design smell, not a case to
              engineer for. Left-packed, so each control sizes to its content
              and the row starts at the text column's edge. */}
          {/* The onClick is a click-isolation BARRIER, not an affordance: it
              only stops propagation, so an action click never also reaches the
              row's onActivateRow (StatusCard takes the same carve-out). It
              wraps the whole action region rather than each control because a
              DISABLED control runs no handler of its own — per-control
              isolation would let a disabled action activate the row. Nothing
              to mirror on the keyboard: the row's key handler already ignores
              events retargeted from a descendant. */}
          <WrapRow onClick={(e) => e.stopPropagation()}>
            <Index each={actions()}>
              {(action) => {
                const a = () => action();
                const isLink = () => !!a().href && !a().disabled;
                return (
                  <Show
                    when={isLink()}
                    fallback={
                      // Tone is a semantic prop on Button's public API, not a
                      // raw style override. Default accent, so a lone CTA reads
                      // the same as the anchor branch.
                      <TextButton
                        tone={a().tone ?? "accent"}
                        disabled={a().disabled}
                        onClick={() => props.onActivateAction(item(), a())}
                      >
                        {/* Decoration — the label carries the accessible
                            name, so the glyph is hidden from AT. */}
                        <Show when={a().icon}>
                          {(name) => (
                            <Icon name={name()} size="sm" aria-hidden="true" />
                          )}
                        </Show>
                        {a().label}
                      </TextButton>
                    }
                  >
                    {/* `Link`, not `NavLink`: NavLink is a nav-RAIL item and
                        bakes padding-left:16px, which indented the anchor
                        branch ~16px past the button branch. Link is the
                        unpadded accent anchor — the right atom for an inline
                        CTA. The → suffix is the NAVIGATION signal, so it rides
                        only this branch; on every action in a multi-action row
                        it would read as noise. */}
                    <Link
                      href={a().href}
                      onClick={(e) => props.onActivateAction(item(), a(), e)}
                    >
                      <Show when={a().icon}>
                        {(name) => (
                          <Icon name={name()} size="sm" aria-hidden="true" />
                        )}
                      </Show>
                      {`${a().label} →`}
                    </Link>
                  </Show>
                );
              }}
            </Index>
          </WrapRow>
        </Show>
      </GrowTightStack>
    </TopClusterRow>
  );
};
