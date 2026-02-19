import { Component } from "solid-js";
import { HeatStack, HeatStackItem } from "../../src/components/HeatStack";

const KEYS = ["A", "B", "C", "D", "E", "F", "G", "H"];

const f = "full" as const;
const p = "partial" as const;
const m = "missing" as const;
const u = "unknown" as const;

// 30 rows for compact view: healthy base with degradation bands and unknown tail
const compactItems: HeatStackItem[] = [
  { name: "1",  statuses: { A: f, B: f, C: f, D: f, E: f, F: f, G: f, H: f } },
  { name: "2",  statuses: { A: f, B: f, C: f, D: f, E: f, F: f, G: f, H: f } },
  { name: "3",  statuses: { A: f, B: f, C: f, D: f, E: f, F: f, G: f, H: f } },
  { name: "4",  statuses: { A: f, B: f, C: f, D: p, E: f, F: f, G: f, H: f } },
  { name: "5",  statuses: { A: f, B: f, C: p, D: p, E: f, F: f, G: f, H: p } },
  { name: "6",  statuses: { A: f, B: f, C: m, D: m, E: f, F: f, G: p, H: p } },
  { name: "7",  statuses: { A: f, B: f, C: m, D: m, E: f, F: f, G: p, H: m } },
  { name: "8",  statuses: { A: f, B: f, C: m, D: m, E: f, F: p, G: m, H: m } },
  { name: "9",  statuses: { A: f, B: f, C: m, D: m, E: f, F: m, G: m, H: m } },
  { name: "10", statuses: { A: f, B: f, C: m, D: p, E: f, F: m, G: m, H: m } },
  { name: "11", statuses: { A: f, B: f, C: p, D: f, E: f, F: m, G: p, H: p } },
  { name: "12", statuses: { A: f, B: f, C: f, D: f, E: f, F: p, G: f, H: f } },
  { name: "13", statuses: { A: f, B: f, C: f, D: f, E: f, F: f, G: f, H: f } },
  { name: "14", statuses: { A: f, B: f, C: f, D: f, E: f, F: f, G: f, H: f } },
  { name: "15", statuses: { A: f, B: p, C: f, D: f, E: f, F: f, G: f, H: f } },
  { name: "16", statuses: { A: f, B: m, C: f, D: f, E: p, F: f, G: f, H: f } },
  { name: "17", statuses: { A: f, B: m, C: f, D: f, E: m, F: f, G: f, H: f } },
  { name: "18", statuses: { A: f, B: m, C: f, D: f, E: m, F: f, G: f, H: f } },
  { name: "19", statuses: { A: f, B: m, C: f, D: f, E: m, F: f, G: f, H: f } },
  { name: "20", statuses: { A: f, B: p, C: f, D: f, E: p, F: f, G: f, H: f } },
  { name: "21", statuses: { A: f, B: f, C: f, D: f, E: f, F: f, G: f, H: f } },
  { name: "22", statuses: { A: f, B: f, C: f, D: f, E: f, F: f, G: f, H: f } },
  { name: "23", statuses: { A: f, B: f, C: f, D: f, E: f, F: f, G: f, H: f } },
  { name: "24", statuses: { A: f, B: f, C: f, D: f, E: f, F: f, G: f, H: f } },
  { name: "25", statuses: { A: f, B: f, C: f, D: f, E: f, F: f, G: f, H: f } },
  { name: "26", statuses: { A: u, B: u, C: u, D: u, E: u, F: u, G: u, H: u } },
  { name: "27", statuses: { A: u, B: u, C: u, D: u, E: u, F: u, G: u, H: u } },
  { name: "28", statuses: { A: u, B: u, C: u, D: u, E: u, F: u, G: u, H: u } },
  { name: "29", statuses: { A: u, B: u, C: u, D: u, E: u, F: u, G: u, H: u } },
  { name: "30", statuses: { A: u, B: u, C: u, D: u, E: u, F: u, G: u, H: u } },
];

