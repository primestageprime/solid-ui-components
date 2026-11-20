// `npm run build`: the design system's files, from SUI's sources, into
// dist/project/ (or the folder given as the first argument). Publishing them
// is a separate step: the design system's page reads this folder as it is.
import { execFileSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildBundle } from "./bundle.ts";
import { composeBundleCss } from "./bundleCss.ts";
import { FACTORY_TYPES } from "./declarations.ts";
import { exportedTypes, indexDeclarations } from "./dts.ts";
import { TABLES } from "./generate.ts";
import { ROOTS, SUI_SRC } from "./roots.ts";
import { variantTable } from "./source.ts";
import { tokensCss, tokensJson } from "./tokens.ts";

const MIRROR = fileURLToPath(new URL("..", import.meta.url));
const CONTENT = join(MIRROR, "design-system");
const read = (path: string): string => readFileSync(path, "utf8");
const sui = (path: string): string => read(join(SUI_SRC, path));

export const NAMESPACE = "Sui";
export const THEMES = [
  {
    id: "hud",
    name: "HUD",
    file: "themes/hud.css",
    condition: ':not([data-theme="light"])',
  },
  {
    id: "light",
    name: "Light (Bronze)",
    file: "themes/bronze.css",
    condition: '[data-theme="light"]',
  },
] as const;

/** The bases SUI exports (and the two dials), each with the props type it takes. */
const BASES = [
  { name: "MutationDial", props: "MutationDialProps" },
  { name: "GroupDial", props: "GroupDialProps" },
  { name: "MarkedSlider", props: "MarkedSliderProps" },
  { name: "SliderField", props: "SliderFieldProps" },
  { name: "Icon", props: "IconProps" },
  { name: "InlineMetaIcon", props: "IconDataProps" },
] as const;

/** Files whose exported types the props docs may name. */
const TYPE_SOURCES = [
  join(MIRROR, "src/internal/attrs.ts"),
  join(MIRROR, "src/internal/style.ts"),
  ...readdirSync(join(MIRROR, "src"))
    .filter((f) => f.endsWith(".tsx") && !f.includes(".test."))
    .map((f) => join(MIRROR, "src", f)),
  join(ROOTS.components, "MarkedSlider/geometry.ts"),
  join(ROOTS.components, "MutationSliders/labels.ts"),
  join(ROOTS.components, "MutationSliders/readouts.ts"),
  join(MIRROR, "src/generated/sui/Icon/paths.d.ts"),
];

const variants = () =>
  TABLES.flatMap((table) =>
    variantTable(read(join(ROOTS.components, table, "variants.ts"))).map(
      (v) => ({
        name: v.name,
        props: FACTORY_TYPES[v.factory]?.props ?? "never",
      }),
    ),
  );

const commit = (): string => {
  try {
    return execFileSync("git", ["-C", MIRROR, "rev-parse", "--short", "HEAD"], {
      encoding: "utf8",
    }).trim();
  } catch {
    return "unknown";
  }
};

/** The preview marker on line 1 of a card: its group and its first README sentence. */
const cardOf = (comp: string) => {
  const marker =
    read(join(CONTENT, "components", comp, "preview.html")).split("\n")[0] ??
    "";
  const group = /group="([^"]*)"/.exec(marker)?.[1];
  const body = read(join(CONTENT, "components", comp, "README.md"))
    .replace(/^# .*\n/, "")
    .trim();
  const summary = /^[^\n]*?[.!?](?=\s|$)/.exec(body)?.[0];
  return {
    name: comp,
    ...(group ? { group } : {}),
    ...(summary ? { summary } : {}),
  };
};

