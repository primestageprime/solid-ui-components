// ============================================
// SectionedList — Atomic (Depth 1)
// Owns SectionedList.css; no component imports.
//
// A dense list in sections for a narrow side pane. Each section has a
// full-width title bar (an uppercase caption with its count at the right
// end) and one-line rows. A section may collapse; its chevron sits at the
// right end of the bar, so titles and names share one left edge. A row is a
// name, clipped with an ellipsis, and an optional status: a shape plus its
// word. The shape differs per tone (circle, diamond, dash), so colour is
// never the only cue.
//
// A11y: each title is a heading. Only a collapsible section puts a button in
// it, with aria-expanded and aria-controls (the accordion pattern). The rows
// are buttons with aria-current on the selected one. The list is ONE tab
// stop: arrow keys, Home and End move between the rows that show.
//
// Settled on a design canvas with the owner, 2026-10-14 (variant "E").
// ============================================
import {
  type Component,
  For,
  type JSX,
  Show,
  createMemo,
  createSignal,
  createUniqueId,
  mergeProps,
  splitProps,
} from "solid-js";
import { findIndex, flatMap, map } from "../../fn";
import "./SectionedList.css";

/** The status tones. Each has its own shape: success ●, warning ◆, neutral ▬. */
export type SectionedListStatusTone = "success" | "warning" | "neutral";

export interface SectionedListStatus {
  readonly tone: SectionedListStatusTone;
  /** The word: shown after the shape, and read by screen readers. */
  readonly label: string;
}

export interface SectionedListItem {
  readonly id: string;
  readonly label: string;
  /** "Nothing to do here": the name reads muted and the status is hidden. */
  readonly muted?: boolean;
  readonly status?: SectionedListStatus;
}

export interface SectionedListSection {
  readonly id: string;
  readonly label: string;
  readonly items: readonly SectionedListItem[];
  /** A section that can collapse. Without it the section is always open. */
  readonly collapsible?: boolean;
  /** The start state of a collapsible section. Default: collapsed. */
  readonly defaultOpen?: boolean;
  /** Controlled open state. When set, the list follows it and only reports toggles. */
  readonly open?: boolean;
}

export interface SectionedListProps
  extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "onSelect" | "children"> {
  readonly sections: readonly SectionedListSection[];
  readonly selectedId?: string | null;
  readonly onSelect?: (id: string) => void;
  /** Called with the section id and its next open state. */
  readonly onSectionToggle?: (id: string, open: boolean) => void;
  /** Show the status word after its shape. Default true. */
  readonly statusLabels?: boolean;
  /** Shown when there are no sections. */
  readonly emptyMessage?: string;
}

const STEP: Readonly<Record<string, 1 | -1 | "first" | "last">> = {
  ArrowDown: 1,
  ArrowUp: -1,
  Home: "first",
  End: "last",
};

const Chevron = (): JSX.Element => (
  <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
    <path
      d="M3.5 2 L7 5 L3.5 8"
      fill="none"
      stroke="currentColor"
      stroke-width="1.4"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
);

