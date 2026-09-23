#!/usr/bin/env node
// ============================================
// gate — exactly what CI runs (.github/workflows/ci.yml), in one command,
// safe to run next to a live dev server.
//
//   node scripts/gate.mjs                 # every job, in ci.yml's order
//   node scripts/gate.mjs --fast          # same, but skip `build`
//   node scripts/gate.mjs --only lint     # one job only (comma-separated ok)
//   node scripts/gate.mjs --pre-push      # used by githooks/pre-push — see below
//   node scripts/gate.mjs --no-lock       # skip the machine-wide lock (see below)
//
// WHY THIS EXISTS
//
// Agents were learning the gate by failing it in CI, each failure its own
// investigation:
//   • `npm run typecheck` covers `src/**` only. CI's `typecheck` job ALSO runs
//     `npm run typecheck:dev`, which is what catches a bench that bypasses the
//     Overrides/DataProps split — `typecheck` alone says nothing about it.
//   • `npm run lint` is warning-tolerant; CI's `lint` job runs `lint:ci`
//     (`--error-on-warnings`). A locally-clean `lint` can still fail CI.
//   • `npm run build` in THIS checkout collides with Peter's `vite --port 6006`
//     dev server through the shared `node_modules/.vite` cache dir and wedges
//     it. So does `npm run bundle-budget` — it calls `npm run build` itself
//     (see scripts/bundle-budget.mjs) for the same reason CI gives it its own
//     job: it needs a real `dist/` to build six consumer fixtures against.
//   • Piping any of the above into `head` or `less` hides the exit status,
//     so a red step reads as done.
//
// This script is the fix: it derives its step list FROM ci.yml (read the
// workflow if this drifts — the list below is a transcription, not a
// reimplementation) runs the same commands CI runs, and isolates the two
// steps that build.
//
// WHY EVERY STEP SKIPS `npm ci --ignore-scripts`
//
// Every ci.yml job starts with `npm ci --ignore-scripts` — that installs a
// clean `node_modules/` in a disposable runner. Locally there is no
// disposable runner: `node_modules/` is the one Peter's dev server is also
// using. Re-running `npm ci` here would be its own way to wedge that server,
// for the same reason `npm run build` is. `gate` instead runs against
// whatever `node_modules/` the caller already has — exactly what `npm run
// dev` does — which is what "safe next to a live dev server" requires.
//
// HOW `build` AND `bundle-budget` STAY OUT OF THE LIVE CHECKOUT
//
// Both run inside a `git worktree add --detach <tmp> HEAD` — a throwaway
// checkout of the current commit, removed (even on failure) once the step
// finishes. Two things make it usable and safe:
//
//   1. Uncommitted changes must still be gated (that is the whole point of a
//      pre-push/local gate), but `<tmp>` only has HEAD's tree. So before
//      building, the diff between HEAD and the CURRENT WORKING TREE — staged,
//      unstaged, AND untracked — is captured through a throwaway git index
//      (`GIT_INDEX_FILE=<tmp-index> git add -A && git diff --cached`) and
//      applied into `<tmp>` with `git apply`. The throwaway index is a
//      separate file; the real index (and the shared checkout other agents
//      are using) is never touched. `git add -N` was considered and rejected
//      for the same reason: it writes into the REAL index.
//      `git stash` was never considered — this is a shared checkout with a
//      shared stash stack; see CLAUDE.md.
//   2. `<tmp>/node_modules` is NOT a symlink to the live `node_modules/` —
//      that would just resolve `<tmp>/node_modules/.vite` straight back to
//      Peter's cache dir and defeat the isolation. Instead every ENTRY of
//      `node_modules/` is individually symlinked into a real directory at
//      `<tmp>/node_modules/`, skipping `.vite*`/`.cache` — so every package is
//      shared (no reinstall) but Vite's cache dir is a fresh, local,
//      auto-created directory inside `<tmp>`. The entries come from THIS
//      checkout's `node_modules/` when it has one; an agent worktree
//      typically doesn't (Node resolution walks up to the main checkout's,
//      so everything else works without it), so `gate` falls back to the
//      MAIN checkout's `node_modules/` — found via `git rev-parse
//      --git-common-dir`, since every worktree's `.git` points at
//      `<main>/.git` — and prints which one it used.
//
// `--fast` skips only the `build` step (as asked). `bundle-budget` still
// builds — it is a separate CI job/step and `--fast` was scoped to the one
// named in the brief; skip it too with `--only` if you don't need it.
//
// WHY THERE IS A MACHINE-WIDE LOCK
//
// Several agents each running `npm run gate` at once made the `test` step
// take 517s instead of 163s (pure contention — each passed alone), timing
// out three suites on their 60s hooks. So `gate` now acquires an exclusive,
// machine-wide lock (see scripts/gate-lock.mjs) before running, and waits
// for any other gate already holding it — printing who holds it and which
// step they're on — rather than racing it. The lock is keyed to the repo's
// MAIN checkout (shared across worktrees), covers the whole run by default,
// and is released on normal exit, SIGINT/SIGTERM, and uncaught exceptions.
// `--no-lock` opts out.
//
// THE `--pre-push` HEALTH STEP IS INTENTIONALLY DIFFERENT FROM CI's
//
// CI's `health` job runs plain `npm run health`, which fails on a REGRESSION
// and ALSO fails on an unrecorded IMPROVEMENT (AGENT_GUIDE.md's ratchet
// table) — that's what keeps the committed baseline meaningful, and it must
// stay that way in CI. `--pre-push` changes ONLY how the `health` step reacts
// to that second case; see githooks/pre-push and the comment on
// `healthStepPrePush` below for what it does and the one thing it CANNOT do
// (fold the fix into the push already in flight — verified, not assumed).
// ============================================
import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  readdirSync,
  rmSync,
  symlinkSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { acquireGateLock } from "./gate-lock.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const run = (cmd, args, opts = {}) =>
  spawnSync(cmd, args, { cwd: root, stdio: "inherit", env: process.env, ...opts });

