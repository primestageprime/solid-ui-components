#!/usr/bin/env node
// ============================================
// release — cut the version commit that the publish chain rides on.
//
// WHAT THIS IS FOR
// ----------------
// Publishing SUI to GitHub Packages is `workflow_run`-gated: `publish.yml`
// waits for a green **CI** run on `main` and then publishes whatever version
// `package.json` carries, if the registry lacks it. So a release IS a
// version-bump commit on `main` whose CI run goes green — nothing more.
//
// Cutting that commit was a human round-trip: bump `package.json`, roll
// `CHANGELOG.md`, commit, tag the sha, push. It is mechanical, and it is also
// where releases go wrong — 0.175.0 shipped untagged because `git tag` was
// skipped, and 0.170.1/0.174.0 carry a different commit-message shape than
// 0.171.0+ because each release was typed by hand.
//
// This script is the mechanical part, and ONLY that part. It reads the tree,
// decides whether a release is owed, and writes `package.json`,
// `package-lock.json` and `CHANGELOG.md`. It runs no git commands that change
// anything: committing, tagging the resulting sha and pushing belong to
// `.github/workflows/release.yml`, which is the thing that holds the
// credentials. `--dry-run` therefore proves the whole decision locally.
//
// THE RELEASE RULE
// ----------------
// A merge to `main` releases when BOTH hold:
//
//   1. `CHANGELOG.md` has content under `## Unreleased`. This is the author's
//      signal. Nothing is ever released that nobody wrote a line about, and it
//      is also the guard that stops the release commit from releasing itself:
//      rolling `Unreleased` empties it.
//   2. The merge touched `src/**`, or it changed a DEPENDENCY block in
//      `package.json` (`dependencies` / `peerDependencies` / `optional`).
//
// Rule 2 is deliberately narrow. A docs-only, dev-only, scripts-only or
// workflow-only merge changes nothing a consumer installs: the published
// tarball is `dist/` built from `src/`, plus the manifest. Cutting a version
// for a README edit spends a consumer bump PR on a package that is
// byte-identical to the one they already have. Dependency edits DO reach the
// consumer (a peer range, a runtime dep) even with `src/` untouched, so they
// count. `devDependencies` do not — they never leave this repo.
//
// A merge that has `Unreleased` content but touches no shippable path is not
// an error; the content simply waits for the next merge that does.
// ============================================

import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// ---------- pure: version ----------

/**
 * Split "0.178.0" into { major, minor, patch }. Throws on anything that is not
 * three plain integers — a prerelease or build tag has no defined minor bump
 * here and guessing one is how a bad version reaches the registry.
 */
export const parseVersion = (version) => {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(String(version).trim());
  if (!match) throw new Error(`Unparseable version: ${JSON.stringify(version)}`);
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) };
};

/** "0.178.0" → "0.179.0". Minor only: see the header. */
export const bumpMinor = (version) => {
  const { major, minor } = parseVersion(version);
  return `${major}.${minor + 1}.0`;
};

// ---------- pure: changelog ----------

// Both shapes appear in the wild (Keep-a-Changelog writes `## [Unreleased]`);
// this file uses the bare one. Detect either, emit only the bare one.
const UNRELEASED_HEADING = /^##\s+\[?Unreleased\]?\s*$/im;
const NEXT_HEADING = /^##\s+/m;

/**
 * The text under `## Unreleased`, up to the next `## ` heading, trimmed.
 * Returns "" when the heading is absent or the section is empty.
 */
export const unreleasedBody = (changelog) => {
  const heading = UNRELEASED_HEADING.exec(changelog);
  if (!heading) return "";
  const after = changelog.slice(heading.index + heading[0].length);
  const next = NEXT_HEADING.exec(after);
  const body = next ? after.slice(0, next.index) : after;
  return body.trim();
};

/** Does the author's `Unreleased` section say anything? */
export const hasUnreleasedContent = (changelog) => unreleasedBody(changelog).length > 0;

/**
 * Move the `Unreleased` body under a dated `## X.Y.0 — YYYY-MM-DD` heading and
 * leave `Unreleased` in place but empty.
 *
 * The em dash and the bare (unbracketed) version are this file's own format as
 * of 0.171.0–0.178.0; entries at 0.170.1 and below carry no date at all. New
 * headings match the recent shape, and the older ones are left alone.
 */
