// ============================================
// EmptyState — Depth 2 (zero CSS)
// Composes Layout (curried) + Text (curried).
// Centered placeholder with icon, message, size variants.
// ============================================
import { Component, JSX, splitProps } from "solid-js";
import { Dynamic } from "solid-js/web";
import { SmRegion, MdRegion, LgRegion, FadedBox, ConstrainedBox } from "../Layout";
import { TextBody, MutedBody, AccentBody } from "../Text";

export type EmptyStateVariant = "default" | "muted" | "accent";
export type EmptyStateSize = "sm" | "md" | "lg";

export interface EmptyStateProps extends JSX.HTMLAttributes<HTMLDivElement> {
  variant?: EmptyStateVariant;
  size?: EmptyStateSize;
  message?: string;
  icon?: JSX.Element;
}

const regions = { sm: SmRegion, md: MdRegion, lg: LgRegion };
const messages = { default: TextBody, muted: MutedBody, accent: AccentBody };

export const EmptyState: Component<EmptyStateProps> = (props) => {
  const [local, others] = splitProps(props, [
    "variant",
    "size",
    "message",
    "icon",
    "children",
  ]);

  const s = () => local.size || "md";
  const v = () => local.variant || "default";

  return (
    <Dynamic component={regions[s()]} {...others}>
      {local.icon && <FadedBox>{local.icon}</FadedBox>}
      {local.children ?? (
        <ConstrainedBox>
          <Dynamic component={messages[v()]}>{local.message}</Dynamic>
        </ConstrainedBox>
      )}
    </Dynamic>
  );
};