export const buildDesignSystem = async (
  out: string,
): Promise<readonly string[]> => {
  const notes: string[] = [];
  rmSync(out, { recursive: true, force: true });
  mkdirSync(join(out, "components"), { recursive: true });
  const write = (path: string, text: string): void => {
    mkdirSync(dirname(join(out, path)), { recursive: true });
    writeFileSync(join(out, path), text);
  };

  const sha = commit();
  const tokens = tokensJson(
    THEMES.map((t) => ({ id: t.id, name: t.name, css: sui(t.file) })),
    sui("components/Text/Text.css"),
  );
  if (tokens.skipped.length > 0)
    notes.push(`tokens not carried: ${tokens.skipped.join(", ")}`);
  const tokenFile = {
    meta: {
      source: "github",
      repo: "primestageprime/solid-ui-components",
      ref: sha,
      package: "react-mirror",
      paths: { tokens: THEMES.map((t) => `src/${t.file}`) },
      synced: new Date().toISOString().slice(0, 10),
    },
    ...tokens.json,
  };
  write("tokens.json", `${JSON.stringify(tokenFile, null, 2)}\n`);
  write("tokens.css", tokensCss(tokens.json));

  const bundle = await buildBundle();
  const ordered = [...BASES, ...variants()];
  const header = {
    format: 4,
    namespace: NAMESPACE,
    components: ordered.map((c) => ({ name: c.name })),
  };
  const js = `/* @ds-bundle: ${JSON.stringify(header)} */\n${bundle.js}`;
  if (/<\/script|<!--/i.test(js))
    throw new Error("bundle.js holds </script or <!--");
  write("components/bundle.js", js);
  const css = composeBundleCss({
    components: bundle.css,
    baseline: sui("themes/_baseline.css"),
    themes: THEMES.map((t) => ({ css: sui(t.file), condition: t.condition })),
  });
  if (/<\/style/i.test(css)) throw new Error("bundle.css holds </style");
  write("components/bundle.css", css);

  const decls = TYPE_SOURCES.flatMap((path) => exportedTypes(read(path)));
  write("components/index.d.ts", indexDeclarations(decls, ordered));

  cpSync(CONTENT, out, { recursive: true });
  const cards = readdirSync(join(CONTENT, "components")).filter(
    (c) => c !== "Cover",
  );
  const order = new Map(ordered.map((c, i) => [c.name, i]));
  const catalogue = [...cards]
    .sort((a, b) => (order.get(a) ?? 1e9) - (order.get(b) ?? 1e9))
    .map(cardOf);
  const missing = cards.filter((c) => !order.has(c));
  if (missing.length > 0)
    throw new Error(
      `cards for components not in the bundle: ${missing.join(", ")}`,
    );

  const now = new Date().toISOString();
  const lastChange = {
    by: "Peter Stradinger",
    at: now,
    via: `Claude Code · solid-ui-components/react-mirror@${sha}`,
    note: `built from SUI at ${sha}`,
  };
  write(
    "manifest.json",
    `${JSON.stringify(
      {
        manifestVersion: 3,
        name: "SUI",
        namespace: NAMESPACE,
        libraries: [
          { name: "react", version: "18.3.1", global: "React" },
          { name: "react-dom", version: "18.3.1", global: "ReactDOM" },
        ],
        components: catalogue,
        lastChange,
        assetGroups: [],
      },
      null,
      2,
    )}\n`,
  );
  write(
    "design-system.json",
    `${JSON.stringify(
      {
        v: 3,
        layout: "files",
        createdOnFiles: { v: 1, at: now },
        title: "SUI",
        namespace: NAMESPACE,
        editing: "code",
        libraries: [
          { name: "react", version: "18" },
          { name: "react-dom", version: "18" },
        ],
        sections: {},
        groups: [],
        assetGroups: {},
        blobs: {},
        docs: { readme: "project/README.md", sections: [] },
        lastChange,
      },
      null,
      2,
    )}\n`,
  );
  return notes;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = resolve(process.argv[2] ?? join(MIRROR, "dist/project"));
  const notes = await buildDesignSystem(out);
  for (const note of notes) console.log(`note: ${note}`);
  console.log(`built ${out}`);
}
