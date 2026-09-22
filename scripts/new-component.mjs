#!/usr/bin/env node
// ============================================
// new:component — scaffold the ten ratchet-enforced artefacts a new SUI
// component owes, all green at birth, so an agent only writes the body.
//
//   node scripts/new-component.mjs <Name> --depth <N> [--primitive]
//
// Emits (see AGENT_GUIDE.md § the health ratchet, .claude/skills/sui-build/
// SKILL.md step 4 — this is that checklist, mechanised):
//   1. src/components/<Name>/<Name>.tsx   — depth header, create<Name> factory,
//      Overrides/DataProps split (copied from createButton / createRateGauge).
//      --primitive: owns <Name>.css. Composite (default): zero CSS, zero
//      inline style={}, composes a Layout curried variant so it is a real
//      Composite rather than a bare <div>.
//   2. index.ts                            — barrel: factory + DataProps only
//      (no base export — curried variants ONLY, per every existing barrel).
//   3. <Name>.test.tsx                     — mounts as JSX (componentsNeverRendered).
//   4. dev/showcases/<kebab>.tsx           — <Name>Showcase, .component-section
//      / .example-group idiom (rate-gauge.tsx's shape).
//   5. a `.<kebab>-demo` class in dev/main.css (showcaseStyleRubricViolations
//      is ratcheted at 0 — no inline style={{ in a showcase, ever).
//   6. the import + items entry in dev/main.tsx, tags: ["depth:N", …].
//   7. a COMPONENTS.md entry (appended; doc-coverage only needs the name to
//      appear somewhere — a human fills in the real prose).
//   8. one CHANGELOG.md ### Added line under [Unreleased].
//   9. export * from "./components/<Name>"; in src/index.ts.
//  10. runs `npm run health` before and after, prints the delta.
//
// Refuses atomically (see generator-lib.mjs: the whole plan is validated
// before anything is written) when ANY target already exists, and is
// idempotent to re-run after a refusal for exactly that reason.
// ============================================
import { join } from "node:path";
import {
  root,
  isPascalName,
  pascalToKebab,
  fileWrite,
  runPlan,
  runHealth,
  printHealthDelta,
} from "./generator-lib.mjs";

// ── args ─────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const name = argv.find((a) => !a.startsWith("--"));
const depthArg = argv.find((a) => a.startsWith("--depth"));
const isPrimitive = argv.includes("--primitive");
const depthValue = depthArg?.includes("=")
  ? depthArg.split("=")[1]
  : argv[argv.indexOf(depthArg) + 1];

const fail = (msg) => {
  console.error(`new:component: ${msg}`);
  console.error(
    "usage: node scripts/new-component.mjs <Name> --depth <N> [--primitive]",
  );
  process.exit(1);
};

if (!name) fail("missing <Name>");
if (!isPascalName(name)) fail(`"${name}" must be PascalCase (e.g. RateGauge)`);
if (!depthValue || Number.isNaN(Number(depthValue)))
  fail("missing/invalid --depth <N>");
const depth = Number(depthValue);
if (isPrimitive && depth !== 1)
  fail("--primitive is always Depth 1 — omit --depth or pass --depth 1");
if (!isPrimitive && depth < 2)
  fail("a Composite is Depth 2 or higher — pass --primitive for Depth 1");

const kebab = pascalToKebab(name);
const kind = isPrimitive ? "Atomic" : "Composite";

// ── templates (pure) ────────────────────────────────────────────────────

