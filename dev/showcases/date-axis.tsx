import { Component, createSignal } from "solid-js";
import { DateAxis } from "../../src/components/DateAxis";

// ── Static dates — anchored to 2026-05-01 so the gallery shows a stable
//    range without clocking. `today` is pinned near the middle of the range.
const RANGE_START = new Date("2026-05-01");
const RANGE_END = new Date("2026-07-14"); // ~75 days — forces horizontal scroll
const PINNED_TODAY = new Date("2026-05-27");

// A narrower range (3 weeks) for a second instance so both ends are visible
// at once and a larger cellWidth is exercised.
const NARROW_START = new Date("2026-05-19");
const NARROW_END = new Date("2026-06-08");

const fmtLong = (d: Date): string =>
  d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

// Deterministic stub net-cashflow ($) per day for the heatmap demo — a wave
// that swings positive/negative so both the green (up) and red (down) bars get
// exercised. `renderDay` turns each day into a calendar-style cashflow cell.
const cashflow = (i: number): number =>
  Math.round(Math.sin(i / 3.5) * 1100 + Math.sin(i / 1.6) * 480 + Math.sin(i / 13) * 260);

const fmtDollars = (v: number): string =>
  `${v >= 0 ? "+" : "−"}$${Math.abs(v).toLocaleString("en-US")}`;

const HEAT_GREEN = "rgba(0, 200, 120, 0.85)";
const HEAT_RED = "rgba(230, 70, 70, 0.85)";

// Shared framed-box chrome for each ribbon (label strip + bordered body).
const demoBox = (label: string, children: () => unknown) => (
  <div
    style={{
      padding: "0 0 4px",
      background: "var(--sui-bg-elevated)",
      border: "1px solid var(--sui-border)",
      "border-radius": "var(--sui-radius-md)",
      "margin-bottom": "16px",
      overflow: "hidden",
    }}
  >
    <div
      style={{
        padding: "8px 16px",
        "font-size": "11px",
        "text-transform": "uppercase",
        "letter-spacing": "0.08em",
        color: "var(--sui-text-muted)",
        "border-bottom": "1px solid var(--sui-border)",
      }}
    >
      {label}
    </div>
    <div style={{ padding: "0" }}>{children() as any}</div>
  </div>
);

