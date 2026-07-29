// Bench: Cross-Filtering Tiles (workshop:cross-filtering)
//
// A WORKING demo of the interconnected-filtering PATTERN, driven entirely by the
// static fixture below — no data layer, no subscriptions, nothing to connect.
// Open the bench and it filters.
//
// This bench is the successor to `report-filter-bar.tsx`, which was a skeleton
// posing open questions before anything was built. Those questions now have
// answers, and this is what they resolved to.
//
// ---------------------------------------------------------------------------
// WHAT THE PATTERN IS
//
// Several breakdown tiles over ONE row-grain fact. Each tile groups the fact by
// its own dimension. Clicking a row toggles that member into a shared filter,
// and every tile — plus the metric row — re-aggregates against it at once. The
// same filter is also editable from the chip row.
//
// Four behaviours make it work, and each one is a bug if you drop it:
//
//   1. TWO-WAY TOGGLE. A row click adds the member; clicking the same row again
//      removes it. The chip row and the tiles edit ONE filter, so they can never
//      disagree.
//
//   2. OWN-DIMENSION EXCLUSION. A tile applies every active filter EXCEPT its
//      own (`matches(row, filters, except)`). Without it, selecting a member
//      collapses that tile to a single row — and since the toggle-off click
//      lives on the rows, the other members you would switch to are gone. It is
//      what keeps a row click reversible, not merely a display nicety.
//
//   3. RANK BEFORE CAP, THEN PIN. Ranks are assigned over the FULL ranked list
//      and the top-N cap is applied after, so a rank means the same thing
//      whether or not the tile is capped. A selected member that ranks below the
//      cap is then appended, carrying its TRUE rank. Cap-then-rank instead drops
//      the selection off the bottom of a capped tile: the tile keeps showing its
//      unfiltered top N while every other tile has narrowed, and — because rule
//      1 puts toggle-off on the row — there is no way to clear the filter you
//      just set. Try it: pick "Knife Work" (rank 9) in the capped Top 5 tile.
//
//   4. EMPTY MEANS ALL. No selection in a dimension is no filter on it, rather
//      than a filter matching nothing. This is also MultiSelectFilter's own
//      convention, so the chips need no "all" pseudo-member.
//
// Composition is AND across dimensions, OR within one — pick two genres and you
// get either genre; add a format and you get (either genre) AND that format.
//
// ---------------------------------------------------------------------------
// WHAT IS DELIBERATELY NOT HERE
//
// Persistence (the consuming app encodes the filter in its URL), the data layer,
// and grain. The mechanism below is agnostic to all three: it is a filter over
// an array of rows, and it does not care where the rows came from or what a row
// means. Keeping those out is what makes this a library bench and not a copy of
// one app's report.
//
// SUI-only, curried-variants-only, zero custom styling.
import { type Component, createMemo, createSignal, For } from "solid-js";
import { SectionTable } from "../../../src/components/Table/SectionTable";
import type { TableColumn } from "../../../src/components/Table/types";
import { MultiSelectFilter } from "../../../src/components/MultiSelectFilter";
import { MetricCard } from "../../../src/components/DataDisplay";
import { GhostButton } from "../../../src/components/Button";
import {
  ContentStack,
  TightClusterRow,
  TightStack,
  WrapRow,
} from "../../../src/components/Layout";
import {
  CaptionLabel,
  MutedBody,
  NoteText,
  SectionTitle,
  SubsectionTitle,
} from "../../../src/components/Text";

// ---------------------------------------------------------------------------
// Fixture. A generic bookshop: one row per sale line.

type Dim = "genre" | "format" | "region" | "title";

const DIMENSIONS: Dim[] = ["genre", "format", "region", "title"];

const DIMENSION_LABEL: Record<Dim, string> = {
  genre: "Genre",
  format: "Format",
  region: "Region",
  title: "Title",
};

const GENRE_OF: Record<string, string> = {
  "The Salt Road": "Fiction",
  "Harbor Lights": "Fiction",
  "Nine Winters": "Fiction",
  "Empire of Dust": "History",
  "The Long Peace": "History",
  "Quantum Garden": "Science",
  "Tidal Forces": "Science",
  "Slow Dough": "Cooking",
  "Knife Work": "Cooking",
};

