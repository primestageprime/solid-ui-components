// Reading SUI's own source as data — never running it (except the icon table,
// a plain object literal the mirror needs verbatim).

/**
 * The text of the value an `export const <name>` is initialised with, when that
 * value is a `{…}` literal. Strings, template literals and comments are
 * skipped while matching braces, so a `{` inside an SVG path never counts.
 */
export const sliceInitializer = (source: string, name: string): string => {
  const head = new RegExp(`export const ${name}\\b[^=]*=\\s*`).exec(source);
  if (!head) throw new Error(`no "export const ${name}" in the source`);
  const start = source.indexOf("{", head.index + head[0].length - 1);
  let depth = 0;
  let i = start;
  while (i < source.length) {
    const ch = source[i];
    const next = source[i + 1];
    if (ch === "/" && next === "/") {
      i = source.indexOf("\n", i);
      if (i === -1) break;
      continue;
    }
    if (ch === "/" && next === "*") {
      i = source.indexOf("*/", i) + 2;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      i += 1;
      while (i < source.length && source[i] !== ch)
        i += source[i] === "\\" ? 2 : 1;
      i += 1;
      continue;
    }
    if (ch === "{") depth += 1;
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
    i += 1;
  }
  throw new Error(`unbalanced braces after "export const ${name}"`);
};

export interface VariantEntry {
  readonly name: string;
  readonly factory: string;
}

/** Every `export const X … = createY(` in a SUI variant table, in order. */
export const variantTable = (source: string): readonly VariantEntry[] =>
  [
    ...source.matchAll(
      /^export const ([A-Z]\w*)(?:\s*:[^=]+)?\s*=\s*(create[A-Z]\w*)\(/gm,
    ),
  ].map((m) => ({ name: m[1] ?? "", factory: m[2] ?? "" }));
