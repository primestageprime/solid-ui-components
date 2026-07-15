#!/usr/bin/env node
// ============================================
// SUI style rubric linter
// --------------------------------------------
// The Layout-Purity / minimal-props regime allows an inline `style={{…}}` in a
// src/components *.tsx ONLY when the value is genuinely DYNAMIC (measured
// geometry, data-driven placement/proportion/paint, anchored overlays,
// columnar table config, cssvar bridges). Static literal values inline are
// always violations — they belong in a CSS class / curried variant.
//
// This linter makes that rule mechanical. It walks the component tree with the
// TypeScript compiler API, finds every `style={{ … }}` object literal, and
// checks each property against a per-file MANIFEST (scripts/style-rubric.json)
// that records which rubric CATEGORIES a file is allowed to use. It flags:
//   (a) a file that uses style={{ but is NOT in the manifest;
//   (b) a property not in the union of the file's categories' allowed
//       properties (custom properties `--*` need the `cssvar` category);
//   (c) a property whose value is a PURE static literal (a bare string/number
//       with no identifier / call / template interpolation) — EXCEPT a literal
//       used as the fallback of a `??` / `||` expression, which is allowed but
//       reported as ADVISORY.
// `style={props.style}` / `style={local.style}` (any non-object-literal
// initializer, e.g. a ternary or identifier passthrough) is always legal and
// is not inspected.
//
//   node scripts/style-rubric.mjs            # summary + nonzero exit on violations
//   node scripts/style-rubric.mjs --report   # per-file detail (build the manifest)
//   node scripts/style-rubric.mjs --json      # machine-readable counts
//
// The count of (a)+(b)+(c) violations is surfaced as the `styleRubricViolations`
// health metric (expected 0). Advisories do not count.
// ============================================
import ts from "typescript";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const COMPONENTS = join(root, "src/components");
const MANIFEST_PATH = join(root, "scripts", "style-rubric.json");

// Canonical category → allowed CSS properties. `cssvar` is special: it grants
// any `--*` custom property (checked separately), no fixed list.
export const CATEGORY_PROPS = {
  measured: [
    "width", "height", "min-width", "min-height", "max-width", "max-height",
    "top", "left", "transform",
  ],
  plotted: ["grid-row", "grid-column", "top", "left", "transform", "transition"],
  proportion: ["width", "height", "flex", "flex-basis", "transform", "clip-path", "transition"],
  paint: ["background", "background-color", "color", "border-color", "opacity", "transition"],
  anchored: ["top", "left", "right", "bottom", "transform"],
  columnar: ["width", "max-width", "min-width", "text-align"],
  cssvar: [], // any --* property
};

const camelToKebab = (s) => s.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase());

// ── walk .tsx (skip tests / d.ts) ────────────────────────────────────────────
const walk = (dir) => {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (p.endsWith(".tsx") && !p.includes(".test.")) out.push(p);
  }
  return out;
};

// Is an expression a pure static literal (no identifier/call/interpolation)?
const isStaticLiteral = (node) =>
  ts.isStringLiteral(node) ||
  ts.isNumericLiteral(node) ||
  ts.isNoSubstitutionTemplateLiteral(node) ||
  (ts.isPrefixUnaryExpression(node) && ts.isNumericLiteral(node.operand));

// Is `node` the literal fallback of a `??` / `||` (its right operand)?
const isFallbackLiteral = (node) => {
  const p = node.parent;
  return (
    p &&
    ts.isBinaryExpression(p) &&
    (p.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken ||
      p.operatorToken.kind === ts.SyntaxKind.BarBarToken) &&
    p.right === node &&
    isStaticLiteral(node)
  );
};

function propName(prop) {
  const n = prop.name;
  if (!n) return null;
  if (ts.isIdentifier(n)) return camelToKebab(n.text);
  if (ts.isStringLiteral(n)) return n.text; // already kebab (e.g. "min-height")
  return null; // computed — skip
}