// ── isolated build worktree ─────────────────────────────────────────────

const SKIP_NODE_MODULES_ENTRIES = new Set([".cache"]);
const isViteCache = (name) => name === ".vite" || name.startsWith(".vite-");

// True if `dir` has at least one real package entry to symlink (i.e. isn't
// missing, isn't empty, and isn't just Vite's cache dir left behind by a
// previous run).
function hasUsableNodeModules(dir) {
  if (!existsSync(dir)) return false;
  return readdirSync(dir).some(
    (entry) => !isViteCache(entry) && !SKIP_NODE_MODULES_ENTRIES.has(entry),
  );
}

// An agent worktree (see CLAUDE.md's "Assigned worktree branch is stale"
// setup) has no `node_modules/` of its own — Node's module resolution walks
// up to the MAIN checkout's, so everything except this isolated-worktree
// step works anyway, and there is nothing here to symlink. Fall back to the
// main checkout's `node_modules/`, found via `git rev-parse
// --git-common-dir` (absolute, per-worktree metadata all points at
// `<main>/.git`, so its dirname is `<main>`).
function findNodeModulesSource() {
  const localNM = join(root, "node_modules");
  if (hasUsableNodeModules(localNM)) return { dir: localNM, label: `local checkout (${root})` };

  const commonDir = spawnSync(
    "git",
    ["rev-parse", "--path-format=absolute", "--git-common-dir"],
    { cwd: root, encoding: "utf8" },
  );
  if (commonDir.status === 0) {
    const mainRoot = dirname(commonDir.stdout.trim());
    const mainNM = join(mainRoot, "node_modules");
    if (hasUsableNodeModules(mainNM)) return { dir: mainNM, label: `main checkout (${mainRoot})` };
  }

  throw new Error(
    `no usable node_modules/ found in the local checkout (${localNM}) or the main checkout — run \`npm ci\` in the main checkout first.`,
  );
}

// Real dir, symlinked children — see header comment §2 for why not a single
// symlink to the whole `node_modules/`.
function linkNodeModulesInto(tmpDir) {
  const { dir: srcNM, label } = findNodeModulesSource();
  console.log(`  node_modules resolved from: ${label}`);
  const dstNM = join(tmpDir, "node_modules");
  mkdirSync(dstNM, { recursive: true });
  for (const entry of readdirSync(srcNM)) {
    if (isViteCache(entry) || SKIP_NODE_MODULES_ENTRIES.has(entry)) continue;
    symlinkSync(join(srcNM, entry), join(dstNM, entry));
  }
}

// Everything uncommitted — staged, unstaged, and untracked — captured
// through a throwaway index so the real index (shared with other agents in
// this checkout) is never touched, then applied on top of HEAD in `tmpDir`.
function applyWorkingTreeInto(tmpDir) {
  const tmpIndex = join(tmpdir(), `sui-gate-index-${process.pid}`);
  const env = { ...process.env, GIT_INDEX_FILE: tmpIndex };
  try {
    const add = spawnSync("git", ["add", "-A"], { cwd: root, env, stdio: "inherit" });
    if (add.status !== 0) throw new Error("gate: failed to stage working tree into throwaway index");
    const diff = spawnSync("git", ["diff", "--cached", "--binary"], {
      cwd: root,
      env,
      encoding: "utf8",
    });
    if (diff.status !== 0) throw new Error("gate: failed to diff throwaway index");
    if (!diff.stdout.trim()) return; // clean tree — nothing to carry over
    const apply = spawnSync("git", ["apply"], {
      cwd: tmpDir,
      input: diff.stdout,
      stdio: ["pipe", "inherit", "inherit"],
    });
    if (apply.status !== 0)
      throw new Error("gate: uncommitted changes failed to apply into the detached worktree");
  } finally {
    rmSync(tmpIndex, { force: true });
  }
}