const componentTsx = () => {
  if (isPrimitive) {
    return `// ============================================
// ${name} — Atomic (Depth 1)
// Owns ${name}.css; no component imports.
// Scaffolded by \`npm run new:component -- ${name} --depth 1 --primitive\`.
// ============================================
import { type Component, type JSX, splitProps, mergeProps } from "solid-js";
import "./${name}.css";

export interface ${name}Props extends JSX.HTMLAttributes<HTMLDivElement> {
  children?: JSX.Element;
}

export const ${name}: Component<${name}Props> = (props) => {
  const [local, others] = splitProps(props, ["children", "class"]);
  const classes = () =>
    ["sui-${kebab}", local.class].filter(Boolean).join(" ");
  return (
    <div class={classes()} {...others}>
      {local.children}
    </div>
  );
};

/** Props that are visual/static overrides — locked at variant-definition time. */
export type ${name}Overrides = Record<string, never>;

/** Props that remain available to consumers of a curried ${name} variant. */
export type ${name}DataProps = Omit<${name}Props, keyof ${name}Overrides>;

export function create${name}(
  defaults: Partial<Omit<${name}Props, "children">>,
): Component<${name}DataProps> {
  return (props) => <${name} {...mergeProps(defaults, props)} />;
}
`;
  }
  return `// ============================================
// ${name} — Composite (Depth ${depth})
// Owns zero CSS files and zero inline style={} (STYLE_GUIDE Layout Purity —
// composes curried Primitives only). Scaffolded by
// \`npm run new:component -- ${name} --depth ${depth}\`.
// ============================================
import { type Component, type JSX, mergeProps } from "solid-js";
import { NarrowStack } from "../Layout";

export interface ${name}Props {
  children?: JSX.Element;
}

export const ${name}: Component<${name}Props> = (props) => (
  <NarrowStack>{props.children}</NarrowStack>
);

/** Props that are visual/static overrides — locked at variant-definition time. */
export type ${name}Overrides = Record<string, never>;

/** Props that remain available to consumers of a curried ${name} variant. */
export type ${name}DataProps = Omit<${name}Props, keyof ${name}Overrides>;

export function create${name}(
  defaults: Partial<Omit<${name}Props, "children">>,
): Component<${name}DataProps> {
  return (props) => <${name} {...mergeProps(defaults, props)} />;
}
`;
};

const componentCss = () => `.sui-${kebab} {
  /* Scaffolded by npm run new:component. Style this Primitive here — this
     is the only place ${name}'s visual styling may live. */
}
`;

const indexTs = () => `// Base (${name}) is intentionally NOT exported — use curried variants ONLY
// (no create* factories at call sites — add one via
// \`npm run new:variant -- ${name} <VariantName> --<override>=<value>\`).
export { create${name} } from "./${name}";
export type { ${name}DataProps } from "./${name}";
`;

const testTsx = () => `import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { ${name}, create${name} } from "./${name}";

describe("${name}", () => {
  it("mounts and renders its children", () => {
    const { container } = render(() => <${name}>content</${name}>);
    expect(container.textContent).toBe("content");
  });

  it("create${name} produces a curried component with baked-in defaults", () => {
    const Curried = create${name}({});
    const { container } = render(() => <Curried>content</Curried>);
    expect(container.textContent).toBe("content");
  });
});
`;

const showcaseTsx = () => `// ${name} — scaffolded by \`npm run new:component\`. Replace this with a real
// demonstration of the component's API: every Curried Variant, wired to
// working state, in the .component-section / .example-group idiom (see
// dev/showcases/rate-gauge.tsx).
import { type Component } from "solid-js";
import { create${name} } from "../../src/components/${name}";
import { SectionTitle, MutedBody } from "../../src/components/Text";

const Demo${name} = create${name}({});

export const ${name}Showcase: Component = () => (
  <div class="component-section component-section--full">
    <div class="example-group">
      <SectionTitle>${name}</SectionTitle>
      <MutedBody>
        Scaffolded component — describe its API and Curried Variants here.
      </MutedBody>
      <div class="${kebab}-demo">
        <Demo${name}>Example content</Demo${name}>
      </div>
    </div>
  </div>
);
`;

const mainCssBlock = () => `
/* ${name} showcase demo frame — scaffolded by npm run new:component. */
.${kebab}-demo {
  padding: 16px;
}
`;

