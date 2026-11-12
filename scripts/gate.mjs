#!/usr/bin/env node
// ============================================
// gate — exactly what CI runs (.github/workflows/ci.yml), in one command,
// safe to run next to a live dev server.
//
//   node scripts/gate.mjs                    # the profile `workmode` names (speed or quality);
//                                            # quality when workmode cannot say
//   node scripts/gate.mjs --profile quality  # every stage, in ci.yml's order — what CI runs
//   node scripts/gate.mjs --profile speed    # the push tier now; the rest DEFERRED to the workmode ledger
//   node scripts/gate.mjs --stage lint       # that stage alone, in full (comma-separated ok; --only is the same flag)
//   node scripts/gate.mjs --fast             # every stage but the two isolated builds
//   node scripts/gate.mjs --pre-push      # used by githooks/pre-push: lint + typecheck + AFFECTED tests + catalog
//                                         # freshness + usage-manifest (warn-only)
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
// This script is the fix: it runs the same commands CI runs and isolates the
// two steps that build. The stage list is scripts/gate-stages.mjs — ONE
// definition, shared with githooks/pre-push (which only calls this script) and
// checked against ci.yml by scripts/gate-stages.test.ts, so no check can live
// in the hook or in CI without being a stage here. A green `npm run gate`
// therefore means: the pre-push hook will pass and CI's checks will pass.
// The summary lists EVERY stage, run or skipped.
//
// That promise belongs to the QUALITY profile (every stage, in full). Stages
// are composable: each runs alone (`--stage <name>`), and a profile is a named
// composition of them (gate-stages.mjs PROFILES). The SPEED profile runs the
// push tier and hands the rest to the machine-wide `workmode` ledger as owed
// work, which `workmode cleanup` later runs one `--stage` at a time; its
// summary says "SPEED profile only" and never claims a CI-equivalent pass.
// `--pre-push` never reads workmode and refuses `--profile`.
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
// `--fast` skips BOTH isolated-worktree steps, `build` and `bundle-budget`
// (each is a full build). `--pre-push` implies `--fast`: a pre-push hook that
// runs ~8 minutes outlives GitHub's SSH idle timeout, so the gate passes
// and then the push itself is dropped (observed 2026-09-25, twice). CI runs
// both builds on every push; pre-push keeps lint and typecheck and runs only the
// AFFECTED tests (see testStepAffected). The full suite, coverage, health ratchet
// and builds are the PR gate: CI, or plain `npm run gate`.
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
import { planTests } from "./affected-tests.mjs";
import { PROFILES, ledgerCalls, planStages, resolveProfile } from "./gate-stages.mjs";

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

// ── the `--pre-push` test step ──────────────────────────────────────────
//
// Push tier = AFFECTED tests only (lint + typecheck + the tests whose import
// graph reaches the diff). The full suite, coverage, execution-coverage and
// the health ratchet need a whole-suite run; they stay in plain `npm run gate`
// and in CI, i.e. at the PR gate. `scripts/affected-tests.mjs` decides the set
// (and falls back to the FULL suite when the merge-base cannot be computed or a
// config-level file changed) — run it by hand to see what a push would run.
// Plain `vitest run`, no coverage: coverage is only meaningful over everything.
function testStepAffected(cwd) {
  const plan = planTests({ root: cwd });
  console.log(`  ${plan.mode === "full" ? "FULL suite" : "affected tests"} — ${plan.reason}`);
  if (plan.mode === "affected" && plan.files.length === 0) {
    console.log("  nothing to run — no test file reaches this diff");
    return 0;
  }
  const files = plan.mode === "full" ? [] : plan.files;
  return run("npx", ["vitest", "run", ...files], { cwd }).status ?? 1;
}

// ── stage list — scripts/gate-stages.mjs is the ONE definition ──────────
//
// The list, the tiers and the commands live in gate-stages.mjs (shared with
// githooks/pre-push, which only calls this script, and checked against ci.yml
// by scripts/gate-stages.test.ts). Here: how a stage is executed.

// Default runner: the stage's commands in order, stopping at the first failure.
function runCommands(stage, cwd) {
  for (const [cmd, ...args] of stage.commands) {
    const status = run(cmd, args, { cwd }).status ?? 1;
    if (status !== 0) return status;
  }
  return 0;
}