function withDetachedWorktree(fn) {
  const tmpDir = mkdtempSync(join(tmpdir(), "sui-gate-"));
  try {
    const add = spawnSync("git", ["worktree", "add", "--detach", "--quiet", tmpDir, "HEAD"], {
      cwd: root,
      stdio: "inherit",
    });
    if (add.status !== 0) throw new Error("gate: git worktree add failed");
    linkNodeModulesInto(tmpDir);
    applyWorkingTreeInto(tmpDir);
    return fn(tmpDir);
  } finally {
    const remove = spawnSync("git", ["worktree", "remove", "--force", tmpDir], {
      cwd: root,
      stdio: "inherit",
    });
    if (remove.status !== 0) rmSync(tmpDir, { recursive: true, force: true });
  }
}

// ── the health step's two modes ─────────────────────────────────────────

// Plain CI behaviour: exactly `npm run health`, no different from any other
// step. Used by default (matches the `health` CI job byte-for-byte).
function healthStepCi(cwd) {
  return run("npm", ["run", "health"], { cwd }).status ?? 1;
}

// `--pre-push` behaviour. `npm run health` already refuses to pass on an
// unrecorded IMPROVEMENT, not just a regression (AGENT_GUIDE.md's ratchet
// table) — that costs a `--update-baseline` round-trip on every gain. This
// closes the round-trip automatically for the case that is safe to close
// automatically: a run that failed ONLY because a ceiling could be
// tightened, never one that failed because a ceiling was breached.
//
// `scripts/health.mjs --update-baseline` (see scripts/health-ratchet.mjs)
// already refuses to touch the file at all if any metric rose without being
// named — so calling it unconditionally after a failed plain run is safe:
// if the failure was a real regression, `--update-baseline` fails too and
// nothing is written; only a pure-improvement/newly-added-metric failure
// makes it through and updates the baseline.
//
// ONE THING THIS CANNOT DO: fold the resulting commit into the push that
// triggered the hook. Verified empirically (not assumed) against a local
// bare remote: a commit created by a pre-push hook is NOT included in the
// push in progress — git resolves which objects/refs to send from the state
// that existed before the hook ran, so the new commit stays local and CI's
// (deliberately still-strict) `health` job would fail on it exactly as
// before. An alternative was considered — have the hook invoke `git push`
// itself a second time after committing — and rejected: it means a hook
// script driving the user's own push command with whatever remote/refspec
// it was originally called with, recursively, which is a much larger
// surface for a subtle double-push or loop bug than "tell the human to push
// again" is worth. So: commit the fix locally, then FAIL this push with a
// message saying exactly that. It still collapses "discover → flag → run
// --update-baseline → commit → push" down to "push again", which is the
// improvement that mattered.
function healthStepPrePush(cwd) {
  const first = run("node", ["scripts/health.mjs"], { cwd });
  if (first.status === 0) return 0;

  console.log(
    "\n  health ratchet did not pass outright — checking whether this is a pure improvement (never blesses a real regression)…",
  );
  const attempt = spawnSync("node", ["scripts/health.mjs", "--update-baseline"], {
    cwd,
    encoding: "utf8",
    env: process.env,
  });
  process.stdout.write(attempt.stdout ?? "");
  process.stderr.write(attempt.stderr ?? "");

  if (attempt.status !== 0) {
    console.error(
      "\n✗ That was a real regression, not just an unlocked improvement — --update-baseline cannot and did not fix it. See the ✗ REGRESSED lines above.",
    );
    return first.status ?? 1;
  }

  const moved = (attempt.stdout ?? "")
    .split("\n")
    .filter((l) => /^\s*[↓↑]/.test(l))
    .map((l) => l.trim());

  const add = spawnSync(
    "git",
    ["add", "scripts/health-baseline.json", "scripts/health-history.json"],
    { cwd, stdio: "inherit" },
  );
  if (add.status !== 0) {
    console.error("\n✗ Baseline updated on disk but `git add` failed — commit it by hand:");
    console.error("    git add scripts/health-baseline.json scripts/health-history.json");
    return 1;
  }
  const message = [
    "chore(health): auto-update ratchet baseline",
    "",
    ...(moved.length ? moved : ["(no metrics moved — see full output above)"]),
    "",
    "Auto-committed by githooks/pre-push (scripts/gate.mjs --pre-push).",
  ].join("\n");
  const commit = spawnSync("git", ["commit", "-q", "-m", message], { cwd, stdio: "inherit" });
  if (commit.status !== 0) {
    console.error("\n✗ Baseline staged but `git commit` failed — commit it by hand and push again.");
    return 1;
  }

  console.error("\n✓ Ceiling(s) auto-tightened and committed:");
  for (const l of moved) console.error(`    ${l}`);
  console.error(
    "\n✗ This push is still BLOCKED — the commit above cannot join a push already in\n" +
      "  flight (verified: git resolves what to send before this hook runs). Nothing\n" +
      "  else is wrong. Run `git push` again to send it.",
  );
  return 1;
}

