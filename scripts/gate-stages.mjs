// ============================================
// gate-stages — THE one list of gate stages.
//
// Every check that can turn a push or a PR red is a stage here. Three readers:
//
//   • scripts/gate.mjs       runs the stages (`npm run gate`)
//   • githooks/pre-push      calls `gate.mjs --pre-push`, i.e. the same list in
//                            its fast tier; the hook holds no check of its own
//   • .github/workflows/ci.yml   runs the same COMMANDS, one job per stage
//                            group; scripts/gate-stages.test.ts fails the suite
//                            if ci.yml has a `run:` line no stage carries
//
// So: a green `npm run gate` means the hook will pass and CI's checks will
// pass. To add a check, add a stage HERE (and its `run:` line to ci.yml if CI
// should enforce it). Never add a check to the hook or to ci.yml alone; that
// is how `npm run catalog -- --check` lived in the hook and in CI but not in
// the gate, and a "gate green" push was refused on a stale catalog.json
// (2026-11-12, thorcasting #4471 / #4472).
//
// Stage fields:
//   name      the `--only` name and the summary row
//   ciJob     the ci.yml job that runs these commands, or null (local only)
//   commands  [cmd, ...args] lists, run in order, stopping at the first failure;
//             joined with spaces they are ci.yml's `run:` lines verbatim
//   fast      runs under `--fast`?
//   prePush   runs under `--pre-push`?  true | false | "affected" (tests only:
//             the stage runs, narrowed to the tests that reach the diff)
//   isolate   run inside a throwaway detached worktree (the steps that build)
//   warnOnly  a failure is reported and listed, but never fails the gate
//   remedy    printed under a failure: the command that fixes it
//   skipWhy   why a tier leaves the stage out, for the summary
//
// This module is pure (no fs, no child processes) so the list and the tier
// plan are unit-tested without running anything.
// ============================================

export const STAGES = [
  {
    name: "test",
    ciJob: "test",
    commands: [
      ["npm", "run", "test:coverage"],
      ["npm", "run", "execution-coverage"],
    ],
    fast: true,
    prePush: "affected",
  },
  {
    name: "lint",
    ciJob: "lint",
    // `lint:ci`, NOT plain `lint` (warning-tolerant) — see gate.mjs's header.
    commands: [["npm", "run", "lint:ci"]],
    fast: true,
    prePush: true,
  },
  {
    name: "typecheck",
    ciJob: "typecheck",
    commands: [
      ["npx", "tsc", "--noEmit"],
      ["npm", "run", "typecheck:dev"],
    ],
    fast: true,
    prePush: true,
  },
  {
    name: "health",
    ciJob: "health",
    commands: [["npm", "run", "health"]],
    fast: true,
    // The ratchet needs a full coverage run; `--pre-push --only health` still
    // reaches gate.mjs's healthStepPrePush.
    prePush: false,
    skipWhy: "needs a full coverage run; runs at the PR gate",
  },
  {
    name: "catalog",
    // Second command of ci.yml's `health` job. Cheap (no build, no tests), so
    // it runs in EVERY tier.
    ciJob: "health",
    commands: [["npm", "run", "catalog", "--", "--check"]],
    fast: true,
    prePush: true,
    remedy: [
      "catalog.json is stale — COMPONENTS.md, CHANGELOG.md, dev/main.tsx or src/",
      "changed without regenerating it. CI's health job and the pre-push hook",
      "both refuse this.",
      "",
      "  npm run catalog     # regenerate, then commit catalog.json",
    ],
  },
  {
    name: "build",
    ciJob: "build",
    commands: [["npm", "run", "build"]],
    fast: false,
    prePush: false,
    isolate: true,
    skipWhy: "full build; runs at the PR gate",
  },
  {
    name: "bundle-budget",
    ciJob: "bundle-budget",
    // Also builds (scripts/bundle-budget.mjs calls `npm run build` itself).
    commands: [["npm", "run", "bundle-budget"]],
    fast: false,
    prePush: false,
    isolate: true,
    skipWhy: "full build; runs at the PR gate",
  },
  {
    name: "usage-manifest",
    // Local only; CI has no consumer checkouts to scan.
    //
    // WARNS, never blocks (2026-08-05, dside sui 12565). It blocked until it
    // had refused four consecutive unrelated pushes, all of which went through
    // with --no-verify; a gate that trains you to bypass it is worse than no
    // gate. Two reasons it cannot block in this shape:
    //
    //   1. It compares against consumer WORKING COPIES on whoever's machine is
    //      pushing — unpinned, possibly mid-feature, possibly on another
    //      branch. The last block was five line numbers moving in
    //      thorcasting-ui because somebody added three lines above an import.
    //      Nothing about SUI changed. And the printed remedy ("regenerate and
    //      commit") would have committed a snapshot of another developer's
    //      working tree into this repo.
    //   2. It is silent on the change it exists to catch. --check compares the
    //      committed manifest against a fresh consumer scan; deleting a SUI
    //      export changes NEITHER side, because the manifest records
    //      consumers' imports and not SUI's exports. Delete something
    //      thorcasting-ui imports and this check passes.
    //
    // The gate worth having asks "does any repo that tracks main unpinned
    // import a name this push no longer exports?" and needs SUI's own export
    // surface, which the tool does not compute yet (dside sui 12565). Until
    // then the manifest is a REPORT. Do not trust the committed copy without
    // regenerating.
    ciJob: null,
    commands: [["node", "scripts/usage-manifest.mjs", "--check"]],
    fast: true,
    prePush: true,
    warnOnly: true,
    remedy: [
      "docs/usage-manifest.json is stale — NOT blocking.",
      "",
      "Consumer imports drifted since the manifest was generated (differences",
      "listed above). Usually this is another repo's working copy moving, and",
      "has nothing to do with your change. Regenerate when you actually need",
      "the survey — above all before deleting or renaming an export:",
      "",
      "  npm run usage-manifest",
      "",
      "This check does NOT verify that your change keeps consumers compiling.",
      "See dside sui 12565.",
    ],
  },
];

/** A stage command as ci.yml writes it: `npm run catalog -- --check`. */
export const commandLine = (command) => command.join(" ");

/**
 * Which stages a tier runs. Returns one row per stage, in STAGES order —
 * skipped stages are IN the list, so a summary built from it can never imply a
 * stage ran when it did not.
 *
 *   action: "run" | "skip"
 *   mode:   "affected" when the test stage is narrowed (pre-push), else "full"
 *   why:    for a skip, the reason
 *
 * Throws on an unknown `only` name.
 */
export function planStages({ fast = false, prePush = false, only = null } = {}) {
  if (only) {
    const known = new Set(STAGES.map((s) => s.name));
    const unknown = only.filter((n) => !known.has(n));
    if (unknown.length > 0) {
      const err = new Error(`--only names unknown step(s): ${unknown.join(", ")}`);
      err.known = [...known];
      throw err;
    }
  }
  const tier = prePush ? "--pre-push" : fast ? "--fast" : null;
  return STAGES.map((stage) => {
    const mode = prePush && stage.prePush === "affected" ? "affected" : "full";
    if (only) {
      return only.includes(stage.name)
        ? { stage, action: "run", mode }
        : { stage, action: "skip", mode, why: "not named by --only" };
    }
    const inTier = prePush ? stage.prePush !== false : fast ? stage.fast : true;
    return inTier
      ? { stage, action: "run", mode }
      : { stage, action: "skip", mode, why: `${tier}: ${stage.skipWhy ?? "not in this tier"}` };
  });
}
