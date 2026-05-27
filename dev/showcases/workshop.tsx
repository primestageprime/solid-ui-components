import { Component, createSignal } from "solid-js";
import { SectionTitle, SubsectionTitle } from "../../src/components/Text";
import { DateAxis } from "../../src/components/DateAxis";

// ─── Workshop ────────────────────────────────────────────────────────────
// Scratch bench for in-progress components. Current occupant: DateAxis.
// Prototype goal: a standalone horizontal day-cell ribbon usable at the
// bottom of a chart or as a freestanding "rules header" on mobile — now with
// clickable days that drive a linked view (e.g. scrub a graph to a day).

// ── Static dates — anchored to 2026-05-01 so the gallery shows a stable
//    range without clocking. `today` is pinned near the middle of the range.
const RANGE_START = new Date("2026-05-01");
const RANGE_END = new Date("2026-07-14"); // ~75 days — forces horizontal scroll
const PINNED_TODAY = new Date("2026-05-27");

// A narrower range (3 weeks) for the second instance so we can see both
// ends simultaneously and compare cellWidth behaviour.
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

// Deterministic stub metric for the heatmap demo — a gentle wave so runs of
// up/down days appear without real data. `renderDay` colours each square by
// the day-over-day delta: green when the metric rises, red when it falls.
const heatValue = (i: number): number => Math.sin(i / 6) * 50 + Math.sin(i / 2.3) * 18;

const heatColor = (i: number): string => {
  if (i === 0) return "transparent";
  const delta = heatValue(i) - heatValue(i - 1);
  const mag = Math.min(1, Math.abs(delta) / 22);
  const alpha = (0.18 + mag * 0.62).toFixed(2);
  return delta >= 0 ? `rgba(0, 200, 120, ${alpha})` : `rgba(230, 70, 70, ${alpha})`;
};

// ── Shared demo chrome ────────────────────────────────────────────────────

const demoBox = (label: string, children: () => unknown) => (
  <div
    style={{
      padding: "0 0 4px",
      background: "var(--sui-bg-elevated)",
      border: "1px solid var(--sui-border)",
      "border-radius": "var(--sui-radius-md)",
      "margin-bottom": "32px",
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
        "margin-bottom": "0",
      }}
    >
      {label}
    </div>
    <div style={{ padding: "0" }}>{children() as any}</div>
  </div>
);

// ── Main showcase ─────────────────────────────────────────────────────────

