#!/usr/bin/env node
// ============================================
// Run Biome, or fail LOUDLY — never silently pass.
//
// The failure this exists to prevent, observed 2026-07-29: `@biomejs/biome` was
// declared in devDependencies and present in the lockfile but NOT INSTALLED.
// An agent verifying its work locally reached for `npx biome`, which resolved
// an unrelated package named `biome` (v0.3.3) from the registry — a different
// tool entirely, which exited 0 having linted nothing. Every local "lint clean"
// was meaningless, three lint failures reached `main`, and one of them let a
// release publish from a red commit.
//
// The bug is not "the tool was missing". It is that **"tool absent" and "tool
// ran, all clean" were indistinguishable at the call site.** That is strictly
// worse than having no linter: a repo with no linter is honest about it; a repo
// whose linter silently isn't there manufactures confidence.
//
// So this script refuses to be ambiguous:
//   - it resolves the SCOPED package, so a stray `biome` on PATH or in the
//     registry cannot satisfy it;
//   - it checks the resolved name, so the wrong package fails rather than runs;
//   - if it cannot find the real thing it exits NON-ZERO with instructions,
//     never 0.
//
// Test the third case, not just the first two. A gate is only known to work
// once it has been observed rejecting something — see AGENT_GUIDE.
// ============================================
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

const PKG = "@biomejs/biome";
const require = createRequire(import.meta.url);

const die = (lines) => {
  console.error(`\n  ✗ LINT DID NOT RUN — refusing to report success.\n`);
  for (const l of lines) console.error(`  ${l}`);
  console.error("");
  process.exit(1);
};

let pkgJsonPath;
try {
  pkgJsonPath = require.resolve(`${PKG}/package.json`);
} catch {
  die([
    `${PKG} is not installed, so nothing was linted.`,
    "",
    "  Fix:  npm install",
    "",
    "  Do NOT reach for `npx biome` — the bare name resolves an UNRELATED",
    "  package (biome@0.3.3) that exits 0 without linting anything. That is",
    "  what made a broken gate look green for a whole day.",
  ]);
}

const meta = require(pkgJsonPath);
if (meta.name !== PKG) {
  die([
    `Resolved "${meta.name}" where ${PKG} was expected — wrong package.`,
    "  Refusing to treat its exit code as a lint result.",
  ]);
}

// Prefer the package's own bin over anything on PATH.
const binDir = join(dirname(pkgJsonPath), "bin");
const local = join(binDir, "biome");
const bin = existsSync(local) ? local : null;
if (!bin) {
  die([
    `${PKG}@${meta.version} resolved, but its bin is missing at ${local}.`,
    "  A partial install. Fix:  npm install",
  ]);
}

const args = process.argv.slice(2);
const run = spawnSync(process.execPath, [bin, ...args], { stdio: "inherit" });
process.exit(run.status ?? 1);
