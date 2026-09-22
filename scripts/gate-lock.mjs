#!/usr/bin/env node
// ============================================
// gate-lock — a machine-wide mutex for `scripts/gate.mjs`.
//
// WHY THIS EXISTS
//
// Six agents running `npm run gate` concurrently on one machine made the
// `test` step run 517s instead of 163s (pure CPU/IO contention), timing out
// three suites on their 60s hooks. Each passed alone. The fix is to make
// concurrent gates serialize on this machine, not to lengthen timeouts or
// skip steps — see docs/handoffs or the PR that introduced this file.
//
// WHY A LOCK DIRECTORY, KEYED TO THE MAIN CHECKOUT
//
// `mkdirSync` is atomic on every platform Node supports (POSIX `mkdir(2)`
// and Win32 `CreateDirectory` both fail outright if the target exists) —
// that's the same guarantee an `O_EXCL` file open gives, and a directory
// lets the holder drop a small metadata file inside it (pid + current step)
// without a second atomic primitive.
//
// The lock is keyed to `git rev-parse --git-common-dir` of the CURRENT
// checkout, resolved to an absolute path. `--git-common-dir` already
// resolves to the MAIN checkout's `.git` for every worktree of the same
// repo (that's what makes worktrees share one `.git/hooks`, one set of
// refs, etc.) — so hashing it, rather than `--show-toplevel` (which differs
// per worktree), is what makes two agents in two different worktrees of
// this repo share one lock. Two unrelated repos hash to two different
// lock directories and never contend.
//
// WHAT "STALE" MEANS
//
// A lock directory whose `meta.json` names a pid that is no longer running
// (`process.kill(pid, 0)` throws `ESRCH`) is stale — its holder crashed,
// was killed with `-9`, or the machine lost power mid-run. It is reclaimed
// automatically, with a one-line notice, rather than wedging every future
// gate on this machine forever.
// ============================================
import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";

const POLL_MS = 500;
// A holder's `meta.json` write lands microseconds after its `mkdirSync`
// succeeds, but under CPU contention (exactly the situation this lock
// exists for) a waiter can lose that race and see the dir with no
// meta.json yet. Retry quickly in that case instead of falling all the way
// back to POLL_MS, so the waiting message shows up promptly rather than
// silently skipping a whole poll interval.
const META_RACE_RETRY_MS = 30;

function gitCommonDirAbs(cwd) {
  const result = spawnSync("git", ["rev-parse", "--git-common-dir"], {
    cwd,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(`gate-lock: \`git rev-parse --git-common-dir\` failed: ${result.stderr ?? ""}`);
  }
  const raw = result.stdout.trim();
  // Relative output (e.g. `.git`, or `../../.git` from a worktree) is
  // relative to `cwd` — resolve it the same way git itself would.
  return resolve(cwd, raw);
}

function lockDirFor(cwd) {
  const commonDir = gitCommonDirAbs(cwd);
  const key = createHash("sha256").update(commonDir).digest("hex").slice(0, 16);
  return { lockDir: join(tmpdir(), `sui-gate-lock-${key}`), commonDir };
}

function isAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    // EPERM: process exists, owned by someone else — treat as alive.
    // ESRCH (or anything else): no such process — dead.
    return err.code === "EPERM";
  }
}

function readMeta(lockDir) {
  try {
    return JSON.parse(readFileSync(join(lockDir, "meta.json"), "utf8"));
  } catch {
    return null; // holder created the dir but hasn't written meta.json yet — race, keep polling
  }
}

function writeMeta(lockDir, step) {
  writeFileSync(
    join(lockDir, "meta.json"),
    JSON.stringify({ pid: process.pid, step, startedAt: new Date().toISOString() }),
  );
}

// `setTimeout`, NOT `Atomics.wait` — `Atomics.wait` blocks the JS thread at
// the engine level, which also blocks Node's signal-watcher callbacks from
// running (verified empirically: a lock held across an `Atomics.wait` poll
// did not release on `SIGINT` sent directly to it — the kernel delivered
// the signal, but libuv never got a turn to invoke our handler until the
// wait's own timeout elapsed). An `await`ed `setTimeout` keeps the event
// loop pumping, so `SIGINT`/`SIGTERM` are handled immediately even while
// this process is waiting for someone else's lock.
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function tryAcquire(lockDir) {
  try {
    mkdirSync(lockDir);
    return true;
  } catch (err) {
    if (err.code === "EEXIST") return false;
    throw err;
  }
}

// Acquires the machine-wide gate lock, awaiting (polling) until it is free.
// Returns a handle: `{ setStep(name), release() }`. `release()` is
// idempotent and safe to call more than once (exit-time safety net).
export async function acquireGateLock(cwd) {
  const { lockDir, commonDir } = lockDirFor(cwd);
  let owned = false;
  let lastPrinted = null;

  while (!tryAcquire(lockDir)) {
    const meta = readMeta(lockDir);
    if (meta && !isAlive(meta.pid)) {
      console.log(`gate: reclaiming stale lock (holder pid ${meta.pid} is not running)`);
      rmSync(lockDir, { recursive: true, force: true });
      continue; // retry acquire immediately, no sleep
    }
    if (meta) {
      const msg = `gate: waiting for ${meta.pid} (${meta.step}) …`;
      if (msg !== lastPrinted) {
        console.log(msg);
        lastPrinted = msg;
      }
      await sleep(POLL_MS);
    } else {
      // Directory exists but meta.json isn't visible yet — either the
      // holder just mkdir'd and hasn't written it, or it released between
      // our mkdir failure and this read. Either way this resolves within
      // milliseconds — retry fast rather than losing a whole poll interval.
      await sleep(META_RACE_RETRY_MS);
    }
  }
  owned = true;
  writeMeta(lockDir, "starting");

  const release = () => {
    if (!owned) return;
    owned = false;
    try {
      rmSync(lockDir, { recursive: true, force: true });
    } catch {
      // best effort — a concurrent stale-reclaim may have already removed it
    }
  };

  // Release on every path out: normal exit, Ctrl-C, `kill`, and a crash we
  // didn't catch. `process.on('exit', ...)` only permits synchronous work,
  // which `release()` is (fs *Sync calls only).
  process.on("exit", release);
  process.on("SIGINT", () => {
    release();
    process.exit(130);
  });
  process.on("SIGTERM", () => {
    release();
    process.exit(143);
  });
  process.on("uncaughtException", (err) => {
    console.error(err);
    release();
    process.exit(1);
  });

  return {
    lockDir,
    commonDir,
    setStep: (name) => {
      if (!owned) return;
      writeMeta(lockDir, name);
    },
    release,
  };
}

export function lockPathFor(cwd) {
  return lockDirFor(cwd).lockDir;
}
