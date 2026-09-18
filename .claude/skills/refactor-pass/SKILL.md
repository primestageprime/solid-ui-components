---
name: refactor-pass
description: Use when taking one item off the SUI adherence worklist (docs/adherence/OPEN_ITEMS.md) as a background refactor — for "/refactor-pass ADH-Fab-css", "fix that adherence item", "take the top open item", or after the SessionStart banner lists items you want cleared. Spawns a background agent in its own worktree that fixes exactly one item WITHOUT changing the public API, gates it, and opens a PR.
---

# Refactor pass — one adherence item, no public API change

`scripts/adherence.mjs` produces a per-component worklist of design-philosophy
violations (`docs/adherence/OPEN_ITEMS.md`, ids like `ADH-Fab-css`). This skill
turns ONE of those ids into a merged PR.

The whole point is the constraint: **the public API does not move.** An
adherence item is about the inside of a component. If a fix needs a prop added,
a prop removed, or a render to change, it is not this skill's job — it is a
conversation with Peter (BEST_PRACTICES §4 gates the variant surface in both
directions).

## Pick the item

If the invocation named an id, use it. Otherwise:

```
npm run adherence            # refreshes the two files, prints the top 20
```

Take the first `HIGH` item. The list is sorted severity → smallest job first,
so the head of it is the cheapest real win. Never take:

- `unused-variants` or `missing-factory` — both `info`, both change the public
  surface, both Peter's call (§4). Report them, don't act on them.
- `intrinsic-svg` — `info`; §8 exempts chart interiors. If you believe a
  specific one is not a chart, say so and stop.
- anything listed under `## Exempted` — the reason is printed with it.

## Confirm the item is real before spawning

Two minutes here saves an agent an hour. Read the component's header comment
and the file the item names, and check:

1. **Is the declared depth right?** Several rules key off it. If the header is
   wrong, the correct fix is the header (a one-line commit), not a refactor —
   and it will close the item.
2. **Is there an exemption that should exist and doesn't?** If the STYLE_GUIDE
   or BEST_PRACTICES names this component or this shape as exempt, the fix is
   an entry in `scripts/adherence-exemptions.json` with the quoted reason.
   That is a legitimate outcome of a refactor pass, not a cop-out — but the
   reason must cite a document, not an opinion.
3. **Does a `layout-purity-refactor` fit better?** If the item is `css` and the
   stylesheet is flex/grid/gap geometry, that skill already exists and has the
   visual-verification procedure. Use it and stop here.

## Pin the API before you change anything

```
node -e 'import("./scripts/export-usage-report.mjs").then(({collectExportSurface})=>{
  const s = collectExportSurface("src/index.ts");
  console.log(JSON.stringify({v:[...s.valueExports].sort(),t:[...s.typeExports].sort()}));
})' > /tmp/sui-api-before.json
```

This is the mechanical definition of "no public API change": the same name
list, before and after. Prose promises are not checkable; this is. Re-run it
at the end and `diff` — any difference fails the pass.

Also note the component's own test file. If it has none, **write the mounting
test first** and land it in its own commit: a refactor with no test pinning the
render is a rewrite. `npm run render-coverage -- --list` says whether one
exists.

## Spawn the background agent

Spawn ONE agent with `isolation: "worktree"` and give it, verbatim:

- the item id, its title, and its `detail` list from `docs/adherence/report.json`
- the rule's rationale — copy the relevant paragraph out of
  `scripts/adherence.mjs`'s header, which names the document each rule comes
  from, rather than paraphrasing it
- the `/tmp/sui-api-before.json` path and the instruction to diff against it
- these standing constraints:
  - **props, exports and rendered output are pinned.** Behaviour changes are
    out of scope. If the fix appears to require one, stop and report.
  - **one item, one branch, one PR.** Do not fix the neighbouring items you
    will inevitably notice — report them and let the next pass take them.
  - **read `AGENT_GUIDE.md` § "The health ratchet will fail you" first.** An
    improvement that is not locked into the baseline fails CI exactly like a
    regression, and five PRs in a row were lost to this.
  - **shared checkout discipline**: stage only files you touched, never
    `git add -A`, never `--amend`, never a bare `git stash`. Push immediately
    after each commit.
  - milestones every 5 minutes or on each milestone, with a revised estimate.

## Gates, before the PR

```
npx tsc --noEmit
npm run typecheck:dev
npm run lint:ci
npm run health
npx vitest run
```

Then the two that are specific to this skill:

```
diff <(node -e '…collectExportSurface…') /tmp/sui-api-before.json   # must be empty
npm run adherence -- --component=<Component>                        # the item must be gone
```

If `health` reports an improvement, `npm run health -- --update-baseline` and
commit the baseline **with** the change. If it reports a regression you caused,
fix it — do not name it in `--update-baseline` to get past the gate.

`npm run adherence` writes two git-ignored files, so it never appears in the
diff. Do not commit them.

## PR

Title: `refactor(<Component>): <what moved>` — name the mechanism, not the id.
Body: the item id, the rule and the document it comes from, the before/after
API diff (empty), and the gate results. End with the attribution line the
session's instructions specify.

Report back: the PR URL, the item id now closed, and any items the pass
surfaced but deliberately left.
