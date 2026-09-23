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
  const re = new RegExp(
    `export\\s+const\\s+${escapeRegex(name)}\\b[^=]*=\\s*create([A-Za-z0-9_]+)\\(`,
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
      out.unshift(t.replace(/^\/?\*+\/?\s?/, ""));
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

    // Overrides/DataProps: keyed on the factory suffix for a variant
    // (`Button` for `createButton`), on the export's own name otherwise.
    const overridesBase = variant ? variant.factory.replace(/^create/, "") : e.name;
    const overrideSrc = variant ? depthSource : fileSrc;
    const overrides = overridesOf(overrideSrc, overridesBase);
    const dataProps = hasDataProps(overrideSrc, overridesBase)
      ? `${overridesBase}DataProps`
      : null;

    const bullet = componentsMdBulletFor(componentsMd, e.name);
    const notes = precedingCommentOf(fileSrc, e.name);

    return {
      name: e.name,
      depth: depth ?? null,
      kind,
      family: e.dir ?? null,
      variantOf: variant ? { factory: variant.factory, overrides: variant.argsText } : null,
      overrides,
      dataProps,
      summary: bullet ? firstSentenceOf(bullet) : null,
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
  console.log(
    `catalog.json written: ${length(records)} records, ${length(missingSummary)} with summary: null.`,
  );
}