const componentsMdEntry = () => `
## ${name}
- **${name}** — ${kind} (Depth ${depth}). Scaffolded by \`npm run new:component -- ${name} --depth ${depth}${
  isPrimitive ? " --primitive" : ""
}\`. Replace this with real documentation: key props, the factory
  (\`create${name}\`), any Curried Variants, a usage example and a "use for"
  line, in the voice of its neighbours.
`;

const changelogAdded = () =>
  `- **\`${name}\`** — new ${kind.toLowerCase()} (Depth ${depth}), scaffolded via \`npm run new:component\`.`;

// ── plan ─────────────────────────────────────────────────────────────────

const componentDir = join(root, "src/components", name);
const showcasePath = join(root, "dev/showcases", `${kebab}.tsx`);

const writes = [
  fileWrite(join(componentDir, `${name}.tsx`), componentTsx()),
  fileWrite(join(componentDir, "index.ts"), indexTs()),
  fileWrite(join(componentDir, `${name}.test.tsx`), testTsx()),
  fileWrite(showcasePath, showcaseTsx()),
];
if (isPrimitive) writes.push(fileWrite(join(componentDir, `${name}.css`), componentCss()));

const mainTsxPath = join(root, "dev/main.tsx");
const mainCssPath = join(root, "dev/main.css");
const componentsMdPath = join(root, "COMPONENTS.md");
const changelogPath = join(root, "CHANGELOG.md");
const indexTsPath = join(root, "src/index.ts");

const GENERATED_IMPORT_MARKER =
  "// Generated components (npm run new:component) — appended below, do not reorder.";
const GENERATED_ITEMS_MARKER =
  "  // Generated component entries (npm run new:component) — appended above this line.";

// dev/main.tsx: the import. First run also plants the marker comment right
// after the workshop-benches import (a stable, always-present anchor).
const mainTsxImportEdit = {
  path: mainTsxPath,
  check: (text) => {
    if (text.includes(`from "./showcases/${kebab}"`))
      return `already imports dev/showcases/${kebab} — component already registered`;
    if (
      !text.includes(GENERATED_IMPORT_MARKER) &&
      !/import \{ buildWorkshopItems, type BenchModule \} from "\.\/workshop-benches";/.test(
        text,
      )
    )
      return "anchor not found — dev/main.tsx's workshop-benches import line moved";
    return null;
  },
  apply: (text) => {
    const importLine = `import { ${name}Showcase } from "./showcases/${kebab}";`;
    if (text.includes(GENERATED_IMPORT_MARKER)) {
      return text.replace(
        GENERATED_IMPORT_MARKER,
        `${GENERATED_IMPORT_MARKER}\n${importLine}`,
      );
    }
    return text.replace(
      'import { buildWorkshopItems, type BenchModule } from "./workshop-benches";',
      `import { buildWorkshopItems, type BenchModule } from "./workshop-benches";\n\n${GENERATED_IMPORT_MARKER}\n${importLine}`,
    );
  },
};

