#!/usr/bin/env node
// link-consumer / unlink-consumer — wire a local SUI checkout into a
// consumer app via `npm link`, so the consumer's dev server resolves SUI's
// SOURCE (src/index.ts) instead of a published/registry build, with HMR on
// SUI edits and no publish round-trip.
//
// Proven 2026-09-22 against a thorcasting-ui worktree: see
// docs/link-consumer.md for the exact mechanism and its traps.
//
// This script does the LINK plumbing (npm link both directions) only. It
// does NOT edit the consumer's app.config.ts / vite config — that config
// must already contain the "SUI_SOURCE_LINKED" guard pattern (see
// thorcasting-ui/app.config.ts, or dside-ui/app.config.ts for the simpler
// fs.allow-only version). If the consumer doesn't have that guard yet,
// linking still creates the symlink, but the dev server won't pick up
// source mode until the guard is added by hand — this script warns when it
// can't find one.
import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL("..", import.meta.url));
const PKG_NAME = "@primestageprime/solid-ui-components";

function run(cmd, args, cwd) {
  console.log(`+ (${cwd}) ${cmd} ${args.join(" ")}`);
  execFileSync(cmd, args, { cwd, stdio: "inherit" });
}

function usageAndExit() {
  console.error("Usage: npm run link:consumer -- <path-to-consumer>");
  console.error("       npm run unlink:consumer -- <path-to-consumer>");
  process.exit(1);
}

function isSymlinkedToSui(consumerNodeModulesEntry) {
  try {
    return lstatSync(consumerNodeModulesEntry).isSymbolicLink();
  } catch {
    return false;
  }
}

function checkGuardPattern(consumerPath) {
  const candidates = ["app.config.ts", "vite.config.ts", "vitest.config.ts"];
  for (const file of candidates) {
    const p = resolve(consumerPath, file);
    if (!existsSync(p)) continue;
    const text = readFileSync(p, "utf8");
    if (text.includes("isSymbolicLink") || text.includes("SUI_SOURCE_LINKED")) {
      return { found: true, file };
    }
  }
  return { found: false, file: null };
}

function main() {
  const mode = process.argv[1].includes("unlink") ? "unlink" : "link";
  const consumerArg = process.argv[2];
  if (!consumerArg) usageAndExit();

  const consumerPath = resolve(process.cwd(), consumerArg);
  if (!existsSync(resolve(consumerPath, "package.json"))) {
    console.error(`No package.json at ${consumerPath} — is this a consumer app root?`);
    process.exit(1);
  }

  const consumerNodeModulesEntry = resolve(
    consumerPath,
    "node_modules/@primestageprime/solid-ui-components",
  );

  if (mode === "link") {
    // 1. Register this SUI checkout globally (idempotent — re-running just
    //    repoints the global symlink at this checkout and rebuilds dist,
    //    which some consumers' SSR/node paths still resolve to).
    run("npm", ["link"], here);

    // 2. Point the consumer at it.
    run("npm", ["link", PKG_NAME], consumerPath);

    if (!isSymlinkedToSui(consumerNodeModulesEntry)) {
      console.error(
        `Expected a symlink at ${consumerNodeModulesEntry} after linking — something went wrong.`,
      );
      process.exit(1);
    }
    console.log(`\n✓ ${consumerPath} now resolves ${PKG_NAME} -> ${here}`);

    const guard = checkGuardPattern(consumerPath);
    if (guard.found) {
      console.log(
        `✓ Found a source-linked guard in ${guard.file} — the dev server should pick up SUI source mode automatically. Restart it if already running.`,
      );
    } else {
      console.warn(
        "\n⚠ No SUI_SOURCE_LINKED-style guard found in this consumer's app.config.ts / vite config.\n" +
          "  The symlink is in place, but without that guard the dev server will still\n" +
          "  resolve SUI's published dist/ (or fail on missing fs.allow / optimizeDeps\n" +
          "  exclusions). See docs/link-consumer.md for the exact block to add\n" +
          "  (copy it from thorcasting-ui/app.config.ts or dside-ui/app.config.ts).",
      );
    }
    console.log("\nUnlink later with: npm run unlink:consumer -- " + consumerArg);
    return;
  }

  // mode === "unlink"
  if (!isSymlinkedToSui(consumerNodeModulesEntry)) {
    console.log(`${consumerNodeModulesEntry} is not a symlink — nothing to unlink.`);
    return;
  }
  // `npm install` on a linked dep silently no-ops (reconciles against the
  // lockfile's `link: true` and keeps the symlink) — the reliable way back
  // to the registry version is to remove the symlink first, then reinstall.
  run("npm", ["unlink", "--no-save", PKG_NAME], consumerPath);
  run("npm", ["install"], consumerPath);
  console.log(`\n✓ ${consumerPath} restored to its registry-pinned ${PKG_NAME}.`);
}

main();
