# Domain Name Rename Pass — Handoff

**Status:** Planned. Deferred from the depth/classification audit (PR #21, merged as `17afa66`). The user has flagged this twice and wants it tackled in its own focused pass.

**Audience:** A new Claude Code instance picking up this work cold. Read this file plus the linked memory + repo docs before starting.

---

## The principle

`solid-ui-components` (SUI) is the shared component library across all PrimeStage SolidJS apps: `jtf-ui`, `taskmaster`, `amygdala-ui`, `amygdala-ui-explore`, `dside-ui`. **The library names *shapes*; consumer apps name *domain concepts*.** Component names that encode a single domain ("Vessel", "Engine", "AlarmStripe-but-not-really") confuse the shape and discourage adoption from non-maritime apps.

The user has said it twice, the second time more firmly:

> "VesselCard is probably not a great name, it's too tied to one domain"
>
> "SUI shouldn't know about vessels"

This is a load-bearing principle for the library — not a stylistic preference.

---

## Confirmed offenders

These names are in the library today and encode domain concepts. Each is a generic shape underneath:

| Name | Path | Actual shape |
|---|---|---|
| `VesselCard` | `src/components/Card/VesselCard.tsx` | Title + remove-button + details-slot in an `InteractiveCard`. Generic "removable list-item card." |
| `VesselCallHeader` | `src/components/VesselCallHeader/` | Title + optional badge + time range + duration + optional asset chip + optional action slot. Generic "named-thing with time range" header. |
| `EngineDataSection` | `src/components/DataDisplay/EngineDataSection/` | Heading + warning AlertBox + content slot. Generic "section with warning alert + data slot." |

There may be more — see "Sweep for additional offenders" below.

---

## Suggested rename targets (proposals — get user input before applying)

Don't pick one unilaterally. Offer the user a menu with descriptions and let them choose, then save the choice to memory before executing. Custom alternatives are fine; the user's instinct should override these.

**`VesselCard` →** one of: `RemovableItemCard`, `DismissibleCard`, `TitledCard`, `ItemCard` (least specific).

**`VesselCallHeader` →** one of: `TitledTimeRangeHeader`, `NamedSessionHeader`, `EventHeader`, `TimeRangedTitleBar`.

**`EngineDataSection` →** one of: `WarningAlertSection`, `KeyedDataSection`, `AlertedSection`, `AnnotatedSection`.

If a target name is overly long or feels wrong to the user, ask them what they'd call it. The mechanical work is the same regardless of the chosen name.

---

## Mechanical work per rename

Each rename touches a substantial surface. Do them **one at a time** with verification between each — don't batch all three. A regression in one is easier to isolate this way.

For each rename:

1. **Source files** — rename `<Old>.tsx` → `<New>.tsx`, `<Old>.css` → `<New>.css`. If the component lives in a directory matching its name (`src/components/VesselCallHeader/`), rename the directory too.
2. **Exported symbol** — rename the Component, props interface (`<Old>Props` → `<New>Props`), and any helper types.
3. **CSS class prefix** — rename `sui-<old>__*` → `sui-<new>__*` across both the `.tsx` and `.css`. Use `replace_all`-style edits since the prefix is unique enough.
4. **Factory functions** — if there are `create<Old>` factories, rename them too.
5. **Re-export** — update `src/index.ts` (and any intermediate barrel `src/components/<Group>/index.ts`).
6. **Showcase wiring** — update `dev/main.tsx` (the import + the items array entry; the `id:` and `label:` fields).
7. **Showcase file** — rename `dev/showcases/<old>.tsx` → `dev/showcases/<new>.tsx`; rename the exported `<Old>Showcase` → `<New>Showcase`; update the `<h2>` heading and any inline doc prose.
8. **Manifest** — update `COMPONENTS.md`: section heading (if the section is named after the component), entry bullet, and any cross-references in *other* entries (e.g. `EngineDataSection`'s entry might reference `NumberWithUnits` and others; `VesselCard` is the only entry in the `Card` section so the section heading itself moves).
9. **Project memory** — once the rename lands, update `project_vesselcard_naming.md` to drop the renamed offender from the list.
10. **Verification cadence** — after each rename: `npx tsc --noEmit` (must pass), `npm test` (must pass — 380 tests currently), open the showcase in the browser and visually verify.

---

## Downstream coordination — ask before assuming

This is a **breaking change to the library's public API**. Consumer apps that import `VesselCard` etc. will break the moment they pull this version.

Get user input on:

- **One PR or per-rename PRs?** Per-rename gives cleaner review and easier rollback; one PR groups the breaking change into a single library version bump.
- **Update downstream consumers in this PR?** The library is consumed by 5 apps (`jtf-ui`, `taskmaster`, `amygdala-ui`, `amygdala-ui-explore`, `dside-ui`). The user may want a coordinated sweep that updates the consumer apps' imports in the same change, or they may want to bump the library version and let consumers migrate at their own pace.
- **Version bump strategy?** Check `package.json` — the library is currently at some 0.x version. A major-bump-vs-minor decision belongs to the user.

Don't guess any of these. Ask.

---

## Sweep for additional offenders

Don't trust the list to be complete. Before starting renames, do a fresh sweep:

```
grep -rl --include="*.tsx" -E "(Vessel|Engine|Alarm|Maritime|Cargo|Shipment|Port|Sail)" src/components/ | head
```

Inspect each hit. Anything that's a *shape* dressed in a *domain* word should join the list. Read its `tsx` source — if it composes generic things (Surface, Text, Layout) and doesn't touch the domain in any meaningful way, it's a rename candidate.

Surface findings to the user before proposing names — they decide what's an offender and what's legitimately domain-specific.

---

## Current state of the audit work (what's already done — don't re-do)

The depth/classification audit closed in PR #21. Everything below is already in `main` as of `17afa66`:

- 5 components promoted from Composite to Atomic Primitive: DateRangePicker, NumberWithUnits, MetricCard, ResultDisplay, VesselCallHeader.
- PivotTreemap dropped 7 static inline styles via new Curried Variants (`ChipLabel`, `EllipsizedChipLabel`, `CountText`, `TightSpreadRow`).
- ConversationTree depth claim corrected (3+ → 2).
- Duration formalised as a styleless Atomic Primitive.
- CONTEXT.md grew two glossary concepts: **Kobalte-wrapping Primitive**, **Styleless Primitive** (the carve-out for Duration-shape components).
- `formatDateTimeRange` pure helper extracted (shared between `DateTimeRange` Composite and `VesselCallHeader` Primitive).
- ResultDisplay gained `highlightable` + `highlighted` Data Props (absorbed FormulaDecomposition's hover-target wrapper).
- All 7 previously-unclassified Manifest entries now labelled.
- Depth cascade propagated to ResultPanel + FormulaDecomposition + `dev/main.tsx` tags.
- VesselCallHeader CSS class prefix migrated `jtf-` → `sui-` (the rename to a non-domain name is what's outstanding).

When you read the source for the three offenders, you'll see headers explicitly flagging the domain-bound name. That flag is your TODO marker.

---

## Suggested approach for the next agent

1. **Read these first.** In order:
   - This file (you're here).
   - User's project memory: `~/.claude/projects/-Users-aarnold-gits-primestage-solid-ui-components/memory/MEMORY.md` and especially `project_vesselcard_naming.md`.
   - `CONTEXT.md` (the glossary the rename must respect).
   - `COMPONENTS.md` entries for the three offenders.
   - `AGENT_GUIDE.md` (the #1 rule about Curried Variants).
2. **Sweep for additional offenders** (see grep above). Surface findings.
3. **Ask the user the three open questions** below before touching any code.
4. **Execute renames one at a time** with full verification between each (`tsc` + `npm test` + browser).
5. **Use the same workflow that closed the audit:** feature branch → push → PR → `/pr-review-toolkit:review-pr` → apply review fixes → squash merge. The user invoked `/pr-review-toolkit:review-pr 21` during the audit pass — same shape works here.
6. **Update project memory** after the work lands so the next session doesn't re-flag the same offenders.

---

## Open questions for the user

These must be answered before any rename is executed:

1. **Which names?** Pick from the proposals above or offer alternatives.
2. **One PR or three?** (Recommendation: three, for cleaner review per-rename.)
3. **Update the 5 downstream consumer apps in the same PR(s), or bump the library version and let consumers migrate?** Default if unclear: library only, version bump.
4. **Are there other domain-bound names in the codebase?** (Run the sweep, surface findings, get yes/no per candidate.)

---

## Constraints (don't break these)

- **Don't rename unilaterally** — naming is a UX decision for the user.
- **Don't touch the audit work** — PR #21 is merged, the depth/classification scope is closed. If you find a depth or contract issue while renaming, surface it but don't fix it in this PR.
- **Honor the principle** — SUI names shapes, consumer apps name domain concepts. If the user proposes a domain-flavored replacement name, push back gently and offer a shape-flavored alternative.
- **Verify visually** — type checks + unit tests will catch most regressions, but the rename will touch CSS class prefixes too. Open each renamed showcase in the browser and confirm visual parity.
- **Co-author commits as Claude** — the audit PR used `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`. Match that convention.
