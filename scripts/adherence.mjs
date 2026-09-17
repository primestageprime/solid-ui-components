#!/usr/bin/env node
// ============================================
// SUI adherence — does each component still obey the design philosophy?
// --------------------------------------------
// `health.mjs` ratchets FOURTEEN repo-wide counters. Every one of them is a
// number: `inlineStyleSrc` is 65, and nothing in the output says which
// component owes what, or which of those 65 is a Composite breaking
// BEST_PRACTICES §1 versus a Primitive doing its job. This script answers the
// other question — **per component, what does it owe** — and answers it as a
// worklist an agent can pick one item off.
//
// It is NOT a ratchet and deliberately has no baseline (Peter decides whether
// it ever becomes one, 2026-09-17). `--quiet` therefore ALWAYS exits 0 unless
// the script itself crashed: a post-commit hook and a Claude Code SessionStart
// hook both call it, and a reporting tool that can fail a commit or break
// every agent session in the repo is worse than no tool.
//
// ── The rules, and which document each one comes from ───────────────────────
//
//   css              A Composite "owns zero CSS files and zero inline
//                    style={}" (BEST_PRACTICES §1). A Depth-2+ folder with a
//                    .css file has styling outside the Primitive layer.
//   intrinsic        Same clause, other half: a Composite "composes curried
//                    variants of Primitives" — a raw <div>/<span>/<table> is a
//                    Primitive it declined to use. SVG tags are reported
//                    SEPARATELY and as info, because §8 ("d3 is math only,
//                    Solid owns the DOM") and the STYLE_GUIDE svg/canvas
//                    exemption both put chart interiors outside the box model.
//   third-party      "Wrapping a headless third-party primitive (Kobalte)
//                    still counts as a Primitive" (§1) — so a Composite that
//                    imports one directly has skipped the wrapper layer.
//   inline-style     `style={{` in a Depth-2+ module. Narrower than health's
//                    `inlineStyleSrc`, which counts all of src/ including the
//                    Primitives that are allowed it. `style={props.style}`
//                    passthrough is the §1 exception and is not counted.
//   depth-mismatch   The header says Depth 2 and the module imports something
//                    the repo itself declares Depth 2+. This compares the
//                    repo's headers AGAINST EACH OTHER; it does not derive an
//                    absolute depth, which would need a judgment call about
//                    what "arranges children" means.
//   depth-label      No canonical `(Depth N)` declaration in the leading
//                    comment block. `missingDepthHeaders` is ratcheted at 0 on
//                    the LOOSE regex `/Depth [0-9]/` anywhere in the file, so
//                    prose ("Why it is Depth 2 and not the Atomic…") satisfies
//                    it. That gap is why this rule exists, and it also catches
//                    the pre-2026 `(Depth 0)` label — the scale in the
//                    STYLE_GUIDE starts at 1.
//   helper-exports   "Clients import only curried components" (memory rule,
//                    CONTEXT.md): a component folder that publishes bare
//                    helper FUNCTIONS to the root barrel is exporting its
//                    internals.
//   missing-factory  Every component "ships a full curried set" — a published
//                    component with no `create<Name>` factory and no
//                    variants.ts has no curried path to close a bypass with.
//   unused-variants  Exported names no production consumer imports
//                    (docs/usage-manifest.json). INFO, never actionable
//                    unprompted: §4 puts the variant surface behind a Peter
//                    gate in BOTH directions, so "delete it" is his call.
//
// ── Why the declared depth is parsed so strictly ────────────────────────────
// Five rules key off it, so a wrong depth is a wrong report. `grep -o "Depth
// [0-9]"` over AnimatedSwimlaneChart.tsx returns TWO values, and
// RateGauge.tsx:33 and MutationSliders.tsx:4 both match on prose about a
// DIFFERENT component's depth. So only the contiguous leading comment block is
// read, and only the canonical `— <Kind> (Depth N)` form counts. A file with a
// loose match and no canonical declaration is reported (`depth-label`), never
// silently assigned the number that happened to match first.
//
// ── Exemptions live in a file with a reason each ────────────────────────────
// `scripts/adherence-exemptions.json`. Not an allowlist buried in this source:
// `prop-rubric.json` exists for exactly this purpose, and
// `health-baseline._raises` exists because a justification in a commit message
// "is effectively lost". The layout-exempt set (Modal, CollapsiblePanel,
// BottomSheet, Page, …) is quoted from STYLE_GUIDE § Layout Purity §
// Exemptions; without it the top of the worklist is mostly components doing
// what they were told to.
//
// ── Items are per (component, rule), with the occurrences inside ────────────
// `ADH-MutationSliders-css` is one item whatever the file count, so the id the
// refactor-pass skill is handed stays stable while the component is worked on.
//
//   node scripts/adherence.mjs              # summary table
//   node scripts/adherence.mjs --quiet      # write the two files, say nothing
//   node scripts/adherence.mjs --list       # every item, one per line
//   node scripts/adherence.mjs --json       # the report on stdout
//   node scripts/adherence.mjs --component=RateGauge
//
// Writes docs/adherence/OPEN_ITEMS.md and docs/adherence/report.json, both
// GIT-IGNORED and regenerated — see docs/adherence/README.md for why.
// ============================================
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import posix from "node:path/posix";
import { length } from "./fn.mjs";
import { collectExportSurface } from "./export-usage-report.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// ── pure helpers (the test surface) ──────────────────────────────────────────