/** [title, format, region, units, dollars] */
const SALES: [string, string, string, number, number][] = [
  ["Empire of Dust", "Hardcover", "North", 12, 1800],
  ["Empire of Dust", "Ebook", "West", 9, 1400],
  ["Empire of Dust", "Audiobook", "South", 6, 1000],
  ["The Salt Road", "Paperback", "East", 15, 1500],
  ["The Salt Road", "Hardcover", "North", 8, 1300],
  ["The Salt Road", "Ebook", "South", 7, 1000],
  ["Quantum Garden", "Hardcover", "West", 10, 1600],
  ["Quantum Garden", "Paperback", "North", 9, 900],
  ["Quantum Garden", "Audiobook", "East", 4, 600],
  ["Harbor Lights", "Paperback", "South", 11, 1100],
  ["Harbor Lights", "Ebook", "West", 8, 800],
  ["Harbor Lights", "Audiobook", "North", 5, 700],
  ["Slow Dough", "Hardcover", "East", 7, 1200],
  ["Slow Dough", "Paperback", "West", 6, 600],
  ["Slow Dough", "Ebook", "North", 4, 400],
  ["Tidal Forces", "Hardcover", "South", 6, 1000],
  ["Tidal Forces", "Paperback", "East", 5, 500],
  ["Tidal Forces", "Ebook", "West", 3, 300],
  ["Nine Winters", "Paperback", "North", 9, 900],
  ["Nine Winters", "Audiobook", "South", 4, 600],
  ["The Long Peace", "Hardcover", "West", 4, 700],
  ["The Long Peace", "Ebook", "East", 4, 400],
  ["Knife Work", "Paperback", "North", 5, 400],
  ["Knife Work", "Audiobook", "East", 2, 300],
];

interface FactRow {
  dims: Record<Dim, string>;
  units: number;
  dollars: number;
}

const FACT: FactRow[] = SALES.map(([title, format, region, units, dollars]) => ({
  dims: { title, format, region, genre: GENRE_OF[title] },
  units,
  dollars,
}));

/** Every member present in the fact, per dimension — the chip option lists. */
const MEMBERS: Record<Dim, string[]> = DIMENSIONS.reduce(
  (acc, d) => {
    acc[d] = [...new Set(FACT.map((r) => r.dims[d]))].sort();
    return acc;
  },
  {} as Record<Dim, string[]>,
);

const money = (d: number) => `$${d.toLocaleString("en-US")}`;

// ---------------------------------------------------------------------------
// The mechanism. Two pure functions — this is the whole pattern.

type FilterSet = Partial<Record<Dim, string[]>>;

/**
 * Does this row satisfy every active dimension? OR within a dimension, AND
 * across them. `except` drops one dimension from the test — behaviour 2.
 */
const matches = (row: FactRow, filters: FilterSet, except?: Dim): boolean => {
  for (const d of DIMENSIONS) {
    if (d === except) continue;
    const sel = filters[d];
    if (!sel?.length) continue; // behaviour 4: empty means all
    if (!sel.includes(row.dims[d])) return false;
  }
  return true;
};

interface TileRow {
  key: string;
  member: string;
  rank: number;
  units: number;
  dollars: number;
  active: boolean;
}

/**
 * Group the fact by `dimension`, rank it, cap it, and pin a below-cap
 * selection — behaviour 3. Pure: no signals read here, so it is testable and
 * the memo that calls it owns the reactivity.
 */
const tileRowsFrom = (
  src: FactRow[],
  dimension: Dim,
  filters: FilterSet,
  topN?: number,
): TileRow[] => {
  const agg = new Map<string, { units: number; dollars: number }>();
  for (const row of src) {
    if (!matches(row, filters, dimension)) continue;
    const member = row.dims[dimension];
    let a = agg.get(member);
    if (!a) agg.set(member, (a = { units: 0, dollars: 0 }));
    a.units += row.units;
    a.dollars += row.dollars;
  }

  const sel = filters[dimension] ?? [];
  // Rank over the FULL list, BEFORE any cap. (value DESC, member ASC) — the
  // alphabetical tiebreak keeps equal-valued members from shuffling between
  // renders.
  const ranked: TileRow[] = [...agg.entries()]
    .map(([member, a]) => ({
      key: member,
      member,
      units: a.units,
      dollars: a.dollars,
      active: sel.includes(member),
      rank: 0,
    }))
    .sort((x, y) => y.dollars - x.dollars || (x.member < y.member ? -1 : 1))
    .map((r, i) => ({ ...r, rank: i + 1 }));

  if (topN === undefined) return ranked;
  const shown = ranked.slice(0, topN);
  if (sel.length === 0) return shown;
  const inSlice = new Set(shown.map((r) => r.key));
  // Pin any selected member the cap excluded — it keeps its TRUE rank.
  return [...shown, ...ranked.filter((r) => r.active && !inSlice.has(r.key))];
};

// ---------------------------------------------------------------------------
// Presentation.

const TILES: { dimension: Dim; label: string; topN?: number }[] = [
  { dimension: "genre", label: "Revenue by genre" },
  { dimension: "format", label: "Revenue by format" },
  { dimension: "region", label: "Revenue by region" },
  { dimension: "title", label: "Top 5 titles by revenue", topN: 5 },
];

export const meta = { label: "Cross-Filtering Tiles" };

