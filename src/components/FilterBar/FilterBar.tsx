// ============================================
// FilterBar — Composed (Depth 1). Owns FilterBar.css; composes no library
// components. Promoted from the matchmaking workshop bench (spec:
// docs/superpowers/specs/2026-07-28-progressive-filter-bar-design.md).
//
// Presentational. Knows NOTHING about the filter engine.
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
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
} from "solid-js";
import { observeSize } from "../../internal/dom/observeSize";
import { filter as fnFilter, find as fnFind, map as fnMap } from "../../fn";
import "./FilterBar.css";

export interface FilterMember {
  value: string;
  label: string;
  /**
   * Facet count, rendered beside the label. OPTIONAL, and deliberately so: an
   * honest count for a member of dimension `d` must be computed with `d`'s OWN
   * filter excluded, or every unselected member of an active dimension reads 0
   * and the picker looks broken exactly when someone is trying to switch
   * selections. A required field that invites a wrong answer is worse than an
   * absent one — omit it rather than pass a naive count.
   */
  count?: number;
}

export interface FilterGroup {
  id: string;
  label: string;
  terms: { value: string; label: string }[];
  /** Everything selectable for this dimension, for the combobox. */
  members: FilterMember[];
}

export interface FilterBarProps {
  /**
   * The ACTIVE groups — derive them straight from your selection state. A
   * dimension the user has added but not yet given a term to is NOT here: the
   * bar holds that itself (see `pending` below), so a caller serialising filter
   * state to a URL never has to encode a half-made filter.
   */
  filters: FilterGroup[];
  availableDimensions: { id: string; label: string }[];
  scopeLabel: string;
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

/** Keep in sync with `.sui-filter-bar__popover` max-width, for right-edge clamping. */
const POPOVER_WIDTH = 320;

/** Width held back for the `+N` chip when deciding how many groups fit. */
const OVERFLOW_RESERVE_PX = 52;

type OpenMenu =
  | { kind: "dimensions" }
  | { kind: "group"; id: string }
  | { kind: "overflow" }
  | null;

export const FilterBar: Component<FilterBarProps> = (props) => {
  const [openMenu, setOpenMenu] = createSignal<OpenMenu>(null);
  const [query, setQuery] = createSignal("");
  // Dimensions the user has ADDED but not yet given a term to. This is the
  // bar's own presentational state, not filter state: a half-made filter
  // constrains nothing, and pushing it at the caller would force anyone
  // serialising filters (e.g. to a URL) to encode a state that has no meaning
  // to a reader of that URL. It clears itself the moment a term lands, because
  // the group then arrives through `props.filters` under its own steam.
  const [pending, setPending] = createSignal<readonly string[]>([]);
  let barRef: HTMLDivElement | undefined;
  let groupsRef: HTMLDivElement | undefined;

  /** Active groups, plus a synthetic empty group per pending dimension. */
  const renderGroups = createMemo<FilterGroup[]>(() => {
    const active = props.filters;
    const activeIds = new Set(fnMap((g: FilterGroup) => g.id, active));
    const extra = fnMap((id: string) => {
      const dim = fnFind(
        (d: { id: string; label: string }) => d.id === id,
        props.availableDimensions,
      );
      return {
        id,
        label: dim?.label ?? id,
        terms: [],
        members: [],
      } satisfies FilterGroup;
    }, fnFilter((id: string) => !activeIds.has(id), pending()));
    return [...active, ...extra];
  });

  // A pending dimension that has since gained terms is no longer pending.
  createEffect(() => {
    const activeIds = new Set(fnMap((g: FilterGroup) => g.id, props.filters));
    const stillPending = fnFilter((id: string) => !activeIds.has(id), pending());
    if (stillPending.length !== pending().length) setPending(stillPending);
  });

  const addPending = (id: string) =>
    setPending((prev) => (prev.includes(id) ? prev : [...prev, id]));
  const dropPending = (id: string) =>
    setPending((prev) => fnFilter((p: string) => p !== id, prev));

  const closeMenu = () => {
    setOpenMenu(null);
    setQuery("");
  };

  /**
   * Open `menu`, anchored under the element that was clicked.
   *
   * The offset is a runtime MEASUREMENT, not a style decision, so it is fed
   * to CSS as a custom property — `.sui-filter-bar__popover` still owns `left`.
   */
  const openAt = (event: MouseEvent, menu: Exclude<OpenMenu, null>) => {
    const trigger = event.currentTarget as HTMLElement;
    if (barRef) {
      const barRect = barRef.getBoundingClientRect();
      const triggerRect = trigger.getBoundingClientRect();
      const raw = triggerRect.left - barRect.left;
      // Never let the overlay run off the bar's right edge.
      const clamped = Math.max(0, Math.min(raw, barRect.width - POPOVER_WIDTH));
      barRef.style.setProperty("--sui-filter-bar-popover-x", `${clamped}px`);
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

  // ── Tier three: measured collapse ────────────────────────────────────
  // Tiers one and two (inline lozenges → a count chip) are term-count
  // decisions and need no measurement. Tier three is a WIDTH decision: with
  // enough active dimensions the collapsed chips still overrun the line, and
  // because the row is `overflow: hidden` the surplus would be CLIPPED —
  // invisible, unremovable, and still filtering. That is worse than the reflow
  // this bar exists to prevent, so trailing groups collapse into a `+N` chip
  // that opens them in the overlay. Same measured approach as OverflowNav:
  // cache each group's natural width, recompute against the container.
  const [visibleGroups, setVisibleGroups] = createSignal(Number.POSITIVE_INFINITY);
  const [naturalWidths, setNaturalWidths] = createSignal<number[]>([]);
  let groupEls: (HTMLDivElement | undefined)[] = [];

  const recomputeOverflow = () => {
    const widths = naturalWidths();
    const total = renderGroups().length;
    if (widths.length !== total || !groupsRef) return;
    const available = groupsRef.clientWidth;
    if (available <= 0) return; // not laid out yet — never trust a 0 box
    const gap = 6;
    let running = 0;
    for (let i = 0; i < total; i++) running += widths[i] + (i > 0 ? gap : 0);
    if (running <= available) {
      setVisibleGroups(total);
      return;
    }
    const budget = available - OVERFLOW_RESERVE_PX;
    let count = 0;
    let acc = 0;
    for (let i = 0; i < total; i++) {
      const next = acc + widths[i] + (i > 0 ? gap : 0);
      if (next > budget) break;
      acc = next;
      count = i + 1;
    }
    setVisibleGroups(count);
  };

  const measureGroups = () => {
    const widths: number[] = [];
    for (let i = 0; i < renderGroups().length; i++) {
      const el = groupEls[i];
      widths.push(el ? el.offsetWidth : 0);
    }
    setNaturalWidths(widths);
    recomputeOverflow();
  };

  // Render everything inline for one frame so each group can be measured at its
  // natural width, then trim.
  createEffect(() => {
    const n = renderGroups().length;
    setVisibleGroups(Number.POSITIVE_INFINITY);
    if (typeof requestAnimationFrame !== "function") return;
    void n;
    requestAnimationFrame(measureGroups);
  });

  // Split once, read twice — the shown/hidden pair is one decision, and
  // slicing the memo inline would re-derive it on every read.
  const splitGroups = createMemo<[FilterGroup[], FilterGroup[]]>(() => {
    const all = renderGroups();
    const n = visibleGroups();
    return [all.slice(0, n), all.slice(n)];
  });
  const shownGroups = () => splitGroups()[0];
  const hiddenGroups = () => splitGroups()[1];

  onMount(() => {
    if (groupsRef) onCleanup(observeSize(groupsRef, () => recomputeOverflow()));
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
    return fnFind((group: FilterGroup) => group.id === menu.id, renderGroups());
  });

  const suggestions = createMemo<FilterMember[]>(() => {
    const group = activeGroup();
    if (!group) return [];
    const needle = query().trim().toLowerCase();
    const chosen = new Set(
      fnMap((term: { value: string }) => term.value, group.terms),
    );
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
    <span class="sui-filter-bar__lozenge">
      {term.label}
      <button
        type="button"
        class="sui-filter-bar__lozenge-x"
        onClick={() => props.onRemoveTerm(group.id, term.value)}
        aria-label={`Remove ${term.label}`}
      >
        ✕
      </button>
    </span>
  );

  return (
    <div class="sui-filter-bar" ref={barRef}>
      <div class="sui-filter-bar__row">
        <span class="sui-filter-bar__scope">{props.scopeLabel}</span>

        <div class="sui-filter-bar__groups" ref={groupsRef}>
          <For each={shownGroups()}>
            {(group, i) => (
              <div
                class="sui-filter-bar__group"
                ref={(el) => {
                  groupEls[i()] = el;
                }}
              >
                <button
                  type="button"
                  class="sui-filter-bar__group-label"
                  onClick={() => {
                    dropPending(group.id);
                    props.onRemoveFilter(group.id);
                  }}
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
                      class="sui-filter-bar__count"
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
                    class="sui-filter-bar__add-term"
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
          {/* Tier three — trailing groups that would otherwise be clipped. */}
          <Show when={hiddenGroups().length > 0}>
            <button
              type="button"
              class="sui-filter-bar__overflow"
              classList={{ "is-open": openMenu()?.kind === "overflow" }}
              onClick={(e) => toggleAt(e, { kind: "overflow" })}
              title={`${hiddenGroups().length} more filter${hiddenGroups().length === 1 ? "" : "s"}`}
            >
              +{hiddenGroups().length} ▾
            </button>
          </Show>
        </div>

        <div class="sui-filter-bar__actions">
          <Show when={renderGroups().length > 0}>
            <button type="button" class="sui-filter-bar__clear" onClick={() => props.onClearAll()}>
              clear
            </button>
          </Show>
          <button
            type="button"
            class="sui-filter-bar__add"
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
        <div class="sui-filter-bar__popover">
          <Show when={openMenu()?.kind === "dimensions"}>
            <div class="sui-filter-bar__options">
              <For
                each={props.availableDimensions}
                fallback={<div class="sui-filter-bar__empty">every dimension is filtered</div>}
              >
                {(dimension) => (
                  <button
                    type="button"
                    class="sui-filter-bar__option"
                    onClick={(e) => {
                      addPending(dimension.id);
                      openAt(e, { kind: "group", id: dimension.id });
                    }}
                  >
                    <span class="sui-filter-bar__option-label">{dimension.label}</span>
                  </button>
                )}
              </For>
            </div>
          </Show>

          {/* Tier-three overlay: the collapsed groups, each reachable and
              removable. A filter you cannot see is a filter you cannot
              remove — that is the failure this tier exists to prevent. */}
          <Show when={openMenu()?.kind === "overflow"}>
            <div class="sui-filter-bar__options">
              <For each={hiddenGroups()}>
                {(group) => (
                  <button
                    type="button"
                    class="sui-filter-bar__option"
                    onClick={(e) => openAt(e, { kind: "group", id: group.id })}
                  >
                    <span class="sui-filter-bar__option-label">
                      {group.label}
                    </span>
                    <span class="sui-filter-bar__option-count">
                      {group.terms.length}
                    </span>
                  </button>
                )}
              </For>
            </div>
          </Show>

          <Show when={activeGroup()}>
            {(group) => (
              <>
                <Show when={group().terms.length > INLINE_TERM_LIMIT}>
                  <div class="sui-filter-bar__popover-terms">
                    <For each={group().terms}>{(term) => lozenge(group(), term)}</For>
                  </div>
                </Show>

                <input
                  class="sui-filter-bar__input"
                  placeholder={`Add ${group().label.toLowerCase()}…`}
                  value={query()}
                  ref={(el) => queueMicrotask(() => el.focus())}
                  onInput={(e) => setQuery(e.currentTarget.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitFirstSuggestion();
                  }}
                />

                <div class="sui-filter-bar__options">
                  <For
                    each={suggestions()}
                    fallback={<div class="sui-filter-bar__empty">no matches</div>}
                  >
                    {(member) => (
                      <button
                        type="button"
                        class="sui-filter-bar__option"
                        onClick={() => {
                          props.onAddTerm(group().id, member.value);
                          setQuery("");
                        }}
                      >
                        <span class="sui-filter-bar__option-label">{member.label}</span>
                        <Show when={member.count !== undefined}>
                          <span class="sui-filter-bar__option-count">
                            {member.count}
                          </span>
                        </Show>
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
