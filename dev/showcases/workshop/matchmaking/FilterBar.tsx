// ============================================
// FilterBar — presentational. Knows NOTHING about the filter engine.
//
// The whole contract is: here are the filters, here are the members you may
// add, call me back when the user does something. It never sees an Outing.
//
// The one hard rule it enforces itself: the bar is exactly one row tall, and
// every expansion is an overlay. Content below it must never move.
//
// Structure note — the row is `overflow: hidden`, which is what height-locks
// it. That clip would also swallow any popover anchored INSIDE the row, so
// the overlay is a sibling of the row, anchored by a measured x offset. One
// menu is open at a time, so a single overlay node is enough.
// ============================================
import {
  type Component,
  For,
  Show,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
} from "solid-js";
import "./FilterBar.css";

export interface FilterMember {
  value: string;
  label: string;
  count: number;
}

export interface FilterGroup {
  id: string;
  label: string;
  terms: { value: string; label: string }[];
  /** Everything selectable for this dimension, for the combobox. */
  members: FilterMember[];
}

export interface FilterBarProps {
  filters: FilterGroup[];
  availableDimensions: { id: string; label: string }[];
  scopeLabel: string;
  onAddFilter: (id: string) => void;
  onRemoveFilter: (id: string) => void;
  onAddTerm: (id: string, value: string) => void;
  onRemoveTerm: (id: string, value: string) => void;
  onClearAll: () => void;
}

/**
 * Terms shown inline before a group collapses to a count. Not a prop — how
 * the bar degrades is the bar's own business, and exposing it would invite
 * call sites to disagree about it.
 */
const INLINE_TERM_LIMIT = 2;

/** Longest typeahead list rendered at once. */
const SUGGESTION_LIMIT = 60;

/** Keep in sync with `.mm-bar__popover` max-width, for right-edge clamping. */
const POPOVER_WIDTH = 320;

type OpenMenu = { kind: "dimensions" } | { kind: "group"; id: string } | null;

