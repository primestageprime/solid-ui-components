#!/usr/bin/env node
// ============================================
// SUI export surface — type-level extraction of the public API
// --------------------------------------------
// Answers "what does `import { X } from 'solid-ui-components'` actually give
// you, and what props does it take" by asking the TypeScript compiler rather
// than by reading text. Built for dside sui#16389.
//
// ── Why this exists alongside export-usage-report.mjs ───────────────────────
// `collectExportSurface` in export-usage-report.mjs resolves the same barrel
// chain with regexes and no `typescript` dependency. It is NOT redundant with
// this file and is not being replaced: it resolves NAMES, this resolves TYPES.
//
// The two were cross-checked as of 0.141.0 and agree EXACTLY — 1260 names,
// zero symmetric difference (pinned by test). That agreement is the reason the
// cheap extractor stays trustworthy for name-level work (the #12565 breakage
// gate, consumer import cross-referencing) and this heavier one is reached for
// only when a prop's actual type is the question. If the pinning test ever
// fails, the regex extractor has drifted and is the one to fix.
//
// ── The declaration-site filter (the thing that makes output usable) ────────
// `checker.getPropertiesOfType` on a curried Button variant returns 474
// properties, because Solid's `ComponentProps<"button">` folds in the entire
// HTML button attribute surface. A 474-row table documents nothing.
//
// So a prop counts as the component's OWN only when its declaration lives
// under src/. PrimaryButton goes 474 -> 3 (`loading`, `active`, `tone`), and
// the rest are reported as a bare `inherited` count.
//
// That filter also surfaces something the hand-written prose cannot: currying
// is visible in the types. PrimaryButton's own props do NOT include `variant`
// or `size` — `createButton` Omits them once they are baked. The generated
// table therefore shows what a caller may actually pass, which is exactly the
// curried-only policy COMPONENTS.md states in prose and cannot enforce.
//
// ── Classification is by RETURN TYPE, never by arity ────────────────────────
// The obvious "one parameter means it's a component" heuristic is wrong here.
// `formatCompactDuration(ms: number)` takes one parameter, and asking for the
// properties of `number` yields `toFixed`/`toString`/… — which the src/ filter
// then reduces to zero, so it would be reported as a component with no props
// rather than as the pure formatter it is. A symbol is a component only when a
// call signature returns solid-js's `JSX.Element`, and a factory only when it
// returns something that does.
//
//   node scripts/export-surface.mjs              # counts + any unresolved
//   node scripts/export-surface.mjs --components # exported components + prop counts
//   node scripts/export-surface.mjs --name Combobox
//   node scripts/export-surface.mjs --json
//
// Building the Program costs ~900ms over ~890 source files, so this is a
// report/codegen input, not something to put in a per-push hook.
// ============================================
import ts from "typescript";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Compile `entry` with the repo's own tsconfig and hand back the checker. */
function createProgram(root, entry) {
  const configPath = join(root, "tsconfig.json");
  const { config, error } = ts.readConfigFile(configPath, ts.sys.readFile);
  if (error)
    throw new Error(
      `cannot read ${configPath}: ${ts.flattenDiagnosticMessageText(error.messageText, " ")}`,
    );
  const parsed = ts.parseJsonConfigFileContent(config, ts.sys, root);
  const program = ts.createProgram({
    rootNames: [entry],
    // noEmit — this is a type query. declaration/outDir from the real config
    // would otherwise have it plan an emit it never performs.
    options: { ...parsed.options, noEmit: true, declaration: false },
  });
  return { program, checker: program.getTypeChecker() };
}

/** Is this type solid-js's `JSX.Element`? */
const isJsxElement = (type) => {
  const symbol = type.getSymbol() ?? type.aliasSymbol;
  const decl = symbol?.getDeclarations()?.[0];
  return (
    symbol?.getName() === "Element" &&
    Boolean(decl) &&
    /solid-js/.test(decl.getSourceFile().fileName)
  );
};

/**
 * A call signature is component-shaped when it takes a single props bag and
 * returns JSX.
 *
 * The arity guard is not cosmetic. `getCellValue(row, column): JSX.Element`
 * (Table/types.ts) is a two-argument cell accessor that happens to return
 * renderable content; without the guard it lands in the component bucket and
 * then reports zero props, because there is no single parameter to read them
 * from. Zero props on a real component and zero props on a misfiled helper are
 * indistinguishable downstream, which is precisely the ambiguity this file
 * exists to remove.
 */
