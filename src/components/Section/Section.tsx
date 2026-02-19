// ============================================
// Section + Panel + Divider — Atomic (Depth 1)
// Owns CSS (Section.css), no component imports.
// Section with header/subtitle/action, Panel for simple containers,
// Divider for content separation.
// ============================================
import { Component, JSX, splitProps, Show, mergeProps } from "solid-js";
import "./Section.css";

export interface SectionProps extends JSX.HTMLAttributes<HTMLElement> {
  title?: string;
  subtitle?: string;
  variant?: "default" | "bordered" | "decorated";
  fill?: boolean;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  headerAction?: JSX.Element;
}

export const Section: Component<SectionProps> = (props) => {
  const [local, others] = splitProps(props, [
    "title",
    "subtitle",
    "variant",
    "fill",
    "collapsible",
    "defaultExpanded",
    "headerAction",
    "class",
    "children",
  ]);

  const classes = () => {
    const classList = ["jtf-section"];
    classList.push(`jtf-section--${local.variant || "default"}`);
    if (local.fill) classList.push("jtf-section--fill");
    if (local.class) classList.push(local.class);
    return classList.join(" ");
  };

  return (
    <section class={classes()} {...others}>
      <Show when={local.title || local.headerAction}>
        <div class="jtf-section__header">
          <div class="jtf-section__header-text">
            <Show when={local.title}>
              <h2 class="jtf-section__title">{local.title}</h2>
            </Show>
            <Show when={local.subtitle}>
              <p class="jtf-section__subtitle">{local.subtitle}</p>
            </Show>
          </div>
          <Show when={local.headerAction}>
            <div class="jtf-section__header-action">{local.headerAction}</div>
          </Show>
        </div>
      </Show>
      <div class="jtf-section__content">{local.children}</div>
      <Show when={local.variant === "decorated"}>
        <div class="jtf-section__corner jtf-section__corner--top-left" />
        <div class="jtf-section__corner jtf-section__corner--top-right" />
        <div class="jtf-section__corner jtf-section__corner--bottom-left" />
        <div class="jtf-section__corner jtf-section__corner--bottom-right" />
      </Show>
    </section>
  );
};

// Panel - a simpler section without decoration
export interface PanelProps extends JSX.HTMLAttributes<HTMLDivElement> {
  title?: string;
  padding?: "none" | "sm" | "md" | "lg";
}

export const Panel: Component<PanelProps> = (props) => {
  const [local, others] = splitProps(props, [
    "title",
    "padding",
    "class",
    "children",
  ]);

  const classes = () => {
    const classList = ["jtf-panel"];
    classList.push(`jtf-panel--padding-${local.padding || "md"}`);
    if (local.class) classList.push(local.class);
    return classList.join(" ");
  };

  return (
    <div class={classes()} {...others}>
      <Show when={local.title}>
        <div class="jtf-panel__title">{local.title}</div>
      </Show>
      <div class="jtf-panel__content">{local.children}</div>
    </div>
  );
};

// Divider for separating content
export interface DividerProps extends JSX.HTMLAttributes<HTMLHRElement> {
  orientation?: "horizontal" | "vertical";
  variant?: "solid" | "dashed" | "dotted";
  spacing?: "sm" | "md" | "lg";
}

export const Divider: Component<DividerProps> = (props) => {
  const [local, others] = splitProps(props, [
    "orientation",
    "variant",
    "spacing",
    "class",
  ]);

  const classes = () => {
    const classList = ["jtf-divider"];
    classList.push(`jtf-divider--${local.orientation || "horizontal"}`);
    classList.push(`jtf-divider--${local.variant || "solid"}`);
    classList.push(`jtf-divider--spacing-${local.spacing || "md"}`);
    if (local.class) classList.push(local.class);
    return classList.join(" ");
  };

  return <hr class={classes()} {...others} />;
};

export function createSection(defaults: Partial<Omit<SectionProps, "children">>): Component<SectionProps> {
  return (props) => <Section {...mergeProps(defaults, props)} />;
}

export function createPanel(defaults: Partial<Omit<PanelProps, "children">>): Component<PanelProps> {
  return (props) => <Panel {...mergeProps(defaults, props)} />;
}
