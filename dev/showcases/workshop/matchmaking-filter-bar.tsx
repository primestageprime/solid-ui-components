// Bench: Matchmaking Filter Bar (workshop:matchmaking-filter-bar)
//
// A progressive-disclosure filter bar over twelve facet tables. The bar is
// height-locked to one line and every expansion is an overlay, so filtering
// never pushes the tables down.
//
// This file is the ONLY place the filter engine and the visual components
// meet. `FilterBar` and `FacetTable` are pure data-in/callbacks-out; the
// engine is pure functions over rows. Neither imports the other.
//
// Spec: docs/superpowers/specs/2026-07-28-progressive-filter-bar-design.md
import { type Component, For, createMemo, createSignal } from "solid-js";
import { filter, map, pipe } from "../../../src/fn";
import { MutedBody, NoteText, SectionTitle } from "../../../src/components/Text";
import { ContentStack, WrapRow } from "../../../src/components/Layout";
import { FacetTable } from "./matchmaking/FacetTable";
import { FilterBar, type FilterGroup } from "./matchmaking/FilterBar";
import { DIMENSIONS, dimensionById } from "./matchmaking/dimensions";
import {
  type FilterState,
  addFilter,
  addTerm,
  applyFilters,
  clearAll,
  facetRows,
  facetTables,
  removeFilter,
  removeTerm,
  toggleTerm,
} from "./matchmaking/engine";
import { generateDataset } from "./matchmaking/generate";

export const meta = { label: "Matchmaking Filter Bar" };

/** Generated once at module load — 4,000 outings, deterministic seed. */
const data = generateDataset();

const formatCount = (n: number): string => n.toLocaleString();

const MatchmakingFilterBarBench: Component = () => {
  const [state, setState] = createSignal<FilterState>({});

  const tables = createMemo(() => facetTables(data, state()));

  const scopeLabel = createMemo(() => {
    const shown = applyFilters(data.outings, state()).length;
    return shown === data.outings.length
      ? `${formatCount(shown)} dates`
      : `${formatCount(shown)} of ${formatCount(data.outings.length)} dates`;
  });

  /**
   * The bar's view of the world. Member lists come from the same
   * exclude-own-dimension counts the tables use, so the combobox shows what
   * each choice would actually yield.
   */
  const groups = createMemo<FilterGroup[]>(() =>
    pipe(
      Object.keys(state()),
      map((id: string) => {
        const dimension = dimensionById.get(id);
        if (!dimension) return undefined;
        const selected = state()[id] ?? [];
        const rows = facetRows(data, state(), dimension);
        return {
          id,
          label: dimension.label,
          terms: map(
            (value: string) => ({
              value,
              label: dimension.labelOf(value, data),
            }),
            selected,
          ),
          members: map(
            (row) => ({ value: row.value, label: row.label, count: row.count }),
            rows,
          ),
        } satisfies FilterGroup;
      }),
      filter((group): group is FilterGroup => group !== undefined),
    ),
  );

  const availableDimensions = createMemo(() =>
    pipe(
      DIMENSIONS,
      filter((d) => !(d.id in state())),
      map((d) => ({ id: d.id, label: d.label })),
    ),
  );

  return (
    <div class="component-section component-section--full">
      <SectionTitle>Matchmaking Filter Bar</SectionTitle>
      <MutedBody>
        Twelve facet tables over 4,000 dates (outings of 2–6 people). The bar
        starts empty and stays exactly one line tall — every expansion is an
        overlay, so nothing below it ever moves. Click a table's{" "}
        <strong>header</strong> to start filtering on that dimension; click a{" "}
        <strong>row</strong> to toggle that member. Terms are OR'd within a
        filter and AND'd across them.
      </MutedBody>

      <ContentStack>
        <FilterBar
          filters={groups()}
          availableDimensions={availableDimensions()}
          scopeLabel={scopeLabel()}
          onAddFilter={(id) => setState((s) => addFilter(s, id))}
          onRemoveFilter={(id) => setState((s) => removeFilter(s, id))}
          onAddTerm={(id, value) => setState((s) => addTerm(s, id, value))}
          onRemoveTerm={(id, value) => setState((s) => removeTerm(s, id, value))}
          onClearAll={() => setState(clearAll())}
        />

        <NoteText>
          Things worth finding: filter Activity to “midnight bowling” and watch
          Region collapse to one row. Cross Party size 3 with Intimacy 4+ to see
          the third-wheel effect. Cross Duration 4–8h with Intimacy 1 for the
          reversal — long first dates convert far better than short ones.
        </NoteText>

        <WrapRow>
          <For each={tables()}>
            {(table) => (
              <FacetTable
                title={table.label}
                columns={table.columns}
                rows={table.rows}
                activeValues={table.activeValues}
                onHeaderClick={() => setState((s) => addFilter(s, table.id))}
                onCellClick={(value) =>
                  setState((s) => toggleTerm(s, table.id, value))
                }
              />
            )}
          </For>
        </WrapRow>
      </ContentStack>
    </div>
  );
};

export default MatchmakingFilterBarBench;
