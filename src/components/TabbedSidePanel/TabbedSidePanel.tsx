// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// TabbedSidePanel — Composite (Depth 2)
// Zero CSS. Composes Tabs (vertical) + Row.
// Tab strip is always visible; active tab's
// content renders inboard only when isOpen=true.
// Clicking the active tab toggles isOpen.
// ============================================
import {
  type Component,
  type JSX,
  Show,
  createMemo,
  mergeProps,
} from "solid-js";
import { Tabs, type Tab } from "../Tabs/Tabs";
import { Row } from "../Layout/Row";
import type { ColorVariant } from "../../types";

export type TabbedPanelTab = Tab & {
  /** Body rendered when this tab is active AND the panel is open. */
  content: () => JSX.Element;
};

export type ContentPaddingValue = "none" | "sm" | "md";

export interface TabbedSidePanelProps {
  // Override Props (curried at variant-definition time)
  side?: "left" | "right";
  tabsVariant?: "default" | "underline" | "boxed" | "pill";
  color?: ColorVariant;
  /**
   * Inboard padding on the body container. Always padded on the edge that
   * faces the tab strip ("padding-left" when side="right", "padding-right"
   * when side="left"), so the body never visually collides with the strip.
   * Default `"sm"` (~8px). Pass `"none"` for flush content (e.g. an embedded
   * chart that should go edge-to-edge).
   */
  contentPadding?: ContentPaddingValue;
  // Data Props
  tabs: TabbedPanelTab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  class?: string;
  style?: JSX.CSSProperties | string;
}

export type TabbedSidePanelOverrides = Pick<
  TabbedSidePanelProps,
  "side" | "tabsVariant" | "color" | "contentPadding"
>;
export type TabbedSidePanelDataProps = Omit<
  TabbedSidePanelProps,
  keyof TabbedSidePanelOverrides
>;

const PADDING_TOKEN: Record<ContentPaddingValue, string> = {
  none: "0",
  sm: "var(--sui-space-2)",
  md: "var(--sui-space-3)",
};

const PaddedBody: Component<{
  padding: ContentPaddingValue;
  side: "left" | "right";
  children: JSX.Element;
}> = (props) => {
  const style = (): JSX.CSSProperties => {
    const value = PADDING_TOKEN[props.padding];
    // min-width/min-height: 0 lets PaddedBody shrink to its flex-allocated
    // size regardless of intrinsic content width (DAG SVG, wide tables, long
    // words). Without this, the CSS default `min-width: auto` propagates the
    // largest descendant's natural width up through the panel, blowing it
    // past its container.
    const base: JSX.CSSProperties = { "min-width": "0", "min-height": "0" };
    return props.side === "right"
      ? { ...base, "padding-left": value }
      : { ...base, "padding-right": value };
  };
  return (
    <div
      data-sui-content-padding={props.padding}
      data-sui-content-side={props.side}
      style={style()}
    >
      {props.children}
    </div>
  );
};

export const TabbedSidePanel: Component<TabbedSidePanelProps> = (rawProps) => {
  const props = mergeProps(
    {
      side: "right" as const,
      tabsVariant: "default" as const,
      contentPadding: "sm" as ContentPaddingValue,
    },
    rawProps,
  );

  const activeContent = createMemo(() => {
    const t = props.tabs.find((x) => x.id === props.activeTab);
    return t ? t.content : null;
  });

  const handleStripClick = (id: string) => {
    if (id === props.activeTab) {
      props.onOpenChange(!props.isOpen);
    } else {
      props.onTabChange(id);
      if (!props.isOpen) props.onOpenChange(true);
    }
  };

  const classes = () => {
    const cs = [
      "sui-tabbed-side-panel",
      `sui-tabbed-side-panel--${props.side}`,
    ];
    if (props.class) cs.push(props.class);
    return cs.join(" ");
  };

  return (
    <Row class={classes()} style={props.style}>
      <Show when={props.side === "left" && props.isOpen}>
        {(() => {
          const c = activeContent();
          return c ? (
            <PaddedBody padding={props.contentPadding} side={props.side}>
              {c()}
            </PaddedBody>
          ) : null;
        })()}
      </Show>
      <Tabs
        orientation="vertical"
        variant={props.tabsVariant}
        color={props.color}
        tabs={props.tabs}
        activeTab={props.activeTab}
        onTabChange={handleStripClick}
      />
      <Show when={props.side === "right" && props.isOpen}>
        {(() => {
          const c = activeContent();
          return c ? (
            <PaddedBody padding={props.contentPadding} side={props.side}>
              {c()}
            </PaddedBody>
          ) : null;
        })()}
      </Show>
    </Row>
  );
};

export function createTabbedSidePanel(
  defaults: Partial<TabbedSidePanelOverrides>,
): Component<TabbedSidePanelDataProps> {
  return (props) => <TabbedSidePanel {...mergeProps(defaults, props)} />;
}
