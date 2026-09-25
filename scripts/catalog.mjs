#!/usr/bin/env node
// ============================================
// SUI component catalog — discovery by what a component DOES, not by name.
// --------------------------------------------
// The push-back protocol (AGENT_GUIDE.md § The push-back protocol) says: name
// the existing component that covers a need before proposing a new one. The
// only searchable index today is COMPONENTS.md — ~2,000 lines of prose,
// findable only by a name you already have to know. This script builds a
// structured index over the same source of truth, and `npm run find` (this
// file, `--find`) ranks it against a plain-text query.
//
// ── Where the record list comes from ─────────────────────────────────────────
// `scripts/adherence.mjs`'s unit is a PascalCase `.tsx` MODULE under
// `src/components/` — that's the wrong grain here. A curried variant
// (`HalfFillColumn`, `PrimaryButton`) is not a module; it's a `const` inside
// `variants.ts` produced by a `createX()` call, and adherence's unit-scan
// structurally cannot see it. The correct spine for "every exported component
// and curried variant" is `scripts/export-surface.mjs`'s `buildExportSurface`
// — it already asks the TypeScript checker for exactly that list, with
// `{name, kind, file, line, dir}` per export. This script reuses THAT for the
// record list, and reuses adherence.mjs's `leadingCommentBlock` /
// `parseDeclaredDepth` (the same header parser, so depth numbers agree with
// the adherence report) for the depth of each owning file.
//
// ── Why a curried variant's own file rarely carries a depth header ──────────
// `variants.ts` carries ONE header for the whole file ("Button Curried
// Variants — Depth 1"), not the canonical `— <Kind> (Depth N)` form
// `parseDeclaredDepth` requires, and even where it did, it would only say
// "some depth", not `variantOf`'s. So a variant's depth is resolved from the
// FACTORY it curries: find `create<Factory>`'s own declaration file (the base
// component, e.g. `Button.tsx`) and read that file's declared depth.
//
// ── Summary/useFor/notToBeConfusedWith come from COMPONENTS.md; a second,
// wider text field backs the ranker for names that don't have an entry ──────
// `NoShrinkScrollBox` (Layout/variants.ts) has no COMPONENTS.md bullet at all
// — only a JSDoc block above its `export const`. Per the brief, `summary`
// stays `null` in that case (the gap must be visible), but the JSDoc block
// immediately preceding the export is captured in `notes` and `npm run find`
// searches both fields — otherwise a real, well-documented gap in the manifest
// makes the component unfindable by the tool built to fix exactly that.
//
// ── CLI ──────────────────────────────────────────────────────────────────────
//   node scripts/catalog.mjs                 # regenerate catalog.json
//   node scripts/catalog.mjs --check          # exit 1 if catalog.json is stale (no write)
//   node scripts/catalog.mjs --find "<query>" # rank catalog.json against a query
// ============================================
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { length } from "./fn.mjs";
import { buildExportSurface } from "./export-surface.mjs";
import { parseDeclaredDepth } from "./adherence.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const CATALOG_PATH = join(root, "catalog.json");

// ── pure helpers (the test surface) ──────────────────────────────────────────

export const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** PascalCase/camelCase -> kebab-case, matching dev/main.tsx's showcase ids
 *  (`SwimlaneChart` -> `swimlane-chart`). */
export const kebab = (name) =>
  name
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .toLowerCase();

/** The `create<Factory>(...)` call an exported `const` is assigned to, and the
 *  RAW source text of the object literal passed to it (kept as text, never
 *  evaluated — these are TS object literals, some with nested `style` objects
 *  and arrow-function callbacks that are not JSON). Returns null when the
 *  export is not a curried-variant assignment (a base component, a `function`
 *  declaration, …). */
