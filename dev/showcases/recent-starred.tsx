import { type Component, createSignal } from "solid-js";
import {
  createRecentStarredStore,
  RecentStarredSidebar,
  StarToggle,
} from "../../src/components/RecentStarred";
import { NarrowStack, ClusterRow } from "../../src/components/Layout";
import { SectionTitle, MutedBody } from "../../src/components/Text";

// ── Seeded demo store ───────────────────────────────────────────────────────
// A dedicated storageKey so the showcase never collides with a consuming app's
// lists. We clear + seed on module load so the panel always shows both sections
// populated (starred above, recent below).

const store = createRecentStarredStore({ storageKey: "sui.dev.recent-starred" });
store.clearAll();

const SEED = [
  { id: "r-12045", label: "R12045 — Coolant leak, Line 4" },
  { id: "r-12046", label: "R12046 — Bearing wear, Pump A" },
  { id: "r-12050", label: "R12050 — Overtemp trip, Kiln 2" },
  { id: "cust-acme", label: "Acme Manufacturing" },
  { id: "dash-uptime", label: "Fleet Uptime Dashboard" },
];

// Recent list is newest-first; push in reverse so the first entry sorts to top.
for (let i = SEED.length - 1; i >= 0; i--) store.pushRecent(SEED[i]);
store.toggleStar(SEED[0]);
store.toggleStar(SEED[3]);

export const RecentStarredShowcase: Component = () => {
  const [lastPicked, setLastPicked] = createSignal<string>("—");

  return (
    <NarrowStack>
      <div>
        <SectionTitle>RecentStarred — Composite (Depth 1)</SectionTitle>
        <MutedBody>
          A pure sidebar renderer for a `createRecentStarredStore`. Two sections
          (Starred, Recent), each with a header + count and a scrolling list of
          clickable items. Empty sections still render so the sidebar height
          doesn't jump.
        </MutedBody>
      </div>

      <section>
        <h3>Sidebar panel</h3>
        <div class="recent-starred-demo__frame">
          <RecentStarredSidebar
            store={store}
            onPick={(item) => setLastPicked(item.label)}
          />
        </div>
        <p class="text-meta">Last picked: {lastPicked()}</p>
      </section>

      <section>
        <h3>StarToggle</h3>
        <ClusterRow>
          <StarToggle store={store} item={SEED[1]} title="Star R12046" />
          <span class="text-meta">Click to toggle the star fill.</span>
        </ClusterRow>
      </section>
    </NarrowStack>
  );
};
