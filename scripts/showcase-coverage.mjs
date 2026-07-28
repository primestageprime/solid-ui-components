#!/usr/bin/env node
// ============================================
// Showcase coverage — every exported COMPONENT should be visible in the dev
// gallery. A component nobody can look at is a component nobody adopts: call
// sites get invented from the type signature instead of from a rendered
// example, which is how override props and hand-rolled geometry creep back in.
//
// The check is mechanical: resolve the public value exports of src/index.ts,
// keep the ones that look like components (PascalCase values that aren't
// factories/helpers/data), and ask whether each is REFERENCED anywhere under
// dev/. Referenced — not merely imported — because a showcase that imports a
// variant and never renders it teaches nothing, and the cheapest honest proxy
// for "rendered" is "the name appears in a gallery file".
//
//   node scripts/showcase-coverage.mjs           # summary + nonzero exit if any are missing
//   node scripts/showcase-coverage.mjs --list    # the missing names, one per line
//   node scripts/showcase-coverage.mjs --json    # machine-readable
//
// Surfaced as the `componentsWithoutShowcase` health metric.
// ============================================
import ts from "typescript";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ENTRY = join(root, "src/index.ts");
const GALLERY = join(root, "dev");

// Names that are exported values in PascalCase but are not components: type
// carriers, enums-as-objects, and the `create*` factories (which are exercised
// through their curried variants, not directly).
const NOT_A_COMPONENT = [
  /^(create[A-Z]|use[A-Z])/, // factories and hooks — exercised through variants
  /^[A-Z0-9_]+$/, // SCREAMING_SNAKE constants (ICON_PATHS, DEFAULT_TOTAL_MS)
  /^HUD/, // legacy back-compat aliases of components that are showcased
];

const walk = (dir, pred) => {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p, pred));
    else if (pred(p)) out.push(p);
  }
  return out;
};

// ── the public component surface ─────────────────────────────────────────────
const program = ts.createProgram([ENTRY], {
  target: ts.ScriptTarget.ESNext,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  jsx: ts.JsxEmit.Preserve,
  allowJs: false,
  noEmit: true,
  skipLibCheck: true,
});
const checker = program.getTypeChecker();
const entrySource = program.getSourceFile(ENTRY);
const moduleSymbol = checker.getSymbolAtLocation(entrySource);

const components = [];
for (const sym of checker.getExportsOfModule(moduleSymbol)) {
  const name = sym.getName();
  if (!/^[A-Z]/.test(name)) continue;
  if (NOT_A_COMPONENT.some((re) => re.test(name))) continue;

  // Resolve aliases (`export * from`) to the real declaration, then keep only
  // VALUES — a type-only export (props interfaces, unions like AccentTone) is
  // not something a showcase can render.
  const target =
    sym.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(sym) : sym;
  const isValue =
    target.flags &
    (ts.SymbolFlags.Variable | ts.SymbolFlags.Function | ts.SymbolFlags.Class);
  if (!isValue) continue;

  components.push(name);
}
components.sort();

// ── what the gallery shows ───────────────────────────────────────────────────
const galleryText = walk(GALLERY, (p) => /\.tsx?$/.test(p) && !p.includes(".test."))
  .map((f) => readFileSync(f, "utf8"))
  .join("\n");

const missing = components.filter(
  (name) => !new RegExp(`\\b${name}\\b`).test(galleryText),
);

export function run() {
  return { components, missing };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const asJson = process.argv.includes("--json");
  const list = process.argv.includes("--list");
  if (asJson) {
    console.log(JSON.stringify({ total: components.length, missing }, null, 2));
  } else if (list) {
    for (const m of missing) console.log(m);
  } else {
    console.log(
      `componentsWithoutShowcase: ${missing.length}   (of ${components.length} exported components)`,
    );
    for (const m of missing) console.log(`  ${m}`);
  }
  process.exit(missing.length ? 1 : 0);
}
