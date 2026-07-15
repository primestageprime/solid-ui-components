import { type Component, For, Show, createMemo, createSignal } from "solid-js";
import { TagPill, type PillStats } from "../tag-pill";
import {
  TextBody,
  MutedBody,
  TextLabel,
  InlineUnits,
} from "../../src/components/Text";
import {
  NarrowStack,
  ClusterRow,
  WrappedClusterRow,
} from "../../src/components/Layout";

// Mirror of items[] in main.tsx — only id+tags needed. Keep in sync.
type ItemMeta = { id: string; tags: string[] };
const ITEMS: ItemMeta[] = [
  { id: "base-table", tags: ["depth:1", "table", "data"] },
  { id: "button", tags: ["depth:1", "form"] },
  { id: "hud-button-group", tags: ["depth:1", "form"] },
  { id: "candlestick-renderer", tags: ["depth:1", "chart", "data"] },
  { id: "cell-renderers", tags: ["depth:1", "data"] },
  { id: "combobox", tags: ["depth:1", "form"] },
  { id: "dag-chart", tags: ["depth:1", "chart", "data"] },
  {
    id: "data-table-container",
    tags: ["depth:1", "table", "data", "container"],
  },
  { id: "digit-roller", tags: ["depth:1", "indicator", "data"] },
  { id: "divider", tags: ["depth:1", "layout"] },
  { id: "heatmap", tags: ["depth:1", "chart", "data"] },
  { id: "heatstream", tags: ["depth:1", "chart", "time", "data"] },
  { id: "icon", tags: ["depth:1", "text"] },
  { id: "inputs", tags: ["depth:1", "form"] },
  { id: "hud-list", tags: ["depth:1", "list"] },
  { id: "math-formula", tags: ["depth:1", "math", "text"] },
  { id: "hud-modal", tags: ["depth:1", "feedback"] },
  { id: "nav-item", tags: ["depth:1", "navigation"] },
  { id: "hud-page", tags: ["depth:1", "layout"] },
  { id: "hud-panel", tags: ["depth:1", "container"] },
  { id: "progress-bar", tags: ["depth:1", "indicator"] },
  { id: "section", tags: ["depth:1", "container"] },
  { id: "hud-section", tags: ["depth:1", "container"] },
  { id: "select", tags: ["depth:1", "form"] },
  { id: "sidebar-selector", tags: ["depth:1", "navigation", "form"] },
  { id: "stats-table", tags: ["depth:1", "table", "data"] },
  { id: "status-badge", tags: ["depth:1", "indicator", "status"] },
  { id: "hud-tabs", tags: ["depth:1", "navigation"] },
  { id: "text", tags: ["depth:0", "text"] },
  { id: "themed-number-input", tags: ["depth:1", "form"] },
  { id: "app-shell", tags: ["depth:0", "layout", "navigation"] },
  { id: "burndown-chart", tags: ["depth:2", "chart", "time", "data"] },
  { id: "completion-timeline", tags: ["depth:2", "chart", "time", "data"] },
  { id: "dropdown", tags: ["depth:1", "form"] },
  { id: "duration", tags: ["depth:1", "time", "text"] },
  { id: "popover-menu", tags: ["depth:2", "navigation", "feedback"] },
  { id: "progress-check", tags: ["depth:1", "indicator"] },
  { id: "quadrant-grid", tags: ["depth:2", "chart", "data"] },
  { id: "ring-chart", tags: ["depth:1", "chart", "data"] },
  { id: "sprint-selector", tags: ["depth:1", "form", "time"] },
  { id: "status-light", tags: ["depth:1", "indicator", "status"] },
  { id: "tag-input", tags: ["depth:1", "form"] },
  { id: "throughput-chart", tags: ["depth:2", "chart", "time", "data"] },
  { id: "truth-indicator", tags: ["depth:1", "indicator"] },
  { id: "quickfilter-atom", tags: ["depth:1", "form"] },
  { id: "worker-card", tags: ["depth:1", "container", "indicator"] },
  { id: "three-panel-layout", tags: ["depth:1", "layout"] },
  { id: "toast", tags: ["depth:1", "feedback"] },
  { id: "toggle", tags: ["depth:1", "form"] },
  { id: "tooltip", tags: ["depth:1", "feedback"] },
  { id: "value-renderer", tags: ["depth:1", "data"] },
  { id: "resizable-container", tags: ["depth:0", "layout"] },
  { id: "row", tags: ["depth:0", "layout"] },
  { id: "stack", tags: ["depth:0", "layout"] },
  { id: "surface", tags: ["depth:0", "layout", "container"] },
  { id: "alert-box", tags: ["depth:2", "feedback"] },
  { id: "chart", tags: ["depth:2", "chart", "data"] },
  { id: "change-renderer", tags: ["depth:2", "data", "indicator"] },
  { id: "hud-confirmation-modal", tags: ["depth:2", "feedback"] },
  { id: "date-range-picker", tags: ["depth:2", "form", "time"] },
  { id: "date-time-range", tags: ["depth:2", "time"] },
  { id: "empty-state", tags: ["depth:2", "feedback"] },
  { id: "heatstream-grid", tags: ["depth:2", "chart", "time", "data"] },
  { id: "nav-bar", tags: ["depth:2", "navigation"] },
  { id: "number-with-units", tags: ["depth:2", "data"] },
  { id: "progress-card", tags: ["depth:2", "container", "indicator"] },
  { id: "quick-filter", tags: ["depth:2", "form"] },
  { id: "selectable-table", tags: ["depth:2", "table", "data", "form"] },
  { id: "removable-item-card", tags: ["depth:2", "container", "data"] },
  { id: "connection-status", tags: ["depth:3", "indicator", "status"] },
  { id: "conversation-tree", tags: ["depth:3", "list", "chat"] },
  { id: "data-list", tags: ["depth:3", "list", "data"] },
  { id: "titled-time-range-header", tags: ["depth:1", "container", "data"] },
  { id: "formula-panel", tags: ["depth:4", "container", "math"] },
  { id: "interactive-formula", tags: ["depth:4", "form", "math"] },
  { id: "metric-card", tags: ["depth:3", "container", "indicator", "data"] },
  { id: "result-display", tags: ["depth:3", "math", "data"] },
  { id: "result-panel", tags: ["depth:4", "container", "math", "data"] },
];