export const SectionedList: Component<SectionedListProps> = (props) => {
  const merged = mergeProps(
    { statusLabels: true, emptyMessage: "Nothing here" },
    props,
  );
  const [local, others] = splitProps(merged, [
    "sections",
    "selectedId",
    "onSelect",
    "onSectionToggle",
    "statusLabels",
    "emptyMessage",
    "class",
  ]);
  const uid = createUniqueId();
  let root: HTMLDivElement | undefined;

  // Uncontrolled sections: the ids the user flipped away from defaultOpen.
  const [flipped, setFlipped] = createSignal<ReadonlySet<string>>(new Set());
  const isOpen = (s: SectionedListSection): boolean => {
    if (!s.collapsible) return true;
    if (s.open !== undefined) return s.open;
    const start = s.defaultOpen === true;
    return flipped().has(s.id) ? !start : start;
  };
  const toggle = (s: SectionedListSection): void => {
    const next = !isOpen(s);
    if (s.open === undefined) {
      setFlipped((prev) => {
        const out = new Set(prev);
        if (out.has(s.id)) out.delete(s.id);
        else out.add(s.id);
        return out;
      });
    }
    local.onSectionToggle?.(s.id, next);
  };

  // The roving tab stop: the selected row when it shows, else the first row that shows.
  const visibleIds = createMemo((): readonly string[] =>
    flatMap(
      (s: SectionedListSection) =>
        isOpen(s) ? map((i: SectionedListItem) => i.id, s.items) : [],
      local.sections,
    ),
  );
  const tabStop = createMemo((): string | undefined => {
    const ids = visibleIds();
    const sel = local.selectedId;
    return sel != null && ids.includes(sel) ? sel : ids[0];
  });

  const onRowKey = (e: KeyboardEvent): void => {
    const step = STEP[e.key];
    if (step === undefined || root === undefined) return;
    e.preventDefault();
    const rows = Array.from(
      root.querySelectorAll<HTMLButtonElement>(".sui-sectioned-list__row"),
    );
    const at = findIndex((r: HTMLButtonElement) => r === e.currentTarget, rows);
    const to =
      step === "first"
        ? 0
        : step === "last"
          ? rows.length - 1
          : Math.max(0, Math.min(rows.length - 1, at + step));
    rows[to]?.focus();
  };

  // The full name shows as a tooltip only when the row clips it.
  const onRowEnter = (e: MouseEvent, label: string): void => {
    const row = e.currentTarget as HTMLElement;
    const name = row.querySelector<HTMLElement>(".sui-sectioned-list__name");
    row.title = name && name.scrollWidth > name.clientWidth ? label : "";
  };

  const classes = (): string =>
    local.class ? `sui-sectioned-list ${local.class}` : "sui-sectioned-list";

  const title = (s: SectionedListSection): JSX.Element => (
    <>
      <span class="sui-sectioned-list__label">{s.label}</span>
      <span class="sui-sectioned-list__count">{s.items.length}</span>
    </>
  );

  return (
    <div
      ref={root}
      class={classes()}
      data-status-labels={local.statusLabels ? "true" : "false"}
      {...others}
    >
      <Show
        when={local.sections.length > 0}
        fallback={<p class="sui-sectioned-list__empty">{local.emptyMessage}</p>}
      >
        <For each={local.sections}>
          {(s) => {
            const rowsId = `${uid}-${s.id}`;
            return (
              <section class="sui-sectioned-list__section" aria-label={s.label}>
                <h3 class="sui-sectioned-list__heading">
                  <Show
                    when={s.collapsible}
                    fallback={
                      <span class="sui-sectioned-list__title">{title(s)}</span>
                    }
                  >
                    <button
                      type="button"
                      class="sui-sectioned-list__title sui-sectioned-list__title--toggle"
                      aria-expanded={isOpen(s)}
                      aria-controls={rowsId}
                      onClick={() => toggle(s)}
                    >
                      {title(s)}
                      <span
                        class="sui-sectioned-list__chevron"
                        classList={{
                          "sui-sectioned-list__chevron--open": isOpen(s),
                        }}
                      >
                        <Chevron />
                      </span>
                    </button>
                  </Show>
                </h3>
                <Show when={isOpen(s)}>
                  <div class="sui-sectioned-list__rows" id={rowsId}>
                    <For each={s.items}>
                      {(item) => {
                        const selected = (): boolean =>
                          local.selectedId === item.id;
                        const status = (): SectionedListStatus | undefined =>
                          item.muted ? undefined : item.status;
                        return (
                          <button
                            type="button"
                            class="sui-sectioned-list__row"
                            classList={{
                              "sui-sectioned-list__row--selected": selected(),
                              "sui-sectioned-list__row--muted":
                                item.muted === true,
                            }}
                            data-item-id={item.id}
                            tabindex={tabStop() === item.id ? 0 : -1}
                            aria-current={selected() ? "true" : undefined}
                            onClick={() => local.onSelect?.(item.id)}
                            onKeyDown={onRowKey}
                            onMouseEnter={(e) => onRowEnter(e, item.label)}
                          >
                            <span class="sui-sectioned-list__name">
                              {item.label}
                            </span>
                            <Show when={status()}>
                              {(st) => (
                                <>
                                  <span
                                    class="sui-sectioned-list__status"
                                    data-tone={st().tone}
                                    aria-hidden="true"
                                  >
                                    <span class="sui-sectioned-list__status-word">
                                      {st().label}
                                    </span>
                                  </span>
                                  <span class="sui-sectioned-list__sr">
                                    , {st().label}
                                  </span>
                                </>
                              )}
                            </Show>
                          </button>
                        );
                      }}
                    </For>
                  </div>
                </Show>
              </section>
            );
          }}
        </For>
      </Show>
    </div>
  );
};

/** Props that are visual/static overrides — locked at variant-definition time. */
export type SectionedListOverrides = Pick<SectionedListProps, "statusLabels">;

/** Props that remain available to consumers of a curried SectionedList variant. */
export type SectionedListDataProps = Omit<
  SectionedListProps,
  keyof SectionedListOverrides
>;

export function createSectionedList(
  defaults: Partial<SectionedListOverrides>,
): Component<SectionedListDataProps> {
  return (props) => <SectionedList {...mergeProps(defaults, props)} />;
}