export const DateAxisShowcase: Component = () => {
  // The "linked view" position. In a real page this scrolls a graph; here we
  // just render the selected day so the click→navigate loop is visible.
  const [selected, setSelected] = createSignal<Date>(PINNED_TODAY);

  return (
    <div class="component-section">
      <h2>DateAxis — Atomic (Depth 1)</h2>
      <p class="text-meta">
        Owns CSS (DateAxis.css), composes no other components. A freestanding
        horizontal day-cell ribbon — one cell per calendar day across a date
        range, with month labels on month edges, a today marker, horizontal
        scroll for long ranges, and optional clickable days that drive a linked
        view. Not the chart-internal XAxis: no SVG, no scale, no chart context.
        With <code>renderDay</code> the caller owns each cell's content and size.
      </p>

      <div class="example-group">
        <h3>Default ribbon</h3>
        <p class="text-meta">
          The simplest form: <code>{"<DateAxis start={…} end={…} />"}</code>.
          Today (May 27) is marked with an accent highlight and pip; month names
          appear above the day number on the first and last day of each month.
        </p>
        {demoBox("DateAxis · passive · 3-week · cellWidth=56", () => (
          <DateAxis
            start={NARROW_START}
            end={NARROW_END}
            today={PINNED_TODAY}
            cellWidth={56}
          />
        ))}
        <div class="text-meta">
          Without <code>onDayClick</code> the ribbon is a passive header — no
          pointer cursor, not focusable.
        </div>
      </div>

      <div class="example-group">
        <h3>Clickable days drive a linked view</h3>
        <p class="text-meta">
          Click (or focus + Enter/Space on) any day below. The selected day gets
          an accent underline and the stand-in "graph view" updates — the hook a
          real page uses to scrub a chart to a date. Both ribbons share one{" "}
          <code>selected</code> signal, so either drives the view.
        </p>

        {/* Stand-in for the graph a real consumer would scrub. */}
        <div
          style={{
            display: "flex",
            "align-items": "center",
            gap: "12px",
            padding: "16px 20px",
            background: "var(--sui-bg-elevated)",
            border: "1px solid var(--sui-accent)",
            "border-radius": "var(--sui-radius-md)",
            "margin-bottom": "16px",
          }}
        >
          <span style={{ "font-size": "20px" }}>📈</span>
          <div>
            <div
              style={{
                "font-size": "11px",
                "text-transform": "uppercase",
                "letter-spacing": "0.08em",
                color: "var(--sui-text-muted)",
              }}
            >
              Graph view — centered on
            </div>
            <div
              style={{
                "font-size": "15px",
                "font-weight": "600",
                color: "var(--sui-accent)",
              }}
            >
              {fmtLong(selected())}
            </div>
          </div>
        </div>

        {demoBox("DateAxis · clickable · start=2026-05-01  end=2026-07-14", () => (
          <DateAxis
            start={RANGE_START}
            end={RANGE_END}
            today={PINNED_TODAY}
            selected={selected()}
            onDayClick={setSelected}
          />
        ))}

        {demoBox("DateAxis · clickable · 3-week · cellWidth=56", () => (
          <DateAxis
            start={NARROW_START}
            end={NARROW_END}
            today={PINNED_TODAY}
            selected={selected()}
            onDayClick={setSelected}
            cellWidth={56}
          />
        ))}
      </div>

      <div class="example-group">
        <h3>Custom cell renderer — cashflow heatmap</h3>
        <p class="text-meta">
          Pass <code>renderDay</code> to make each day a calendar-style{" "}
          <strong>cashflow cell</strong>: the date sits in the top corner (month +
          day on month edges, like the default axis), a diverging bar shows the
          day's net cashflow — green growing up when positive, red growing down
          when negative — and the dollar amount driving the colour is printed
          below. The renderer sizes each cell (60×72); the axis grows to respect
          it and the scrollbar stays entirely below the cells.
        </p>
        {demoBox("DateAxis · renderDay cashflow — date corner + diverging bar + $", () => (
          <DateAxis
            start={RANGE_START}
            end={RANGE_END}
            renderDay={(day, ctx) => {
              const v = cashflow(ctx.index);
              const up = v >= 0;
              const frac = Math.min(1, Math.abs(v) / 2200);
              const corner =
                ctx.isFirstOfMonth || ctx.isLastOfMonth
                  ? `${day.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" })} ${day.getUTCDate()}`
                  : String(day.getUTCDate());
              return (
                <div
                  style={{
                    position: "relative",
                    width: "60px",
                    height: "72px",
                    "box-sizing": "border-box",
                    display: "flex",
                    "flex-direction": "column",
                    padding: "3px 4px 4px",
                    gap: "2px",
                    "border-right": "1px solid var(--sui-border)",
                    background: up ? "rgba(0,200,120,0.05)" : "rgba(230,70,70,0.05)",
                  }}
                >
                  {/* date in the corner, like a calendar day */}
                  <div
                    style={{
                      "font-size": "9px",
                      "line-height": "1.1",
                      color: "var(--sui-text-muted)",
                      "white-space": "nowrap",
                    }}
                  >
                    {corner}
                  </div>
                  {/* diverging bar: green grows up (positive), red grows down (negative) */}
                  <div style={{ position: "relative", flex: "1", "min-height": "0" }}>
                    <div
                      style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        top: "50%",
                        height: "1px",
                        background: "var(--sui-border)",
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        left: "24%",
                        right: "24%",
                        height: `${(frac * 50).toFixed(0)}%`,
                        ...(up
                          ? { bottom: "50%", background: HEAT_GREEN, "border-radius": "1px 1px 0 0" }
                          : { top: "50%", background: HEAT_RED, "border-radius": "0 0 1px 1px" }),
                      }}
                    />
                  </div>
                  {/* the dollar value driving the colour */}
                  <div
                    style={{
                      "font-size": "9px",
                      "font-weight": "600",
                      "text-align": "center",
                      "white-space": "nowrap",
                      color: up ? HEAT_GREEN : HEAT_RED,
                    }}
                  >
                    {fmtDollars(v)}
                  </div>
                </div>
              );
            }}
          />
        ))}
        <div class="text-meta">
          DateAxis still owns the cell wrapper (click handling, today/selected
          highlight); <code>renderDay</code> controls only what's inside — and,
          for custom cells, the cell's own width and height.
        </div>
      </div>
    </div>
  );
};
