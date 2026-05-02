#!/usr/bin/env node
// audit-inline-styles.mjs
// Greps src/components for `style={...}` JSX attributes and surfaces:
//   - the count per file
//   - the most-repeated normalized style fragments (good candidates for new
//     curried variants)
// No external deps; runs under node ≥18.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("../src/components", import.meta.url).pathname;

const walk = (dir, out = []) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(name)) out.push(p);
  }
  return out;
};

// Extract `style={…}` blocks across multiple lines. Naive but adequate.
const STYLE_RX = /style=\{([\s\S]*?)\}\s*[/>]/g;

const normalize = (s) =>
  s
    .replace(/\s+/g, " ")
    .replace(/['"`]/g, '"')
    .trim();

const fileCounts = new Map();
const fragmentCounts = new Map();
const fragmentExamples = new Map();

for (const file of walk(ROOT)) {
  const text = readFileSync(file, "utf8");
  let m;
  let count = 0;
  while ((m = STYLE_RX.exec(text))) {
    count += 1;
    const frag = normalize(m[1]);
    if (!frag) continue;
    fragmentCounts.set(frag, (fragmentCounts.get(frag) ?? 0) + 1);
    if (!fragmentExamples.has(frag)) {
      fragmentExamples.set(frag, relative(process.cwd(), file));
    }
  }
  if (count > 0) fileCounts.set(relative(process.cwd(), file), count);
}

const totalCount = [...fileCounts.values()].reduce((a, b) => a + b, 0);
console.log(`# Inline style audit\n`);
console.log(`Total \`style={…}\` occurrences: ${totalCount} across ${fileCounts.size} files\n`);

console.log(`## Top 15 files by inline style count\n`);
const topFiles = [...fileCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);
for (const [f, n] of topFiles) console.log(`- ${n.toString().padStart(3)}  ${f}`);

console.log(`\n## Most repeated style fragments (candidates for curried variants)\n`);
const repeated = [...fragmentCounts.entries()]
  .filter(([, n]) => n >= 2)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 25);

if (repeated.length === 0) {
  console.log(`(none)`);
} else {
  for (const [frag, n] of repeated) {
    console.log(`- ${n}× ${frag}  — first seen: ${fragmentExamples.get(frag)}`);
  }
}