function collectStyleObjects(sf) {
  const found = []; // { obj, line }
  const visit = (node) => {
    if (
      ts.isJsxAttribute(node) &&
      node.name.getText(sf) === "style" &&
      node.initializer &&
      ts.isJsxExpression(node.initializer) &&
      node.initializer.expression &&
      ts.isObjectLiteralExpression(node.initializer.expression)
    ) {
      const obj = node.initializer.expression;
      const line = sf.getLineAndCharacterOfPosition(obj.getStart(sf)).line + 1;
      found.push({ obj, line });
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return found;
}

function lint(manifest) {
  const files = walk(COMPONENTS);
  const violations = []; // {file,line,prop,kind,detail}
  const advisories = [];
  const perFile = {}; // file -> [{prop, static, value}]

  for (const file of files) {
    const rel = relative(root, file);
    const src = readFileSync(file, "utf8");
    const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const styleObjs = collectStyleObjects(sf);
    if (!styleObjs.length) continue;

    const cats = manifest.files?.[rel];
    const allowed = cats
      ? new Set(cats.flatMap((c) => CATEGORY_PROPS[c] ?? []))
      : new Set();
    const allowsVar = cats ? cats.includes("cssvar") : false;

    for (const { obj, line } of styleObjs) {
      if (!cats) {
        // (a) file uses style={{ but is not in the manifest
        violations.push({ file: rel, line, prop: "*", kind: "a", detail: "file not in manifest" });
      }
      for (const prop of obj.properties) {
        if (ts.isSpreadAssignment(prop)) continue; // ...overrides() passthrough
        const name = propName(prop);
        if (name === null) continue;
        // value node
        let value = null;
        if (ts.isPropertyAssignment(prop)) value = prop.initializer;
        else if (ts.isShorthandPropertyAssignment(prop)) value = prop.name;
        const isVar = name.startsWith("--");
        const staticLit = value ? isStaticLiteral(value) && !isFallbackLiteral(value) : false;
        const fallbackLit = value ? isFallbackLiteral(value) : false;
        (perFile[rel] ??= []).push({
          prop: name,
          static: staticLit,
          fallback: fallbackLit,
          value: value ? value.getText(sf).replace(/\s+/g, " ").slice(0, 40) : "",
          line,
        });
        if (!cats) continue; // already flagged (a); don't double-count props
        // (b) property not permitted by the file's categories
        const permitted = isVar ? allowsVar : allowed.has(name);
        if (!permitted) {
          violations.push({
            file: rel, line, prop: name, kind: "b",
            detail: isVar ? "cssvar category not granted" : `not in {${cats.join(",")}}`,
          });
        }
        // (c) pure static literal value (advisory if a ??/|| fallback)
        if (fallbackLit) advisories.push({ file: rel, line, prop: name, detail: "literal ??/|| fallback" });
        else if (staticLit)
          violations.push({ file: rel, line, prop: name, kind: "c", detail: `static literal ${value.getText(sf)}` });
      }
    }
  }
  return { violations, advisories, perFile };
}

// ── run ──────────────────────────────────────────────────────────────────────
export function run() {
  const manifest = existsSync(MANIFEST_PATH)
    ? JSON.parse(readFileSync(MANIFEST_PATH, "utf8"))
    : { files: {} };
  return lint(manifest);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const report = process.argv.includes("--report");
  const asJson = process.argv.includes("--json");
  const { violations, advisories, perFile } = run();
  if (asJson) {
    console.log(JSON.stringify({ violations: violations.length, advisories: advisories.length, detail: violations }, null, 2));
    process.exit(violations.length ? 1 : 0);
  }
  if (report) {
    for (const [file, props] of Object.entries(perFile).sort()) {
      console.log(`\n${file}`);
      for (const p of props)
        console.log(`  L${p.line}  ${p.prop.padEnd(16)} ${p.static ? "STATIC" : p.fallback ? "fallbk" : "dyn   "}  ${p.value}`);
    }
    console.log("\n────────────");
  }
  console.log(`styleRubricViolations: ${violations.length}   (advisories: ${advisories.length})`);
  for (const v of violations) console.log(`  [${v.kind}] ${v.file}:${v.line}  ${v.prop}  — ${v.detail}`);
  if (advisories.length && report)
    for (const a of advisories) console.log(`  (advisory) ${a.file}:${a.line}  ${a.prop}  — ${a.detail}`);
  process.exit(violations.length ? 1 : 0);
}