// Mostly full, with missing streaks in C (items 4–7), D degrading, and F gap (items 6–8)
const sampleItems: HeatStackItem[] = [
  { name: "Item 1",  statuses: { A: "full", B: "full",    C: "full",    D: "full",    E: "full",    F: "full",    G: "full",    H: "full" } },
  { name: "Item 2",  statuses: { A: "full", B: "full",    C: "full",    D: "full",    E: "full",    F: "full",    G: "full",    H: "full" } },
  { name: "Item 3",  statuses: { A: "full", B: "full",    C: "full",    D: "partial", E: "full",    F: "full",    G: "full",    H: "partial" } },
  { name: "Item 4",  statuses: { A: "full", B: "full",    C: "missing", D: "partial", E: "full",    F: "full",    G: "full",    H: "partial" } },
  { name: "Item 5",  statuses: { A: "full", B: "full",    C: "missing", D: "missing", E: "full",    F: "full",    G: "partial", H: "missing" } },
  { name: "Item 6",  statuses: { A: "full", B: "partial", C: "missing", D: "missing", E: "full",    F: "missing", G: "partial", H: "missing" } },
  { name: "Item 7",  statuses: { A: "full", B: "full",    C: "missing", D: "missing", E: "full",    F: "missing", G: "full",    H: "full" } },
  { name: "Item 8",  statuses: { A: "full", B: "full",    C: "partial", D: "full",    E: "full",    F: "missing", G: "full",    H: "full" } },
  { name: "Item 9",  statuses: { A: "full", B: "full",    C: "full",    D: "full",    E: "full",    F: "full",    G: "full",    H: "full" } },
  { name: "Item 10", statuses: { A: "full", B: "full",    C: "full",    D: "full",    E: "full",    F: "full",    G: "full",    H: "full" } },
];

// Bottom 5 have real data with a missing streak in B (items 2–4), top 5 unknown
const partialUnknownItems: HeatStackItem[] = [
  { name: "Item 1",  statuses: { A: "full", B: "full",    C: "full",    D: "full",    E: "full",    F: "full",    G: "full",    H: "full" } },
  { name: "Item 2",  statuses: { A: "full", B: "missing", C: "full",    D: "partial", E: "full",    F: "full",    G: "full",    H: "full" } },
  { name: "Item 3",  statuses: { A: "full", B: "missing", C: "partial", D: "full",    E: "full",    F: "partial", G: "full",    H: "full" } },
  { name: "Item 4",  statuses: { A: "full", B: "missing", C: "full",    D: "full",    E: "full",    F: "full",    G: "full",    H: "full" } },
  { name: "Item 5",  statuses: { A: "full", B: "full",    C: "full",    D: "full",    E: "full",    F: "full",    G: "full",    H: "full" } },
  { name: "Item 6",  statuses: { A: "unknown", B: "unknown", C: "unknown", D: "unknown", E: "unknown", F: "unknown", G: "unknown", H: "unknown" } },
  { name: "Item 7",  statuses: { A: "unknown", B: "unknown", C: "unknown", D: "unknown", E: "unknown", F: "unknown", G: "unknown", H: "unknown" } },
  { name: "Item 8",  statuses: { A: "unknown", B: "unknown", C: "unknown", D: "unknown", E: "unknown", F: "unknown", G: "unknown", H: "unknown" } },
  { name: "Item 9",  statuses: { A: "unknown", B: "unknown", C: "unknown", D: "unknown", E: "unknown", F: "unknown", G: "unknown", H: "unknown" } },
  { name: "Item 10", statuses: { A: "unknown", B: "unknown", C: "unknown", D: "unknown", E: "unknown", F: "unknown", G: "unknown", H: "unknown" } },
];

export const HeatStackShowcase: Component = () => {
  return (
    <div class="component-section">
      <h2>HeatStack — Atomic (Depth 1)</h2>
      <p class="text-meta">Owns CSS (HeatStack.css), no component imports. Vertical stack of items with status cells per key. Earliest at bottom, latest on top.</p>
      <div class="depth2-layout">
        <div class="depth2-composed">
          <h3>Default — 8 Keys, Missing Streaks in C, D, F</h3>
          <HeatStack
            items={sampleItems}
            keys={KEYS}
            showLegend
          />

          <h3 style={{ "margin-top": "24px" }}>Top 5 Unknown (Not Yet Reported)</h3>
          <HeatStack
            items={partialUnknownItems}
            keys={KEYS}
            showLegend
          />

          <h3 style={{ "margin-top": "24px" }}>Compact — 30 Rows</h3>
          <div style={{ width: "80px" }}>
            <HeatStack
              items={compactItems}
              keys={KEYS}
              variant="compact"
            />
          </div>
        </div>
        <div class="depth2-atoms">
          <h3>Props</h3>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Variant</div>
            <div class="depth2-atom"><div class="depth2-atom__label">default / compact</div></div>
          </div>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Status</div>
            <div class="depth2-atom"><div class="depth2-atom__label">full / partial / missing / unknown</div></div>
          </div>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Keys (default)</div>
            <div class="depth2-atom"><div class="depth2-atom__label">A, B, C, D (customizable)</div></div>
          </div>
        </div>
      </div>
    </div>
  );
};
