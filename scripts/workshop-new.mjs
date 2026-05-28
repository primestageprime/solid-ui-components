#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { isValidSlug, slugToTitle, renderBenchTemplate } from "./workshop-lib.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const benchDir = join(repoRoot, "dev/showcases/workshop");

const argv = process.argv.slice(2);
const slug = argv.find((a) => !a.startsWith("--"));
const labelIdx = argv.indexOf("--label");
const label = labelIdx !== -1 ? argv[labelIdx + 1] : undefined;

const fail = (msg) => {
  console.error(`workshop-new: ${msg}`);
  console.error("usage: node scripts/workshop-new.mjs <kebab-slug> [--label \"Nice Label\"]");
  process.exit(1);
};

if (!slug) fail("missing <slug>");
if (!isValidSlug(slug)) fail(`"${slug}" is not a kebab-case slug (a-z, 0-9, hyphen)`);

mkdirSync(benchDir, { recursive: true });
const filePath = join(benchDir, `${slug}.tsx`);
if (existsSync(filePath)) {
  fail(`bench already exists at dev/showcases/workshop/${slug}.tsx — refusing to overwrite`);
}

writeFileSync(filePath, renderBenchTemplate({ slug, label: label ?? slugToTitle(slug) }));
console.log(`Created dev/showcases/workshop/${slug}.tsx`);
console.log(`Nav id: workshop:${slug}`);
