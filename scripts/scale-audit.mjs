// ============================================
// Documented prop scales vs. declared types
//
// COMPONENTS.md documents string-union props inline:
//
//     - **Modal** — … `size` (`sm`|`md`|`lg`|`xl`) …
//
// Nothing keeps that in step with the type. Drift is invisible — it breaks no
// build and fails no test — and it goes both directions. A doc that promises a
// value the type rejects sends a consumer to a TS2322; a doc that omits a real
// value hides shipped surface area. A 2026-07-31 sweep found five of these,
// including one prop whose doc had been wrong since the value was removed.
//
//   node scripts/scale-audit.mjs            # report
//   node scripts/scale-audit.mjs --check    # exit 1 on any overclaim
//
// NOT wired into health.mjs, deliberately. Every other ratchet counts something
// with an objective definition; this one needs a human. `Text.as` is documented
// `span|p|pre|h1..h4|div` — the `..` range is a perfectly good doc convention
// that no parser should be asked to adjudicate, and props whose union sits
// behind a re-exported or generic type resolve to nothing at all. Those land in
// UNRESOLVED for someone to eyeball, which is not a thing CI can do.
//
// RESOLUTION IS STRICT ON PURPOSE. The first version of this fell back to
// searching every source file for the prop name when it wasn't found on the
// component, and reported 19 mismatches with total confidence — `variant`
// resolved to Button's, `size` to AssigneeChips'. All 19 were false. A prop is
// now only ever resolved against its own component's `<Name>Props` body (plus
// one level of `type Alias = "a" | "b"`), and anything else is reported as
// unresolved rather than guessed at.
// ============================================
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const CHECK = process.argv.includes("--check");

const sourceFiles = [];
const walk = (dir) => {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.tsx?$/.test(p) && !/\.test\.tsx?$/.test(p)) sourceFiles.push(p);
  }
};
walk(join(root, "src"));
const fileText = new Map(sourceFiles.map((f) => [f, readFileSync(f, "utf8")]));

/** Body of `interface X {…}` / `type X = {…}`, brace-balanced. */
const interfaceBody = (text, name) => {
  const head = text.match(
    new RegExp(
      `(?:interface\\s+${name}\\b[^{]*|type\\s+${name}\\s*=\\s*[^{;]*)\\{`,
      "m",
    ),
  );
  if (!head) return null;
  const start = head.index + head[0].length;
  let i = start;
  let depth = 1;
  while (i < text.length && depth > 0) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") depth--;
    i++;
  }
  return text.slice(start, i - 1);
};

/** `type Alias = "a" | "b"` anywhere in src. Members may carry `// comments`. */
const aliasUnion = (name) => {
  const re = new RegExp(
    `type\\s+${name}\\s*=\\s*((?:\\s*\\|?\\s*"[^"]*"\\s*(?://[^\\n]*)?)+);`,
    "m",
  );
  for (const f of sourceFiles) {
    const m = fileText.get(f).match(re);
    if (m) {
      const members = [...m[1].matchAll(/"([^"]*)"/g)].map((x) => x[1]);
      if (members.length >= 2) return members;
    }
  }
  return null;
};

/** Union members of `prop?: …` — inline, or one level of named alias. */
const unionInBody = (body, prop) => {
  const inline = body.match(
    new RegExp(
      `(?:^|[\\s{;])${prop}\\??\\s*:\\s*((?:"[^"]*"|\\s|\\|)+)[;\\n]`,
      "m",
    ),
  );
  if (inline) {
    const members = [...inline[1].matchAll(/"([^"]*)"/g)].map((x) => x[1]);
    if (members.length >= 2) return members;
  }
  const named = body.match(
    new RegExp(`(?:^|[\\s{;])${prop}\\??\\s*:\\s*([A-Z][A-Za-z0-9]*)\\s*;`, "m"),
  );
  return named ? aliasUnion(named[1]) : null;
};

/** The component's own `<Name>Props` body, its own folder searched first. */
const propsBody = (component) => {
  const ownFirst = [
    ...sourceFiles.filter((f) => f.includes(`/${component}/`)),
    ...sourceFiles,
  ];
  for (const f of ownFirst) {
    const body = interfaceBody(fileText.get(f), `${component}Props`);
    if (body) return { body, file: f.replace(`${root}/`, "") };
  }
  return null;
};

// A documented scale: `prop` (`a`|`b`|…) with at least two members, so plain
// annotations like `foo` (boolean) are ignored.
const DOC_SCALE =
  /`([a-zA-Z][a-zA-Z0-9]*)`\s*\((`[a-z0-9-]+`(?:\s*\|\s*`[a-z0-9-]+`)+)/g;

const overclaims = [];
const underclaims = [];
const unresolved = [];

readFileSync(join(root, "COMPONENTS.md"), "utf8")
  .split("\n")
  .forEach((line, i) => {
    const named = line.match(/^-\s+\*\*`?([A-Za-z][A-Za-z0-9]*)`?\*\*/);
    if (!named) return;
    const component = named[1];
    const props = propsBody(component);

    for (const m of line.matchAll(DOC_SCALE)) {
      const prop = m[1];
      const documented = [...m[2].matchAll(/`([^`]+)`/g)].map((x) => x[1]);
      const declared = props ? unionInBody(props.body, prop) : null;
      const at = { component, prop, documented, declared, line: i + 1, file: props?.file };

      if (!declared) {
        unresolved.push(at);
        continue;
      }
      const extra = documented.filter((v) => !declared.includes(v));
      const missing = declared.filter((v) => !documented.includes(v));
      if (extra.length) overclaims.push({ ...at, extra });
      else if (missing.length) underclaims.push({ ...at, missing });
    }
  });

const report = (title, rows, detail) => {
  console.log(`\n${"=".repeat(72)}\n${title} (${rows.length})\n${"=".repeat(72)}`);
  for (const r of rows) {
    console.log(`\n${r.component}.${r.prop}   COMPONENTS.md:${r.line}`);
    console.log(`  documented: ${r.documented.join(" | ")}`);
    if (r.declared) console.log(`  declared:   ${r.declared.join(" | ")}   [${r.file}]`);
    if (detail(r)) console.log(`  ${detail(r)}`);
  }
};

report(
  "OVERCLAIMS — doc promises a value the type rejects",
  overclaims,
  (r) => `>> NOT IN THE TYPE: ${r.extra.join(", ")}`,
);
report(
  "UNDERCLAIMS — type accepts more than the doc lists",
  underclaims,
  (r) => `>> doc omits: ${r.missing.join(", ")}  (may be intentional shorthand, e.g. \`h1\`..\`h4\`)`,
);
report(
  "UNRESOLVED — no union found on the component's own Props; check by hand",
  unresolved,
  () => "",
);

console.log(
  `\n${overclaims.length} overclaim(s), ${underclaims.length} underclaim(s), ${unresolved.length} unresolved.`,
);
if (CHECK && overclaims.length) process.exit(1);
