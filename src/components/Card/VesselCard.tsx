// ============================================
// VesselCard — Depth 2 (zero CSS)
// Composes Surface (curried: InteractiveCard) +
// Layout (curried: SpreadRow) + Text (curried:
// FlexLabel) + Button (Atomic/Depth 1).
// ============================================
import { Component, JSX, Show, splitProps } from "solid-js";
import { InteractiveCard } from "../Surface";
import { SpreadRow } from "../Layout/variants";
import { FlexLabel } from "../Text/variants";
import { Button } from "../Button/Button";

export interface VesselCardProps extends JSX.HTMLAttributes<HTMLDivElement> {
  title: string;
  active?: boolean;
  onRemove?: () => void;
  details?: JSX.Element;
}

export const VesselCard: Component<VesselCardProps> = (props) => {
  const [local, others] = splitProps(props, [
    "title",
    "active",
    "onRemove",
    "details",
    "class",
    "children",
  ]);

  return (
    <InteractiveCard active={local.active} class={local.class} {...others}>
      <SpreadRow>
        <FlexLabel>{local.title}</FlexLabel>
        <Show when={local.onRemove}>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              local.onRemove!();
            }}
            title="Remove"
          >
            &times;
          </Button>
        </Show>
      </SpreadRow>
      <Show when={local.details}>
        <SpreadRow>{local.details}</SpreadRow>
      </Show>
      <Show when={local.children}>
        {local.children}
      </Show>
    </InteractiveCard>
  );
};