// ── the workmode ledger (machine-wide; ~/.claude/toolbox/workmode) ──────
//
// `workmode` says whether this machine is in speed or quality mode, and keeps
// the ledger of what speed runs skipped. Every call here is BEST-EFFORT: the
// tool missing, slow or broken never fails the gate and never weakens it —
// with no answer the profile is quality. `GATE_WORKMODE_BIN` points at another
// binary (tests use a stub).
const WORKMODE_BIN = process.env.GATE_WORKMODE_BIN || "workmode";

function workmode(args) {
  const r = spawnSync(WORKMODE_BIN, args, { cwd: root, encoding: "utf8", timeout: 10_000 });
  if (r.error) return { ok: false, why: r.error.code === "ENOENT" ? "workmode is not on PATH" : r.error.message };
  if (r.status !== 0) return { ok: false, why: `exit ${r.status}${r.stderr ? `: ${r.stderr.trim().split("\n")[0]}` : ""}` };
  return { ok: true, stdout: r.stdout ?? "" };
}

function readWorkmode() {
  const r = workmode(["--json"]);
  if (!r.ok) return null;
  try {
    return JSON.parse(r.stdout);
  } catch {
    return null;
  }
}

// ── CLI ──────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const flagValue = (name) => {
  const i = argv.indexOf(name);
  return i !== -1 ? (argv[i + 1] ?? "") : null;
};
const fast = argv.includes("--fast");
const prePush = argv.includes("--pre-push");
const noLock = argv.includes("--no-lock");
// `--stage` and `--only` are the same flag: run just the named stages.
const named = [flagValue("--stage"), flagValue("--only")].filter((v) => v !== null);
const onlyNames = named.length > 0 ? named.flatMap((v) => v.split(",").map((s) => s.trim())).filter(Boolean) : null;
const profileFlag = flagValue("--profile");

// The profile: --profile, else (no tier flag, no named stage) whatever
// `workmode --json` says, else quality. `--pre-push` never reads workmode.
const wantsWorkmode = profileFlag === null && !fast && !prePush && !onlyNames;
const resolved = resolveProfile({
  flag: profileFlag,
  fast,
  prePush,
  only: onlyNames,
  workmode: wantsWorkmode ? readWorkmode() : null,
});
if (resolved.error) {
  console.error(`✗ ${resolved.error}`);
  process.exit(2);
}
const profile = resolved.profile;

// The stages a narrowed tier runs differently (same list, different runner).
function runnerFor(stage, mode) {
  if (prePush && stage.name === "health") return healthStepPrePush;
  if (mode === "affected" && stage.name === "test") return testStepAffected;
  return (cwd) => runCommands(stage, cwd);
}

let plan;
try {
  plan = planStages({ fast, prePush, only: onlyNames, profile });
} catch (err) {
  console.error(`✗ ${err.message}`);
  if (err.known) console.error(`  Known stages: ${err.known.join(", ")}`);
  process.exit(1);
}

if (profile) console.log(`gate: ${profile} profile — ${PROFILES[profile]} [${resolved.source}]`);

// ── machine-wide lock ────────────────────────────────────────────────────
//
// Concurrent gates on one machine contend for CPU/IO and can time out
// otherwise-passing suites (see scripts/gate-lock.mjs header) — so a gate
// waits for any other gate already running against the SAME repo (shared
// across worktrees, keyed off `git rev-parse --git-common-dir`) rather than
// racing it. `--no-lock` opts out (e.g. CI, where each run is isolated).
const lock = noLock ? null : await acquireGateLock(root);

// ── run ──────────────────────────────────────────────────────────────────

const printRemedy = (stage) => {
  if (!stage.remedy) return;
  console.error("");
  for (const line of stage.remedy) console.error(`  ${line}`);
};

// One row per stage in gate-stages.mjs — run or not — so the summary names
// everything "gate passed" does and does not cover.
const results = [];
let overall = 0;
for (const { stage, action, mode, why, deferred } of plan) {
  if (action === "skip") {
    results.push({ stage, mode, state: deferred ? "deferred" : "skipped", note: why });
    continue;
  }
  if (overall !== 0) {
    results.push({ stage, mode, state: "not run", note: "an earlier stage failed" });
    continue;
  }
  lock?.setStep(stage.name);
  console.log(`\n▶ ${stage.name}`);
  const runner = runnerFor(stage, mode);
  const status = stage.isolate ? withDetachedWorktree(runner) : runner(root);
  const ok = status === 0;
  const affectedNote =
    profile === "speed" ? "affected tests only; full suite deferred" : "affected tests only";
  const note = mode === "affected" ? affectedNote : "";
  if (ok) {
    console.log(`✓ ${stage.name} — passed`);
    results.push({ stage, mode, state: "passed", note });
  } else if (stage.warnOnly) {
    console.log(`⚠ ${stage.name} — WARNING (exit ${status}), not blocking`);
    printRemedy(stage);
    results.push({ stage, mode, state: "warned", note: `exit ${status}, warn-only: does not fail the gate` });
  } else {
    console.log(`✗ ${stage.name} — FAILED (exit ${status})`);
    printRemedy(stage);
    results.push({ stage, mode, state: "FAILED", note: `exit ${status}` });
    overall = status;
  }
}

