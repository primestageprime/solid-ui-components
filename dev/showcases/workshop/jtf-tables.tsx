// Workshop bench — JTF Table Catalog (2026-07-17).
// Every table in jtf-ui, replicated with realistic stub data and tagged
// SUI-compliant (FieldTable/fields/ValueMatrix) or raw (still on BaseTable
// with call-site geometry/color). Sidebar lists route + table name; clicking
// renders the replica. The catalog is the migration worklist made visible.
import type { Component } from "solid-js";
import { createSignal, For, Show, onCleanup, onMount } from "solid-js";
import { SectionTitle, TextBody, TextSublabel } from "../../../src/components/Text";
import {
  ContentStack,
  TightStack,
  PaneRow,
  GrowColumn,
  ClusterRow,
  DelineatedSidebar,
  SpreadRow,
  ScrollXBox,
} from "../../../src/components/Layout";
import { CompliantBadge, WarningBadge } from "../../../src/components/Badge";
import { InteractiveCard } from "../../../src/components/Surface";
import { pipe, map, filter, sortBy, length } from "../../../src/fn";
import { CUSTOM_DEMANDS, type TableEntry } from "./jtf-tables/shared";
import { ENTRIES as fortnightEntries } from "./jtf-tables/fortnight";
import { ENTRIES as widgetEntries } from "./jtf-tables/widgets";
import { ENTRIES as powerEntries } from "./jtf-tables/power";
import { ENTRIES as routeEntries } from "./jtf-tables/routes";
import { ENTRIES as triageEntries } from "./jtf-tables/triage";

// Raw first — they're the migration worklist; stable sort keeps each
// group's internal order.
const ALL: TableEntry[] = [
  ...fortnightEntries,
  ...widgetEntries,
  ...powerEntries,
  ...routeEntries,
  ...triageEntries,
].sort((a, b) => (a.status === b.status ? 0 : a.status === "raw" ? -1 : 1));

// Stable slug per entry for the ?t= hash param (deep-linkable selection).
// The gallery router only reads the path segment and known params, so an
// extra param passes through parseHash untouched.
const slugify = (s: string): string =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
const SLUGS = (() => {
  const seen = new Map<string, number>();
  return ALL.map((e) => {
    const base = slugify(e.name);
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    return n === 0 ? base : `${base}-${n + 1}`;
  });
})();

// The not-yet-curried rail: each demand's table count derives from the
// entries' `customs` annotations — the definitions never carry counts.
const usesDemand = (id: string) => (e: TableEntry) =>
  (e.customs ?? []).includes(id);

const demandTableCount = (id: string): number =>
  pipe(ALL, filter(usesDemand(id)), length);

const DEMAND_RAIL = pipe(
  CUSTOM_DEMANDS,
  map((d) => ({ ...d, count: demandTableCount(d.id) })),
  filter((d) => d.count > 0),
  sortBy((d) => -d.count),
);

const readSlugFromHash = (): string | null => {
  const [, queryStr = ""] = location.hash.replace(/^#\/?/, "").split("?");
  return new URLSearchParams(queryStr).get("t");
};

const hashWithSlug = (slug: string): string => {
  const raw = location.hash.replace(/^#\/?/, "");
  const [path, queryStr = ""] = raw.split("?");
  const params = new URLSearchParams(queryStr);
  params.set("t", slug);
  return `#/${path}?${params.toString()}`;
};

/** Click selections push history (back/forward walks them). */
const writeSlugToHash = (slug: string) => {
  location.hash = hashWithSlug(slug);
};

const JtfTablesBench: Component = () => {
  // Deep links restore (?t=), and the restored card is scrolled into view in
  // the rail — a selection below the fold read as "nothing selected"
  // (ruled 2026-07-18).
  const initialSlug = readSlugFromHash();
  const initialIdx = initialSlug ? SLUGS.indexOf(initialSlug) : -1;
  const [active, setActive] = createSignal(initialIdx >= 0 ? initialIdx : 0);

  const revealActive = () => {
    document
      .getElementById(`jtf-cat-${SLUGS[active()]}`)
      ?.scrollIntoView({ block: "nearest" });
  };
  const entry = () => ALL[active()];
  const suiCount = ALL.filter((e) => e.status === "sui").length;

  const select = (i: number) => {
    setActive(i);
    writeSlugToHash(SLUGS[i]);
  };

  // Back/forward restores the selection from the hash.
  onMount(() => {
    // Reflect the restored/default selection in the URL without minting a
    // history entry, and make sure its card is visible in the rail.
    history.replaceState(null, "", hashWithSlug(SLUGS[active()]));
    revealActive();
    const onHash = () => {
      const slug = readSlugFromHash();
      const idx = slug ? SLUGS.indexOf(slug) : -1;
      if (idx >= 0 && idx !== active()) {
        setActive(idx);
        revealActive();
      }
    };
    window.addEventListener("hashchange", onHash);
    onCleanup(() => window.removeEventListener("hashchange", onHash));
  });

  return (
    <div class="component-section component-section--full">
      <SectionTitle>JTF Table Catalog</SectionTitle>
      <TextBody>
        {`Every table in jtf-ui with realistic stub data — ${suiCount} of ${ALL.length} SUI-compliant. The warning-tagged replicas are the migration worklist.`}
      </TextBody>
      <PaneRow>
        <DelineatedSidebar class="jtf-catalog-rail">
          <For each={ALL}>
            {(e, i) => (
              <InteractiveCard
                id={`jtf-cat-${SLUGS[i()]}`}
                active={i() === active()}
                onClick={() => select(i())}
              >
                <SpreadRow>
                  <TightStack>
                    <TextSublabel>{e.route}</TextSublabel>
                    <TextBody>{e.name}</TextBody>
                  </TightStack>
                  {e.status === "sui" ? (
                    <CompliantBadge label="SUI" />
                  ) : (
                    <WarningBadge label="raw" />
                  )}
                </SpreadRow>
              </InteractiveCard>
            )}
          </For>
        </DelineatedSidebar>
        <GrowColumn>
          <Show when={entry()} keyed>
            {(e) => (
              <ContentStack>
                <ClusterRow>
                  {e.status === "sui" ? (
                    <CompliantBadge label="SUI compliant" />
                  ) : (
                    <WarningBadge label="not migrated" />
                  )}
                  <TextSublabel>{`${e.route} — ${e.name}`}</TextSublabel>
                </ClusterRow>
                <TextSublabel>{e.note}</TextSublabel>
                <ScrollXBox class="jtf-catalog-pane">
                  <e.component />
                </ScrollXBox>
              </ContentStack>
            )}
          </Show>
        </GrowColumn>
        {/* Not-yet-curried rail: the field types still blocking migrations,
            counts derived from the entries' customs annotations. */}
        <DelineatedSidebar class="jtf-catalog-demand-rail">
          <TextSublabel>NOT YET CURRIED</TextSublabel>
          <For each={DEMAND_RAIL}>
            {(d) => (
              <TightStack>
                <SpreadRow>
                  <TextBody>{d.name}</TextBody>
                  <WarningBadge label={`${d.count} table${d.count === 1 ? "" : "s"}`} />
                </SpreadRow>
                <TextSublabel>{d.why}</TextSublabel>
              </TightStack>
            )}
          </For>
        </DelineatedSidebar>
      </PaneRow>
    </div>
  );
};

export const meta = { label: "JTF Table Catalog" };

export default JtfTablesBench;