export const FilterBar: Component<FilterBarProps> = (props) => {
  const [openMenu, setOpenMenu] = createSignal<OpenMenu>(null);
  const [query, setQuery] = createSignal("");
  let barRef: HTMLDivElement | undefined;

  const closeMenu = () => {
    setOpenMenu(null);
    setQuery("");
  };

  /**
   * Open `menu`, anchored under the element that was clicked.
   *
   * The offset is a runtime MEASUREMENT, not a style decision, so it is fed
   * to CSS as a custom property — `.mm-bar__popover` still owns `left`.
   */
  const openAt = (event: MouseEvent, menu: Exclude<OpenMenu, null>) => {
    const trigger = event.currentTarget as HTMLElement;
    if (barRef) {
      const barRect = barRef.getBoundingClientRect();
      const triggerRect = trigger.getBoundingClientRect();
      const raw = triggerRect.left - barRect.left;
      // Never let the overlay run off the bar's right edge.
      const clamped = Math.max(0, Math.min(raw, barRect.width - POPOVER_WIDTH));
      barRef.style.setProperty("--mm-popover-x", `${clamped}px`);
    }
    setQuery("");
    setOpenMenu(menu);
  };

  const toggleAt = (event: MouseEvent, menu: Exclude<OpenMenu, null>) => {
    const current = openMenu();
    const same =
      current?.kind === menu.kind &&
      (menu.kind !== "group" || (current as { id: string }).id === menu.id);
    if (same) closeMenu();
    else openAt(event, menu);
  };

  onMount(() => {
    const onDocClick = (event: MouseEvent) => {
      if (!openMenu() || !barRef) return;
      if (!barRef.contains(event.target as Node)) closeMenu();
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEscape);
    onCleanup(() => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEscape);
    });
  });

  const isGroupOpen = (id: string) => {
    const menu = openMenu();
    return menu?.kind === "group" && menu.id === id;
  };

  /** The group whose combobox is open, if any. */
  const activeGroup = createMemo(() => {
    const menu = openMenu();
    if (menu?.kind !== "group") return undefined;
    return props.filters.find((group) => group.id === menu.id);
  });

  const suggestions = createMemo<FilterMember[]>(() => {
    const group = activeGroup();
    if (!group) return [];
    const needle = query().trim().toLowerCase();
    const chosen = new Set(group.terms.map((term) => term.value));
    const out: FilterMember[] = [];
    for (const member of group.members) {
      if (chosen.has(member.value)) continue;
      if (needle && !member.label.toLowerCase().includes(needle)) continue;
      out.push(member);
      if (out.length >= SUGGESTION_LIMIT) break;
    }
    return out;
  });

  const commitFirstSuggestion = () => {
    const group = activeGroup();
    const first = suggestions()[0];
    if (!group || !first) return;
    props.onAddTerm(group.id, first.value);
    setQuery("");
  };

  const lozenge = (group: FilterGroup, term: { value: string; label: string }) => (
    <span class="mm-bar__lozenge">
      {term.label}
      <button
        type="button"
        class="mm-bar__lozenge-x"
        onClick={() => props.onRemoveTerm(group.id, term.value)}
        aria-label={`Remove ${term.label}`}
      >
        ✕
      </button>
    </span>
  );

  return (
    <div class="mm-bar" ref={barRef}>
      <div class="mm-bar__row">
        <span class="mm-bar__scope">{props.scopeLabel}</span>

        <div class="mm-bar__groups">
          <For each={props.filters}>
            {(group) => (
              <div class="mm-bar__group">
                <button
                  type="button"
                  class="mm-bar__group-label"
                  onClick={() => props.onRemoveFilter(group.id)}
                  title={`Remove the ${group.label} filter`}
                >
                  {group.label}
                </button>

                {/* Few terms: inline lozenges. Many: a count that opens the
                    overlay. Same height either way. */}
                <Show
                  when={group.terms.length <= INLINE_TERM_LIMIT}
                  fallback={
                    <button
                      type="button"
                      class="mm-bar__count"
                      classList={{ "is-open": isGroupOpen(group.id) }}
                      onClick={(e) => toggleAt(e, { kind: "group", id: group.id })}
                    >
                      {group.terms.length} ▾
                    </button>
                  }
                >
                  <For each={group.terms}>{(term) => lozenge(group, term)}</For>
                  <button
                    type="button"
                    class="mm-bar__add-term"
                    classList={{ "is-open": isGroupOpen(group.id) }}
                    onClick={(e) => toggleAt(e, { kind: "group", id: group.id })}
                    aria-label={`Add a ${group.label} term`}
                  >
                    ▾
                  </button>
                </Show>
              </div>
            )}
          </For>
        </div>

        <div class="mm-bar__actions">
          <Show when={props.filters.length > 0}>
            <button type="button" class="mm-bar__clear" onClick={() => props.onClearAll()}>
              clear
            </button>
          </Show>
          <button
            type="button"
            class="mm-bar__add"
            aria-label="Add a filter"
            onClick={(e) => toggleAt(e, { kind: "dimensions" })}
          >
            +
          </button>
        </div>
      </div>

      {/* ── Overlay layer ──────────────────────────────────────────────
          Sibling of the clipped row, so the height lock cannot swallow it. */}
      <Show when={openMenu()}>
        <div class="mm-bar__popover">
          <Show when={openMenu()?.kind === "dimensions"}>
            <div class="mm-bar__options">
              <For
                each={props.availableDimensions}
                fallback={<div class="mm-bar__empty">every dimension is filtered</div>}
              >
                {(dimension) => (
                  <button
                    type="button"
                    class="mm-bar__option"
                    onClick={(e) => {
                      props.onAddFilter(dimension.id);
                      openAt(e, { kind: "group", id: dimension.id });
                    }}
                  >
                    <span class="mm-bar__option-label">{dimension.label}</span>
                  </button>
                )}
              </For>
            </div>
          </Show>

          <Show when={activeGroup()}>
            {(group) => (
              <>
                <Show when={group().terms.length > INLINE_TERM_LIMIT}>
                  <div class="mm-bar__popover-terms">
                    <For each={group().terms}>{(term) => lozenge(group(), term)}</For>
                  </div>
                </Show>

                <input
                  class="mm-bar__input"
                  placeholder={`Add ${group().label.toLowerCase()}…`}
                  value={query()}
                  ref={(el) => queueMicrotask(() => el.focus())}
                  onInput={(e) => setQuery(e.currentTarget.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitFirstSuggestion();
                  }}
                />

                <div class="mm-bar__options">
                  <For
                    each={suggestions()}
                    fallback={<div class="mm-bar__empty">no matches</div>}
                  >
                    {(member) => (
                      <button
                        type="button"
                        class="mm-bar__option"
                        onClick={() => {
                          props.onAddTerm(group().id, member.value);
                          setQuery("");
                        }}
                      >
                        <span class="mm-bar__option-label">{member.label}</span>
                        <span class="mm-bar__option-count">{member.count}</span>
                      </button>
                    )}
                  </For>
                </div>
              </>
            )}
          </Show>
        </div>
      </Show>
    </div>
  );
};