// ── step list — derived from .github/workflows/ci.yml, same order ───────

const STEPS = [
  {
    name: "test",
    // ci.yml `test` job: npm run test:coverage && npm run execution-coverage
    run: (cwd) => {
      const cov = run("npm", ["run", "test:coverage"], { cwd });
      if (cov.status !== 0) return cov.status ?? 1;
      return run("npm", ["run", "execution-coverage"], { cwd }).status ?? 1;
    },
  },
  {
    name: "lint",
    // ci.yml `lint` job: npm run lint:ci (NOT plain `lint` — see header)
    run: (cwd) => run("npm", ["run", "lint:ci"], { cwd }).status ?? 1,
  },
  {
    name: "typecheck",
    // ci.yml `typecheck` job: npx tsc --noEmit && npm run typecheck:dev
    run: (cwd) => {
      const src = run("npx", ["tsc", "--noEmit"], { cwd });
      if (src.status !== 0) return src.status ?? 1;
      return run("npm", ["run", "typecheck:dev"], { cwd }).status ?? 1;
    },
  },
  {
    name: "health",
    // ci.yml `health` job: npm run health — mode swapped by --pre-push, see above.
    run: null, // filled in below once `prePush` is known
  },
  {
    name: "build",
    // ci.yml `build` job: npm run build — isolated (see header §"HOW build...").
    run: (cwd) => run("npm", ["run", "build"], { cwd }).status ?? 1,
    isolate: true,
  },
  {
    name: "bundle-budget",
    // ci.yml `bundle-budget` job: npm run bundle-budget — also builds
    // (scripts/bundle-budget.mjs calls `npm run build` itself), so it is
    // isolated for the same reason `build` is.
    run: (cwd) => run("npm", ["run", "bundle-budget"], { cwd }).status ?? 1,
    isolate: true,
  },
];

// ── CLI ──────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const fast = argv.includes("--fast");
const prePush = argv.includes("--pre-push");
const noLock = argv.includes("--no-lock");
const onlyFlagIdx = argv.indexOf("--only");
const onlyNames = onlyFlagIdx !== -1 ? (argv[onlyFlagIdx + 1] ?? "").split(",").map((s) => s.trim()) : null;

for (const step of STEPS) {
  if (step.name === "health") step.run = prePush ? healthStepPrePush : healthStepCi;
}

if (onlyNames) {
  const known = new Set(STEPS.map((s) => s.name));
  const unknown = onlyNames.filter((n) => !known.has(n));
  if (unknown.length > 0) {
    console.error(`✗ --only names unknown step(s): ${unknown.join(", ")}`);
    console.error(`  Known steps: ${[...known].join(", ")}`);
    process.exit(1);
  }
}

const stepsToRun = STEPS.filter((s) => {
  if (onlyNames) return onlyNames.includes(s.name);
  if (fast && s.name === "build") return false;
  return true;
});

// ── machine-wide lock ────────────────────────────────────────────────────
//
// Concurrent gates on one machine contend for CPU/IO and can time out
// otherwise-passing suites (see scripts/gate-lock.mjs header) — so a gate
// waits for any other gate already running against the SAME repo (shared
// across worktrees, keyed off `git rev-parse --git-common-dir`) rather than
// racing it. `--no-lock` opts out (e.g. CI, where each run is isolated).
const lock = noLock ? null : await acquireGateLock(root);

// ── run ──────────────────────────────────────────────────────────────────

const results = [];
let overall = 0;
for (const step of stepsToRun) {
  lock?.setStep(step.name);
  console.log(`\n▶ ${step.name}`);
  const status = step.isolate ? withDetachedWorktree(step.run) : step.run(root);
  const ok = status === 0;
  console.log(`${ok ? "✓" : "✗"} ${step.name} — ${ok ? "passed" : `FAILED (exit ${status})`}`);
  results.push({ name: step.name, status });
  if (!ok) {
    overall = status;
    break;
  }
}

lock?.release();

console.log("\n── gate summary ──────────────────────────");
for (const { name, status } of results) {
  console.log(`  ${status === 0 ? "✓" : "✗"} ${name.padEnd(16)} exit ${status}`);
}
const skipped = stepsToRun.length < STEPS.length && !onlyNames;
if (skipped) console.log("  (build skipped — --fast)");
console.log(overall === 0 ? "\n✓ gate passed" : "\n✗ gate FAILED");

process.exit(overall);