export const isTestPath = (p) => p.includes(".test.");

/** Any non-test `.ts`/`.tsx` module under src/components. Deliberately WIDER
 *  than render-coverage's PascalCase selector: MutationSliders' header names
 *  the private lowercase `dial.tsx` as Depth 2, so a PascalCase-only sweep
 *  under-computes depth on exactly the components most recently promoted. */
export const isModulePath = (p) =>
  p.includes("/src/components/") &&
  /\.tsx?$/.test(p) &&
  !isTestPath(p) &&
  !p.endsWith(".d.ts");

/** The folder a file sits under, as the first segment below `src/components/`.
 *  NOT the same thing as a component — see `isUnitPath`. */
export const folderOf = (p) => {
  const m = p.match(/\/src\/components\/([^/]+)\//);
  return m ? m[1] : null;
};

/**
 * A component UNIT: a PascalCase `.tsx` module. Same selector health's
 * `missingDepthHeaders` and render-coverage's `isEntryPath` use, so all three
 * agree on what a component is.
 *
 * The unit is the MODULE, not the folder, and that distinction is the
 * difference between a usable report and a misleading one. `src/components/
 * Badge/` is a NAMESPACE holding eight independent primitives — StatusBadge,
 * CountChip, TagPill, ScenarioGlyph … — each with its own `.css`. Scored by
 * folder it read as "Depth 2 owns 8 CSS files", blaming the deepest member's
 * depth for seven correct Primitives' stylesheets. Scored by module it is what
 * it is: eight Primitives, each owning one stylesheet, none of them a finding.
 *
 * Item ids come out of this too: `ADH-StatusBadge-css` names the module a
 * refactor would touch, where `ADH-Badge-css` named a directory.
 */
export const isUnitPath = (p) =>
  isModulePath(p) && p.endsWith(".tsx") && /\/[A-Z][^/]*\.tsx$/.test(p);

/** A unit's name: its basename without the extension. */
export const unitNameOf = (p) => p.split("/").pop().replace(/\.tsx$/, "");

/** The contiguous comment block at the top of a file, comment markers stripped.
 *  Stops at the first line that is neither a comment nor blank — which is what
 *  makes prose further down the file unable to masquerade as a declaration. */
export const leadingCommentBlock = (src) => {
  const out = [];
  for (const line of src.split("\n")) {
    const t = line.trim();
    if (t === "") continue;
    if (t.startsWith("//")) {
      out.push(t.replace(/^\/\/\s?/, ""));
      continue;
    }
    if (t.startsWith("/*") || t.startsWith("*")) {
      out.push(t.replace(/^\/?\*+\/?\s?/, ""));
      continue;
    }
    break;
  }
  return out.join("\n");
};

/**
 * The module's DECLARED depth, from its canonical header line.
 *
 * Canonical: `<Names> — <Kind> (Depth N)` in the leading comment block, e.g.
 * `// RateGauge — Composite (Depth 2)`. The em dash and the parenthesised
 * number are both required, which is what excludes `// Why it is Depth 2 and
 * not the Atomic it began as` (prose, and 31 lines further down).
 *
 * @returns {{depth: number|null, kind: string|null, loose: boolean}}
 *   `loose` is true when the file says `Depth N` SOMEWHERE but not in the
 *   canonical form — the state that passes health's `missingDepthHeaders` (a
 *   bare `/Depth [0-9]/` over the whole file) while telling a reader nothing.
 */
export const parseDeclaredDepth = (src) => {
  const header = leadingCommentBlock(src);
  const m = header.match(/[—-]\s*([A-Za-z][A-Za-z /]*?)\s*\(Depth\s+([0-9])\)/);
  if (m) return { depth: Number(m[2]), kind: m[1].trim(), loose: false };
  return { depth: null, kind: null, loose: /Depth\s+[0-9]/.test(src) };
};

/** Depth 0 and Depth 1 are both the Primitive layer. The STYLE_GUIDE scale
 *  starts at 1; `(Depth 0)` is the older label still carried by Surface, Cell,
 *  Dot, GroupBracket, ResizableContainer and Sparkline, all of which own CSS
 *  legitimately. Treating 0 as "not a Primitive" would put six correct
 *  Primitives at the top of the worklist. */
export const isPrimitiveDepth = (depth) => depth !== null && depth <= 1;

/** Comments out, so a header's `<div>` example is not a render. Mirrors
 *  render-coverage's local copy rather than sharing it — those two already
 *  disagree about what a comment line is, and unifying them would move
 *  published numbers. */
export const stripComments = (src) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .split("\n")
    .map((l) => (/^\s*(\/\/|\*)/.test(l) ? "" : l))
    .join("\n");

/** SVG tags. The box model does not reach inside an `<svg>`, so these are
 *  reported apart from the HTML ones — a chart drawing `<path>` is obeying §8,
 *  not dodging the Layout family. `title`/`desc`/`image`/`filter`/`text` are
 *  here because in SUI they only ever appear in an SVG. */
export const SVG_TAGS = new Set([
  "svg", "g", "path", "rect", "circle", "ellipse", "line", "polyline",
  "polygon", "text", "textPath", "tspan", "defs", "linearGradient",
  "radialGradient", "stop", "clipPath", "mask", "use", "marker", "symbol",
  "title", "desc", "foreignObject", "pattern", "filter", "image", "animate",
  "feGaussianBlur", "feMerge", "feMergeNode", "feOffset", "feFlood",
  "feComposite", "feColorMatrix", "feDropShadow",
]);

/** Intrinsic (lowercase) JSX elements the module renders, tag → count.
 *  `<div>`, `<div/>`, `<div className=…>` and `<my-element>` all match; a
 *  `<Foo>` does not (capital), and neither does a lone `<` in a comparison
 *  (the delimiter class after the name is required, as in render-coverage's
 *  `mountsAny`). */
export const intrinsicElementsOf = (src) => {
  const counts = new Map();
  for (const m of stripComments(src).matchAll(/<([a-z][a-zA-Z0-9-]*)[\s/>]/g))
    counts.set(m[1], (counts.get(m[1]) ?? 0) + 1);
  return counts;
};

/** Every module specifier the source imports or re-exports from. */
export const specifiersOf = (src) =>
  [
    ...stripComments(src).matchAll(/(?:from|import)\s*\(?\s*["']([^"']+)["']/g),
  ].map((m) => m[1]);

/** Specifiers a barrel re-exports. */
export const reexportsOf = (src) =>
  [
    ...stripComments(src).matchAll(
      /export\s+(?:\*|\{[^}]*\})\s*from\s*["']([^"']+)["']/g,
    ),
  ].map((m) => m[1]);

/** Local names a module imports, by specifier — so a barrel import can be
 *  narrowed to the modules that actually export those names instead of
 *  crediting the importer with the whole barrel's depth. */
export const importedNamesOf = (src) => {
  const out = [];
  for (const m of stripComments(src).matchAll(
    /import\s+(type\s+)?\{([^}]*)\}\s*from\s*["']([^"']+)["']/g,
  )) {
    if (m[1]) continue; // `import type` cannot render anything
    const names = m[2]
      .split(",")
      .filter((p) => !/^\s*type\s/.test(p))
      .map((p) => p.trim().split(/\s+as\s+/)[0]?.trim())
      .filter(Boolean);
    if (length(names) > 0) out.push({ spec: m[3], names });
  }
  return out;
};

