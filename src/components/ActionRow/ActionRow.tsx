// ============================================
// ActionRow — Composed (Depth 2)
// Owns CSS (ActionRow.css), no component imports.
// A row with optional leading/trailing slots and a hover-revealed action
// bar. Actions stay layout-stable via `visibility` toggling.
// Extracted from dside-ui DesignView (CarryoverRow + focus-mode rows).
// ============================================
import { Component, For, JSX, Show, mergeProps } from "solid-js";
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

  return (
    <div class={rowClass()}>
      <div class="sui-action-row__main">
        <Show when={props.leading}>
          <div class="sui-action-row__leading">{props.leading}</div>
        </Show>
        <div class="sui-action-row__body">{props.children}</div>
        <Show when={props.trailing}>
          <div class="sui-action-row__trailing">{props.trailing}</div>
        </Show>
      </div>
      <Show when={props.actions && props.actions.length > 0}>
        <div class="sui-action-row__actions">
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
        </div>
      </Show>
    </div>
  );
};

export function createActionRow(
  defaults: Partial<ActionRowProps>,
): Component<ActionRowProps> {
  return (props) => <ActionRow {...mergeProps(defaults, props)} />;
}