lock?.release();

// ── ledger: pass receipts, and what a speed run owes ─────────────────────
//
// settle = "these stages passed in full at HEAD"; defer = "this speed run left
// these for later" (`workmode cleanup` runs them with `gate.mjs --stage <name>`).
// A receipt from a dirty tree is marked `--dirty`: it is not valid for a push.
const ledgerNotes = [];
let deferFailed = false;
{
  const { settle, defer } = ledgerCalls(results, { profile, passed: overall === 0 });
  if (settle.length > 0) {
    const status = spawnSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8" });
    const dirty = status.status !== 0 || status.stdout.trim() !== "";
    const r = workmode(["settle", "--stages", settle.join(","), "--by", "gate", ...(dirty ? ["--dirty"] : [])]);
    ledgerNotes.push(
      r.ok
        ? `workmode: pass receipts for ${settle.join(", ")}${dirty ? " (dirty tree: not valid for a push)" : ""}`
        : `workmode: no pass receipts written (${r.why})`,
    );
  }
  if (defer.length > 0) {
    const r = workmode(["defer", "--stages", defer.join(","), "--by", "gate"]);
    if (r.ok) {
      ledgerNotes.push(`workmode: DEFERRED ${defer.join(", ")} — owed; \`workmode owed\` lists them, \`workmode cleanup\` runs them`);
    } else {
      deferFailed = true;
      ledgerNotes.push(
        `✗ workmode: COULD NOT RECORD the deferred stages (${r.why}). NOTHING remembers that ${defer.join(", ")} still have to run — run \`npm run gate -- --profile quality\` yourself before this goes anywhere.`,
      );
    }
  }
}

const MARK = { passed: "✓", warned: "⚠", FAILED: "✗", skipped: "–", deferred: "…", "not run": "–" };
const tierLabel = onlyNames
  ? `--stage ${onlyNames.join(",")}${prePush ? " (--pre-push)" : ""}`
  : prePush
    ? "--pre-push (push tier)"
    : fast
      ? "--fast"
      : `${profile} profile [${resolved.source}]`;
const count = (state) => results.filter((r) => r.state === state).length;
const ran = count("passed") + count("warned") + count("FAILED");
const narrowed = results.filter((r) => r.mode === "affected" && r.state === "passed").length;

console.log(`\n── gate summary — ${tierLabel} ──────────────────────────`);
for (const { stage, state, note } of results) {
  console.log(`  ${MARK[state]} ${stage.name.padEnd(16)} ${state.padEnd(8)}${note ? ` ${note}` : ""}`.trimEnd());
}
console.log(
  `  ${ran} of ${results.length} stages ran` +
    (count("deferred") ? `, ${count("deferred")} deferred` : "") +
    (count("skipped") ? `, ${count("skipped")} skipped` : "") +
    (count("not run") ? `, ${count("not run")} not run` : "") +
    (count("warned") ? `, ${count("warned")} warned` : ""),
);
for (const line of ledgerNotes) console.log(`  ${line}`);

if (overall !== 0) {
  console.log("\n✗ gate FAILED");
} else if (ran === results.length && narrowed === 0) {
  console.log("\n✓ gate passed — QUALITY: every stage ran in full; the pre-push hook and CI run nothing else");
} else if (profile === "speed") {
  console.log(
    `\n✓ gate passed — SPEED profile only: ${ran} of ${results.length} stages, tests narrowed to the diff. NOT a CI-equivalent pass; the deferred stages above are ${deferFailed ? "NOT RECORDED ANYWHERE" : "owed in the workmode ledger"}. A push to main needs \`npm run gate -- --profile quality\`.`,
  );
} else {
  console.log(
    `\n✓ gate passed — ${ran} of ${results.length} stages only; the skipped ones above still run at the PR gate (CI / \`npm run gate -- --profile quality\`)`,
  );
}

process.exit(overall);
