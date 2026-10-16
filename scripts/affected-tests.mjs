#!/usr/bin/env node
// ============================================
// affected-tests — which test files would the pre-push tier run for the
// current diff?
//
//   node scripts/affected-tests.mjs                # human table
//   node scripts/affected-tests.mjs --json         # machine-readable
//   node scripts/affected-tests.mjs --base <ref>   # diff against <ref> instead
//                                                  # of merge-base(HEAD, origin/main)
//
// This is the single source of truth for scripts/gate.mjs --pre-push: the gate
// imports `planTests` and runs exactly the files it returns, so what this
// prints is what the push runs. Headless observation first.
//
// HOW THE SET IS BUILT
//   1. base = `git merge-base HEAD origin/main`. If that cannot be computed,
//      the plan is the FULL suite.
//   2. If a changed file affects everything — vitest/vite config, package.json,
//      the lockfile, any tsconfig*.json, src/styles/**, src/themes/**,
//      src/test-setup.ts — the plan is the FULL suite.
//   3. Otherwise `vitest list --filesOnly --changed <base>` gives the test files
//      whose import graph reaches a changed file (committed, staged, unstaged
//      and untracked all count).
//   4. vitest's graph is blind to files tests read as TEXT rather than import
//      (verified 2026-10-16: appending to Alarm.css selects zero tests, because
//      the repo's `?raw` plugin and the CSS plugin keep stylesheets out of the
//      graph). So every changed file that is not a script/module is mapped
//      by hand to (a) the tests in its component directory and (b) every test
//      whose text mentions its file name. Both are over-approximations on
//      purpose: a push gate may run too much, never too little.
// ============================================
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const defaultRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

// Changing any of these can change the outcome of any test.
const FULL_RUN_PATTERNS = [
  /^vitest\.config\.[cm]?[jt]s$/,
  /^vite\.config\.[cm]?[jt]s$/,
  /^package(-lock)?\.json$/,
  /^tsconfig[^/]*\.json$/,
  /^src\/styles\//,
  /^src\/themes\//,
  /^src\/test-setup\.[jt]s$/,
];

const SCRIPT_EXT = /\.(?:[cm]?[jt]sx?)$/;
const isTestFile = (f) => /\.(?:test|spec)\.[jt]sx?$/.test(f);

const git = (root, args) =>
  spawnSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });

const lines = (s) => (s ?? "").split("\n").map((l) => l.trim()).filter(Boolean);

function vitestList(root, extra) {
  const r = spawnSync("npx", ["vitest", "list", "--filesOnly", ...extra], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (r.status !== 0) return null;
  // vitest prints absolute paths; keep only repo-relative ones.
  return lines(r.stdout)
    .map((l) => (l.startsWith(root + "/") ? l.slice(root.length + 1) : l))
    .filter(isTestFile);
}

export function changedFiles(root, base) {
  const tracked = git(root, ["diff", "--name-only", base]);
  const untracked = git(root, ["ls-files", "--others", "--exclude-standard"]);
  if (tracked.status !== 0) return null;
  return [...new Set([...lines(tracked.stdout), ...lines(untracked.stdout)])].sort();
}

export function mergeBase(root, ref = "origin/main") {
  const r = git(root, ["merge-base", "HEAD", ref]);
  return r.status === 0 ? r.stdout.trim() : null;
}

/** @returns {{mode:"full"|"affected", reason:string, base:string|null, changed:string[], files:string[], total:number}} */
export function planTests({ root = defaultRoot, base: baseOverride } = {}) {
  const universe = vitestList(root, []) ?? [];
  const full = (reason, base, changed = []) => ({
    mode: "full", reason, base, changed, files: universe, total: universe.length,
  });

  const base = baseOverride ?? mergeBase(root);
  if (!base) return full("merge-base with origin/main could not be computed", null);
  const changed = changedFiles(root, base);
  if (!changed) return full(`git diff against ${base} failed`, base);

  const trigger = changed.find((f) => FULL_RUN_PATTERNS.some((p) => p.test(f)));
  if (trigger) return full(`${trigger} affects every test`, base, changed);

  const fromGraph = vitestList(root, ["--changed", base]);
  if (!fromGraph) return full("vitest list --changed failed", base, changed);
  const picked = new Set(fromGraph);

  // Files the import graph cannot see (css, json, md, html, ...).
  const untraced = changed.filter((f) => !SCRIPT_EXT.test(f));
  if (untraced.length) {
    const texts = new Map(universe.map((t) => [t, readFileSync(join(root, t), "utf8")]));
    for (const f of untraced) {
      const name = basename(f);
      const m = f.match(/^(src\/components\/[^/]+)\//);
      for (const [t, text] of texts) {
        if ((m && t.startsWith(m[1] + "/")) || text.includes(name)) picked.add(t);
      }
    }
  }
  // A changed test file always runs (vitest's own rule, kept explicit).
  for (const f of changed) if (isTestFile(f) && universe.includes(f)) picked.add(f);

  return {
    mode: "affected",
    reason: `${picked.size} of ${universe.length} test files reach ${changed.length} changed file(s)`,
    base, changed, files: [...picked].sort(), total: universe.length,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const argv = process.argv.slice(2);
  const bi = argv.indexOf("--base");
  const t0 = Date.now();
  const plan = planTests({ base: bi !== -1 ? argv[bi + 1] : undefined });
  const ms = Date.now() - t0;
  if (argv.includes("--json")) {
    console.log(JSON.stringify({ ...plan, planMs: ms }, null, 2));
  } else {
    console.log(`base:     ${plan.base ?? "(none)"}`);
    console.log(`changed:  ${plan.changed.length} file(s)`);
    for (const f of plan.changed.slice(0, 20)) console.log(`            ${f}`);
    if (plan.changed.length > 20) console.log(`            … ${plan.changed.length - 20} more`);
    console.log(`mode:     ${plan.mode} — ${plan.reason}`);
    console.log(`tests:    ${plan.files.length} of ${plan.total} test files`);
    if (plan.mode === "affected") for (const f of plan.files) console.log(`            ${f}`);
    console.log(`planned in ${(ms / 1000).toFixed(1)}s`);
  }
}