export const WorkshopShowcase: Component = () => {
  // The "linked view" position. In a real page this would scroll a graph;
  // here we just render the selected day so the click→navigate loop is visible.
  const [selected, setSelected] = createSignal<Date>(PINNED_TODAY);

  return (
    <div class="component-section component-section--full">
      <SectionTitle>Workshop</SectionTitle>
      <p
        style={{
          "font-size": "12px",
          color: "var(--sui-text-secondary)",
          margin: "8px 0 24px",
        }}
      >
        In-progress: <strong>DateAxis</strong> — a standalone horizontal day-cell
        ribbon. One cell per calendar day, horizontal scroll for long ranges,
        today marker, and <strong>clickable days</strong> that drive a linked
        view. Intended as both a bottom-of-chart date header and a freestanding
        "rules header" on mobile (see thorcasting-ui timeline.tsx). Not the
        chart-internal XAxis — no SVG, no scale, no chart context required.
      </p>

      {/* ── Linked "graph view" driven by the axis ───────────────────── */}
      <SubsectionTitle>Clickable days drive a linked view</SubsectionTitle>
      <p
        style={{
          "font-size": "12px",
          color: "var(--sui-text-secondary)",
          margin: "4px 0 16px",
        }}
      >
        Click (or focus + Enter/Space on) any day below. The selected day gets an
        accent underline, and the stand-in "graph view" updates — this is the
        hook a real page would use to scrub a chart to a date. Both ribbons share
        one <code>selected</code> signal, so either one drives the view.
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

      {/* ── Custom cell renderer: heatmap ────────────────────────────── */}
      <SubsectionTitle>Custom cell renderer — heatmap</SubsectionTitle>
      <p
        style={{
          "font-size": "12px",
          color: "var(--sui-text-secondary)",
          margin: "4px 0 16px",
        }}
      >
        Pass <code>renderDay</code> to control each square's content. Below, a
        plain DateAxis supplies the date scale, and a second one over the same
        range renders a <strong>heatmap</strong>: each day is a colored cell —
        green when a stub metric rises vs. the prior day, red when it falls,
        intensity by magnitude. Same component, same range; only the cell
        content differs. <code>ctx.index</code> indexes into the caller's series.
      </p>
      {demoBox("DateAxis · date scale + renderDay heatmap (shared range)", () => (
        <div>
          <DateAxis start={RANGE_START} end={RANGE_END} today={PINNED_TODAY} />
          <DateAxis
            start={RANGE_START}
            end={RANGE_END}
            renderDay={(_day, ctx) => (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  background: heatColor(ctx.index),
                }}
              />
            )}
          />
        </div>
      ))}

      {/* ── Passive (no onDayClick) ──────────────────────────────────── */}
      <SubsectionTitle>Passive ribbon (no onDayClick)</SubsectionTitle>
      <p
        style={{
          "font-size": "12px",
          color: "var(--sui-text-secondary)",
          margin: "4px 0 16px",
        }}
      >
        Without <code>onDayClick</code> the ribbon is a passive header — no
        pointer cursor, not focusable. Today (May 27) is still marked.
      </p>
      {demoBox("DateAxis · passive · start=2026-05-19  end=2026-06-08", () => (
        <DateAxis start={NARROW_START} end={NARROW_END} today={PINNED_TODAY} cellWidth={56} />
      ))}

      {/* ── Prop surface reference ───────────────────────────────────── */}
      <SubsectionTitle>Prop surface</SubsectionTitle>
      <p
        style={{
          "font-size": "12px",
          color: "var(--sui-text-secondary)",
          margin: "4px 0 12px",
        }}
      >
        Minimal controlled surface for this prototype phase:
      </p>
      <table
        style={{
          "font-size": "12px",
          "border-collapse": "collapse",
          width: "100%",
          "max-width": "640px",
          "margin-bottom": "32px",
        }}
      >
        <thead>
          <tr>
            {(["Prop", "Type", "Default", "Notes"] as const).map((h) => (
              <th
                style={{
                  "text-align": "left",
                  padding: "4px 12px 4px 0",
                  "border-bottom": "1px solid var(--sui-border)",
                  color: "var(--sui-text-primary)",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(
            [
              ["start", "Date", "—", "First day (inclusive)"],
              ["end", "Date", "—", "Last day (inclusive)"],
              ["today", "Date?", "new Date()", "Day cell to highlight as today"],
              ["cellWidth", "number?", "40", "px per day cell"],
              ["selected", "Date?", "—", "Day to highlight as the linked-view position"],
              ["onDayClick", "(day: Date) => void", "—", "Makes cells clickable/focusable; fires on activate"],
              ["renderDay", "(day, ctx) => JSX", "—", "Custom per-cell content (e.g. heatmap); default shows the date"],
            ] as const
          ).map(([prop, type, def, notes]) => (
            <tr>
              <td
                style={{
                  padding: "4px 12px 4px 0",
                  "border-bottom": "1px solid rgba(255,255,255,0.05)",
                  color: "var(--sui-accent, #00a8cc)",
                  "font-family": "monospace",
                }}
              >
                {prop}
              </td>
              <td
                style={{
                  padding: "4px 12px 4px 0",
                  "border-bottom": "1px solid rgba(255,255,255,0.05)",
                  color: "var(--sui-text-secondary)",
                  "font-family": "monospace",
                  "white-space": "nowrap",
                }}
              >
                {type}
              </td>
              <td
                style={{
                  padding: "4px 12px 4px 0",
                  "border-bottom": "1px solid rgba(255,255,255,0.05)",
                  color: "var(--sui-text-muted)",
                  "font-family": "monospace",
                }}
              >
                {def}
              </td>
              <td
                style={{
                  padding: "4px 0",
                  "border-bottom": "1px solid rgba(255,255,255,0.05)",
                  color: "var(--sui-text-muted)",
                }}
              >
                {notes}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
