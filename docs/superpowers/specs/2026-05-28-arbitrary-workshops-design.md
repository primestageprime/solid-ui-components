# Arbitrary Workshop Benches — Design

**Date:** 2026-05-28
**Status:** Approved (brainstorm), pending implementation plan

## Problem

Today there is exactly **one** Workshop: `dev/showcases/workshop.tsx`, registered
once in `dev/main.tsx` (hardcoded import, hardcoded `items` entry at
`main.tsx:126`, and a dedicated sidebar link). It is deliberately throwaway and
gets rewritten as components are promoted out of it.

This single-slot design means two Claude instances prototyping different
components at the same time **clobber each other** — they edit the same
`workshop.tsx` bytes and the same registration block in `main.tsx`.

Goal: let an arbitrary number of in-progress component benches coexist so
multiple Claudes can build prototype SUI components simultaneously without
collisions.

## Constraints & decisions (from brainstorming)

- **Isolation unit:** namespaced benches in one app. The `workshop` concept
  becomes a *folder of benches* auto-discovered by `main.tsx`, so there is no
  shared registration block to clobber.
- **Git/runtime layer:** one shared checkout, one dev server (port 6006). No
  worktree machinery. Git discipline (staging only one's own bench path) is left
  to the agents and reinforced by the skill.
- **Spin-up ergonomics:** a `/workshop` skill is the agent-facing entry point,
  backed by deterministic node scripts that do the file work.
- **Keep the master workshop:** the existing `dev/showcases/workshop.tsx` stays
  exactly as-is (another Claude is actively working in it). The new process only
  *adds* benches alongside it. `workshop.tsx` and its registration are never
  edited by this work.

## Architecture

### 1. Bench folder + auto-discovery

- The master workshop file `dev/showcases/workshop.tsx` (id `"workshop"`,
  `WorkshopShowcase`, dedicated sidebar link) is untouched.
- New benches live in a sibling **folder** `dev/showcases/workshop/`. The file
  and folder coexist: the discovery glob `./showcases/workshop/*.tsx` matches
  only files *inside* the folder, never `workshop.tsx` itself.
- `main.tsx` gains a small **additive** block — nothing existing is rewritten:

  ```ts
  type BenchMeta = { label?: string; order?: number };

  const benchModules = import.meta.glob<{ default: Component; meta?: BenchMeta }>(
    "./showcases/workshop/*.tsx",
    { eager: true },
  );

  const workshopBenches: Item[] = Object.entries(benchModules)
    .map(([path, mod]) => {
      const slug = path.match(/\/([^/]+)\.tsx$/)![1];
      return {
        item: {
          id: `workshop:${slug}`,
          label: mod.meta?.label ?? slugToTitle(slug),
          component: mod.default,
          tags: ["workshop"],
        } satisfies Item,
        order: mod.meta?.order ?? 0,
      };
    })
    .sort((a, b) => a.order - b.order || a.item.label.localeCompare(b.item.label))
    .map((e) => e.item);
  ```

  `order` is a transient sort key only — the existing `Item` type
  (`{ id; label; component; tags }`) is **not** changed. The resulting items are
  concatenated onto the existing `items` array; the hardcoded master item stays
  first.

- Benches are tagged `"workshop"`, so the existing depth-grouped list filter
  (`main.tsx:337`, `!i.tags.includes("workshop")`) already excludes them — no
  change needed there.

### Bench file contract

Each bench file (`dev/showcases/workshop/<slug>.tsx`):

- **default-exports** a SolidJS `Component`.
- optionally `export const meta = { label?: string; order?: number }`.

`label` falls back to the slug rendered as Title Case. `order` (ascending)
sorts the bench list; default 0, then alphabetical by label.

### 2. Nav presentation

- The existing "Workshop" sidebar button (master) is unchanged and keeps its
  prominence.
- Directly beneath it, render a **bench list**: one clickable row per discovered
  bench, navigating to `workshop:<slug>`. The active row gets the active style,
  mirroring `workshop-link--active`.
- When the folder is empty (no benches), the list renders nothing — the sidebar
  looks exactly like today.

### 3. `/workshop` skill + backing scripts

Deterministic file work lives in node scripts under `scripts/`; the skill is
thin orchestration.

**Scripts:**

- `scripts/workshop-new.mjs <slug> [--label "Nice Label"]`
  - Validates `<slug>` is kebab-case (`^[a-z0-9]+(-[a-z0-9]+)*$`).
  - **Refuses if `dev/showcases/workshop/<slug>.tsx` already exists** — cannot
    clobber another Claude's bench.
  - Writes the bench file from the template below.
  - Prints the written path and the nav id `workshop:<slug>`.
- `scripts/workshop-list.mjs` — lists current benches (reads the folder; prints
  slug + label).
- `scripts/workshop-remove.mjs <slug>` — deletes the bench file (teardown for an
  abandoned bench; promotion is handled separately by `/promote`).

**Template** the `new` script writes:

```tsx
import { Component } from "solid-js";
import { SectionTitle } from "../../../src/components/Text";

export const meta = { label: "<Label>" };

const <Pascal>Bench: Component = () => (
  <div class="component-section component-section--full">
    <SectionTitle><Label></SectionTitle>
    {/* build here */}
  </div>
);

export default <Pascal>Bench;
```

(`<Label>` from `--label` or Title-Cased slug; `<Pascal>` is the PascalCase
slug.)

**Skill** `.claude/skills/workshop/SKILL.md` (frontmatter `name: workshop`,
`description` covering "/workshop <name>", "spin up a workshop", "new bench"):

- `/workshop <name>` → run `workshop-new`, confirm the bench appears in nav
  (it auto-discovers on HMR), leave the agent ready to build in it.
- `/workshop list` → run `workshop-list`.
- `/workshop remove <name>` → run `workshop-remove`.
- Includes a **git-discipline reminder**: shared checkout — stage only your own
  bench path (`git add dev/showcases/workshop/<slug>.tsx`), never `git add -A`.

## Data flow

1. Agent runs `/workshop scrub-chart` → skill calls `workshop-new.mjs scrub-chart`.
2. Script writes `dev/showcases/workshop/scrub-chart.tsx` (refusing if present).
3. Vite HMR + `import.meta.glob` pick up the new file; `main.tsx` builds a new
   `Item` and renders a bench row under the Workshop link.
4. Agent iterates in that one file; on settle, `/promote` graduates it. Abandon
   via `/workshop remove scrub-chart`.

## Error handling

- `workshop-new`: non-kebab slug → error + usage. Existing file → error naming
  the conflicting path (never overwrite).
- `workshop-remove`: missing file → warn, no-op.
- `main.tsx` discovery: an empty folder yields zero benches (sidebar unchanged).
  A bench whose module lacks a default export is a build-time TS error surfaced
  by the dev server, which is acceptable for a throwaway bench.

## Testing

- Unit-test the pure helpers in the scripts where they exist (slug validation,
  `slugToTitle`/PascalCase). Keep scripts small enough to test their core
  functions, mirroring `dev/load-theme.test.ts`.
- Manual: create two benches, confirm both appear in the sidebar, navigate
  between them and the master workshop, remove one, confirm it disappears.
- `npx tsc --noEmit` clean with benches present.

## Out of scope (follow-ups, flagged not built)

1. **`/promote` generalization** — the `/promote` skill currently targets
   `dev/showcases/workshop.tsx` (singular). Once benches exist it should also
   accept a bench path (`dev/showcases/workshop/<slug>.tsx`). Flagged here; not
   part of this work.
2. Any worktree / multi-dev-server automation — explicitly rejected in favor of
   the shared-checkout model.

## Files touched

- **New:** `dev/showcases/workshop/` (folder), `scripts/workshop-new.mjs`,
  `scripts/workshop-list.mjs`, `scripts/workshop-remove.mjs`,
  `.claude/skills/workshop/SKILL.md`.
- **Edited (additive only):** `dev/main.tsx` (glob block + bench-list nav
  rendering), possibly `dev/main.css` (bench-row style, reusing
  `workshop-link`).
- **Untouched:** `dev/showcases/workshop.tsx` and its existing registration.
