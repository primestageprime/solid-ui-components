// ============================================
// TabbedSidePanel — Composite (Depth 2)
// Zero CSS. Composes Tabs (vertical) + Row.
// Tab strip is always visible; active tab's
// content renders inboard only when isOpen=true.
// Clicking the active tab toggles isOpen.
// ============================================
import { Component, JSX, Show, createMemo, mergeProps } from "solid-js";
import { Tabs, type Tab } from "../Tabs/Tabs";
import { Row } from "../Layout/Row";
import type { ColorVariant } from "../../types";

export type TabbedPanelTab = Tab & {
  /** Body rendered when this tab is active AND the panel is open. */
  content: () => JSX.Element;
};

export interface TabbedSidePanelProps {
  // Override Props (curried at variant-definition time)
  side?: "left" | "right";
  tabsVariant?: "default" | "underline" | "boxed" | "pill";
  color?: ColorVariant;
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
  "side" | "tabsVariant" | "color"
>;
export type TabbedSidePanelDataProps = Omit<
  TabbedSidePanelProps,
  keyof TabbedSidePanelOverrides
>;

export const TabbedSidePanel: Component<TabbedSidePanelProps> = (rawProps) => {
  const props = mergeProps({ side: "right" as const, tabsVariant: "default" as const }, rawProps);

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
    const cs = ["sui-tabbed-side-panel", `sui-tabbed-side-panel--${props.side}`];
    if (props.class) cs.push(props.class);
    return cs.join(" ");
  };

  return (
    <Row class={classes()} style={props.style as any}>
      <Show when={props.side === "left" && props.isOpen}>
        {(() => {
          const c = activeContent();
          return c ? c() : null;
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
          return c ? c() : null;
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
