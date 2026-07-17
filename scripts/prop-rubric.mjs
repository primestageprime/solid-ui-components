#!/usr/bin/env node
// ============================================
// SUI prop rubric linter — type-level enforcement of semantic props
// --------------------------------------------
// Companion to scripts/style-rubric.mjs. Where the style rubric guards the
// *implementation* (an inline style={{…}} must be dynamic + classified), this
// guards the *public interface*: a curried component's contract is specific
// typed properties, never raw CSS strings (ADR 0003; plan
// docs/superpowers/plans/2026-07-16-semantic-props-metric.md).
//
// The violation is a geometry/paint prop whose declared TYPE admits a raw CSS
// string — `width?: string`, `maxHeight?: string`, `height?: number | string`.
// A geometry/paint prop typed pure `number` (semantic px/fraction), a named
// literal union (`"sm" | "md"`), or a token alias (`SeriesToken`) is the
// sanctioned form and passes.
//
// It walks src/components/**/*.{ts,tsx} (skip .test./.d.ts) with the TS
// compiler API and inspects the members of:
//   • every EXPORTED interface / type-alias whose name ends in `Props`
//     (the component public-contract convention), and
//   • the Table column-def shapes — every named interface / object type-alias
//     declared in the four designated column-def files (Table/types.ts,
//     Table/columnHelpers.tsx, Table/GroupedTable.tsx,
//     DataDisplay/StatsTable/StatsTable.tsx) even if not named *Props.
// Derived types (Pick<…>/Omit<…> — TypeReference, not an object literal) are
// not re-inspected; their members are counted once at the source interface.
//
// A property is flagged when BOTH:
//   1. its name is in the geometry/paint set below, and
//   2. its type node contains the `string` keyword (bare string or a union arm).
//
// EXCEPTION: a `color: string` (or other paint) prop that carries caller-OWNED
// identity colour (a Legend swatch, a Dropdown dot, a ScenarioDot, an episode
// characterColor — ADR 0003) is sanctioned. Those file+prop pairs are
// whitelisted in scripts/prop-rubric.json with a reason string. There is NO
// layout-family exemption by default (Peter ruled: no escape hatches); the
// manifest is the only way an exemption is granted.
//
//   node scripts/prop-rubric.mjs            # summary + nonzero exit on violations
//   node scripts/prop-rubric.mjs --report   # per-site detail
//   node scripts/prop-rubric.mjs --json      # machine-readable counts
//
// The count is surfaced as the `cssTypedProps` health metric (ratcheted).
// ============================================
import ts from "typescript";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const COMPONENTS = join(root, "src/components");
const MANIFEST_PATH = join(root, "scripts", "prop-rubric.json");

// Geometry/paint prop names that map to a raw CSS length/colour. An exact
// (camelCase) name match — `leftPanelWidth` is NOT `width`.
export const GEOMETRY_PAINT_PROPS = new Set([
  "width", "height", "minWidth", "maxWidth", "minHeight", "maxHeight",
  "top", "left", "gap", "size",
  "background", "backgroundColor", "color", "borderColor", "opacity",
]);

// Column-def files whose named shapes are inspected even when not *Props.
const COLUMN_DEF_FILES = new Set([
  "src/components/Table/types.ts",
  "src/components/Table/columnHelpers.tsx",
  "src/components/Table/GroupedTable.tsx",
  "src/components/DataDisplay/StatsTable/StatsTable.tsx",
]);

// ── walk .ts/.tsx (skip tests / d.ts) ────────────────────────────────────────
const walk = (dir) => {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (/\.tsx?$/.test(p) && !p.includes(".test.") && !p.endsWith(".d.ts"))
      out.push(p);
  }
  return out;
};

// Does a type node contain the bare `string` keyword anywhere (bare, or a
// union arm like `number | string`)? A string *literal* union member
// (`"sm"`) is a LiteralType, not the StringKeyword, so it does NOT match.
const typeContainsString = (node) => {
  if (!node) return false;
  if (node.kind === ts.SyntaxKind.StringKeyword) return true;
  let found = false;
  ts.forEachChild(node, (c) => {
    if (!found && typeContainsString(c)) found = true;
  });
  return found;
};

const hasExportModifier = (node) =>
  (ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Export) !== 0;

// The object-literal members of a declaration, or null if it isn't one we
// inspect (a Pick<>/Omit<> derived alias resolves to a TypeReference → skip).
const memberList = (node) => {
  if (ts.isInterfaceDeclaration(node)) return node.members;
  if (ts.isTypeAliasDeclaration(node) && ts.isTypeLiteralNode(node.type))
    return node.type.members;
  return null;
};

function lint(manifest) {
  const files = walk(COMPONENTS);
  const violations = []; // { file, line, prop, type }
  const whitelisted = []; // { file, prop, reason }

  for (const file of files) {
    const rel = relative(root, file);
    const isColumnDefFile = COLUMN_DEF_FILES.has(rel);
    const src = readFileSync(file, "utf8");
    const sf = ts.createSourceFile(
      file, src, ts.ScriptTarget.Latest, true,
      file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );

    const visit = (node) => {
      const members = memberList(node);
      if (members) {
        const name = node.name?.text ?? "";
        // Inspect: exported *Props contracts, plus any named shape in a
        // designated column-def file.
        const inspect =
          (name.endsWith("Props") && hasExportModifier(node)) || isColumnDefFile;
        if (inspect) {
          for (const m of members) {
            if (!ts.isPropertySignature(m) || !m.name || !ts.isIdentifier(m.name))
              continue;
            const propName = m.name.text;
            if (!GEOMETRY_PAINT_PROPS.has(propName)) continue;
            if (!typeContainsString(m.type)) continue;
            const wl = manifest.allow?.[rel]?.[propName];
            if (wl) {
              whitelisted.push({ file: rel, prop: propName, reason: wl });
              continue;
            }
            const line =
              sf.getLineAndCharacterOfPosition(m.getStart(sf)).line + 1;
            violations.push({
              file: rel,
              line,
              prop: `${name}.${propName}`,
              type: m.type.getText(sf).replace(/\s+/g, " "),
            });
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
  violations.sort((a, b) =>
    a.file === b.file ? a.line - b.line : a.file < b.file ? -1 : 1,
  );
  return { violations, whitelisted };
}

// ── run ──────────────────────────────────────────────────────────────────────
export function run() {
  const manifest = existsSync(MANIFEST_PATH)
    ? JSON.parse(readFileSync(MANIFEST_PATH, "utf8"))
    : { allow: {} };
  return lint(manifest);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const report = process.argv.includes("--report");
  const asJson = process.argv.includes("--json");
  const { violations, whitelisted } = run();
  if (asJson) {
    console.log(
      JSON.stringify(
        { violations: violations.length, whitelisted: whitelisted.length, detail: violations },
        null, 2,
      ),
    );
    process.exit(violations.length ? 1 : 0);
  }
  console.log(
    `cssTypedProps: ${violations.length}   (whitelisted identity props: ${whitelisted.length})`,
  );
  for (const v of violations)
    console.log(`  ${v.file}:${v.line}  ${v.prop}: ${v.type}`);
  if (report && whitelisted.length) {
    console.log("\nWhitelisted (scripts/prop-rubric.json):");
    for (const w of whitelisted) console.log(`  ${w.file}  ${w.prop}  — ${w.reason}`);
  }
  process.exit(violations.length ? 1 : 0);
}
