// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// WeekCalendar — Composed (Depth 2)
// Owns CSS (WeekCalendar.css), no component imports.
// Weekly time-grid: time gutter on the left, day columns with
// absolute-positioned block slots. Pure layout primitive — the consumer
// supplies a renderBlock callback for content.
// Time parsing follows the dside convention: 1..8 are PM hours.
// Extracted from dside-ui DesignView (PerDayGrid + parseTime).
// ============================================
import { Component, For, JSX, mergeProps } from "solid-js";
import "./WeekCalendar.css";

export interface WeekCalendarBlock {
  day: string;
  /** "H" or "H:MM"; 1..8 mean PM by dside convention. */
  startAt: string;
  durationInHrs: number;
  key?: string;
}

export interface WeekCalendarHighlight {
  day: string;
  startAt: string;
}

export interface WeekCalendarProps {
  days: string[];
  startHour: number;
  /** May be fractional, e.g. 16.5 for 4:30 PM. */
  endHour: number;
  /** Pixels per hour. Default 60. */
  pxPerHour?: number;
  blocks: WeekCalendarBlock[];
  renderBlock: (block: WeekCalendarBlock) => JSX.Element;
  highlight?: WeekCalendarHighlight | null;
  /** Time gutter width in px. Default 56. */
  gutterWidth?: number;
  /** Header row height in px. Default 24. */
  headerHeight?: number;
  class?: string;
}

/** dside "1-8 means PM" parser. Returns hour as a float (e.g. 13.5). */
export function parseWeekCalendarTime(s: string): number {
  const [hStr, mStr] = s.split(":");
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr ?? "0", 10);
  if (h >= 1 && h <= 8) h += 12;
  return h + m / 60;
}

function fmtHour(h: number): string {
  const whole = Math.floor(h);
  const min = Math.round((h - whole) * 60);
  const display = whole > 12 ? whole - 12 : whole;
  return min === 0
    ? `${display}:00`
    : `${display}:${min.toString().padStart(2, "0")}`;
}

export const WeekCalendar: Component<WeekCalendarProps> = (rawProps) => {
  const props = mergeProps(
    { pxPerHour: 60, gutterWidth: 56, headerHeight: 24 },
    rawProps,
  );

  const totalHours = () => props.endHour - props.startHour;
  // Top inset (px) reserved inside the gutter/column so the first hour-mark
  // label — which uses translateY(-50%) — doesn't bleed above the column's
  // border-box. Padding-top doesn't help here because absolute children are
  // positioned relative to the padding box, not the content box.
  const TOP_INSET = 8;
  const calHeight = () => totalHours() * props.pxPerHour + TOP_INSET;
  const hourMarks = () => {
    const marks: number[] = [];
    for (let h = props.startHour; h <= props.endHour; h += 1) marks.push(h);
    return marks;
  };

  const wrapperClass = () => {
    const c = ["sui-week-calendar"];
    if (props.class) c.push(props.class);
    return c.join(" ");
  };

  const wrapperStyle = (): JSX.CSSProperties => ({
    "grid-template-columns": `${props.gutterWidth}px repeat(${props.days.length}, 1fr)`,
  });

  return (
    <div class={wrapperClass()} style={wrapperStyle()}>
      <div
        class="sui-week-calendar__corner"
        style={{ height: `${props.headerHeight}px` }}
      />
      <For each={props.days}>
        {(d) => (
          <div
            class="sui-week-calendar__day-header"
            style={{ height: `${props.headerHeight}px` }}
          >
            {d}
          </div>
        )}
      </For>

      <div
        class="sui-week-calendar__gutter"
        style={{ height: `${calHeight()}px` }}
      >
        <For each={hourMarks()}>
          {(h) => (
            <div
              class="sui-week-calendar__gutter-mark"
              style={{
                top: `${(h - props.startHour) * props.pxPerHour + TOP_INSET}px`,
              }}
            >
              {fmtHour(h)}
            </div>
          )}
        </For>
      </div>

      <For each={props.days}>
        {(d) => {
          const dayBlocks = () => props.blocks.filter((b) => b.day === d);
          return (
            <div
              class="sui-week-calendar__column"
              style={{ height: `${calHeight()}px` }}
            >
              <For each={hourMarks().slice(1)}>
                {(h) => (
                  <div
                    class="sui-week-calendar__hour-line"
                    style={{
                      top: `${(h - props.startHour) * props.pxPerHour + TOP_INSET}px`,
                    }}
                  />
                )}
              </For>
              <For each={dayBlocks()}>
                {(b) => {
                  // Reactive: pxPerHour changes when the consumer scales the
                  // calendar (e.g. via a ResizeObserver). Reading props
                  // inside the accessor keeps top/height in sync.
                  const start = parseWeekCalendarTime(b.startAt);
                  const top = () =>
                    (start - props.startHour) * props.pxPerHour + TOP_INSET;
                  const height = () => b.durationInHrs * props.pxPerHour;
                  const isHighlight = () => {
                    const h = props.highlight;
                    return !!h && h.day === b.day && h.startAt === b.startAt;
                  };
                  const cls = () => {
                    const c = ["sui-week-calendar__block"];
                    if (isHighlight()) {
                      c.push("sui-week-calendar__block--highlight");
                    }
                    return c.join(" ");
                  };
                  return (
                    <div
                      class={cls()}
                      style={{
                        top: `${top()}px`,
                        height: `${height()}px`,
                      }}
                    >
                      {props.renderBlock(b)}
                    </div>
                  );
                }}
              </For>
            </div>
          );
        }}
      </For>
    </div>
  );
};

export function createWeekCalendar(
  defaults: Partial<WeekCalendarProps>,
): Component<WeekCalendarProps> {
  return (props) => <WeekCalendar {...mergeProps(defaults, props)} />;
}
