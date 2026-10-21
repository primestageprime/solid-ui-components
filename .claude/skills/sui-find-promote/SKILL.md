---
name: sui-find-promote
description: Promote a component the slow search found into the fast search. Use after `find-recall` (union + reader) or an exhaustive read of COMPONENTS.md answered a need that `npm run find` missed or ranked below 3 — diagnose why, make the smallest fast-path fix (lexicon phrase, tag, doc line), prove it, pin it in scripts/find-regress.json. Never on a held-out need.
---

# sui-find-promote

Peter, 2026-10-20 (diddit #4161): "each time we find a big component early, it
drops the cost for the times we have to look harder. If we find one through a
slow search, make a skill that figures out how to get it in a faster search.
That should also incrementally improve."

Every lookup that needed the slow path becomes a fast-path case. Run this once
per (need, component) pair the slow path answered.

## Inputs

- the need, as the builder or brief phrased it (quote it, do not paraphrase);
- the component the slow path chose (an exported name in `catalog.json`);
- where the need came from (file:line, topic, transcript), for `source`.

## Steps

1. **Diagnose.** Dry run, nothing is written:

   ```bash
   node scripts/find-promote.mjs "<need>" <Component> --source "<where>"
   ```

   Read the diagnosis: the fast-path position, the need's words that reach no
   tag (`unreached words`), the component's tags the need never infers, words
   lost to negation/quote stripping, and the parts ranked above it. Decide the
   cause: a missing synonym, a weak `Use for` sentence or tags on the
   component, a negation that hid the key word, or a part outranking its
   composite without a `preferFirst` edge.

2. **Fix, smallest first.** The script proposes a lexicon phrase (its own
   pick is mechanical: refuse a phrase that is positional, generic or an app
   noun — `large`, `there`, `incidents`, `retrospective` — and choose the
   phrase yourself from the unreached words). In order:
   - a phrase in `scripts/find-lexicon.json` → the component's tags
     (generic words only, no app nouns; `--apply` writes the script's pick,
     or edit the file by hand);
   - a tag the need infers that the component really has (`Tags:` line in
     its file; `--allow-tags --apply`, then `npm run catalog`);
   - a `Use for:` phrase on its COMPONENTS.md bullet, then `npm run catalog`
     (a doc change retires any held-out set that contains the need);
   - a `reach for X first` clause on the part that outranks it.

3. **Prove.** Re-run the fast path on the need and on the sets that must not
   move:

   ```bash
   npm run find -- "<need>" --top 3
   node scripts/find-promote.mjs "<need>" <Component> --record-only --apply --source "<where>"   # pins it
   npm run find:bench | grep tuning           # 31/31 stays 31/31
   npx vitest run scripts/find.test.ts        # regression set + floors
   ```

   A fix that drops the tuning split or a regression case is reverted; try
   the next smallest fix.

4. **Record.** `--record-only --apply` appended the case to
   `scripts/find-regress.json` (`promotedBy`, `on`, `source`);
   `scripts/find.test.ts` pins every case at top 3. Commit the lexicon /
   tag / doc change, the regenerated `catalog.json` and `catalog-index.md`,
   and the regression file together, naming the need in the message.

## Never

- promote a need from `scripts/find-bench-real.json` or
  `scripts/find-bench-fresh.json` while they are the honest score (the
  script refuses without `--i-know-this-retires-the-held-out-set`);
- add an app noun or a positional word to the lexicon;
- lower a floor in `scripts/find.test.ts` to make a case pass.

## Batch

A JSON array of `{need, answer, source}` runs through `--batch <file>`; the
first run (2026-10-20) was the 24 fallbacks of the first held-out set.