export const variantAssignmentOf = (src, name) => {
  // `<T>` between the factory name and `(` is a generic instantiation
  // (`createHighlightSegments<HighlightSegment>({...})`) — optional so both
  // forms match. Without it, every generic factory call read as a base
  // export (kind "primitive") instead of a variant, which is how
  // `AccentHighlightSegments`/`FaintHighlightSegments` and their siblings
  // went undetected.
  const re = new RegExp(
    `export\\s+const\\s+${escapeRegex(name)}\\b[^=]*=\\s*create([A-Za-z0-9_]+)(?:<[^(]*>)?\\(`,
  );
  const m = re.exec(src);
  if (!m) return null;
  const factory = `create${m[1]}`;
  const openIdx = m.index + m[0].length - 1; // position of the `(`
  let depth = 0;
  let i = openIdx;
  for (; i < length(src); i++) {
    if (src[i] === "(") depth++;
    else if (src[i] === ")") {
      depth--;
      if (depth === 0) break;
    }
  }
  const argsText = src.slice(openIdx + 1, i).trim();
  return { factory, argsText };
};

/** `export type <Base>Overrides = Pick<..., "a" | "b">;` -> ["a","b"]. Also
 *  reads `<Base>DataProps`'s presence (just whether it's declared — its shape
 *  is "everything else", not worth rendering as a list). */
