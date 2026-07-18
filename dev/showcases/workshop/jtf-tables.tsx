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
import type { TableEntry } from "./jtf-tables/shared";
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
  // A (re)load always lands on the TOP of the worklist (ruled 2026-07-18) —
  // any stale ?t= from a previous session is replaced, not restored.
  const [active, setActive] = createSignal(0);
  const entry = () => ALL[active()];
  const suiCount = ALL.filter((e) => e.status === "sui").length;

  const select = (i: number) => {
    setActive(i);
    writeSlugToHash(SLUGS[i]);
  };

  // Back/forward restores the selection from the hash.
  onMount(() => {
    // Reflect the top item in the URL without minting a history entry.
    history.replaceState(null, "", hashWithSlug(SLUGS[0]));
    const onHash = () => {
      const slug = readSlugFromHash();
      const idx = slug ? SLUGS.indexOf(slug) : -1;
      if (idx >= 0 && idx !== active()) setActive(idx);
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
              <InteractiveCard active={i() === active()} onClick={() => select(i())}>
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
      </PaneRow>
    </div>
  );
};

export const meta = { label: "JTF Table Catalog" };

export default JtfTablesBench;
