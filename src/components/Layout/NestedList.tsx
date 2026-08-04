// ============================================
// NestedList / NestedListItem — Layout Primitive (Depth 1)
// Owns CSS (NestedList.css), no component imports.
//
// The library's ONE hierarchical-indent primitive: "this row is one level
// deeper than that row". Depth is derived from a Solid context the item
// provides to its own subtree, so a recursive render function is just the
// component wrapping itself — no `level` integer threaded through call sites.
// An explicit `level` re-seeds that context, which is what a virtualised list
// rendering row 4000 without its ancestors mounted needs.
//
// A11y: role="list" / role="listitem" + aria-level (1-based, exactly the
// attribute value). NOT role="tree" — see NestedList.css and COMPONENTS.md for
// why: a Layout Primitive that indents arbitrary children owns neither focus
// nor selection, so it cannot honour the tree pattern's keyboard contract, and
// claiming the role would promise navigation that does not exist. `listitem`
// supports aria-level/aria-posinset/aria-setsize (WAI-ARIA 1.2 §listitem), so
// assistive tech gets exact depth with no keyboard obligation attached.
//
// Because AT reads depth off aria-level, the pixels only have to disambiguate
// depth for sighted users — hence a 12px step with a 1px guide rail per
// ancestor rather than the 24px of raw whitespace ThreadGroup spends.
//
// No Override Props: every prop is per-instance data (level, set position,
// content), so these ship as no-config shells like AutoStackRow /
// ProportionalStack rather than through a factory.
// ============================================
import {
  type Accessor,
  type Component,
  type JSX,
  Show,
  createContext,
  createMemo,
  splitProps,
  useContext,
} from "solid-js";
import { assertModifierClass } from "../../internal/dom/assertModifierClass";
import "./NestedList.css";

/**
 * How many indent steps are ever drawn. Past this the visual indent stops
 * growing (so content is never squeezed to nothing in a narrow rail) while
 * `aria-level` keeps counting — the depth stays exact for assistive tech and
 * the row is marked so the rail can say "there is more depth than is drawn".
 *
 * 8 steps x 12px = 96px, still less than ThreadGroup spends on four levels.
 */
export const NESTED_LIST_MAX_INDENT_STEPS = 8;

/** The `aria-level` items in the current list should carry. Root lists are 1. */
const NestedLevelContext = createContext<Accessor<number>>(() => 1);

export type NestedListProps = JSX.HTMLAttributes<HTMLDivElement>;

/**
 * The `role="list"` container. Use it once at the root of a hierarchy; nested
 * groups are emitted by `NestedListItem` itself from its `subtree` slot.
 */
export const NestedList: Component<NestedListProps> = (props) => {
  const [local, others] = splitProps(props, ["class", "children"]);
  const classes = (): string =>
    local.class ? `sui-nested-list ${local.class}` : "sui-nested-list";
  return (
    // biome-ignore lint/a11y/useSemanticElements: intentional ARIA list (same call as Legend) — a native <ul> injects UA margin/padding/markers, and Safari/VoiceOver drops list semantics once the <li> children stop being display:list-item, which these flex columns are not.
    <div role="list" class={classes()} {...others}>
      {local.children}
    </div>
  );
};

export interface NestedListItemProps
  extends JSX.HTMLAttributes<HTMLDivElement> {
  /**
   * 1-based hierarchy level — the literal `aria-level` value, so what you pass
   * is what the DOM carries. Level 1 is the root and renders with ZERO indent.
   * Omit it inside a recursive render (the context supplies it); pass it when
   * a flat/virtualised list knows its own depth without its ancestors mounted.
   * An explicit value re-seeds the context, so descendants continue from it.
   */
  level?: number;
  /**
   * Descendant `NestedListItem`s. The item wraps them in its own nested
   * `role="list"` and bumps the level for them, so a recursive component only
   * has to hand back more of itself. Pass `undefined` for a leaf — an empty
   * `subtree` would emit a list with no items.
   */
  subtree?: JSX.Element;
  /** `aria-setsize`. Only for partially-rendered lists; omit when the DOM is complete. */
  setSize?: number;
  /** `aria-posinset`. Only for partially-rendered lists; omit when the DOM is complete. */
  posInSet?: number;
}

/**
 * One row of a hierarchy: `role="listitem"` + `aria-level`, indented one
 * 12px step per ancestor with a 1px guide rail at each ancestor's position.
 */
export const NestedListItem: Component<NestedListItemProps> = (props) => {
  const [local, others] = splitProps(props, [
    "level",
    "subtree",
    "setSize",
    "posInSet",
    "class",
    "children",
  ]);
  const inherited = useContext(NestedLevelContext);

  const level = createMemo((): number => {
    const explicit = local.level;
    return explicit === undefined
      ? inherited()
      : Math.max(1, Math.floor(explicit));
  });

  const steps = createMemo((): number =>
    Math.min(level() - 1, NESTED_LIST_MAX_INDENT_STEPS),
  );
  const capped = createMemo(
    (): boolean => level() - 1 > NESTED_LIST_MAX_INDENT_STEPS,
  );

  const rowClass = createMemo((): string => {
    const indentClass = `sui-nested-list__row--indent-${steps()}`;
    assertModifierClass(
      "NestedListItem",
      "level",
      String(level()),
      indentClass,
    );
    const cls = ["sui-nested-list__row", indentClass];
    if (capped()) cls.push("sui-nested-list__row--capped");
    return cls.join(" ");
  });

  const itemClass = (): string =>
    local.class
      ? `sui-nested-list__item ${local.class}`
      : "sui-nested-list__item";

  const childLevel: Accessor<number> = () => level() + 1;

  return (
    // biome-ignore lint/a11y/useAriaPropsSupportedByRole: the rule resolves the <div>'s implicit generic role, not the explicit role="listitem" below; WAI-ARIA 1.2 lists aria-level/aria-posinset/aria-setsize as listitem's supported properties, with nested lists as their canonical use.
    // biome-ignore lint/a11y/useSemanticElements: intentional ARIA listitem matching the ARIA list above; a native <li> re-introduces the marker/spacing and the Safari display:list-item coupling.
    <div
      class={itemClass()}
      {...others}
      role="listitem"
      aria-level={level()}
      aria-setsize={local.setSize}
      aria-posinset={local.posInSet}
      data-capped={capped() ? "true" : undefined}
    >
      <div class={rowClass()}>{local.children}</div>
      {/* Provider OUTSIDE the Show, and the Show's callback form, so
          `local.subtree` is read exactly ONCE. Solid compiles a JSX-valued
          prop into a getter, so reading it for the truthiness check and again
          to render it constructs the whole subtree twice — which, being
          recursive, is 2^depth constructions. A Provider wrapping a falsy
          Show renders nothing, so leaves are unaffected. */}
      <NestedLevelContext.Provider value={childLevel}>
        <Show when={local.subtree}>
          {(subtree) => (
            // A collapse toggle needs something to point aria-controls at, and
            // the consumer never sees this element. Give the item an `id` and
            // the group derives `<id>-group` — deterministic, no extra prop.
            <NestedList id={props.id ? `${props.id}-group` : undefined}>
              {subtree()}
            </NestedList>
          )}
        </Show>
      </NestedLevelContext.Provider>
    </div>
  );
};
