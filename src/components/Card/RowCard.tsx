// ============================================
// RowCard — Composite (Depth 2)
// Owns CSS (RowCard.css) for its dividers and text sizes only. Composes
// BaselineSpreadRow and TightStack (Layout variants) and Text.
// A full-width LIST ROW, the dense sibling of StatusCard: line 1 is the name
// (ellipsised) with a short `aside` on the right (who, a count, a time); line
// 2 is an optional `bar` slot (a progress bar). No border or background of
// its own, so a selector's accent bar and dividers draw the selection.
//   <RowCard name="Load test" aside="Ana" bar={<HatchedProgressBar … />} />
// ============================================
import { type Component, type JSX, Show, splitProps } from "solid-js";
import { BaselineSpreadRow, TightStack } from "../Layout/variants";
import { Text } from "../Text/Text";
import "./RowCard.css";

export interface RowCardProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /** Line 1, left — ellipsised; the full text is the title attribute. */
  name: string;
  /** Line 1, right — short text or a chip. */
  aside?: JSX.Element;
  /** Line 2 — a bar or any one-line drawing; omitted when absent. */
  bar?: JSX.Element;
}

export const RowCard: Component<RowCardProps> = (props) => {
  const [local, others] = splitProps(props, ["name", "aside", "bar", "class"]);
  return (
    <TightStack class={local.class ? `sui-row-card ${local.class}` : "sui-row-card"} {...others}>
      <BaselineSpreadRow>
        <Text as="span" class="sui-row-card__name" title={local.name}>
          {local.name}
        </Text>
        <Show when={local.aside != null}>
          <span class="sui-row-card__aside">{local.aside}</span>
        </Show>
      </BaselineSpreadRow>
      <Show when={local.bar != null}>{local.bar}</Show>
    </TightStack>
  );
};