const isComponentSignature = (signature) =>
  signature.getParameters().length <= 1 &&
  isJsxElement(signature.getReturnType());

/** Follow an `export { X } from` alias to the declaration it names. */
const resolveAlias = (checker, symbol) =>
  symbol.getFlags() & ts.SymbolFlags.Alias
    ? checker.getAliasedSymbol(symbol)
    : symbol;

/** Where a symbol is declared, repo-relative, or null if it has no declaration. */
const declarationSite = (root, symbol) => {
  const decl = symbol.getDeclarations()?.[0];
  if (!decl) return null;
  const sourceFile = decl.getSourceFile();
  const { line } = sourceFile.getLineAndCharacterOfPosition(decl.getStart());
  return { file: relative(root, sourceFile.fileName), line: line + 1, decl };
};

/**
 * The component directory a declaration belongs to
 * (`src/components/Combobox/Combobox.tsx` -> `Combobox`), or null when the
 * declaration lives outside src/components. This is what a documentation
 * coverage metric keys on — see the note in the header about health.mjs's
 * current directory-name-anywhere test.
 */
const componentDir = (file) =>
  file.match(/^src\/components\/([^/]+)\//)?.[1] ?? null;

/**
 * A component's own props, split from everything it inherits.
 *
 * `signature` is the call signature that returns JSX. Props whose declaration
 * is outside src/ (Solid's HTML attribute surface, Kobalte's root props, lib.d.ts
 * members) are counted, not listed — see the header.
 */
function extractProps(root, checker, signature, fallbackNode) {
  const parameters = signature.getParameters();
  if (parameters.length !== 1) return { props: [], inherited: 0 };
  const parameter = parameters[0];
  const node = parameter.valueDeclaration ?? fallbackNode;
  const propsType = checker.getTypeOfSymbolAtLocation(parameter, node);

  const own = [];
  let inherited = 0;
  for (const property of checker.getPropertiesOfType(propsType)) {
    const site = declarationSite(root, property);
    if (!site || !site.file.startsWith("src/")) {
      inherited += 1;
      continue;
    }
    const optional = (property.getFlags() & ts.SymbolFlags.Optional) !== 0;
    const type = checker.typeToString(
      checker.getTypeOfSymbolAtLocation(property, site.decl),
      undefined,
      ts.TypeFormatFlags.NoTruncation,
    );
    own.push({
      name: property.getName(),
      optional,
      // `strict` makes every optional prop `T | undefined`; the `?` already
      // says that, so carrying it into a rendered table is pure noise.
      type: (optional ? type.replace(/\s*\|\s*undefined/g, "") : type)
        .replace(/\s+/g, " ")
        .trim(),
      file: site.file,
    });
  }
  // Required first, then alphabetical — stable across unrelated source edits,
  // so a diff of generated output means the API moved.
  own.sort((a, b) =>
    a.optional === b.optional
      ? a.name.localeCompare(b.name)
      : a.optional
        ? 1
        : -1,
  );
  return { props: own, inherited };
}

/** Classify one exported symbol and extract whatever its kind carries. */
function describe(root, checker, exportedSymbol) {
  const name = exportedSymbol.getName();
  const symbol = resolveAlias(checker, exportedSymbol);
  const site = declarationSite(root, symbol);
  if (!site) return { name, kind: "unresolved" };

  const base = {
    name,
    file: site.file,
    line: site.line,
    dir: componentDir(site.file),
  };
  const flags = symbol.getFlags();

  if (flags & ts.SymbolFlags.Module)
    return {
      ...base,
      kind: "namespace",
      // `export * as fields from "./fields"` — the namespace object is the
      // export, and consumers reach its contents as `fields.text`, never as a
      // bare top-level name. Enumerate them so a breakage gate can see them.
      members: checker
        .getExportsOfModule(symbol)
        .map((m) => m.getName())
        .sort(),
    };

  if (!(flags & ts.SymbolFlags.Value)) return { ...base, kind: "type" };

  const type = checker.getTypeOfSymbolAtLocation(symbol, site.decl);
  const signatures = type.getCallSignatures();
  if (!signatures.length)
    return {
      ...base,
      kind: "const",
      type: checker.typeToString(type).replace(/\s+/g, " "),
    };

  const signature = signatures[0];
  const returnType = signature.getReturnType();

  if (isComponentSignature(signature))
    return {
      ...base,
      kind: "component",
      ...extractProps(root, checker, signature, site.decl),
    };

  // A `createX` factory: the props that matter belong to the component it
  // returns, not to the defaults bag it accepts.
  //
  // Tested structurally rather than by looking for solid-js's `Component<P>`
  // alias on the return type. Three real factories — createTreemap,
  // createBaseTable, createValueMatrix — are generic and so return a bare
  // `<T>(props: P<T>) => JSX.Element`, which the alias test demotes to a plain
  // function. The structural test costs one known false positive in the other
  // direction: createCellRenderer returns `(row: T) => JSX.Element`, a cell
  // accessor that is type-identical to a component and cannot be told apart
  // from one without reading intent. It lands here with zero props.
  const produced = returnType.getCallSignatures().find(isComponentSignature);
  if (produced)
    return {
      ...base,
      kind: "factory",
      ...extractProps(root, checker, produced, site.decl),
    };

  return {
    ...base,
    kind: "function",
    signature: checker.typeToString(type).replace(/\s+/g, " "),
  };
}

/**
 * The full public surface of `entry`, one entry per exported name.
 *
 * Shape per export: `{ name, kind, file, line, dir }` plus, by kind —
 *   component / factory : `props: [{ name, optional, type, file }]`, `inherited`
 *   namespace           : `members: string[]`
 *   function            : `signature`
 *   const               : `type`
 */
export function buildExportSurface({
  root = REPO_ROOT,
  entry = join(REPO_ROOT, "src/index.ts"),
} = {}) {
  const { program, checker } = createProgram(root, entry);
  const sourceFile = program.getSourceFile(entry);
  if (!sourceFile) throw new Error(`entry not in program: ${entry}`);
  const moduleSymbol = checker.getSymbolAtLocation(sourceFile);
  if (!moduleSymbol)
    throw new Error(`${relative(root, entry)} resolves to no module symbol`);

  const exports = checker
    .getExportsOfModule(moduleSymbol)
    .map((s) => describe(root, checker, s))
    .sort((a, b) => a.name.localeCompare(b.name));

  const counts = exports.reduce(
    (acc, e) => ({ ...acc, [e.kind]: (acc[e.kind] ?? 0) + 1 }),
    {},
  );
  return {
    entry: relative(root, entry),
    total: exports.length,
    counts,
    exports,
  };
}

// ── CLI ──────────────────────────────────────────────────────────────────────
if (import.meta.url === `file://${process.argv[1]}`) {
  const argv = process.argv.slice(2);
  const surface = buildExportSurface();

  const nameFlag = argv.indexOf("--name");
  if (nameFlag !== -1) {
    const wanted = argv[nameFlag + 1];
    const found = surface.exports.find((e) => e.name === wanted);
    if (!found) {
      console.error(`${wanted} is not exported from ${surface.entry}`);
      process.exit(1);
    }
    console.log(JSON.stringify(found, null, 2));
  } else if (argv.includes("--json")) {
    console.log(JSON.stringify(surface, null, 2));
  } else if (argv.includes("--components")) {
    for (const e of surface.exports) {
      if (e.kind !== "component" && e.kind !== "factory") continue;
      console.log(
        `${e.name.padEnd(34)} ${String(e.props.length).padStart(3)} own ` +
          `${String(e.inherited).padStart(4)} inherited   ${e.file}`,
      );
    }
  } else {
    console.log(`${surface.entry}: ${surface.total} exported names`);
    for (const [kind, n] of Object.entries(surface.counts).sort(
      (a, b) => b[1] - a[1],
    ))
      console.log(`  ${kind.padEnd(12)} ${String(n).padStart(5)}`);
    const unresolved = surface.exports.filter((e) => e.kind === "unresolved");
    if (unresolved.length) {
      console.log(`\nunresolved (${unresolved.length}):`);
      for (const e of unresolved) console.log(`  ${e.name}`);
    }
  }
}