// dev/main.tsx: the items entry. First run plants the marker right before
// the items array's closing bracket.
const mainTsxItemsEdit = {
  path: mainTsxPath,
  check: (text) => {
    if (new RegExp(`id: "${kebab}"`).test(text))
      return `items array already has an entry for "${kebab}"`;
    if (!text.includes(GENERATED_ITEMS_MARKER) && !/\nconst items: Item\[\] = \[/.test(text))
      return "anchor not found — dev/main.tsx's items array declaration moved";
    return null;
  },
  apply: (text) => {
    const entry = `  {
    id: "${kebab}",
    label: "${name}",
    component: ${name}Showcase,
    tags: ["depth:${depth}"],
  },`;
    if (text.includes(GENERATED_ITEMS_MARKER)) {
      return text.replace(
        GENERATED_ITEMS_MARKER,
        `${entry}\n${GENERATED_ITEMS_MARKER}`,
      );
    }
    // Plant the marker just before the FIRST `\n];` that closes the items
    // array (the array starts at `const items: Item[] = [`).
    const startIdx = text.indexOf("const items: Item[] = [");
    const closeIdx = text.indexOf("\n];", startIdx);
    return (
      text.slice(0, closeIdx) +
      `\n${GENERATED_ITEMS_MARKER}\n${entry}` +
      text.slice(closeIdx)
    );
  },
};

// dev/main.css: append at end of file (deterministic, no shared anchor to
// collide on — every generator run only ever appends).
const mainCssEdit = {
  path: mainCssPath,
  check: (text) =>
    text.includes(`.${kebab}-demo {`)
      ? `.${kebab}-demo already defined in dev/main.css`
      : null,
  apply: (text) => `${text.replace(/\n+$/, "\n")}${mainCssBlock()}`,
};

const componentsMdEdit = {
  path: componentsMdPath,
  check: (text) =>
    new RegExp(`^## ${name}$`, "m").test(text)
      ? `COMPONENTS.md already has a ## ${name} section`
      : null,
  apply: (text) => `${text.replace(/\n+$/, "\n")}${componentsMdEntry()}`,
};

// CHANGELOG.md: append the bullet under the existing `### Added` if
// [Unreleased] already has one (a second generator run this release cycle),
// else create that subsection.
const changelogEdit = {
  path: changelogPath,
  check: (text) => {
    if (text.includes(changelogAdded()))
      return "CHANGELOG.md already lists this component under [Unreleased]";
    if (!/^## Unreleased$/m.test(text))
      return "anchor not found — CHANGELOG.md's ## Unreleased heading moved";
    return null;
  },
  apply: (text) => {
    const unreleasedIdx = text.indexOf("## Unreleased");
    const nextHeadingIdx = text.indexOf("\n## ", unreleasedIdx + 1);
    const section = text.slice(unreleasedIdx, nextHeadingIdx);
    const newSection = /^### Added$/m.test(section)
      ? section.replace(/^### Added$/m, `### Added\n\n${changelogAdded()}`)
      : `${section.replace(/\n+$/, "")}\n\n### Added\n\n${changelogAdded()}\n`;
    return text.slice(0, unreleasedIdx) + newSection + text.slice(nextHeadingIdx);
  },
};

const indexTsEdit = {
  path: indexTsPath,
  check: (text) =>
    text.includes(`export * from "./components/${name}";`)
      ? `src/index.ts already exports ./components/${name}`
      : null,
  apply: (text) => {
    // Insert right after the LAST `export * from "./components/…";` line so
    // the diff stays a single contiguous insertion beside its relatives.
    const re = /^export \* from "\.\/components\/[^"]+";$/gm;
    const matches = [...text.matchAll(re)];
    const last = matches[matches.length - 1];
    if (!last) return text; // validated not to happen
    const insertAt = last.index + last[0].length;
    return (
      text.slice(0, insertAt) +
      `\nexport * from "./components/${name}";` +
      text.slice(insertAt)
    );
  },
};

const edits = [
  mainTsxImportEdit,
  mainTsxItemsEdit,
  mainCssEdit,
  componentsMdEdit,
  changelogEdit,
  indexTsEdit,
];

const plan = { writes, edits };

// ── run ──────────────────────────────────────────────────────────────────

const before = runHealth();
runPlan(plan, { name: "new:component" });
const after = runHealth();
printHealthDelta(before.metrics, after.metrics);
if (!after.ok) {
  console.log(
    "\nnote: `npm run health` exited nonzero after scaffolding — check the " +
      "delta above; a freshly scaffolded, never-customised component is " +
      "expected to be adherence-clean but may need `--update-baseline` if " +
      "a ceiling genuinely improved.",
  );
}
console.log(
  "\nnote: scripts/health-history.json changed (health runs write it on any " +
    "metric change) — commit it alongside this component, per AGENT_GUIDE.md.",
);
