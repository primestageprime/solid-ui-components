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
import { type Component, Show } from "solid-js";
import { Icon, type IconName } from "../Icon/Icon";
import {
  ClusterRow,
  GrowTightStack,
  SpreadRow,
  TopClusterRow,
} from "../Layout/variants";
import { TextTitle, TextSublabel } from "../Text/variants";
import { TextButton } from "../Button/variants";
import { Link } from "../Navigation/Link";
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
}

const rowClass = (item: NotificationItem) =>
  [
    "sui-notification-center__row",
    `sui-notification-center__row--${item.tone ?? "info"}`,
  ].join(" ");

export const NotificationRow: Component<NotificationRowProps> = (props) => {
  const item = () => props.item;

  return (
    // Media-object row: unread gutter · tone well · text column. Unboxed until
    // hover — the well is what makes it read as a unit at rest.
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
        <Show when={item().action && !item().transient}>
          {(() => {
            const it = item();
            const a = it.action as NotificationAction;
            return (
              // Left-packed row so the CTA sizes to its content and starts at
              // the text column's edge. Both branches are inline-flex and would
              // otherwise stretch as column children and centre their own
              // labels — which is why the link and button branches used to sit
              // at different indents.
              <ClusterRow>
                <Show
                  when={a.href}
                  fallback={
                    // Peer of the anchor's accent colour — a semantic tone prop
                    // on Button's public API, not a raw style override.
                    <TextButton
                      tone="accent"
                      onClick={() => props.onActivateAction(it, a)}
                    >
                      {`${a.label} →`}
                    </TextButton>
                  }
                >
                  {/* `Link`, not `NavLink`: NavLink is a nav-RAIL item and bakes
                      padding-left:16px, which indented the anchor branch ~16px
                      past the button branch. Link is the unpadded accent anchor
                      — the right atom for an inline CTA. */}
                  <Link
                    href={a.href}
                    onClick={(e) => props.onActivateAction(it, a, e)}
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
  );
};
