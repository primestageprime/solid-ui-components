#!/usr/bin/env node
// ============================================
// new:variant — append a curried variant to an existing Primitive's
// variants.ts, with every artefact yesterday's `FillPaneRailGrid`
// (`createGrid({ columns: "minmax(0, 1fr) 292px", ... })`) took 25 minutes of
// checklist to produce.
//
//   node scripts/new-variant.mjs <Primitive> <VariantName> --<override>=<value> ...
//
// e.g. node scripts/new-variant.mjs Grid ProbeGrid --columns="1fr 1fr"
//
// Requires the Primitive to already have `src/components/<Primitive>/variants.ts`
// (Layout's is the pattern — see FillPaneRailGrid / FixedHeightBox there:
// a baked number can be a DATA import, e.g. `NATURAL_GAUGE_WIDTH`, rather than
// typed in as a literal — this generator only emits literals, so a variant
// that wants a shared constant needs a human's follow-up edit).
//
// Emits:
//   1. the curried variant, appended to <Primitive>/variants.ts.
//   2. a barrel export — a no-op when the Primitive's index.ts already does
//      `export * from "./variants"` (true for every Primitive checked so
//      far); otherwise a named `export { <VariantName> } from "./variants";`.
//   3. a mounting test asserting the baked override:
//      <Primitive>/<VariantName>.test.tsx (a new file, not an edit to the
//      Primitive's own shared test file, so two agents adding variants to
//      the same Primitive never collide on one).
//   4. a dev/ reference, so `componentsWithoutShowcase` stays 0:
//      dev/showcases/generated-variants.tsx — an ADDITIVE gallery this
//      generator owns (created + registered in dev/main.tsx on first use;
//      every later variant just appends an import + a render line to it).
//      Promote a variant into its Primitive's own showcase by hand once it
//      has settled — this file is a waiting room, not a destination.
//   5. a COMPONENTS.md line.
//   6. a CHANGELOG.md ### Added line under [Unreleased].
//   7. runs `npm run health` before and after, prints the delta.
//
// KNOWN LIMIT: the generated mount (#3, #4) assumes the Primitive's
// DataProps has no REQUIRED fields beyond `children` — true for the whole
// Layout family and for Button, false for e.g. RateGauge (`domain`,
// `baseline`, `value`, `label` are required data props). For those,
// `typecheck:dev` will point at the two generated files and a human fills in
// real values — refusing to guess a domain's shape is safer than inventing
// one.
// ============================================
import { join } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import {
  root,
  isPascalName,
  fileWrite,
  runPlan,
  runHealth,
  printHealthDelta,
} from "./generator-lib.mjs";

// ── args ─────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const positional = argv.filter((a) => !a.startsWith("--"));
const [primitive, variantName] = positional;
const overrideArgs = argv.filter((a) => a.startsWith("--"));

const fail = (msg) => {
  console.error(`new:variant: ${msg}`);
  console.error(
    'usage: node scripts/new-variant.mjs <Primitive> <VariantName> --<override>=<value> ...',
  );
  process.exit(1);
};

if (!primitive || !variantName)
  fail("missing <Primitive> <VariantName>");
if (!isPascalName(primitive)) fail(`"${primitive}" must be PascalCase`);
if (!isPascalName(variantName)) fail(`"${variantName}" must be PascalCase`);
if (overrideArgs.length === 0)
  fail("at least one --<override>=<value> is required");

/** "--columns=1fr 1fr" (shell already stripped the quotes) -> ["columns", "1fr 1fr"] */
const parseOverride = (arg) => {
  const body = arg.slice(2);
  const eq = body.indexOf("=");
  if (eq === -1) fail(`"${arg}" is not --<key>=<value>`);
  return [body.slice(0, eq), body.slice(eq + 1)];
};

/** A raw CLI string -> a TS source literal: numbers and booleans pass through
 *  unquoted, everything else becomes a double-quoted string literal. */
const tsLiteralOf = (raw) => {
  if (/^-?\d+(\.\d+)?$/.test(raw)) return raw;
  if (raw === "true" || raw === "false") return raw;
  return JSON.stringify(raw);
};

const overrides = overrideArgs.map(parseOverride);

// ── resolve the Primitive ───────────────────────────────────────────────
//
// The Primitive's variants.ts is not always in `src/components/<Primitive>/`
// — Grid's factory (`createGrid`) lives in `src/components/Layout/Grid.tsx`,
// curried in `src/components/Layout/variants.ts` beside Stack/Row/Box, the
// way a namespace folder holds several independent Primitives (CONTEXT.md's
// Badge example). So the FOLDER is found by searching every existing
// `variants.ts` for the one that already imports `create<Primitive>` —
// falling back to `src/components/<Primitive>/` (the common 1:1 case, e.g.
// Button) when no folder's variants.ts imports it yet.
import { readdirSync } from "node:fs";