export const rollChangelog = (changelog, { version, date }) => {
  const heading = UNRELEASED_HEADING.exec(changelog);
  if (!heading) throw new Error("CHANGELOG.md has no `## Unreleased` heading — refusing to guess where a release goes.");
  const body = unreleasedBody(changelog);
  if (!body) throw new Error("CHANGELOG.md `## Unreleased` is empty — nothing to roll.");

  const before = changelog.slice(0, heading.index);
  const after = changelog.slice(heading.index + heading[0].length);
  const next = NEXT_HEADING.exec(after);
  const rest = next ? after.slice(next.index) : "";

  const rolled = `## Unreleased\n\n## ${version} — ${date}\n\n${body}\n\n`;
  return `${before}${rolled}${rest}`;
};

/** UTC `YYYY-MM-DD`. The runner is UTC; a local date would drift the heading. */
export const isoDate = (now = new Date()) => now.toISOString().slice(0, 10);

// ---------- pure: what counts as shippable ----------

/** Does this path reach a consumer's installed tarball? */
export const isShippablePath = (path) => path === "package.json" || path.startsWith("src/");

const DEP_BLOCKS = ["dependencies", "peerDependencies", "optionalDependencies"];

/**
 * Did a dependency block that a CONSUMER resolves change? `devDependencies` is
 * excluded on purpose — it never leaves this repo.
 * Both arguments are parsed package.json objects.
 */
export const depsChanged = (basePkg, headPkg) => {
  const block = (pkg, key) => JSON.stringify(pkg?.[key] ?? {});
  const differs = (key) => block(basePkg, key) !== block(headPkg, key);
  for (const key of DEP_BLOCKS) if (differs(key)) return true;
  return false;
};

/**
 * The whole release decision, as a pure function of the facts the driver
 * gathered. Returns `{ release, reason }`; `reason` is what the workflow log
 * prints, so it must read as an explanation on its own.
 */
export const decideRelease = ({ changedFiles, changelog, basePkg, headPkg }) => {
  if (!hasUnreleasedContent(changelog))
    return { release: false, reason: "CHANGELOG.md has nothing under `## Unreleased` — no release is owed." };

  const touchedSrc = changedFiles.filter((f) => f.startsWith("src/"));
  if (touchedSrc.length > 0)
    return {
      release: true,
      reason: `${touchedSrc.length} file(s) under src/ changed, and "## Unreleased" has content.`,
    };

  if (changedFiles.includes("package.json") && depsChanged(basePkg, headPkg))
    return { release: true, reason: "a dependency block in package.json changed, and `## Unreleased` has content." };

  return {
    release: false,
    reason:
      "no src/** change and no dependency-block change — the published tarball would be identical, so `## Unreleased` waits for the next shippable merge.",
  };
};

// ---------- impure: driver ----------

const git = (...args) => execFileSync("git", args, { cwd: repoRoot, encoding: "utf8" }).trim();

const tryGit = (...args) => {
  try {
    return git(...args);
  } catch {
    return null;
  }
};

// Release commits have carried two shapes: `chore(release): 0.178.0` since
// 0.171.0, and `chore: release 0.175.0` before/around it. Match both, or the
// base search walks past a release and over-reports changed files.
const RELEASE_SUBJECT_GREP = "^chore(\\(release\\))?: (release )?[0-9]+\\.[0-9]+\\.[0-9]+";

/**
 * The commit to diff against: the most recent release commit reachable from
 * `head`, INCLUDING `head` itself.
 *
 * Not `HEAD~1`, and not `head~1` either. A squash merge or a multi-commit push
 * makes `HEAD~1` miss files, and on a merge commit `HEAD~1` is the FIRST
 * parent — the main-line tip before the merge — so the release commit that
 * came in on the second parent is skipped and the diff spans two releases.
 * Measured here: HEAD is `73ca0be` (a PR merge), `HEAD~1` is `f62b3c9`
 * (release 0.177.0's merge), and the actual most recent release commit
 * `471d1e5` (0.178.0) sits on the other parent.
 *
 * Including `head` is also the second self-retrigger guard: when `head` IS the
 * release commit, base == head, the diff is empty, and nothing releases —
 * independently of the empty-`Unreleased` check.
 *
 * Falls back to the repo's first commit when no release commit is reachable.
 */
export const findBaseRef = (head = "HEAD") => {
  const found = tryGit("log", "--format=%H", "--extended-regexp", `--grep=${RELEASE_SUBJECT_GREP}`, "-n", "1", head);
  if (found) return found;
  return tryGit("rev-list", "--max-parents=0", head)?.split("\n").pop() ?? null;
};

