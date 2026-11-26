// Writes src/generated/sui/** from SUI's sources (`npm run generate`).
// `generatedFiles` is also what test/generated.test.ts compares against.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { iconDeclarations, variantDeclarations } from "./declarations.ts";
import { iconNames } from "./icons.ts";
import { ICON_SOURCE, ROOTS } from "./roots.ts";
import { variantTable } from "./source.ts";

/** The SUI variant tables the mirror carries, in the order the bundle lists them. */
export const TABLES = [
  "Button",
  "Layout",
  "Surface",
  "Text",
  "Divider",
  "MarkedSlider",
] as const;

export const GENERATED_DIR = fileURLToPath(
  new URL("../src/generated/sui", import.meta.url),
);

/** Generated path (relative to src/generated/sui) → content. */
export const generatedFiles = (): Readonly<Record<string, string>> => ({
  ...Object.fromEntries(
    TABLES.map((table) => [
      `${table}/variants.d.ts`,
      variantDeclarations(
        variantTable(
          readFileSync(join(ROOTS.components, table, "variants.ts"), "utf8"),
        ),
      ),
    ]),
  ),
  "Icon/paths.d.ts": iconDeclarations(
    iconNames(readFileSync(ICON_SOURCE, "utf8")),
  ),
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  for (const [path, content] of Object.entries(generatedFiles())) {
    const target = join(GENERATED_DIR, path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
  }
}
