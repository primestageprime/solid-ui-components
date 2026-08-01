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
// A component is ALSO covered when another component renders it internally and
// that component is showcased — DataList composes DataValuePrimary, so looking
// at the DataList showcase IS looking at DataValuePrimary. Contriving a
// separate demo for something that never stands on its own teaches nothing;
// worse, it invents a call-site shape nobody should copy. Only components a
// CLIENT composes itself (a chart slot dropped into <Chart>, a card, a whole
// control) need their own place in the gallery.
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
// Renaming re-exports (`export { SwimlaneChart as SwimlaneChartStatic }`) are
// the SAME component under a second public name. Looking at the SwimlaneChart
// showcase IS looking at SwimlaneChartStatic, so the alias is covered whenever
// its target is — remember the underlying declaration name to check later.
const aliasTargetOf = new Map();
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

  const targetName = target.getName();
  if (targetName !== name) aliasTargetOf.set(name, targetName);
  components.push(name);
}
components.sort();

// ── what the gallery shows ───────────────────────────────────────────────────
const galleryText = walk(GALLERY, (p) => /\.tsx?$/.test(p) && !p.includes(".test."))
  .map((f) => readFileSync(f, "utf8"))
  .join("\n");

const nameInGallery = (name) => new RegExp(`\\b${name}\\b`).test(galleryText);

const referencedInGallery = (name) => {
  if (nameInGallery(name)) return true;
  const alias = aliasTargetOf.get(name);
  return alias !== undefined && nameInGallery(alias);
};

// ── what other components render internally ──────────────────────────────────
// family(X) = the src/components/<dir> a component is defined in. A component
// is implicitly covered when a file in a DIFFERENT, showcased family renders
// it. One hop only: the point is "you can already see this thing", and a chain
// of invisible parents doesn't make anything visible.
const familyOf = new Map();
const sourceFiles = walk(join(root, "src/components"), (p) => /\.tsx?$/.test(p) && !p.includes(".test."));
// Comments are stripped before matching: SlotCard's header explains how it
// differs from EntityCard, and a component named in prose is not a component
// rendered.
const stripComments = (src) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .split("\n")
    .map((l) => (/^\s*(\/\/|\*)/.test(l) ? "" : l))
    .join("\n");
const fileText = new Map(
  sourceFiles.map((f) => [f, stripComments(readFileSync(f, "utf8"))]),
);
const familyOfFile = (f) => f.split("src/components/")[1]?.split("/")[0];

for (const name of components) {
  for (const [f, text] of fileText) {
    if (new RegExp(`export (const|function|class) ${name}\\b`).test(text)) {
      familyOf.set(name, familyOfFile(f));
      break;
    }
  }
}

// A family is showcased when any of its own exports is referenced in dev/.
const showcasedFamilies = new Set(
  components.filter(referencedInGallery).map((n) => familyOf.get(n)),
);

const renderedByShowcasedFamily = (name) => {
  const own = familyOf.get(name);
  for (const [f, text] of fileText) {
    const fam = familyOfFile(f);
    if (fam === own || !showcasedFamilies.has(fam)) continue;
    if (new RegExp(`\\b${name}\\b`).test(text)) return fam;
  }
  return null;
};

const implicit = new Map();
const missing = [];
for (const name of components) {
  if (referencedInGallery(name)) continue;
  const parent = renderedByShowcasedFamily(name);
  if (parent) implicit.set(name, parent);
  else missing.push(name);
}

export function run() {
  return { components, missing, implicit };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const asJson = process.argv.includes("--json");
  const list = process.argv.includes("--list");
  if (asJson) {
    console.log(
      JSON.stringify(
        { total: components.length, missing, implicit: Object.fromEntries(implicit) },
        null,
        2,
      ),
    );
  } else if (list) {
    for (const m of missing) console.log(m);
  } else {
    console.log(
      `componentsWithoutShowcase: ${missing.length}   (of ${components.length} exported components; ${implicit.size} covered inside a showcased parent)`,
    );
    for (const m of missing) console.log(`  ${m}`);
  }
  process.exit(missing.length ? 1 : 0);
}
