// ============================================
// Section — Atomic (Depth 1)
// Owns CSS (Section.css), no component imports.
// Merged HUDSection + generic Section.
// Collapsible section with title, subtitle, corner decorations.
// Panel and Divider have been moved to their own directories.
// ============================================
import { Component, JSX, splitProps, Show, mergeProps } from "solid-js";
import type { ColorVariant, CornerStyle } from "../../types";
import "./Section.css";

export interface SectionProps extends JSX.HTMLAttributes<HTMLElement> {
  title?: string;
  subtitle?: string;
  /** Color variant (replaces old HUDVariant) */
  variant?: ColorVariant;
  /** Corner decoration style (replaces old "bordered"/"decorated" variant) */
  corners?: CornerStyle;
  fill?: boolean;
  /** Show header bar (default: true when title or headerAction present) */
  showHeader?: boolean;
  headerAction?: JSX.Element;
  collapsible?: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  defaultExpanded?: boolean;
}

export const Section: Component<SectionProps> = (props) => {
  const [local, others] = splitProps(props, [
    "title",
    "subtitle",
    "variant",
    "corners",
    "fill",
    "showHeader",
    "headerAction",
    "collapsible",
    "collapsed",
    "onToggleCollapse",
    "defaultExpanded",
    "class",
    "children",
  ]);

  const classes = () => {
    const classList = ["sui-section"];
    if (local.corners) classList.push(`sui-section--corners-${local.corners}`);
    if (local.fill) classList.push("sui-section--fill");
    if (local.collapsed) classList.push("sui-section--collapsed");
    if (local.class) classList.push(local.class);
    return classList.join(" ");
  };

  const headerClasses = () => {
    const classList = ["sui-section__header"];
    if (local.variant) classList.push(`sui-section__header--${local.variant}`);
    return classList.join(" ");
  };

  const showHeader = () => local.showHeader !== false && (local.title || local.headerAction);

  return (
    <section class={classes()} {...others}>
      <Show when={showHeader()}>
        <div class={headerClasses()}>
          <div class="sui-section__title-group">
            <Show when={local.title}>
              <h2 class="sui-section__title">{local.title}</h2>
            </Show>
            <Show when={local.subtitle}>
              <p class="sui-section__subtitle">{local.subtitle}</p>
            </Show>
          </div>
          <div style={{ display: "flex", "align-items": "center", gap: "8px" }}>
            {local.headerAction}
            <Show when={local.collapsible}>
              <button
                class="sui-section__collapse-btn"
                onClick={local.onToggleCollapse}
              >
                {local.collapsed ? "+" : "\u2212"}
              </button>
            </Show>
          </div>
        </div>
      </Show>
      <div class="sui-section__content">
        {local.children}
      </div>
    </section>
  );
};

export function createSection(defaults: Partial<Omit<SectionProps, "children">>): Component<SectionProps> {
  return (props) => <Section {...mergeProps(defaults, props)} />;
}