const CrossFilteringBench: Component = () => {
  const [filters, setFilters] = createSignal<FilterSet>({});

  /** Behaviour 1 — the two-way toggle, shared by row clicks and the chips. */
  const toggle = (d: Dim, member: string) => {
    const cur = filters()[d] ?? [];
    const next = { ...filters() };
    const without = cur.filter((m) => m !== member);
    if (without.length === cur.length) next[d] = [...cur, member].sort();
    else if (without.length) next[d] = without;
    else delete next[d];
    setFilters(next);
  };

  const activeDimensions = () =>
    DIMENSIONS.filter((d) => (filters()[d] ?? []).length > 0);

  /** The fully-filtered fact — what the metric row reports. Tiles do NOT use
   *  this; each re-filters with its own dimension excluded. */
  const visible = createMemo(() => FACT.filter((r) => matches(r, filters())));

  const totals = createMemo(() => ({
    revenue: visible().reduce((s, r) => s + r.dollars, 0),
    units: visible().reduce((s, r) => s + r.units, 0),
    lines: visible().length,
  }));

  const columns = (dimension: Dim): TableColumn<TileRow>[] => [
    {
      id: "rank",
      header: "#",
      align: "left",
      // The active marker rides in the DATA, not in a row class: SUI has no
      // active-row visual for a plain table, and inventing one would be custom
      // styling. "›" reads as "this member is selected" beside its rank.
      accessor: (r) => (r.active ? `› ${r.rank}` : String(r.rank)),
    },
    {
      id: "member",
      header: DIMENSION_LABEL[dimension],
      align: "left",
      accessor: (r) => r.member,
    },
    { id: "units", header: "Units", align: "right", accessor: (r) => r.units },
    {
      id: "revenue",
      header: "Revenue",
      align: "right",
      accessor: (r) => money(r.dollars),
    },
  ];

  return (
    <div class="component-section component-section--full">
      <SectionTitle>Cross-Filtering Tiles</SectionTitle>
      <MutedBody>
        Breakdown tiles over one fact, sharing one filter. Click any row to
        toggle that member; every other tile and the metric row re-aggregate.
        Static fixture data — 24 sale lines, no data layer.
      </MutedBody>

      <ContentStack>
        <SubsectionTitle>The shared filter</SubsectionTitle>
        <TightStack>
          <WrapRow>
            <For each={DIMENSIONS}>
              {(d) => (
                <MultiSelectFilter
                  label={DIMENSION_LABEL[d]}
                  options={MEMBERS[d].map((m) => ({ value: m }))}
                  selected={filters()[d] ?? []}
                  onChange={(next) => {
                    // MultiSelectFilter hands back the whole next selection;
                    // the model is toggle-based, so reconcile the two sets.
                    const want = new Set(next);
                    const have = new Set(filters()[d] ?? []);
                    for (const m of want) if (!have.has(m)) toggle(d, m);
                    for (const m of have) if (!want.has(m)) toggle(d, m);
                  }}
                />
              )}
            </For>
          </WrapRow>
          <TightClusterRow>
            <CaptionLabel>
              {activeDimensions().length === 0
                ? "No filter — every tile shows all of its members"
                : `Filtered on ${activeDimensions().length} dimension${
                    activeDimensions().length === 1 ? "" : "s"
                  }`}
            </CaptionLabel>
            <GhostButton onClick={() => setFilters({})}>
              Clear filters
            </GhostButton>
          </TightClusterRow>
        </TightStack>

        <SubsectionTitle>What the filter drives</SubsectionTitle>
        <WrapRow>
          <MetricCard label="Revenue" value={money(totals().revenue)} />
          <MetricCard label="Units" value={totals().units} />
          <MetricCard label="Sale lines" value={totals().lines} />
        </WrapRow>

        <SubsectionTitle>The tiles</SubsectionTitle>
        <WrapRow>
          <For each={TILES}>
            {(t) => (
              <TightStack>
                <SectionTable
                  title={t.label}
                  columns={columns(t.dimension)}
                  data={tileRowsFrom(FACT, t.dimension, filters(), t.topN)}
                  compact
                  hoverable
                  fit
                  onRowClick={(row: TileRow) => toggle(t.dimension, row.member)}
                />
              </TightStack>
            )}
          </For>
        </WrapRow>

        <SubsectionTitle>Things to try</SubsectionTitle>
        <TightStack>
          <NoteText>
            Click "Fiction" in the genre tile. Every other tile narrows to
            Fiction; the genre tile still lists all four genres, marked "›
            Fiction" — that is own-dimension exclusion, and it is what lets you
            click the same row again to switch it off.
          </NoteText>
          <NoteText>
            Click "Knife Work" in the capped Top 5 titles tile — it is rank 9, so
            it is not in the top 5. It appears pinned below the cap, still
            numbered 9. Rank before cap, then pin: without it the tile would show
            its unfiltered top 5 while every other tile narrowed, and the row you
            would click to undo the filter would not be on screen.
          </NoteText>
          <NoteText>
            Pick two formats. Within a dimension the members OR together; across
            dimensions they AND. Clear one dimension back to empty and it stops
            filtering entirely rather than matching nothing.
          </NoteText>
        </TightStack>
      </ContentStack>
    </div>
  );
};

export default CrossFilteringBench;
