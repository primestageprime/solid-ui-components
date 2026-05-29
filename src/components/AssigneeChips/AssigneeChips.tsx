// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// AssigneeChips — Atomic (Depth 1)
// Owns CSS (AssigneeChips.css), no component imports.
// Renders a filled cyan pill per id, applying a caller-supplied
// resolveName to display each label. Promoted from dside-ui.
// ============================================
import { Component, For, Show, mergeProps } from "solid-js";
import "./AssigneeChips.css";

export interface AssigneeChipsProps {
  ids: string[];
  resolveName: (id: string) => string;
  size?: "sm" | "md";
  class?: string;
}

export const AssigneeChips: Component<AssigneeChipsProps> = (rawProps) => {
  const props = mergeProps({ size: "sm" as const }, rawProps);
  const wrapperClass = () => {
    const c = ["sui-assignee-chips"];
    if (props.class) c.push(props.class);
    return c.join(" ");
  };
  const chipClass = () => `sui-assignee-chip sui-assignee-chip--${props.size}`;
  return (
    <Show when={props.ids.length > 0}>
      <div class={wrapperClass()}>
        <For each={props.ids}>
          {(id) => <span class={chipClass()}>{props.resolveName(id)}</span>}
        </For>
      </div>
    </Show>
  );
};

/** Props that are visual/static overrides — locked at variant-definition time. */
export type AssigneeChipsOverrides = Pick<AssigneeChipsProps, "size">;

/** Props that remain available to consumers of a curried AssigneeChips variant. */
export type AssigneeChipsDataProps = Omit<AssigneeChipsProps, keyof AssigneeChipsOverrides>;

export function createAssigneeChips(
  defaults: Partial<AssigneeChipsProps>,
): Component<AssigneeChipsDataProps> {
  return (props) => <AssigneeChips {...mergeProps(defaults, props)} />;
}
