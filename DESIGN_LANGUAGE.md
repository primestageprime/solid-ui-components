# Design Language

A shorthand vocabulary for drafting page mockups in the Sandbox. Each entry maps a phrase the user will say verbally to a precise structural meaning, the curried components that compose it, and a reference invocation. When a phrase recurs, prefer adding a new curried variant over re-styling.

> Drafting rule: in mockups, use **only curried components** — `TightStack`, `SpacedStack`, `ContentStack`, `LgRegion`, `ClusterRow`, `SpreadRow`, `ActionSlot`, `SimplePanel`, `BorderedSection`, `TextLabel`, `HintText`, etc. Never reach for the raw `<Stack>` / `<Row>` / `<Box>` / `<Panel>` primitives in mockups; if a curried variant doesn't exist for the pattern, add one.

---

## Phrase index

- [the baseline](#the-baseline) — every mock starts here
- [shrink-wrapped delineated sidebar with chosen cards](#shrink-wrapped-delineated-sidebar-with-chosen-cards)
- [quickfilter](#quickfilter)
- [detail area](#detail-area)
- [proportional stack](#proportional-stack)

---

## the baseline

Every mock step starts from a single helper, `MockBaseline` (in `dev/sandbox.tsx`). It sets up the layered visual frame so the mock reads correctly inside the sandbox harness:

| layer | purpose | source |
| --- | --- | --- |
| **harness chrome** | black surround that says "this is the harness, not the app" | `.sui-sandbox` + `.sui-sandbox__sidebar` (`background: #000`) |
| **mock frame** | gray border around the mocked surface so its alignment and proportions are visible | `.sui-sandbox__content` (`background: #333; padding: 32px 40px`) |
| **page canvas** | thematic dark surface inside the gray frame — this is "the app's page" | `PageCanvas` curried Box (`var(--jtf-bg-primary)`, fills 100%, no margin/padding) |
| **mock content** | whatever the scenario shows; uses **only curried components** | `DelineatedSidebar` + `ContentStack` + curried Panel/Text/etc. |

Default contents = the [shrink-wrapped delineated sidebar](#shrink-wrapped-delineated-sidebar-with-chosen-cards) on the left + a `SimplePanel` detail on the right. Both render an `LgRegion` with a `HintText` empty-state message by default.

**To author a new mock**, drop a new `SandboxStep` into `SEED_STEPS`:

```tsx
{
  id: "my-step",
  label: "My step",
  render: () => <MockBaseline />,           // empty baseline, default hints
}
```

Override either region to put real content in:

```tsx
render: () => (
  <MockBaseline
    sidebar={
      <TightStack>
        <CompactCard>statement #1</CompactCard>
        <CompactCard>statement #2</CompactCard>
      </TightStack>
    }
    detail={
      <ContentStack>
        <PageTitle>Statement #1</PageTitle>
        {/* curried components only */}
      </ContentStack>
    }
  />
)
```

If you only want to override the empty-state text on a region without changing its structure, use the string props instead:

```tsx
<MockBaseline
  sidebarEmpty="enter a false Statement below to begin generating work"
  detailEmpty="No Statement selected"
/>
```

The "+ add scratch step" button at the bottom of the sandbox sidebar produces a new in-memory step pre-loaded with `MockBaseline`, so you can riff without editing source.

---

## shrink-wrapped delineated sidebar with chosen cards

**Phrase parts and what each token means:**

| token | meaning |
| --- | --- |
| **sidebar** | a vertical column at the left of a two-column body |
| **shrink-wrapped** | the column locks at the 400px floor in practice — fixed at exactly 400px (`width / min-width / max-width: 400px`) so cards fit a predictable slot and long titles ellipsize *inside* the card rather than blowing the column out. (Earlier iterations used `min-content` to "shrink to fit" narrower content; in practice this collapsed badly with `white-space: nowrap` titles, so the column is now pinned.) |
| **(min 400px)** | floor on width so the column is always visible as a region, never collapses to zero |
| **delineated** | a visible vertical line at the right edge of the column, so the user can see where the sidebar ends even when its body is empty |
| **chosen cards** | the contents are small cards representing user-selected items, stacked top-to-bottom |
| **empty state** | when there are no chosen cards, the column still occupies its 400px minimum and shows a hint message |

**Curried variant added for this phrase:** `DelineatedSidebar` (in `Layout/variants.ts`).

```ts
export const DelineatedSidebar = createStack({
  gap: "sm",
  style: {
    "min-width": "400px",
    width: "min-content",
    "align-self": "stretch",
    "border-right": "1px solid var(--sui-border, rgba(255, 255, 255, 0.12))",
    padding: "0 12px",
  },
});
```

**Example invocation (empty):**

```tsx
<FlexRow gap="md" align="stretch">
  <DelineatedSidebar>
    <LgRegion>
      <HintText>enter a false Statement below to begin generating work</HintText>
    </LgRegion>
  </DelineatedSidebar>
  <ContentStack>
    {/* detail */}
  </ContentStack>
</FlexRow>
```

**Example invocation (populated):**

```tsx
<DelineatedSidebar>
  <CompactCard>statement #1</CompactCard>
  <CompactCard>statement #2</CompactCard>
  <CompactCard>statement #3</CompactCard>
</DelineatedSidebar>
```

When chosen cards are present, the sidebar widens to fit the longest card. When empty, it stays at exactly 400px so the right-edge line is always visible as a column delimiter.

---

## quickfilter

A filter box that sits atop a list (or table, or tree) and filters its contents in-page. Receives a list of items and a text accessor; renders a search input + a render-prop child that gets the filtered subset. Composable: drop it anywhere a list-shaped collection is rendered.

**Component:** `QuickFilter` (Atomic, Depth 1) — owns its own input state and matching logic; caller controls how the filtered output is rendered.

```ts
interface QuickFilterProps<T> {
  items: readonly T[];
  /** Returns the searchable text per item. Default: JSON.stringify(item). */
  extract?: (item: T) => string;
  placeholder?: string;
  initialQuery?: string;
  onQueryChange?: (query: string) => void;
  children: (filtered: readonly T[], query: string) => JSX.Element;
}
```

Matching: query is lowercased, split on whitespace, and every token must appear (substring) in the extracted text. So `"Latency 99"` matches a title `"Latency is below the 200ms p99 target across all regions"`.

**Composes with anything that takes a list:**

```tsx
// list
<QuickFilter items={statements} extract={(s) => s.title} placeholder="Filter…">
  {(filtered) => (
    <TightStack>
      <For each={filtered}>{(s) => <StatementCard s={s} />}</For>
    </TightStack>
  )}
</QuickFilter>

// table
<QuickFilter items={rows} extract={(r) => `${r.name} ${r.category}`}>
  {(filtered) => <BaseTable data={filtered} columns={cols} />}
</QuickFilter>

// tree
<QuickFilter items={flatNodes} extract={(n) => n.label}>
  {(filtered) => <Tree nodes={filtered} />}
</QuickFilter>
```

**In the sandbox baseline:** drop a `QuickFilter` directly into `MockBaseline`'s `sidebar` region — it provides both the input and the filtered list, no separate region wiring needed:

```tsx
<MockBaseline
  sidebar={
    <QuickFilter items={statements} extract={(s) => s.title} placeholder="Filter statements…">
      {(filtered) => sidebarOf(filtered)}
    </QuickFilter>
  }
/>
```

> Naming note: there's also a `FilterableTable` (formerly named `QuickFilter`) under `Table/` that is a higher-level Depth-2 wrapper specifically tying the filter to `BaseTable`. Use that for one-liners over a table; use the atomic `QuickFilter` here when you need the filter to compose over an arbitrary list/tree.

---

## detail area

The big region to the right of a [chosen sidebar](#shrink-wrapped-delineated-sidebar-with-chosen-cards). Renders the **single chosen item** (the chosen card in the sidebar is a singleton — only one is selected at any time, with a visible chosen indicator on the card).

**Always-on layout rule:** the detail area opens with the **identity** of the chosen item at the top — name, status, key metadata — followed by **further detail sections** (timelines, activity, related items, body content, etc.). Identity comes first because the user just clicked into it from a list and needs immediate confirmation of which item this is.

Common section structure:

```
[Identity header]              identity / title / metadata strip
[Section: TIMELINE]            uppercase muted section label + entries
[Section: ACTIVITY]
[Section: ...]
```

**Region:** the detail area lives in `MockBaseline`'s `detail` prop. When nothing is chosen, the region shows `detailEmpty` text in a centered `LgRegion`.

```tsx
<MockBaseline
  sidebar={sidebarOf(items, chosen.id)}
  detail={<ItemDetail item={chosen} />}
/>
```

**Chosen indicator on the sidebar card:** the chosen sidebar card gets a 2px ring in the item's status color so it stands out at a glance. There is at most one ringed card.

Composed from curried atoms: `SpacedStack` (overall column) → `TightStack` (identity block) + `NarrowStack` (each section), with `PageTitle` / `TextSublabel` / `MutedBody` for typography and a small `SectionLabel` helper (an uppercased, dimmed `TextSublabel`) for section headers.

---

## proportional stack

A column or row that **always uses all available space** in its parent and splits it among its children by a per-child **weight**. When children's total content fits, weights still apply — leftover is shared by weight, sections don't sprawl beyond their share. When content overflows a section's share, that section scrolls **inside** its share rather than pushing the page.

**Components:** `ProportionalStack` (container) + `ProportionalItem` (weighted child) — primitives in `Layout/`.

```ts
interface ProportionalStackProps {
  direction?: "column" | "row";   // default "column"
  gap?: "xs" | "sm";              // default "sm"
}

interface ProportionalItemProps {
  weight?: number;            // default 1; 0 = fixed-content (shrink-wrap, no share)
  scrollWhenSmall?: boolean;  // default true; internal scroll when content > share
}
```

The flex math: `flex: <weight> 1 0`. Basis 0 means weights determine share regardless of content; min-height/min-width 0 + overflow auto means an oversized child scrolls inside its share rather than blowing out.

```tsx
<ProportionalStack direction="column" gap="md">
  <ProportionalItem weight={0}>           {/* fixed-size header */}
    <DetailHeader ... />
  </ProportionalItem>
  <ProportionalItem weight={1}>           {/* small share */}
    <Evidence />
  </ProportionalItem>
  <ProportionalItem weight={3}>           {/* big share */}
    <Discussion />
  </ProportionalItem>
  <ProportionalItem weight={2}>           {/* medium share */}
    <Activity />
  </ProportionalItem>
</ProportionalStack>
```

**Use for:** any container whose children need to share a fixed space (a detail area, a dashboard column, a multi-pane layout) without one section pushing the page or starving another.
