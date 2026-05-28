---
name: workshop
description: Use when spinning up an isolated workshop bench to prototype an SUI component without clobbering other agents — for "/workshop <name>", "spin up a workshop", "new bench", "list benches", "remove a bench". Backs onto scripts/workshop-{new,list,remove}.mjs; benches auto-appear in the dev gallery (npm run dev, port 6006) under the Workshop link.
---

# Workshop benches (parallel prototyping)

The dev gallery has one **master** workshop (`dev/showcases/workshop.tsx`) plus
an arbitrary number of **benches** under `dev/showcases/workshop/<slug>.tsx`.
Each bench is its own file, auto-discovered by `dev/main.tsx` — so multiple
Claudes can each prototype a component on their own bench at the same time
without touching the same file or any shared registration block.

This is the front half of the build loop:

> `/workshop <name>` → build on the bench → iterate until the API is settled → `/promote` → done.

## Commands

- **Create:** `/workshop <name>` → `node scripts/workshop-new.mjs <slug> [--label "Nice Label"]`
  - `<slug>` must be kebab-case (`a-z`, `0-9`, hyphen). The script **refuses to
    overwrite** an existing bench, so you can never clobber another agent's work.
  - Writes `dev/showcases/workshop/<slug>.tsx` (a default-exported `Component`
    with a `meta.label`) and prints the nav id `workshop:<slug>`.
- **List:** `/workshop list` → `node scripts/workshop-list.mjs`
- **Remove:** `/workshop remove <name>` → `node scripts/workshop-remove.mjs <slug>`
  (teardown for an abandoned bench; promotion is handled by `/promote`).

## Steps for `/workshop <name>`

1. Derive a kebab-case `<slug>` from the requested name (e.g. "Scrub Chart" → `scrub-chart`).
2. Run `node scripts/workshop-new.mjs <slug> --label "<Nice Label>"`. If it
   reports the bench already exists, stop and tell the user — do not overwrite.
3. Tell the user the bench is live: it appears in the gallery under the
   **Workshop** link at `npm run dev` (port 6006), nav id `workshop:<slug>`.
   Build the prototype component in `dev/showcases/workshop/<slug>.tsx`.

## Git discipline (shared checkout)

All agents share one checkout and one git index. **Stage only your own bench
path** — never `git add -A`:

```bash
git add dev/showcases/workshop/<slug>.tsx src/components/<Name>/
```

Committing `-A` would sweep up other agents' in-flight benches.