export const overridesOf = (src, base) => {
  const re = new RegExp(
    `export\\s+type\\s+${escapeRegex(base)}Overrides\\s*=\\s*Pick<[^,]+,\\s*([^>]+)>`,
  );
  const m = re.exec(src);
  if (!m) return null;
  return [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
};

export const hasDataProps = (src, base) =>
  new RegExp(`export\\s+type\\s+${escapeRegex(base)}DataProps\\b`).test(src);

/** The block/line comment immediately preceding an `export const <name>` (or
 *  `export function <name>`) line — a variant's only prose when it has no
 *  COMPONENTS.md entry. Walks upward from the declaration line collecting
 *  contiguous comment lines, mirroring adherence.mjs's `leadingCommentBlock`
 *  but anchored at an arbitrary line instead of the top of the file. */
export const precedingCommentOf = (src, name) => {
  const lines = src.split("\n");
  const declIdx = lines.findIndex((l) =>
    new RegExp(`export\\s+(const|function)\\s+${escapeRegex(name)}\\b`).test(l),
  );
  if (declIdx <= 0) return null;
  const out = [];
  for (let i = declIdx - 1; i >= 0; i--) {
    const t = lines[i].trim();
    if (t === "") {
      if (length(out) > 0) break; // blank line ends the block once we've started
      continue;
    }
    if (t.startsWith("//")) {
      out.unshift(t.replace(/^\/\/\s?/, ""));
      continue;
    }
    if (t.startsWith("*") || t.startsWith("/*") || t.endsWith("*/")) {
      // Strip both the leading `/**`/`*` marker AND a trailing `*/` — a
      // single-line block comment (`/** Foo. */`) carries both on one line,
      // and only stripping the leading marker left a stray `*/` on the end
      // of every such comment's text (visible once this text is promoted
      // into `summary`, not just kept in `notes`).
      out.unshift(
        t.replace(/^\/?\*+\/?\s?/, "").replace(/\s*\*+\/\s*$/, ""),
      );
      continue;
    }
    break;
  }
  return length(out) > 0 ? out.join(" ").replace(/\s+/g, " ").trim() : null;
};

/** COMPONENTS.md's bullet for `name`: `- **Name** — <rest of the line>`. Every
 *  entry observed in the file is a single (very long) line, so a per-line
 *  match is sufficient and avoids swallowing the NEXT bullet. */
export const componentsMdBulletFor = (doc, name) => {
  const re = new RegExp(`^\\s*- \\*\\*${escapeRegex(name)}\\*\\* — (.*)$`, "m");
  const m = re.exec(doc);
  return m ? m[1] : null;
};

/** First sentence of a bullet/note, for `summary`. Not a full sentence
 *  tokenizer — splits on the first ". " that isn't immediately inside a
 *  backtick-quoted code span, which is the one shape that recurs in this
 *  file's prose (`` `1fr` is `minmax(auto, 1fr)`. Whose... ``). Good enough for
 *  a one-line summary; the full text is still in `useFor`/`notToBeConfusedWith`. */
export const firstSentenceOf = (text) => {
  const m = /^(.*?[.!?])(\s|$)/.exec(text);
  return (m ? m[1] : text).trim();
};

/** The clause starting at `Use for:` to the end of the bullet. */
export const useForOf = (bullet) => {
  const m = /Use for:\s*(.*)$/.exec(bullet);
  return m ? m[1].trim() : null;
};

/** Every "Not `X`, ..." / "not interchangeable with `X`" clause — the most
 *  valuable line in the manifest for disambiguating near-miss names. Captures
 *  the referenced name and the surrounding sentence fragment up to the next
 *  semicolon/period. */
export const notToBeConfusedWithOf = (bullet) => {
  const out = [];
  const re =
    /\b(?:[Nn]ot|not interchangeable with)\s+`([A-Za-z0-9_]+)`[^.;]*[.;]?/g;
  for (const m of bullet.matchAll(re)) out.push(m[0].trim());
  return length(out) > 0 ? out : null;
};

// ── summary synthesis: a curried variant/factory's baked overrides ARE its
// description (`FillPaneRailGrid` = `Grid` with `columns: "minmax(0, 1fr)
// 292px"`), so a variant/factory never needs to fall through to
// `summary: null` — only a BASE component with no COMPONENTS.md bullet and no
// JSDoc is a real doc gap. ─────────────────────────────────────────────────

/** Split the raw object-literal text captured by `variantAssignmentOf`
 *  (`{ tone: "accent", style: {...} }`, braces included) into top-level
 *  `{key, value}` pairs, respecting nesting and quoting so a comma inside a
 *  nested `style` object or a template literal doesn't split a pair. Not a
 *  full TS parser — this only needs to find the top-level commas, which is
 *  exactly what a depth/quote-aware scan gives for free. A bare spread
 *  (`...defaults`) or shorthand (`{ foo }`) has no `:` and is dropped; it
 *  carries no describable value. */
export const parseTopLevelProps = (argsText) => {
  let text = argsText.trim();
  // `variantAssignmentOf`'s `argsText` is everything between the CALL's outer
  // parens, not just the object literal — a call written
  // `createFoo(\n  {...},\n)` carries a trailing `,` (and whitespace) after
  // the object. Take only the first BALANCED `{...}` block (quote-aware, so
  // a brace inside a string value doesn't miscount) rather than requiring
  // the trimmed text to itself end in `}`, which that trailing comma broke.
  if (text.startsWith("{")) {
    let depth = 0;
    let q = null;
    let end = -1;
    for (let i = 0; i < length(text); i++) {
      const c = text[i];
      if (q) {
        if (c === "\\") {
          i++;
          continue;
        }
        if (c === q) q = null;
        continue;
      }
      if (c === '"' || c === "'" || c === "`") {
        q = c;
        continue;
      }
      if (c === "{") depth++;
      else if (c === "}") {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    if (end !== -1) text = text.slice(1, end);
  }

  const parts = [];
  let depth = 0;
  let quote = null;
  let current = "";
  for (let i = 0; i < length(text); i++) {
    const c = text[i];
    if (quote) {
      current += c;
      if (c === "\\") {
        i++;
        if (i < length(text)) current += text[i];
        continue;
      }
      if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      quote = c;
      current += c;
      continue;
    }
    if (c === "{" || c === "[" || c === "(") {
      depth++;
      current += c;
      continue;
    }
    if (c === "}" || c === "]" || c === ")") {
      depth--;
      current += c;
      continue;
    }
    if (c === "," && depth === 0) {
      parts.push(current);
      current = "";
      continue;
    }
    current += c;
  }
  if (current.trim()) parts.push(current);

  const props = [];
  for (const part of parts) {
    const t = part.trim();
    if (!t) continue;
    const colonIdx = t.indexOf(":");
    if (colonIdx === -1) continue; // spread/shorthand — no describable value
    const key = t.slice(0, colonIdx).trim().replace(/^["'`]|["'`]$/g, "");
    const value = t.slice(colonIdx + 1).trim().replace(/,$/, "");
    if (key) props.push({ key, value });
  }
  return props;
};

const truncateValue = (v, max = 60) => {
  const collapsed = v.replace(/\s+/g, " ").trim();
  return length(collapsed) > max ? `${collapsed.slice(0, max - 1)}…` : collapsed;
};

/** A one-sentence summary for a curried VARIANT with no COMPONENTS.md bullet
 *  and no JSDoc of its own: the parent's first sentence (when the base has
 *  exactly one unambiguous bullet — `parentSummary` is null otherwise, e.g.
 *  `Grid` collides between `Layout/Grid` and `Chart/Grid`) plus a mechanical
 *  clause built from the baked overrides TEXT (real values —
 *  `columns: "minmax(0, 1fr) 292px"`, not just the prop name). */
export const synthesizeVariantSummary = (baseName, argsText, parentSummary) => {
  const props = parseTopLevelProps(argsText);
  const clause =
    length(props) > 0
      ? `A \`${baseName}\` variant with ${props
          .map((p) => `\`${p.key}: ${truncateValue(p.value)}\``)
          .join(", ")}.`
      : `A \`${baseName}\` variant with no overrides (the default).`;
  return parentSummary ? `${parentSummary} ${clause}` : clause;
};

/** A one-sentence summary for the FACTORY itself (`createGrid`), which has no
 *  baked values of its own — only the list of prop NAMES it lets a curried
 *  variant bake (`overridesList`, from the base's `<Base>Overrides` type). */
export const synthesizeFactorySummary = (baseName, overridesList, parentSummary) => {
  const clause =
    overridesList && length(overridesList) > 0
      ? `Factory behind \`${baseName}\`'s curried variants; bakes \`${overridesList.join("`, `")}\`.`
      : `Factory behind \`${baseName}\`'s curried variants.`;
  return parentSummary ? `${parentSummary} ${clause}` : clause;
};

/** `id: "<slug>"` entries from dev/main.tsx's `items` array, in file order —
 *  the gallery/bench deep-link vocabulary (`#/<id>`, per `parseHash`/
 *  `buildHash` at dev/main.tsx). Regex, not a TS parse: the array is a plain
 *  object-literal list and the ids are all that's needed. */
export const showcaseIdsOf = (mainTsxSrc) =>
  new Set([...mainTsxSrc.matchAll(/\bid:\s*"([^"]+)"/g)].map((m) => m[1]));

/** CHANGELOG.md sections, NEWEST FIRST (the file's own order): `{version,
 *  body}` per `## ...` heading. `version` is the heading's leading token
 *  (`0.178.0`, `v0.9.0`, `Unreleased`). */
export const changelogSectionsOf = (changelogSrc) => {
  const parts = changelogSrc.split(/^## /m).slice(1);
  return parts.map((p) => {
    const nl = p.indexOf("\n");
    const heading = nl === -1 ? p : p.slice(0, nl);
    const version = heading.split(/\s+—\s+/)[0].trim();
    return { version, body: nl === -1 ? "" : p.slice(nl + 1) };
  });
};

/** Earliest (oldest) CHANGELOG section mentioning `name` as a whole word, or
 *  null. Sections are newest-first, so this walks from the END of the array
 *  (oldest) toward the front and returns the first hit — the FIRST version to
 *  ever mention the name, per the brief. Skipped entirely when the whole
 *  document never mentions the name (the common case for an unreleased-only
 *  or never-changelogged name), which keeps this cheap. */
export const sinceOf = (changelogSrc, sections, name) => {
  if (!changelogSrc.includes(name)) return null;
  const re = new RegExp(`\\b${escapeRegex(name)}\\b`);
  for (let i = length(sections) - 1; i >= 0; i--)
    if (re.test(sections[i].body)) return sections[i].version;
  return null;
};

// ── build ─────────────────────────────────────────────────────────────────

/** Build one catalog record per exported component/factory. Pure given the
 *  four documents + the export surface, so it's directly testable without a
 *  fresh `buildExportSurface()` Program build per test case. */
export function buildCatalog({
  surface,
  readSrc, // (repo-relative file path) => source text
  componentsMd,
  changelogSrc,
  mainTsxSrc,
}) {
  const exportable = surface.exports.filter(
    (e) => e.kind === "component" || e.kind === "factory",
  );
  const showcaseIds = showcaseIdsOf(mainTsxSrc);
  const sections = changelogSectionsOf(changelogSrc);
  const srcCache = new Map();
  const src = (file) => {
    if (!srcCache.has(file)) srcCache.set(file, readSrc(file));
    return srcCache.get(file);
  };

  // Where is `create<Factory>` actually declared? Needed to resolve a
  // variant's depth and its `<Factory>Overrides`/`DataProps` types from the
  // BASE component's file, not the variant's own `variants.ts`.
  const factoryFile = new Map(
    exportable.filter((e) => e.kind === "factory").map((e) => [e.name, e.file]),
  );

  const showcaseFor = (folder, name) => {
    for (const candidate of [folder && kebab(folder), kebab(name)]) {
      if (candidate && showcaseIds.has(candidate)) return `#/${candidate}`;
    }
    return null;
  };

  const records = exportable.map((e) => {
    const fileSrc = src(e.file);
    const variant = e.kind === "component" ? variantAssignmentOf(fileSrc, e.name) : null;

    const kind = e.kind === "factory" ? "factory" : variant ? "variant" : depthKindOf(e, fileSrc);

    // Depth: own file's header, or — for a variant — the factory's base file.
    let depthSource = fileSrc;
    if (variant) {
      const ff = factoryFile.get(variant.factory);
      if (ff) depthSource = src(ff);
    }
    const { depth } = parseDeclaredDepth(depthSource);

    // Overrides/DataProps: keyed on the factory suffix (`Button` for
    // `createButton`) whether that suffix comes from a curried variant's
    // factory call OR from the export being the factory itself — both name
    // the SAME `<Base>Overrides`/`<Base>DataProps` types in the base file.
    // Previously only the variant branch stripped `create`, so every
    // factory's own record looked up `createGridOverrides` (never declared)
    // instead of `GridOverrides`, and read `overrides: null` regardless of
    // what the base file actually exports.
    const overridesBase = variant
      ? variant.factory.replace(/^create/, "")
      : e.kind === "factory"
        ? e.name.replace(/^create/, "")
        : e.name;
    const overrideSrc = variant ? depthSource : fileSrc;
    const overrides = overridesOf(overrideSrc, overridesBase);
    const dataProps = hasDataProps(overrideSrc, overridesBase)
      ? `${overridesBase}DataProps`
      : null;

    const bullet = componentsMdBulletFor(componentsMd, e.name);
    const notes = precedingCommentOf(fileSrc, e.name);

    // Summary priority: (1) the export's own COMPONENTS.md bullet, (2) the
    // export's own JSDoc, (3) — for a variant or factory only — a summary
    // synthesized from its baked overrides plus its BASE's bullet (never its
    // own missing one, so this never fabricates prose for a genuinely
    // undocumented base component). A base primitive/composite with neither
    // a bullet nor JSDoc stays `summary: null` — that's the real doc debt.
    let summary = bullet ? firstSentenceOf(bullet) : null;
    let summarySource = summary ? "components-md" : null;

    if (summary === null && notes) {
      summary = firstSentenceOf(notes);
      summarySource = "jsdoc";
    }

    if (summary === null && (kind === "variant" || kind === "factory")) {
      const baseName = overridesBase;
      const baseBulletCount = length(
        [...componentsMd.matchAll(new RegExp(`^\\s*- \\*\\*${escapeRegex(baseName)}\\*\\* — `, "mg"))],
      );
      // A base name with more than one bullet (e.g. `Grid` — `Layout/Grid`
      // vs. `Chart/Grid`) is ambiguous: inheriting either summary would
      // misattribute it, so the synthesized clause stands alone.
      const baseBullet = baseBulletCount === 1 ? componentsMdBulletFor(componentsMd, baseName) : null;
      const parentSummary = baseBullet ? firstSentenceOf(baseBullet) : null;
      summary =
        kind === "variant"
          ? synthesizeVariantSummary(baseName, variant.argsText, parentSummary)
          : synthesizeFactorySummary(baseName, overrides, parentSummary);
      summarySource = "synthesized";
    }

    return {
      name: e.name,
      depth: depth ?? null,
      kind,
      family: e.dir ?? null,
      variantOf: variant ? { factory: variant.factory, overrides: variant.argsText } : null,
      overrides,
      dataProps,
      summary,
      summarySource, // "components-md" | "jsdoc" | "synthesized" | "alias" | null
      notToBeConfusedWith: bullet ? notToBeConfusedWithOf(bullet) : null,
      useFor: bullet ? useForOf(bullet) : null,
      notes, // JSDoc immediately preceding the export — searched by `find`
             // alongside summary/useFor, so a variant with no COMPONENTS.md
             // entry (e.g. NoShrinkScrollBox) is still discoverable.
      showcase: showcaseFor(e.dir, e.name),
      since: sinceOf(changelogSrc, sections, e.name),
      file: e.file,
      line: e.line,
    };
  });

  // A second, cheap pass: a barrel re-export ALIAS (`export { ButtonGroup as
  // HUDButtonGroup } from "./components/ButtonGroup"`) resolves, via the
  // TypeScript checker, to the SAME {file, line} as the name it aliases —
  // it is not a `create*()` call of its own, so `variantAssignmentOf` (and
  // therefore every summary path above) correctly finds nothing for it. That
  // read `HUDButtonGroup`/`HUDModal`/`HUDPage`/… as an undocumented
  // "primitive" even though `ButtonGroup`/`Modal`/`Page` right beside it is
  // fully described. An export whose OWN file has no `export const/function
  // <name>` declaration, sharing a location with one that does, is an alias
  // by construction — inherit that record's summary rather than leaving a
  // real name undescribed for a reason that has nothing to do with docs.
  const byLocation = new Map();
  for (const r of records) {
    const key = `${r.file}:${r.line}`;
    if (!byLocation.has(key)) byLocation.set(key, []);
    byLocation.get(key).push(r);
  }
  for (const group of byLocation.values()) {
    if (length(group) < 2) continue;
    const declaredRe = (name) =>
      new RegExp(`export\\s+(const|function)\\s+${escapeRegex(name)}\\b`);
    const canonical = group.find((r) => declaredRe(r.name).test(src(r.file)));
    if (!canonical) continue;
    for (const r of group) {
      if (r === canonical || r.summary !== null) continue;
      if (declaredRe(r.name).test(src(r.file))) continue; // also self-declared
      r.summary = canonical.summary
        ? `Alias for \`${canonical.name}\`. ${canonical.summary}`
        : null;
      r.summarySource = canonical.summary ? "alias" : null;
    }
  }

  records.sort((a, b) => a.name.localeCompare(b.name));
  return records;
}

/** Own-file depth classification for a non-variant export: primitive (depth
 *  <= 1) or composite (depth > 1). Falls back to "primitive" when no header
 *  is found at all, rather than "composite" — an unlabelled base component is
 *  far more often a Primitive (e.g. one with a loose, non-canonical header)
 *  than a Composite silently missing its own required label (which
 *  `missingDepthHeaders` already ratchets separately). */
const depthKindOf = (_e, fileSrc) => {
  const { depth } = parseDeclaredDepth(fileSrc);
  return depth !== null && depth > 1 ? "composite" : "primitive";
};

// ── find: rank records against a plain-text query ───────────────────────────

const FIELD_WEIGHTS = {
  useFor: 5,
  notToBeConfusedWith: 4,
  notes: 4, // the JSDoc fallback carries as much signal as `useFor` for a
            // variant with no COMPONENTS.md entry (e.g. NoShrinkScrollBox) —
            // weighting it below `summary` would penalize exactly the
            // undocumented-gap records this field exists to keep findable.
  summary: 3,
  name: 3,
};

const textOf = (record, field) => {
  const v = record[field];
  if (!v) return "";
  return Array.isArray(v) ? v.join(" ") : String(v);
};

/** Score one record against a lowercase, tokenised query: sum of (field
 *  weight × token hits in that field), plus a name-substring bonus so an
 *  exact/partial name match still surfaces even when the query is worded
 *  nothing like the prose (`npm run find -- "grid"` should still find
 *  `Grid`). Pure — no I/O — so it's the part pinned by
 *  `scripts/catalog.test.ts`'s two acceptance queries. */
export function scoreRecord(record, queryTokens) {
  if (length(queryTokens) === 0) return 0;
  let score = 0;
  for (const field of Object.keys(FIELD_WEIGHTS)) {
    const haystack = textOf(record, field).toLowerCase();
    if (!haystack) continue;
    for (const token of queryTokens)
      if (haystack.includes(token)) score += FIELD_WEIGHTS[field];
  }
  const nameLower = record.name.toLowerCase();
  if (nameLower.includes(queryTokens.join(" "))) score += 6;
  return score;
}

// Stopwords excluded from query tokens — short/structural words that match
// almost every record's prose and drown out the tokens that actually
// discriminate (`a` alone matched enough records to bury `NoShrinkScrollBox`
// off the bottom of the acceptance query's top 10 before this was added).
const STOPWORDS = new Set([
  "a", "an", "the", "of", "in", "on", "to", "for", "with", "is", "are",
  "be", "and", "or", "its", "it", "that", "this", "as", "at", "by",
]);

export function rankCatalog(records, query, topN = 10) {
  const tokens = query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t && !STOPWORDS.has(t));
  return records
    .map((r) => ({ record: r, score: scoreRecord(r, tokens) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.record.name.localeCompare(b.record.name))
    .slice(0, topN);
}

// ── the edge: read the real tree ─────────────────────────────────────────────

export function run(repoRoot = root) {
  const surface = buildExportSurface({ root: repoRoot });
  const componentsMd = readFileSync(join(repoRoot, "COMPONENTS.md"), "utf8");
  const changelogSrc = readFileSync(join(repoRoot, "CHANGELOG.md"), "utf8");
  const mainTsxSrc = readFileSync(join(repoRoot, "dev/main.tsx"), "utf8");
  return buildCatalog({
    surface,
    readSrc: (file) => readFileSync(join(repoRoot, file), "utf8"),
    componentsMd,
    changelogSrc,
    mainTsxSrc,
  });
}

const isMain =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isMain) {
  const argv = process.argv.slice(2);
  const findFlag = argv.indexOf("--find");

  if (findFlag !== -1) {
    const query = argv.slice(findFlag + 1).join(" ");
    if (!existsSync(CATALOG_PATH)) {
      console.error("catalog.json does not exist — run `npm run catalog` first.");
      process.exit(1);
    }
    const records = JSON.parse(readFileSync(CATALOG_PATH, "utf8"));
    const ranked = rankCatalog(records, query, 10);
    if (length(ranked) === 0) {
      console.log(`No matches for "${query}".`);
    } else {
      console.log(`Top matches for "${query}":\n`);
      for (const { record, score } of ranked) {
        const line = record.useFor ?? record.summary ?? record.notes ?? "(no description)";
        console.log(
          `  ${String(score).padStart(3)}  ${record.name.padEnd(28)} ` +
            `${(record.kind ?? "?").padEnd(10)} depth=${record.depth ?? "?"}  ` +
            `${record.showcase ?? ""}`,
        );
        console.log(`       ${line}`);
      }
    }
    process.exit(0);
  }

  const records = run();
  const missingSummary = records.filter((r) => r.summary === null);
  const rendered = `${JSON.stringify(records, null, 2)}\n`;

  if (argv.includes("--check")) {
    const current = existsSync(CATALOG_PATH)
      ? readFileSync(CATALOG_PATH, "utf8")
      : null;
    if (current !== rendered) {
      console.error(
        "catalog.json is stale. Run `npm run catalog` and commit the result.",
      );
      process.exit(1);
    }
    console.log("catalog.json is fresh.");
    process.exit(0);
  }

  writeFileSync(CATALOG_PATH, rendered);
  const byKind = {};
  for (const r of missingSummary) byKind[r.kind] = (byKind[r.kind] ?? 0) + 1;
  console.log(
    `catalog.json written: ${length(records)} records, ${length(missingSummary)} with summary: null ` +
      `(${Object.entries(byKind)
        .map(([k, n]) => `${k}: ${n}`)
        .join(", ")}).`,
  );
}