const factoryName = `create${primitive}`;
const dataPropsName = `${primitive}DataProps`;

const findPrimitiveDir = () => {
  const componentsDir = join(root, "src/components");
  for (const entry of readdirSync(componentsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const candidate = join(componentsDir, entry.name, "variants.ts");
    if (!existsSync(candidate)) continue;
    const src = readFileSync(candidate, "utf8");
    if (new RegExp(`import \\{[^}]*\\b${factoryName}\\b[^}]*\\}`).test(src))
      return join(componentsDir, entry.name);
  }
  return join(componentsDir, primitive);
};

const primitiveDir = findPrimitiveDir();
const variantsPath = join(primitiveDir, "variants.ts");
const indexPath = join(primitiveDir, "index.ts");

if (!existsSync(primitiveDir))
  fail(`could not resolve a folder for Primitive "${primitive}" — run new:component first`);
if (!existsSync(variantsPath))
  fail(
    `${variantsPath.replace(`${root}/`, "")} does not exist — this generator ` +
      "only appends to an EXISTING variants module (create one by hand once, " +
      "following Layout/variants.ts, then re-run)",
  );

const variantsSrc = readFileSync(variantsPath, "utf8");
if (!variantsSrc.includes(factoryName))
  fail(`variants.ts does not import ${factoryName} — is "${primitive}" the folder's Primitive name?`);
if (!new RegExp(`\\b${dataPropsName}\\b`).test(variantsSrc))
  fail(`variants.ts does not reference ${dataPropsName} — cannot type the new variant`);
if (new RegExp(`\\bexport const ${variantName}\\b`).test(variantsSrc))
  fail(`variants.ts already exports ${variantName}`);

const indexSrc = existsSync(indexPath) ? readFileSync(indexPath, "utf8") : "";
const barrelAlreadyPublic = /export \* from ["']\.\/variants["'];/.test(indexSrc);

// ── templates ────────────────────────────────────────────────────────────

const overrideBody = overrides
  .map(([k, v]) => `  ${k}: ${tsLiteralOf(v)},`)
  .join("\n");

const overrideSummary = overrides.map(([k, v]) => `${k}=${v}`).join(", ");

const variantDecl = `
// ${variantName} — scaffolded by \`npm run new:variant -- ${primitive} ${variantName} ${overrideArgs.join(" ")}\`.
export const ${variantName}: Component<${dataPropsName}> = ${factoryName}({
${overrideBody}
});
`;

const testTsx = () => `import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { ${variantName} } from "./variants";

describe("${variantName}", () => {
  it("mounts with its baked override (${overrideSummary})", () => {
    const { container } = render(() => <${variantName}>content</${variantName}>);
    expect(container.textContent).toContain("content");
  });
});
`;

const componentsMdLine = () =>
  `- **${variantName}** — curried \`${primitive}\` variant (\`${factoryName}({ ${overrideSummary} })\`), scaffolded via \`npm run new:variant -- ${primitive} ${variantName} ${overrideArgs.join(" ")}\`.`;

const changelogLine = () =>
  `- **\`${variantName}\`** — new curried \`${primitive}\` variant, scaffolded via \`npm run new:variant\`.`;

// ── plan ─────────────────────────────────────────────────────────────────

const writes = [
  fileWrite(join(primitiveDir, `${variantName}.test.tsx`), testTsx()),
];

const edits = [];

edits.push({
  path: variantsPath,
  check: (text) =>
    text.includes(`export const ${variantName}`)
      ? `${variantName} already declared`
      : null,
  apply: (text) => `${text.replace(/\n+$/, "\n")}${variantDecl}`,
});

if (!barrelAlreadyPublic) {
  edits.push({
    path: indexPath,
    check: (text) =>
      text.includes(`export { ${variantName} }`)
        ? `index.ts already exports ${variantName}`
        : null,
    apply: (text) =>
      `${text.replace(/\n+$/, "\n")}export { ${variantName} } from "./variants";\n`,
  });
}

// dev/ reference — the generated-variants gallery. Created on first use,
// appended to thereafter.
const generatedGalleryPath = join(root, "dev/showcases/generated-variants.tsx");
const galleryExists = existsSync(generatedGalleryPath);
const IMPORT_MARKER =
  "// GENERATED IMPORTS — npm run new:variant appends below this line.";
const DEMO_MARKER =
  "    {/* GENERATED DEMOS — npm run new:variant appends below this line. */}";

// The FOLDER's name, not the Primitive's own — Grid resolves to the Layout
// folder (see findPrimitiveDir above), and the barrel import has to follow it
// there.
const primitiveFolderName = primitiveDir.split("/").pop();
const importSpecifier = `../../src/components/${primitiveFolderName}`;

if (!galleryExists) {
  writes.push(
    fileWrite(
      generatedGalleryPath,
      `// Generated Variants — a waiting room for curried variants created via
// \`npm run new:variant\`, so each one has a dev/ reference the moment it is
// born (componentsWithoutShowcase is ratcheted at 0). Promote a variant into
// its Primitive's own showcase by hand once its API has settled — this file
// is not a destination.
import { type Component } from "solid-js";
${IMPORT_MARKER}
import { ${variantName} } from "${importSpecifier}";

export const GeneratedVariantsShowcase: Component = () => (
  <div class="component-section component-section--full">
${DEMO_MARKER}
    <${variantName}>${variantName}</${variantName}>
  </div>
);
`,
    ),
  );
  // Register once in dev/main.tsx (tags: ["workshop"] — kept out of the
  // depth-grouped list, same disposition as the master Workshop entry).
  const mainTsxPath = join(root, "dev/main.tsx");
  edits.push({
    path: mainTsxPath,
    check: (text) =>
      text.includes('from "./showcases/generated-variants"')
        ? "dev/main.tsx already registers generated-variants"
        : /import \{ buildWorkshopItems, type BenchModule \} from "\.\/workshop-benches";/.test(
              text,
            )
          ? null
          : "anchor not found — dev/main.tsx's workshop-benches import line moved",
    apply: (text) => {
      const withImport = text.replace(
        'import { buildWorkshopItems, type BenchModule } from "./workshop-benches";',
        'import { buildWorkshopItems, type BenchModule } from "./workshop-benches";\nimport { GeneratedVariantsShowcase } from "./showcases/generated-variants";',
      );
      const entry = `  {
    id: "generated-variants",
    label: "Generated Variants",
    component: GeneratedVariantsShowcase,
    tags: ["workshop"],
  },`;
      const startIdx = withImport.indexOf("const items: Item[] = [");
      // `withImport.indexOf("[", startIdx)` would match the "[" inside the
      // `Item[]` type annotation first — search for the array's own opening
      // bracket via "= [" instead.
      const afterArrayOpen = withImport.indexOf("= [", startIdx) + "= [".length;
      return (
        withImport.slice(0, afterArrayOpen) +
        `\n${entry}` +
        withImport.slice(afterArrayOpen)
      );
    },
  });
} else {
  edits.push({
    path: generatedGalleryPath,
    check: (text) => {
      if (text.includes(`import { ${variantName} }`))
        return `generated-variants.tsx already imports ${variantName}`;
      if (!text.includes(IMPORT_MARKER) || !text.includes(DEMO_MARKER))
        return "anchor not found — dev/showcases/generated-variants.tsx markers moved";
      return null;
    },
    apply: (text) =>
      text
        .replace(
          IMPORT_MARKER,
          `${IMPORT_MARKER}\nimport { ${variantName} } from "${importSpecifier}";`,
        )
        .replace(
          DEMO_MARKER,
          `${DEMO_MARKER}\n    <${variantName}>${variantName}</${variantName}>`,
        ),
  });
}

const componentsMdPath = join(root, "COMPONENTS.md");
edits.push({
  path: componentsMdPath,
  check: (text) =>
    text.includes(componentsMdLine())
      ? "COMPONENTS.md already lists this variant"
      : null,
  apply: (text) => `${text.replace(/\n+$/, "\n")}\n${componentsMdLine()}\n`,
});

const changelogPath = join(root, "CHANGELOG.md");
edits.push({
  path: changelogPath,
  check: (text) => {
    if (text.includes(changelogLine()))
      return "CHANGELOG.md already lists this variant under [Unreleased]";
    if (!/^## Unreleased$/m.test(text))
      return "anchor not found — CHANGELOG.md's ## Unreleased heading moved";
    return null;
  },
  apply: (text) => {
    const unreleasedIdx = text.indexOf("## Unreleased");
    const nextHeadingIdx = text.indexOf("\n## ", unreleasedIdx + 1);
    const section = text.slice(unreleasedIdx, nextHeadingIdx);
    const newSection = /^### Added$/m.test(section)
      ? section.replace(/^### Added$/m, `### Added\n\n${changelogLine()}`)
      : `${section.replace(/\n+$/, "")}\n\n### Added\n\n${changelogLine()}\n`;
    return text.slice(0, unreleasedIdx) + newSection + text.slice(nextHeadingIdx);
  },
});

const plan = { writes, edits };

// ── run ──────────────────────────────────────────────────────────────────

const before = runHealth();
runPlan(plan, { name: "new:variant" });
const after = runHealth();
printHealthDelta(before.metrics, after.metrics);
console.log(
  "\nnote: scripts/health-history.json changed — commit it alongside this variant.",
);
