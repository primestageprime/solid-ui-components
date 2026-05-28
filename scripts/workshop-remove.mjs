#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { existsSync, unlinkSync } from "node:fs";
import { isValidSlug } from "./workshop-lib.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const benchDir = join(repoRoot, "dev/showcases/workshop");

const slug = process.argv[2];
if (!slug || !isValidSlug(slug)) {
  console.error("usage: node scripts/workshop-remove.mjs <kebab-slug>");
  process.exit(1);
}

const filePath = join(benchDir, `${slug}.tsx`);
if (!existsSync(filePath)) {
  console.warn(`workshop-remove: no bench at dev/showcases/workshop/${slug}.tsx (nothing to do)`);
  process.exit(0);
}

unlinkSync(filePath);
console.log(`Removed dev/showcases/workshop/${slug}.tsx`);
