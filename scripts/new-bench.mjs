#!/usr/bin/env node
// ============================================
// new:bench — a workshop bench, barrel-wired and framed, in one command.
//
//   node scripts/new-bench.mjs <slug> [--label "Nice Label"]
//
// A Bench (dev/showcases/workshop/<slug>.tsx) is AUTO-DISCOVERED — dev/main.tsx
// globs `./showcases/workshop/*.tsx` (see workshop-benches.ts) and surfaces
// every default export as its own row under the Workshop nav link, exactly
// how `license-board` appears there today. There is no separate nav-edit
// step: writing the file *is* registering it.
//
// This reuses `scripts/workshop-lib.mjs` (slug validation, the label
// vocabulary) — see `scripts/workshop-new.mjs`, which this generator's plain
// sibling. It differs only in the template: `renderBarrelBenchTemplate`
// imports from the PACKAGE BARREL (`../../../src`, the way a Consumer App
// would) and opens on an empty `ViewportColumn` frame rather than a bare
// `<div>`, added additively to workshop-lib.mjs alongside the existing
// `renderBenchTemplate`.
//
// Refuses when the bench already exists (workshop-new.mjs's own check,
// reused here) and is idempotent to re-run after a refusal — nothing is
// written until the target's absence is confirmed.
// ============================================
import { join } from "node:path";
import {
  isValidSlug,
  slugToTitle,
  renderBarrelBenchTemplate,
} from "./workshop-lib.mjs";
import {
  root,
  fileWrite,
  runPlan,
  runHealth,
  printHealthDelta,
} from "./generator-lib.mjs";

const argv = process.argv.slice(2);
const slug = argv.find((a) => !a.startsWith("--"));
const labelIdx = argv.indexOf("--label");
const label = labelIdx !== -1 ? argv[labelIdx + 1] : undefined;

const fail = (msg) => {
  console.error(`new:bench: ${msg}`);
  console.error(
    'usage: node scripts/new-bench.mjs <kebab-slug> [--label "Nice Label"]',
  );
  process.exit(1);
};

if (!slug) fail("missing <slug>");
if (!isValidSlug(slug))
  fail(`"${slug}" is not a kebab-case slug (kebab-case, must start with a letter)`);

const benchPath = join(root, "dev/showcases/workshop", `${slug}.tsx`);
const plan = {
  writes: [
    fileWrite(
      benchPath,
      renderBarrelBenchTemplate({ slug, label: label ?? slugToTitle(slug) }),
    ),
  ],
  edits: [],
};

const before = runHealth();
runPlan(plan, { name: "new:bench" });
console.log(`  nav id: workshop:${slug}`);
const after = runHealth();
printHealthDelta(before.metrics, after.metrics);
console.log(
  "\nnote: scripts/health-history.json changed — commit it alongside this bench.",
);
