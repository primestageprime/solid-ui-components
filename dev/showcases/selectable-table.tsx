import { type Component, Show, createSignal } from "solid-js";
import { SelectableTable } from "../../src/components/Table";
import { BulkActionBar } from "../../src/components/BulkActionBar";
import { ScrollYBox, NarrowStack } from "../../src/components/Layout";
import { MutedBody } from "../../src/components/Text";
import "./selectable-table.css";

// A berth queue long enough to scroll inside its own box — the BulkActionBar
// sticks to the bottom of that scroll region, which is invisible on four rows.
const QUEUE = Array.from({ length: 24 }, (_, i) => ({
  id: `q${i + 1}`,
  vessel: `${["MV Northern Star", "SS Pacific Dawn", "MT Coral Sea", "MV Aurora", "MV Baltic Trader", "MSC Bellissima"][i % 6]} ${i + 1}`,
  imo: String(9100000 + i * 137),
  date: `2026-01-${String(28 - (i % 28)).padStart(2, "0")}`,
}));

const sampleData = [
  { id: "r1", vessel: "MV Northern Star", imo: "9876543", date: "2026-01-15" },
  { id: "r2", vessel: "SS Pacific Dawn", imo: "9123456", date: "2026-01-14" },
  { id: "r3", vessel: "MT Coral Sea", imo: "9654321", date: "2026-01-13" },
  { id: "r4", vessel: "MV Aurora", imo: "9345678", date: "2026-01-12" },
];

const columns = [
  { id: "vessel", header: "Vessel", accessor: "vessel" as const },
  { id: "imo", header: "IMO", accessor: "imo" as const, width: "100px" },
  { id: "date", header: "Date", accessor: "date" as const, width: "120px" },
];

export const SelectableTableShowcase: Component = () => {
  const [selected, setSelected] = createSignal<Set<string>>(new Set());
  const [queued, setQueued] = createSignal<Set<string>>(new Set());

  return (
    <div class="component-section">
      <h2>SelectableTable — Depth 1 (zero CSS)</h2>
      <p class="text-meta">
        Composes Button (Primitive/Depth 0). Table + checkbox selection + action
        bar.
      </p>
      <div class="depth2-layout">
        <div class="depth2-composed">
          <h3>Composed — With Selection Actions</h3>
          <SelectableTable
            data={sampleData}
            columns={columns}
            getRowId={(row) => row.id}
            selectionStore={{ selected, setSelected }}
            selectionActions={[
              {
                label: "Delete",
                variant: "danger" as const,
                onClick: (ids) => {
                  console.log("Delete:", [...ids]);
                  setSelected(new Set<string>());
                },
              },
            ]}
            stickyHeader
          />
        </div>
        <div class="depth2-atoms">
          <h3>Sub-Components</h3>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Button (Atomic)</div>
            <div class="depth2-atom">
              <div class="depth2-atom__label">Used in action bar</div>
            </div>
          </div>
          <h3>Props</h3>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Selection</div>
            <div class="depth2-atom">
              <div class="depth2-atom__label">
                selectionStore / selectionActions / getRowId
              </div>
            </div>
          </div>
        </div>
      </div>

      <h3>BulkActionBar — the strip a selection puts at the bottom</h3>
      <p class="text-meta">
        The standalone alternative to <code>selectionActions</code>, for when
        the multi-select lives in something that isn't a SelectableTable (a
        grid, a canvas, a card wall). It has no visibility logic of its own:
        render it behind a <code>Show</code> on the selection count, inside the
        scrolling container it should stick to. Tick some rows and scroll — the
        bar stays pinned to the bottom of the queue, not the page.
      </p>
      <div class="example-group">
        <NarrowStack>
          <ScrollYBox class="bulk-action-demo__scroll">
            <SelectableTable
              data={QUEUE}
              columns={columns}
              getRowId={(row) => row.id}
              selectionStore={{ selected: queued, setSelected: setQueued }}
              stickyHeader
            />
            <Show when={queued().size > 0}>
              <BulkActionBar
                count={queued().size}
                noun="call"
                actionLabel="Assign to berth 4"
                onAction={() => setQueued(new Set<string>())}
                onClear={() => setQueued(new Set<string>())}
              />
            </Show>
          </ScrollYBox>
          <MutedBody>
            {queued().size === 0
              ? "nothing selected — the bar is not rendered at all"
              : `${queued().size} selected`}
          </MutedBody>
        </NarrowStack>
      </div>
    </div>
  );
};