/** Value names a module exports. Types are excluded — a type import cannot
 *  render, and a type is not a helper function. */
export const exportedValueNamesOf = (src) => {
  const text = stripComments(src);
  const names = new Set();
  for (const m of text.matchAll(
    /export\s+(?:const|let|var|function|class)\s+([A-Za-z0-9_$]+)/g,
  ))
    names.add(m[1]);
  for (const m of text.matchAll(/export\s+(type\s+)?\{([^}]*)\}/g)) {
    if (m[1]) continue;
    for (let part of m[2].split(",")) {
      part = part.trim();
      if (!part || /^type\s/.test(part)) continue;
      const as = part.match(/(\S+)\s+as\s+(\S+)/);
      names.add((as ? as[2] : part).trim());
    }
  }
  return [...names];
};

/** Lines carrying an inline `style={{`. `style={props.style}` is the one
 *  passthrough BEST_PRACTICES §1 permits and never matches (no double brace). */
export const inlineStyleLinesOf = (src) => {
  const out = [];
  src.split("\n").forEach((l, i) => {
    if (/^\s*(\/\/|\*)/.test(l)) return;
    if (l.includes("style={{")) out.push(i + 1);
  });
  return out;
};

/** Bare package specifiers matching one of `prefixes` — the UI-primitive
 *  packages. d3 is NOT one: §8 makes it math, and math in a Composite is
 *  fine. The list is config (`adherence-exemptions.json`) so adding a
 *  dependency does not mean editing this file. */