const TAG_CATEGORIES: { label: string; tags: string[] }[] = [
  {
    label: "Depth",
    tags: ["depth:0", "depth:1", "depth:2", "depth:3", "depth:4"],
  },
  {
    label: "Shape",
    tags: [
      "chart",
      "table",
      "list",
      "form",
      "layout",
      "feedback",
      "navigation",
      "indicator",
      "container",
      "text",
    ],
  },
  { label: "Domain", tags: ["data", "time", "math", "status", "chat"] },
];

const TOTAL_ITEMS = ITEMS.length;
const shortTag = (tag: string) => tag.replace(/^depth:/, "d");

// Filter logic — same semantics as main.tsx: OR within facet, AND across facets.
const matchesFilter = (item: ItemMeta, selected: Set<string>): boolean => {
  if (selected.size === 0) return true;
  for (const cat of TAG_CATEGORIES) {
    const catSelected = cat.tags.filter((t) => selected.has(t));
    if (catSelected.length === 0) continue;
    if (!catSelected.some((t) => item.tags.includes(t))) return false;
  }
  return true;
};

const filterItems = (selected: Set<string>): ItemMeta[] =>
  ITEMS.filter((i) => matchesFilter(i, selected));

const toggleTag = (set: Set<string>, tag: string): Set<string> => {
  const next = new Set(set);
  if (next.has(tag)) next.delete(tag);
  else next.add(tag);
  return next;
};

// ── Stats helper ──────────────────────────────────────────────────────────

const computeStats = (
  tag: string,
  selected: Set<string>,
  currentSet: Set<string>,
): PillStats => {
  const active = selected.has(tag);
  const next = toggleTag(selected, tag);
  const newItems = filterItems(next);
  const newSet = new Set(newItems.map((i) => i.id));
  let added = 0;
  let removed = 0;
  for (const id of newSet) if (!currentSet.has(id)) added++;
  for (const id of currentSet) if (!newSet.has(id)) removed++;
  return {
    active,
    currentCount: currentSet.size,
    newCount: newSet.size,
    added,
    removed,
  };
};

// Pill rendering lives in dev/tag-pill.tsx — this sandbox just wires data + state.

// ── Sandbox ───────────────────────────────────────────────────────────────

export const PillVariantsShowcase: Component = () => {
  const [selected, setSelected] = createSignal<Set<string>>(new Set());

  const currentItems = createMemo(() => filterItems(selected()));
  const currentSet = createMemo(() => new Set(currentItems().map((i) => i.id)));

  const handleToggle = (tag: string) => {
    setSelected((prev) => toggleTag(prev, tag));
  };

  const reset = () => setSelected(new Set<string>());

  return (
    <div class="component-section">
      <h2>Pill Sandbox — Variant D (dynamic deltas)</h2>
      <p class="text-meta">
        Each pill shows: <code>+N</code> additions and <code>−N</code> removals
        if toggled.
        Internal fill bar is the projected result count if you toggled this
        pill, as a fraction of all {TOTAL_ITEMS} items. Click pills to interact
        — this sandbox has its own state, separate from the sidebar.
      </p>

      <ClusterRow>
        <TextBody>
          <strong>{currentItems().length}</strong>
          <InlineUnits>/ {TOTAL_ITEMS} matching</InlineUnits>
        </TextBody>
        <MutedBody>
          Selected:{" "}
          {selected().size === 0
            ? "none"
            : [...selected()].sort().map(shortTag).join(", ")}
        </MutedBody>
        <Show when={selected().size > 0}>
          <button class="demo-btn" type="button" onClick={reset}>
            Reset
          </button>
        </Show>
      </ClusterRow>

      <For each={TAG_CATEGORIES}>
        {(cat) => (
          <NarrowStack>
            <TextLabel>{cat.label}</TextLabel>
            <WrappedClusterRow>
              <For each={cat.tags}>
                {(tag) => (
                  <TagPill
                    tag={tag}
                    stats={computeStats(tag, selected(), currentSet())}
                    onToggle={() => handleToggle(tag)}
                    totalItems={TOTAL_ITEMS}
                  />
                )}
              </For>
            </WrappedClusterRow>
          </NarrowStack>
        )}
      </For>

      <MutedBody>
        <div>
          <strong>Reading the deltas:</strong>
        </div>
        <div>
          • Inactive pill in a fresh facet → toggling adds an AND constraint →
          shows <code>−N</code> (items lost).
        </div>
        <div>
          • Inactive pill in a facet that already has selections → toggling
          widens the OR set → shows <code>+N</code> (items gained).
        </div>
        <div>
          • Active pill that's the only one in its facet → toggling off removes
          the constraint → shows <code>+N</code> (items gained).
        </div>
        <div>
          • Active pill alongside others in the same facet → toggling off
          narrows the OR set → shows <code>−N</code> (items lost).
        </div>
      </MutedBody>
    </div>
  );
};
