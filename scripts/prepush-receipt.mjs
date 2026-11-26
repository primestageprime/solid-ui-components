// ============================================
// Pre-push pass receipt — skip a push tier that already passed
// ============================================
//
// `gate.mjs --pre-push` runs lint, typecheck, the affected tests and the
// catalog check on every push. Pushing the same commit again (a retry after a
// network error, a second remote, a push after an auto-commit) ran all of it
// again. Adlai, 2026-11-26: "Skip re-running the full check when it just
// passed on the same commit."
//
// gate.mjs records each commit whose push tier passed on a clean tree, in the
// shared git dir (`sui-prepush-passes`, one sha per line, newest last). A push
// is COVERED, and the tier skipped, when every commit it sends is the checked
// out commit and either:
//   - that commit passed before, or
//   - its parent passed and the commit changes only `catalog.json` — the
//     commit the pre-push catalog step makes itself when it regenerates a
//     stale catalog, so "push again" does not run the tier twice. gate.mjs
//     still runs the cheap catalog check on this path, because a hand-made
//     catalog-only commit can itself be stale.
// A push that sends nothing (every ref already up to date) is covered too.
// Anything else runs the tier as before. A dirty tree is never covered and
// never recorded: the gate checks the working tree, not the commit.
//
// Pure: gate.mjs does the git calls and the file I/O.

const ZERO = /^0+$/;

/** The local commits a push sends, from git's pre-push stdin (deletes left out). */
export function pushedShas(stdinText) {
  return stdinText
    .split("\n")
    .map((line) => line.trim().split(/\s+/))
    .filter((f) => f.length === 4 && !ZERO.test(f[1]))
    .map((f) => f[1]);
}

/** The commits that passed, from the receipt file's text. */
export function passesOf(fileText) {
  return new Set(
    fileText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

/** Whether a push is covered by an earlier pass (see the header). */
export function covered({ shas, head, parent, changed, passed, clean }) {
  if (!clean) return false;
  // Nothing to send (every ref already up to date): git gives the hook no lines.
  if (shas.length === 0) return true;
  if (shas.some((s) => s !== head)) return false;
  if (passed.has(head)) return true;
  return (
    parent !== null &&
    passed.has(parent) &&
    changed.length === 1 &&
    changed[0] === "catalog.json"
  );
}

/** The receipt file's text with `sha` recorded, newest last, at most `cap` lines. */
export function recordPass(fileText, sha, cap = 50) {
  const kept = [...passesOf(fileText)].filter((s) => s !== sha);
  return `${[...kept, sha].slice(-cap).join("\n")}\n`;
}
