// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// ActionRow — Composed (Depth 2)
// Owns CSS (ActionRow.css), no component imports.
// A row with optional leading/trailing slots and a hover-revealed action
// bar. Actions stay layout-stable via `visibility` toggling.
// Extracted from dside-ui DesignView (CarryoverRow + focus-mode rows).
// ============================================
import { type Component, For, type JSX, Show, mergeProps } from "solid-js";
import {
  NarrowStack,
  ClusterRow,
  NoShrinkClusterRow,
  GrowBox,
  EndWrapRow,
} from "../Layout/variants";
import "./ActionRow.css";

export type ActionRowTone = "default" | "danger" | "accent";
export type ActionRowActionTone = "accent" | "muted" | "outline";

export interface ActionRowAction {
  label: JSX.Element;
  tone?: ActionRowActionTone;
  onClick: () => void;
  title?: string;
  disabled?: boolean;
}

export interface ActionRowProps {
  tone?: ActionRowTone;
  leading?: JSX.Element;
  trailing?: JSX.Element;
  actions?: ActionRowAction[];
  class?: string;
  children?: JSX.Element;
}

export const ActionRow: Component<ActionRowProps> = (rawProps) => {
  const props = mergeProps({ tone: "default" as ActionRowTone }, rawProps);

  const rowClass = () => {
    const c = ["sui-action-row"];
    if (props.tone && props.tone !== "default") {
      c.push(`sui-action-row--${props.tone}`);
    }
    if (props.class) c.push(props.class);
    return c.join(" ");
  };

  const btnClass = (tone: ActionRowActionTone | undefined) => {
    const c = ["sui-action-row__btn"];
    if (tone) c.push(`sui-action-row__btn--${tone}`);
    return c.join(" ");
  };

  // Arrangement composed from Layout: outer column (NarrowStack), the main row
  // (ClusterRow) with a growing body (GrowBox) between no-shrink leading/trailing
  // clusters, and the hover-revealed action bar (EndWrapRow). Gaps snapped to the
  // xs/sm scale: root 6px->sm, main 8px=sm, leading/trailing 6px->sm, actions
  // 5px->xs. The BEM hook classes carry the remaining intrinsic styling.
  return (
    <NarrowStack class={rowClass()}>
      <ClusterRow class="sui-action-row__main">
        <Show when={props.leading}>
          <NoShrinkClusterRow class="sui-action-row__leading">
            {props.leading}
          </NoShrinkClusterRow>
        </Show>
        <GrowBox class="sui-action-row__body">{props.children}</GrowBox>
        <Show when={props.trailing}>
          <NoShrinkClusterRow class="sui-action-row__trailing">
            {props.trailing}
          </NoShrinkClusterRow>
        </Show>
      </ClusterRow>
      <Show when={props.actions && props.actions.length > 0}>
        <EndWrapRow class="sui-action-row__actions">
          <For each={props.actions}>
            {(a) => (
              <button
                type="button"
                class={btnClass(a.tone)}
                title={a.title}
                disabled={a.disabled}
                onClick={() => a.onClick()}
              >
                {a.label}
              </button>
            )}
          </For>
        </EndWrapRow>
      </Show>
    </NarrowStack>
  );
};

/** Props that are visual/static overrides — locked at variant-definition time. */
export type ActionRowOverrides = Pick<ActionRowProps, "tone" | "leading">;

/** Props that remain available to consumers of a curried ActionRow variant. */
export type ActionRowDataProps = Omit<ActionRowProps, keyof ActionRowOverrides>;

export function createActionRow(
  defaults: Partial<Omit<ActionRowProps, "children">>,
): Component<ActionRowDataProps> {
  return (props) => <ActionRow {...mergeProps(defaults, props)} />;
}
