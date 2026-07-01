// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// List + ListItem — Atomic (Depth 1)
// Owns CSS (List.css), no component imports.
// Status/menu list with dividers, icons, status dots.
// ============================================
import { type Component, splitProps, Show, type JSX, mergeProps } from "solid-js";
import "./List.css";

export interface ListProps extends JSX.HTMLAttributes<HTMLUListElement> {
  /** List style — "numbered" variant has been removed */
  variant?: "default" | "status" | "menu";
  /** Show dividers between items */
  dividers?: boolean;
  /** Compact spacing */
  compact?: boolean;
  /**
   * Make the list fill its flex parent and scroll internally on overflow.
   * Sets `flex: 1; min-height: 0; overflow-y: auto;` so the list lives
   * inside a height-constrained column without pushing siblings.
   */
  scroll?: boolean;
}

export interface ListItemProps extends JSX.HTMLAttributes<HTMLLIElement> {
  /** Status indicator */
  status?: "active" | "inactive" | "warning" | "error" | "success";
  /** Icon element */
  icon?: JSX.Element;
  /** Secondary text */
  secondary?: string;
  /** Make item clickable */
  interactive?: boolean;
  /** Selected state */
  selected?: boolean;
}

export const List: Component<ListProps> = (props) => {
  const [local, others] = splitProps(props, [
    "variant",
    "dividers",
    "compact",
    "scroll",
    "class",
    "children",
  ]);

  const classes = () => {
    const classList = ["sui-list"];
    if (local.variant) classList.push(`sui-list--${local.variant}`);
    if (local.dividers) classList.push("sui-list--dividers");
    if (local.compact) classList.push("sui-list--compact");
    if (local.scroll) classList.push("sui-list--scroll");
    if (local.class) classList.push(local.class);
    return classList.join(" ");
  };

  return (
    <ul class={classes()} {...others}>
      {local.children}
    </ul>
  );
};

/** Props that are layout overrides — locked at variant-definition time. */
export type ListOverrides = Pick<ListProps, "variant" | "dividers" | "compact" | "scroll">;

/** Props that remain available to consumers of a curried List variant. */
export type ListDataProps = Omit<ListProps, keyof ListOverrides>;

export function createList(
  defaults: Partial<Omit<ListProps, "children">>,
): Component<ListDataProps> {
  return (props) => <List {...mergeProps(defaults, props)} />;
}

/**
 * ScrollList — curried `List` that fills its flex parent and scrolls
 * internally on overflow. Use inside a height-constrained flex column
 * (e.g. a panel with `display: flex; flex-direction: column`) when the
 * list may grow beyond the available space.
 */
export const ScrollList: Component<ListDataProps> = createList({ scroll: true });

export const ListItem: Component<ListItemProps> = (props) => {
  const [local, others] = splitProps(props, [
    "status",
    "icon",
    "secondary",
    "interactive",
    "selected",
    "class",
    "children",
  ]);

  const classes = () => {
    const classList = ["sui-list-item"];
    if (local.status) classList.push(`sui-list-item--status-${local.status}`);
    if (local.interactive) classList.push("sui-list-item--interactive");
    if (local.selected) classList.push("sui-list-item--selected");
    if (local.class) classList.push(local.class);
    return classList.join(" ");
  };

  return (
    <li class={classes()} {...others}>
      <Show when={local.status}>
        <span class="sui-list-item__status" />
      </Show>
      <Show when={local.icon}>
        <span class="sui-list-item__icon">{local.icon}</span>
      </Show>
      <div class="sui-list-item__content">
        <p class="sui-list-item__text">{local.children}</p>
        <Show when={local.secondary}>
          <p class="sui-list-item__secondary">{local.secondary}</p>
        </Show>
      </div>
    </li>
  );
};
