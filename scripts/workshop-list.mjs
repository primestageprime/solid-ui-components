#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { extractBenchLabel } from "./workshop-lib.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const benchDir = join(repoRoot, "dev/showcases/workshop");

const benches = existsSync(benchDir)
  ? readdirSync(benchDir)
      .filter((f) => f.endsWith(".tsx"))
      .map((f) => f.replace(/\.tsx$/, ""))
      .sort()
      .map((slug) => ({
        slug,
        label: extractBenchLabel(readFileSync(join(benchDir, `${slug}.tsx`), "utf8"), slug),
      }))
  : [];

if (benches.length === 0) {
  console.log("No workshop benches. Create one: node scripts/workshop-new.mjs <slug>");
} else {
  console.log(`${benches.length} bench(es):`);
  for (const { slug, label } of benches) console.log(`  workshop:${slug}  (${label})`);
}
