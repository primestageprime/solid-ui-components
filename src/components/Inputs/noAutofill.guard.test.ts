// @vitest-environment node
// Every text-like <input> / <textarea> under src/ spreads `noAutofillAttrs`
// (./noAutofill.ts), so no component can ship a field that invites a browser
// or a password manager to fill personal details into app data. A field of a
// type that takes no text (checkbox, radio, file, range, hidden) is exempt.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)],
  );

/** An opening tag that renders a field: a raw one, or a Kobalte `.Input`
 *  part (which renders the visible <input>). Kobalte's slider input is a
 *  hidden range input and `.HiddenInput` is a form mirror: neither is typed
 *  into. */
const FIELD_TAG = /<(input|textarea)\b|<Kobalte(?!Slider)\w+\.(Input|TextArea)\b/g;

/** Input types nobody types text into. */
const NOT_TEXT = /\btype=["'](checkbox|radio|file|range|hidden|color)["']/;

const isCommentLine = (line: string): boolean =>
  /^\s*(\/\/|\*|\/\*|\{\/\*)/.test(line);

/** The text of the opening tag that starts at `start`: up to the `>` that
 *  closes it, skipping any `>` inside a `{...}` expression (an arrow, a
 *  comparison). */
const openingTag = (source: string, start: number): string => {
  let depth = 0;
  for (let i = start; i < source.length; i++) {
    const ch = source[i];
    if (ch === "{") depth++;
    else if (ch === "}") depth--;
    else if (ch === ">" && depth === 0) return source.slice(start, i + 1);
  }
  return source.slice(start);
};

/** 1-based lines of the text-like fields in `source` that do not spread
 *  `noAutofillAttrs`. */
const fieldsWithoutNoAutofill = (source: string): number[] => {
  const lines: number[] = [];
  for (const match of source.matchAll(FIELD_TAG)) {
    const at = match.index ?? 0;
    const lineStart = source.lastIndexOf("\n", at) + 1;
    const lineEnd = source.indexOf("\n", at);
    const line = source.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
    if (isCommentLine(line)) continue;
    const tag = openingTag(source, at);
    if (/noAutofill(Text)?Attrs\(/.test(tag) || NOT_TEXT.test(tag)) continue;
    lines.push(source.slice(0, at).split("\n").length);
  }
  return lines;
};

describe("fieldsWithoutNoAutofill", () => {
  it("finds a bare field, across lines and braces, and skips the exempt", () => {
    const source = [
      "// an <input> in a comment is prose",
      "const a = <input",
      "  onInput={(e) => n > 1}",
      "/>;",
      "const b = <input {...noAutofillAttrs()} value={v} />;",
      'const c = <input type="checkbox" checked={on} />;',
      "const d = <textarea rows={3} />;",
      "const e = <KobalteCombobox.Input id={id} />;",
      "const f = <KobalteSlider.Input />;",
      "const g = <KobalteNumberField.HiddenInput />;",
      "const h = <input {...noAutofillTextAttrs()} value={v} />;",
    ].join("\n");
    expect(fieldsWithoutNoAutofill(source)).toEqual([2, 7, 8]);
  });
});

describe("SUI source", () => {
  it("has no text-like <input> or <textarea> without noAutofillAttrs", () => {
    const offenders = walk("src")
      .filter((file) => file.endsWith(".tsx") && !/\.test\./.test(file))
      .flatMap((file) =>
        fieldsWithoutNoAutofill(readFileSync(file, "utf8")).map(
          (line) => `${file}:${line}`,
        ),
      );
    // To fix an entry: spread `{...noAutofillAttrs()}` on the field (see
    // ./noAutofill.ts), with the `autofill` opt-in if it can hold the user's
    // own details.
    expect(offenders).toEqual([]);
  });
});