const changedFilesSince = (base, head) => {
  if (!base) return null;
  const out = tryGit("diff", "--name-only", `${base}..${head}`);
  if (out === null) return null;
  return out.length === 0 ? [] : out.split("\n");
};

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

const readJsonAtRef = (ref, path) => {
  const raw = tryGit("show", `${ref}:${path}`);
  if (raw === null) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const parseArgs = (argv) => {
  const flag = (name) => argv.includes(`--${name}`);
  const value = (name) => {
    const hit = argv.find((a) => a.startsWith(`--${name}=`));
    return hit ? hit.slice(name.length + 3) : null;
  };
  return {
    dryRun: flag("dry-run"),
    json: flag("json"),
    base: value("base"),
    head: value("head") ?? "HEAD",
    // A `--changelog=` path is the caller's, so resolve it against THEIR cwd;
    // the default is the repo's own file wherever the script was invoked from.
    changelogPath: value("changelog") ? resolve(process.cwd(), value("changelog")) : resolve(repoRoot, "CHANGELOG.md"),
    date: value("date"),
  };
};

/** The first N lines of the unified diff a roll would produce, for the log. */
const changelogPreview = (body, version, date) => {
  const lines = body.split("\n");
  const shown = lines.slice(0, 12);
  const tail = lines.length > shown.length ? `\n  … ${lines.length - shown.length} more line(s)` : "";
  return `+ ## ${version} — ${date}\n+\n${shown.map((l) => `+ ${l}`).join("\n")}${tail}`;
};

const main = (argv) => {
  const args = parseArgs(argv);
  const pkgPath = resolve(repoRoot, "package.json");
  const lockPath = resolve(repoRoot, "package-lock.json");

  const headPkg = readJson(pkgPath);
  const changelog = readFileSync(args.changelogPath, "utf8");
  const head = tryGit("rev-parse", args.head) ?? args.head;
  const base = args.base ?? findBaseRef(args.head);
  const changedFiles = changedFilesSince(base, args.head);

  if (changedFiles === null) {
    console.error(`::error::could not diff ${base ?? "(no base found)"}..${args.head} — refusing to release from an unknown change set.`);
    return 1;
  }

  const basePkg = readJsonAtRef(base, "package.json") ?? {};
  const decision = decideRelease({ changedFiles, changelog, basePkg, headPkg });
  const nextVersion = decision.release ? bumpMinor(headPkg.version) : headPkg.version;
  const date = args.date ?? isoDate();

  if (args.json) {
    console.log(JSON.stringify({ ...decision, currentVersion: headPkg.version, nextVersion, base, head, changedFiles }, null, 2));
    return 0;
  }

  console.log(`base            ${base}`);
  console.log(`head            ${head}`);
  console.log(`changed files   ${changedFiles.length}`);
  console.log(`current version ${headPkg.version}`);
  console.log(`decision        ${decision.release ? "RELEASE" : "no release"} — ${decision.reason}`);

  if (!decision.release) return 0;

  console.log(`next version    ${nextVersion}`);
  console.log(`tag             v${nextVersion}`);
  console.log("");
  console.log("CHANGELOG.md would gain:");
  console.log(changelogPreview(unreleasedBody(changelog), nextVersion, date));
  console.log("");
  // The sha to tag does not exist yet: it is the commit the workflow is about
  // to create. Say so, rather than printing HEAD as if it were the answer.
  console.log(`The tag would point at the release commit created on top of ${head} — not at ${head} itself.`);

  if (args.dryRun) {
    console.log("\n--dry-run: nothing written.");
    return 0;
  }

  const rolled = rollChangelog(changelog, { version: nextVersion, date });
  writeFileSync(args.changelogPath, rolled);

  headPkg.version = nextVersion;
  writeFileSync(pkgPath, `${JSON.stringify(headPkg, null, 2)}\n`);

  // The lockfile carries the root package's own version in two places. Rewrite
  // them directly rather than shelling out to `npm install`, which would also
  // re-resolve the whole tree in a release commit that must change nothing else.
  const lock = readJson(lockPath);
  lock.version = nextVersion;
  if (lock.packages?.[""]) lock.packages[""].version = nextVersion;
  writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`);

  console.log(`\nWrote package.json, package-lock.json and CHANGELOG.md at ${nextVersion}.`);
  return 0;
};

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) process.exit(main(process.argv.slice(2)));
