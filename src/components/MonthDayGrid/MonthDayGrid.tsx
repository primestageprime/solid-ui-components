// ============================================
// MonthDayGrid — Primitive (Depth 1)
// Tags: shows:calendar, shows:grid, shows:count, does:multi-select, does:toggle, does:hotkey, data:schedule, role:control
// Owns MonthDayGrid.css; no component imports.
//
// ONE CALENDAR MONTH, WEEKDAY-ALIGNED, WITH ANY NUMBER OF DAYS PICKED. Seven
// columns under single-letter weekday heads; each day is a 44px button. The
// caller owns the selection: `days[iso]` says per day whether it is enabled,
// selected, how many have picked it (`count`, a corner badge) and an optional
// `tone` wash (accent = "available", muted = "quiet"). A click or Enter/Space
// on an enabled day calls `onDayClick(iso)`; the caller toggles.
//
// Disabled days — `enabled: false`, or before `minDate` — render dimmed, are
// aria-disabled and ignore clicks, but stay focusable so a keyboard can read
// across the month.
//
// Not `DayOfMonthPicker`: that is a single pick of a day NUMBER (1–31) with no
// weekday layout. Not `DatePicker` / `DateRangePicker`: one date or one range.
// This is a multi-select over real dates — a host opening the days a meeting
// could happen, members ticking the ones they can make. Stack several for a
// season.
//
// KEYBOARD: one tab stop per month (roving tabindex); arrows move a day / a
// week, Home/End the ends of the week row, Enter/Space toggle.
// ============================================
import { type Component, For, Show, createSignal, mergeProps } from "solid-js";
import {
  type MonthWeek,
  dayMove,
  monthLayout,
  weekdayLabels,
} from "./monthLayout";
import "./MonthDayGrid.css";

export interface MonthDayState {
  /** Default true. False: dimmed, not clickable. */
  readonly enabled?: boolean;
  readonly selected?: boolean;
  /** A small corner badge (e.g. how many members picked it); 0 or absent shows none. */
  readonly count?: number;
  /** Background wash: accent marks an available day, muted a quiet one. */
  readonly tone?: "accent" | "muted";
}

export interface MonthDayGridProps {
  /** "YYYY-MM". */
  readonly month: string;
  /** Per-day state keyed by ISO day ("2026-11-04"). */
  readonly days?: Readonly<Record<string, MonthDayState>>;
  /** Days before this ISO day are disabled (e.g. today). */
  readonly minDate?: string;
  readonly onDayClick?: (iso: string) => void;
  /** Accessible name; defaults to the month's name, e.g. "November 2026". */
  readonly label?: string;
}

/** Visual override: the first column. 0 = Sunday (default, as DayOfWeekPicker), 1 = Monday. */
export interface MonthDayGridOverrides {
  readonly weekStart?: 0 | 1;
}

const longDate = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});
const monthName = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const asDate = (iso: string) => new Date(`${iso}T00:00:00Z`);

export const MonthDayGrid: Component<
  MonthDayGridProps & MonthDayGridOverrides
> = (props) => {
  const ws = () => props.weekStart ?? 0;
  const weeks = (): MonthWeek[] => monthLayout(props.month, ws());
  const state = (iso: string): MonthDayState => props.days?.[iso] ?? {};
  const enabled = (iso: string) =>
    state(iso).enabled !== false && !(props.minDate && iso < props.minDate);
  const [focused, setFocused] = createSignal<string | null>(null);
  const tabStop = () => {
    const f = focused();
    if (f?.startsWith(props.month)) return f;
    const all: string[] = [];
    for (const w of weeks()) for (const d of w) if (d) all.push(d);
    for (const d of all) if (state(d).selected) return d;
    for (const d of all) if (enabled(d)) return d;
    return all[0];
  };
  let root: HTMLDivElement | undefined;
  const focusDay = (iso: string) => {
    setFocused(iso);
    root?.querySelector<HTMLButtonElement>(`[data-day="${iso}"]`)?.focus();
  };
  const activate = (iso: string) => {
    setFocused(iso);
    if (enabled(iso)) props.onDayClick?.(iso);
  };
  const onKeyDown = (e: KeyboardEvent, iso: string) => {
    const next = dayMove(iso, e.key, props.month, ws());
    if (next === null) return;
    e.preventDefault();
    focusDay(next);
  };
  const describe = (iso: string) => {
    const s = state(iso);
    const bits = [longDate.format(asDate(iso))];
    if (s.count) bits.push(`${s.count} picked`);
    if (!enabled(iso)) bits.push("unavailable");
    return bits.join(", ");
  };
  return (
    // biome-ignore lint/a11y/useSemanticElements: a fieldset would add form semantics and a legend to a calendar of toggles; a labelled group is the WAI-ARIA shape here
    <div
      ref={root}
      class="sui-month-day-grid"
      role="group"
      aria-label={props.label ?? monthName.format(asDate(`${props.month}-01`))}
    >
      <div class="sui-month-day-grid__row">
        <For each={weekdayLabels(ws())}>
          {(d) => (
            <span
              class="sui-month-day-grid__head"
              aria-hidden="true"
              title={d.long}
            >
              {d.short}
            </span>
          )}
        </For>
      </div>
      <For each={weeks()}>
        {(week) => (
          <div class="sui-month-day-grid__row">
            <For each={week}>
              {(iso) => (
                <span class="sui-month-day-grid__slot">
                  <Show when={iso}>
                    {(day) => (
                      <button
                        type="button"
                        data-day={day()}
                        class="sui-month-day-grid__day"
                        classList={{
                          "sui-month-day-grid__day--selected":
                            state(day()).selected === true,
                          "sui-month-day-grid__day--accent":
                            state(day()).tone === "accent",
                          "sui-month-day-grid__day--muted":
                            state(day()).tone === "muted",
                          "sui-month-day-grid__day--disabled": !enabled(day()),
                        }}
                        tabindex={day() === tabStop() ? 0 : -1}
                        aria-pressed={state(day()).selected === true}
                        aria-disabled={enabled(day()) ? undefined : "true"}
                        aria-label={describe(day())}
                        onClick={() => activate(day())}
                        onKeyDown={(e) => onKeyDown(e, day())}
                      >
                        {Number(day().substring(8))}
                        <Show when={(state(day()).count ?? 0) > 0}>
                          <span
                            class="sui-month-day-grid__count"
                            aria-hidden="true"
                          >
                            {state(day()).count}
                          </span>
                        </Show>
                      </button>
                    )}
                  </Show>
                </span>
              )}
            </For>
          </div>
        )}
      </For>
    </div>
  );
};

/** Props that remain available to consumers of a curried MonthDayGrid variant. */
export type MonthDayGridDataProps = MonthDayGridProps;

export function createMonthDayGrid(
  defaults: MonthDayGridOverrides = {},
): Component<MonthDayGridDataProps> {
  return (props) => <MonthDayGrid {...mergeProps(defaults, props)} />;
}
