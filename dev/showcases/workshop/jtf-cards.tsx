// Workshop bench — JTF Card Catalog (2026-07-22).
// Every card layout in jtf-ui, replicated with realistic stub data and tagged
// SUI-compliant (composed from Surface/Layout/Text variants) or raw (still on
// hand-rolled markup with call-site geometry/color). Sidebar lists feature +
// card name; clicking renders the replica. The catalog is the migration
// worklist made visible — the card-shaped twin of the JTF Table Catalog.
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
import { SmallGhostButton } from "../../../src/components/Button";
import { InteractiveCard } from "../../../src/components/Surface";
import type { CardEntry } from "./jtf-cards/shared";
import { ENTRIES as entityEntries } from "./jtf-cards/entity";
import { ENTRIES as fortnightEntries } from "./jtf-cards/fortnight";
import { ENTRIES as jobQueueEntries } from "./jtf-cards/job-queue";
import { ENTRIES as triageEntries } from "./jtf-cards/triage";
import { ENTRIES as violationEntries } from "./jtf-cards/violations";
import { ENTRIES as toolsEntries } from "./jtf-cards/tools";

// Raw first — they're the migration worklist; stable sort keeps each
// group's internal order.
const ALL: CardEntry[] = [
  ...entityEntries,
  ...fortnightEntries,
  ...jobQueueEntries,
  ...triageEntries,
  ...violationEntries,
  ...toolsEntries,
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

// Resolved worklist flags: Peter marks a card resolved once it's verified; the
// rail lists ONLY unresolved entries so the list is the remaining checklist.
// Persisted per-browser in localStorage; "clear resolved" restores the full
// list for a final regression sweep. (Mirrors the JTF Table Catalog.)
const RESOLVED_KEY = "jtf-cards:resolved";
const readResolved = (): Set<string> => {
  try {
    const raw = localStorage.getItem(RESOLVED_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
};
const writeResolved = (slugs: Set<string>) => {
  localStorage.setItem(RESOLVED_KEY, JSON.stringify([...slugs]));
};

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

const JtfCardsBench: Component = () => {
  // Deep links restore (?t=), and the restored card is scrolled into view in
  // the rail — a selection below the fold reads as "nothing selected".
  const initialSlug = readSlugFromHash();
  const initialIdx = initialSlug ? SLUGS.indexOf(initialSlug) : -1;
  const [active, setActive] = createSignal(initialIdx >= 0 ? initialIdx : 0);

  const revealActive = () => {
    document
      .getElementById(`jtf-card-cat-${SLUGS[active()]}`)
      ?.scrollIntoView({ block: "nearest" });
  };
  const entry = () => ALL[active()];
  const suiCount = ALL.filter((e) => e.status === "sui").length;

  const [resolved, setResolved] = createSignal(readResolved(), {
    equals: false,
  });
  const isResolved = (slug: string) => resolved().has(slug);
  const toggleResolved = (slug: string) => {
    const next = new Set(resolved());
    const marking = !next.has(slug);
    if (marking) next.add(slug);
    else next.delete(slug);
    writeResolved(next);
    setResolved(next);
    // Marking the viewed card resolved moves focus to the top remaining entry
    // — the rail is the checklist; keep working it.
    if (marking && slug === SLUGS[active()]) {
      const [top] = visibleIdx();
      if (top !== undefined) {
        select(top);
        revealActive();
      }
    }
  };
  const clearResolved = () => {
    const none = new Set<string>();
    writeResolved(none);
    setResolved(none);
  };
  // The rail is the REMAINING checklist: indices into ALL, resolved hidden.
  const visibleIdx = () =>
    ALL.map((_, i) => i).filter((i) => !isResolved(SLUGS[i]));

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
      <SectionTitle>JTF Card Catalog</SectionTitle>
      <ClusterRow>
        <TextBody>
          {`Every card layout in jtf-ui with realistic stub data — ${suiCount} of ${ALL.length} SUI-compliant${
            resolved().size ? ` · ${resolved().size} resolved (hidden)` : ""
          }.`}
        </TextBody>
        <Show when={resolved().size > 0}>
          <SmallGhostButton onClick={clearResolved}>
            Clear resolved
          </SmallGhostButton>
        </Show>
      </ClusterRow>
      <PaneRow>
        <DelineatedSidebar class="jtf-catalog-rail">
          <For each={visibleIdx()}>
            {(i) => (
              <InteractiveCard
                id={`jtf-card-cat-${SLUGS[i]}`}
                active={i === active()}
                onClick={() => select(i)}
              >
                <SpreadRow>
                  <TightStack>
                    <TextSublabel>{ALL[i].route}</TextSublabel>
                    <TextBody>{ALL[i].name}</TextBody>
                  </TightStack>
                  {ALL[i].status === "sui" ? (
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
                  <SmallGhostButton
                    onClick={() => toggleResolved(SLUGS[active()])}
                  >
                    {isResolved(SLUGS[active()])
                      ? "✓ Resolved — unmark"
                      : "Mark resolved"}
                  </SmallGhostButton>
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

export const meta = { label: "JTF Card Catalog" };

export default JtfCardsBench;