export const thirdPartyPrimitivesOf = (src, prefixes) => {
  const hits = new Set();
  for (const spec of specifiersOf(src))
    for (const p of prefixes) if (spec.startsWith(p)) hits.add(spec);
  return [...hits];
};

export const SEVERITY_ORDER = { high: 0, medium: 1, info: 2 };

/**
 * Per-component adherence findings.
 *
 * Pure: everything comes from the four inputs. No fs, no cwd — so every rule
 * below is pinned in scripts/adherence.test.ts against a handful of string
 * literals rather than a fixture tree or a subprocess. The earlier health.mjs
 * guards spawned a process per case and hung CI at fifteen minutes.
 *
 * @param files       POSIX paths of every file in the repo worth considering
 *                    (modules, `.css`, `variants.ts`, barrels).
 * @param read        (path) => source text.
 * @param publicNames value names reachable from the root barrel.
 * @param consumers   name → repo[] from docs/usage-manifest.json `summary`.
 *                    Carried-forward entries count: the manifest records what
 *                    production imports, not what this machine can see.
 * @param exemptions  parsed scripts/adherence-exemptions.json.
 */
export function analyse({
  files,
  read,
  publicNames = new Set(),
  consumers = {},
  exemptions = {},
}) {
  const known = new Set(files);
  const exempt = exemptions.components ?? {};
  const primitivePkgs = exemptions.thirdPartyPrimitives ?? [];

  const resolveSpec = (fromFile, spec) => {
    if (!spec.startsWith(".")) return null;
    const base = posix.resolve(posix.dirname(fromFile), spec);
    const candidates = [
      base,
      `${base}.ts`,
      `${base}.tsx`,
      posix.join(base, "index.ts"),
      posix.join(base, "index.tsx"),
    ];
    return candidates.find((c) => known.has(c)) ?? null;
  };

  const modules = files.filter(isModulePath).sort();

  // Declared depth, parsed once per module — every rule below reads it.
  const declared = new Map(modules.map((f) => [f, parseDeclaredDepth(read(f))]));
  const exportsOf = new Map(modules.map((f) => [f, exportedValueNamesOf(read(f))]));

  // What a barrel makes visible, transitively. Cycle-guarded: two barrels that
  // re-export each other would otherwise recur forever.
  const exposes = (file, seen = new Set()) => {
    if (seen.has(file)) return [];
    seen.add(file);
    const out = [file];
    for (const spec of reexportsOf(read(file))) {
      const target = resolveSpec(file, spec);
      if (target) out.push(...exposes(target, seen));
    }
    return out;
  };

  // A module's own depth, as the repo's OTHER headers imply it: one more than
  // the deepest thing it imports. A barrel import is narrowed to the modules
  // that export the names actually imported — otherwise `import { Stack } from
  // "../Layout"` would credit Layout's deepest member instead of Stack's 1.
  const impliedDepth = (file) => {
    const src = read(file);
    const byName = new Map();
    for (const { spec, names } of importedNamesOf(src))
      byName.set(spec, names);
    let deepest = 0;
    const sources = [];
    for (const spec of specifiersOf(src)) {
      const target = resolveSpec(file, spec);
      if (!target) continue;
      const visible = exposes(target).filter((f) => isModulePath(f));
      const wanted = byName.get(spec);
      const relevant = wanted
        ? visible.filter((f) =>
            (exportsOf.get(f) ?? []).some((n) => wanted.includes(n)),
          )
        : [];
      // A barrel whose members export none of the imported names (a `variants.ts`
      // re-export chain the regex could not follow) falls back to the whole
      // barrel: under-reporting a depth is worse than a slightly wide one here,
      // because the rule only ever fires when declared < computed.
      for (const dep of length(relevant) ? relevant : visible) {
        if (dep === file) continue;
        const d = declared.get(dep)?.depth;
        if (d === null || d === undefined) continue;
        if (d > deepest) deepest = d;
        sources.push({ file: dep, depth: d });
      }
    }
    if (deepest === 0) return { depth: null, sources: [] };
    return {
      depth: deepest + 1,
      sources: sources.filter((s) => s.depth === deepest),
    };
  };

  // ── attach every non-unit file to a unit ──────────────────────────────────
  // A folder's units are its PascalCase `.tsx` modules. Everything else in the
  // folder — `dial.tsx`, `geometry.ts`, an orphan stylesheet — belongs to a
  // unit rather than to nobody: MutationSliders' private lowercase `dial.tsx`
  // is where its inline styles live, and a finding filed against no component
  // is a finding nobody picks up.
  //
  // A `.css` file goes to the unit of the SAME basename when there is one
  // (`StatusBadge.css` → `StatusBadge.tsx`), which is what keeps a namespace
  // folder's stylesheets with their own primitives. Anything else goes to the
  // folder's primary unit: the one named after the folder, else its first unit
  // alphabetically.
  const units = files.filter(isUnitPath).sort();
  const primaryOf = new Map();
  for (const folder of new Set(files.map(folderOf).filter(Boolean))) {
    const inFolder = units.filter(
      (f) => f.startsWith(`/src/components/${folder}/`) && folderOf(f) === folder,
    );
    if (length(inFolder) === 0) continue;
    primaryOf.set(
      folder,
      inFolder.find((f) => unitNameOf(f) === folder) ?? inFolder[0],
    );
  }

  // Keyed by FOLDER AND basename, never by basename alone. `Layout/Grid` and
  // `Chart/Grid` are two different components sharing a name (render-coverage's
  // header names this pair), as are `Tooltip` and `EllipsisText`. A global
  // basename map silently drops one of each pair and attaches `Chart/Grid.css`
  // to `Layout/Grid.tsx` — the same defect as scoring Badge by folder, one
  // level up.
  const attached = new Map(units.map((u) => [u, []]));
  const byBasename = new Map(
    units.map((u) => [`${folderOf(u)}/${unitNameOf(u)}`, u]),
  );
  for (const f of files) {
    if (isUnitPath(f)) continue;
    const folder = folderOf(f);
    if (!folder) continue;
    const isCss = f.endsWith(".css");
    const isCode = isModulePath(f);
    if (!isCss && !isCode) continue;
    const base = f.split("/").pop().replace(/\.(tsx?|css)$/, "");
    const owner = byBasename.get(`${folder}/${base}`) ?? primaryOf.get(folder);
    if (owner) attached.get(owner).push(f);
  }

  const components = [];
  const items = [];
  // An exemption may be keyed by the unit (`Modal`) or by the FOLDER
  // (`Layout`, whose units are Stack/Row/Box and which the STYLE_GUIDE names as
  // a family). The unit key wins, so one member of an exempt family can still
  // be singled out later.
  const exemptionFor = (name, folder, rule) => {
    for (const key of [name, folder])
      if (exempt[key]?.rules?.includes(rule)) return exempt[key].reason;
    return null;
  };

  // Names carried by a unit in more than one folder. Their items are labelled
  // `<Folder>-<Name>` so `ADH-Chart-Grid-css` and `ADH-Layout-Grid-css` are
  // two ids rather than one ambiguous one — the refactor-pass skill's whole
  // contract is that an id resolves to a file. Only the colliding names take
  // the longer form, so the ids of the other 239 components do not churn.
  const nameCounts = new Map();
  for (const u of units) {
    const n = unitNameOf(u);
    nameCounts.set(n, (nameCounts.get(n) ?? 0) + 1);
  }

  for (const unit of units) {
    const bare = unitNameOf(unit);
    const folder = folderOf(unit);
    const name =
      nameCounts.get(bare) > 1 && folder !== bare ? `${folder}-${bare}` : bare;
    // Bound per unit so the rules below name only the rule and the finding —
    // the folder an exemption might be keyed by is already captured.
    const add = (component, rule, severity, title, detail) => {
      const reason = exemptionFor(component, folder, rule);
      items.push({
        id: `ADH-${component}-${rule}`,
        component,
        folder,
        rule,
        severity,
        title,
        detail,
        ...(reason ? { exempt: reason } : {}),
      });
    };
    const mine = attached.get(unit);
    const code = [unit, ...mine.filter(isModulePath)];
    const cssFiles = mine.filter((f) => f.endsWith(".css"));
    const { depth, kind, loose } = declared.get(unit);

    // A Primitive may be labelled `(Depth 0)` or `(Depth 1)`; either way the
    // KIND is the author's claim about which layer this is, and it wins over
    // the number. `Atomic (Depth 2)` is a contradiction reported as such
    // (`kind-depth-conflict`) rather than silently resolved in either
    // direction — resolving it toward the number put seven correct Primitives
    // at the top of the worklist, and toward the kind would hide a real
    // Composite.
    const primitiveKind = /^(Atomic|Layout|Primitive)/i.test(kind ?? "");
    const composite = depth !== null && depth > 1 && !primitiveKind;

    const exports = code.flatMap((f) => exportsOf.get(f) ?? []);
    const record = {
      component: name,
      folder,
      depth,
      kind,
      modules: length(code),
      cssFiles: length(cssFiles),
      composite,
      published: exports.some((n) => publicNames.has(n)),
    };
    components.push(record);

    // ── depth-label ─────────────────────────────────────────────────────────
    if (depth === null)
      add(
        name,
        "depth-label",
        "info",
        loose
          ? 'says "Depth N" only in prose — no canonical "— <Kind> (Depth N)" header, so health\'s loose regex is green and a reader learns nothing'
          : 'declares no "(Depth N)" header',
        [unit.replace(/^\//, "")],
      );
    else if (depth === 0)
      add(
        name,
        "depth-label",
        "info",
        "declares (Depth 0); the STYLE_GUIDE depth scale starts at 1 for Primitives",
        [unit.replace(/^\//, "")],
      );
    if (depth !== null && depth > 1 && primitiveKind)
      add(
        name,
        "kind-depth-conflict",
        "medium",
        `header says "${kind} (Depth ${depth})" — a ${kind} is Depth 1; the kind and the number contradict each other`,
        [unit.replace(/^\//, "")],
      );

    // ── depth-mismatch: the repo's headers disagree with each other ─────────
    const mismatches = [];
    for (const f of code) {
      const d = declared.get(f)?.depth;
      if (d === null || d === undefined) continue;
      const { depth: implied, sources } = impliedDepth(f);
      if (implied !== null && d < implied)
        mismatches.push(
          `${f.replace(/^\//, "")}: declares ${d}, imports Depth ${implied - 1} (${[
            ...new Set(sources.map((s) => s.file.split("/").pop())),
          ].join(", ")}) → implies ${implied}`,
        );
    }
    if (length(mismatches) > 0)
      add(
        name,
        "depth-mismatch",
        "medium",
        `declares a shallower depth than its imports imply`,
        mismatches,
      );

    if (composite) {
      // ── css: a Composite owns zero CSS files (§1) ─────────────────────────
      if (length(cssFiles) > 0)
        add(
          name,
          "css",
          "high",
          `Depth ${depth} owns ${length(cssFiles)} CSS file(s); a Composite owns none`,
          cssFiles.map((f) => f.replace(/^\//, "")),
        );

      // ── intrinsic: raw HTML where a Primitive belongs ─────────────────────
      const html = new Map();
      const svg = new Map();
      for (const f of code)
        for (const [tag, n] of intrinsicElementsOf(read(f))) {
          const bucket = SVG_TAGS.has(tag) ? svg : html;
          bucket.set(tag, (bucket.get(tag) ?? 0) + n);
        }
      const fmt = (m) =>
        [...m.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([tag, n]) => `<${tag}> ×${n}`);
      if (html.size > 0)
        add(
          name,
          "intrinsic",
          "high",
          `renders ${html.size} intrinsic HTML element type(s) instead of Primitives`,
          fmt(html),
        );
      if (svg.size > 0)
        add(
          name,
          "intrinsic-svg",
          "info",
          `renders ${svg.size} SVG element type(s) — exempt per §8 unless this is not a chart`,
          fmt(svg),
        );

      // ── third-party: the Primitive wrapper layer was skipped ──────────────
      const pkgs = new Set();
      for (const f of code)
        for (const p of thirdPartyPrimitivesOf(read(f), primitivePkgs))
          pkgs.add(p);
      if (pkgs.size > 0)
        add(
          name,
          "third-party",
          "high",
          `imports a third-party UI primitive directly (${[...pkgs].join(", ")})`,
          [...pkgs],
        );

      // ── inline-style ──────────────────────────────────────────────────────
      const styled = [];
      for (const f of code)
        for (const line of inlineStyleLinesOf(read(f)))
          styled.push(`${f.replace(/^\//, "")}:${line}`);
      if (length(styled) > 0)
        add(
          name,
          "inline-style",
          "medium",
          `${length(styled)} inline style={{ outside the Primitive layer`,
          styled,
        );
    }

    // ── helper-exports: internals published to the root barrel ──────────────
    const helpers = [
      ...new Set(
        exports.filter(
          (n) =>
            publicNames.has(n) &&
            /^[a-z]/.test(n) &&
            !/^(use|create)[A-Z]/.test(n),
        ),
      ),
    ].sort();
    if (length(helpers) > 0)
      add(
        name,
        "helper-exports",
        "medium",
        `${length(helpers)} helper function(s) reach the root barrel; clients import only curried components`,
        helpers,
      );

    // ── missing-factory: nothing to curry ───────────────────────────────────
    // INFO, not medium: adding a factory ADDS to the public surface, and
    // BEST_PRACTICES §4 puts every expansion behind Peter's sign-off. So this
    // is a survey of where the curried path does not exist, not a queue an
    // agent may work unprompted.
    //
    // Asked only of a folder's PRIMARY unit. A published sub-component
    // (`CellRow`, `LegendItem`) reaches a caller through its parent's curried
    // set and owes no factory of its own; asking every unit turned this into
    // 103 findings, most of them about modules that should not have one.
    const hasFactory = exports.some((n) => /^create[A-Z]/.test(n));
    const hasVariants = files.some(
      (f) => folderOf(f) === folder && /\/variants\.tsx?$/.test(f),
    );
    if (
      record.published &&
      primaryOf.get(folder) === unit &&
      !hasFactory &&
      !hasVariants
    )
      add(
        name,
        "missing-factory",
        "info",
        "published with no create<Name> factory and no variants.ts in its folder — there is no curried path to offer a client",
        [unit.replace(/^\//, "")],
      );

    // ── unused-variants ─────────────────────────────────────────────────────
    // Also INFO, and for the same reason in the other direction: §4 gates the
    // variant surface in BOTH directions, so "delete it" is Peter's call.
    // `consumers` comes from docs/usage-manifest.json, whose carried-forward
    // entries count — it records what production imports, not what this
    // machine can see. dev/showcases is not a consumer (§4: "Showcase-only or
    // test-only usage is not demand").
    const unused = [
      ...new Set(
        exports.filter(
          (n) => publicNames.has(n) && !(length(consumers[n] ?? []) > 0),
        ),
      ),
    ].sort();
    if (length(unused) > 0)
      add(
        name,
        "unused-variants",
        "info",
        `${length(unused)} exported name(s) no production consumer imports`,
        unused,
      );
  }

  // Severity first, then SMALLEST JOB first, then alphabetical. The middle
  // term is what makes the top of the list worth reading: the SessionStart
  // hook prints only the first dozen lines, and a one-stylesheet Composite is
  // a refactor an agent can finish where a five-element chart interior is a
  // conversation. Every term is deterministic, so the banner does not churn
  // between sessions for no reason.
  const open = items.filter((i) => !i.exempt);
  open.sort(
    (a, b) =>
      SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
      length(a.detail) - length(b.detail) ||
      a.component.localeCompare(b.component) ||
      a.rule.localeCompare(b.rule),
  );

  return {
    components,
    items: open,
    exempted: items.filter((i) => i.exempt),
    summary: {
      components: length(components),
      composites: length(components.filter((c) => c.composite)),
      items: length(open),
      high: length(open.filter((i) => i.severity === "high")),
      medium: length(open.filter((i) => i.severity === "medium")),
      info: length(open.filter((i) => i.severity === "info")),
      exempted: length(items) - length(open),
    },
  };
}

/**
 * OPEN_ITEMS.md.
 *
 * The first ~15 lines are the entire SessionStart payload, so they are a FLAT
 * ranked list — one line per item, id first. Grouping by component up top
 * would spend that budget on headings. The per-component detail follows for a
 * human reading the whole file.
 */
export function renderOpenItems(report, { at = new Date().toISOString() } = {}) {
  const { summary, items, exempted } = report;
  const line = (i) =>
    `- \`${i.id}\`  **${i.severity.toUpperCase()}**  ${i.component} — ${i.title}`;
  const out = [
    "# SUI adherence — open items",
    "",
    `${summary.items} open (${summary.high} high, ${summary.medium} medium, ${summary.info} info) across ${summary.components} components; ${summary.exempted} exempted.`,
    "",
    "## Top items",
    "",
    ...items.slice(0, 12).map(line),
    "",
    "Pick one up: `/refactor-pass ADH-<Component>-<rule>` (no public API change).",
    `Regenerated by \`npm run adherence\`; not committed. Last run ${at}.`,
    "",
    "## Every open item, by component",
    "",
  ];
  const byComponent = new Map();
  for (const i of items)
    byComponent.set(i.component, [...(byComponent.get(i.component) ?? []), i]);
  for (const [component, list] of [...byComponent.entries()].sort()) {
    out.push(`### ${component}`, "");
    for (const i of list) {
      out.push(line(i));
      for (const d of i.detail.slice(0, 8)) out.push(`    - ${d}`);
      if (length(i.detail) > 8)
        out.push(`    - …and ${length(i.detail) - 8} more`);
    }
    out.push("");
  }
  if (length(exempted) > 0) {
    out.push("## Exempted", "");
    for (const i of exempted)
      out.push(`- \`${i.id}\` — ${i.title}\n    - exempt: ${i.exempt}`);
    out.push("");
  }
  return out.join("\n");
}

// ── the edge: read the real tree ─────────────────────────────────────────────

const walk = (dir, pred) => {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p, pred));
    else if (pred(p)) out.push(p);
  }
  return out;
};

const readJson = (p, fallback) => {
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch {
    return fallback;
  }
};

/** Run against the repo. Absolute paths are relativised to a leading `/` so
 *  the ids and detail lines are machine-independent. */
export function run(repoRoot = root) {
  const abs = walk(join(repoRoot, "src"), (p) =>
    /\.(tsx?|css)$/.test(p),
  );
  const rel = new Map(abs.map((p) => [p.replace(repoRoot, ""), p]));
  const manifest = readJson(join(repoRoot, "docs/usage-manifest.json"), {
    summary: {},
  });
  const exemptions = readJson(
    join(repoRoot, "scripts/adherence-exemptions.json"),
    {},
  );
  const { valueExports } = collectExportSurface(join(repoRoot, "src/index.ts"));
  return analyse({
    files: [...rel.keys()],
    read: (p) => {
      const file = rel.get(p);
      return file ? readFileSync(file, "utf8") : "";
    },
    publicNames: valueExports,
    consumers: manifest.summary ?? {},
    exemptions,
  });
}

const isMain =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isMain) {
  const quiet = process.argv.includes("--quiet");
  const report = run();

  const dir = join(root, "docs/adherence");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "OPEN_ITEMS.md"), renderOpenItems(report));
  writeFileSync(
    join(dir, "report.json"),
    JSON.stringify({ at: new Date().toISOString(), ...report }, null, 2) + "\n",
  );

  if (process.argv.includes("--banner")) {
    // The Claude Code SessionStart hook payload (.claude/settings.json). The
    // hook's own command stays a single call with no jq, no shell quoting and
    // no second script to keep in step — the JSON envelope is built here, where
    // it can be read next to the report it wraps.
    //
    // BANNER_LINES is the whole budget an agent gets at session start, which is
    // why OPEN_ITEMS.md leads with a flat id-first list rather than headings.
    const BANNER_LINES = 15;
    const head = renderOpenItems(report).split("\n").slice(0, BANNER_LINES);
    console.log(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "SessionStart",
          additionalContext:
            "SUI adherence — open design-philosophy items (regenerated just now " +
            "by `npm run adherence`; full list in docs/adherence/OPEN_ITEMS.md, " +
            "rules in docs/adherence/README.md). Picking one up is optional and " +
            "never part of another task: use the `refactor-pass` skill, which " +
            "pins the public API.\n\n" +
            head.join("\n"),
        },
      }),
    );
  } else if (process.argv.includes("--json")) {
    console.log(JSON.stringify(report, null, 2));
  } else if (!quiet) {
    const only = process.argv
      .find((a) => a.startsWith("--component="))
      ?.split("=")[1];
    const shown = only
      ? report.items.filter((i) => i.component === only)
      : report.items;
    const { summary } = report;
    console.log("SUI adherence — per-component design-philosophy findings\n");
    console.log(
      `  ${summary.components} components (${summary.composites} Composites), ` +
        `${summary.items} open items: ${summary.high} high, ${summary.medium} medium, ${summary.info} info` +
        ` (${summary.exempted} exempted)\n`,
    );
    const list = process.argv.includes("--list") || only ? shown : shown.slice(0, 20);
    for (const i of list)
      console.log(
        `  ${i.severity.toUpperCase().padEnd(6)} ${i.id.padEnd(42)} ${i.title}`,
      );
    if (length(list) < length(shown))
      console.log(`  …and ${length(shown) - length(list)} more (--list)`);
    console.log("\n  docs/adherence/OPEN_ITEMS.md + report.json rewritten.");
  }
  // Always 0: this is a report, not a gate (Peter decides, 2026-09-17). Both
  // hooks call it, and neither may fail a commit or a session.
  process.exit(0);
}
