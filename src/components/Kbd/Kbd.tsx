// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// Kbd — Atomic (Depth 1)
// Owns CSS (Kbd.css), no component imports.
// Renders a <kbd> keyboard hint. Two usage modes:
//   <Kbd letter="C" rest="onfirm" /> — letter underlined, rest plain.
//   <Kbd>Esc</Kbd> — literal children.
// ============================================
import { type Component, type JSX, mergeProps, Show } from "solid-js";
import "./Kbd.css";

export interface KbdProps {
  letter?: string;
  rest?: string;
  children?: JSX.Element;
  class?: string;
}

export const Kbd: Component<KbdProps> = (props) => {
  const cls = () => {
    const c = ["sui-kbd"];
    if (props.class) c.push(props.class);
    return c.join(" ");
  };
  return (
    <kbd class={cls()}>
      <Show
        when={props.letter !== undefined}
        fallback={props.children}
      >
        <span class="sui-kbd__letter">{props.letter}</span>
        <Show when={props.rest}>
          <span class="sui-kbd__rest">{props.rest}</span>
        </Show>
      </Show>
    </kbd>
  );
};

export function createKbd(defaults: Partial<KbdProps>): Component<KbdProps> {
  return (props) => <Kbd {...mergeProps(defaults, props)} />;
}
