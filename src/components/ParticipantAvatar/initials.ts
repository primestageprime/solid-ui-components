// ============================================
// deriveInitials — pure helper for the ParticipantAvatar family (Depth 0: no
// component, no CSS, no JSX). Companion to AssigneeIcon / ParticipantAvatar:
// both render up-to-2-char initials, and this is the one place that decides
// WHICH characters, so a roster shows consistent, minimally-distinguishing
// initials instead of a wall of identical "P"s.
//
// Rule (the display contract):
//   * Default: the first letter of the first word, uppercased ("Peter …" → "P").
//   * Collision: when two DIFFERENT names would show the same initials, both
//     extend together to the first ladder rung where they diverge — preferring
//     WORD initials over intra-word letters:
//       "Peter Stradinger" vs "Peter Falk"  → "PS" vs "PF"   (word initials)
//       "Peter Falk"       vs "Paula Falk"  → "Pe" vs "Pa"   (first-word letters,
//                                                             conceptually PeF/PaF
//                                                             but capped at 2)
//   * Cap: AssigneeIcon fits two characters, so initials never exceed 2. When
//     two names cannot be told apart within 2 chars (e.g. "Peter Falk" vs
//     "Peter Frank"), they SHARE their longest common initials ("Pe") and are
//     distinguished by the caller's title/tooltip carrying the full name.
//   * Identical full names get identical initials (they're the same key — telling
//     two real people with the same name apart is the caller's job, not ours).
//
// Deterministic and order-independent: the result is a function of the SET of
// names, so the same roster yields the same initials regardless of array order.
// Unicode-sane: words are split on whitespace and the first CODE POINT of a word
// is used, so non-ASCII names ("Ólafur", "Łukasz") behave.
// ============================================

/** First code point of `s`, or "" when empty. Code-point aware (not `s[0]`). */
const firstCodePoint = (s: string): string => {
  for (const cp of s) return cp;
  return "";
};

const codePoints = (s: string): string[] => Array.from(s);

/**
 * The ordered candidate ladder for a single name, most-preferred (shortest,
 * least-specific) first, every rung capped at 2 chars:
 *   [0] first initial            "P"
 *   [1] word initials  (2 words) "PS"   — preferred disambiguator
 *   [2] first-word letters       "Pe"   — fallback when word initials still clash
 * Rungs that don't apply (single word, single-letter word) are omitted, and
 * duplicate rungs are collapsed, so every name has at least one rung.
 */
const candidateLadder = (name: string): string[] => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return ["?"];

  const firstWord = codePoints(words[0]);
  const first = firstWord[0].toUpperCase();
  const ladder: string[] = [first];

  // Prefer WORD initials: first letter of the first + second words, both upper.
  if (words.length >= 2) {
    ladder.push(first + firstCodePoint(words[1]).toUpperCase());
  }
  // Then intra-word letters: first two letters of the first word. The extra
  // letter keeps its natural (lower) case, matching "Pe"/"Pa" in the contract.
  if (firstWord.length >= 2) {
    ladder.push(first + firstWord[1].toLowerCase());
  }

  return ladder.filter((rung, i) => ladder.indexOf(rung) === i);
};

/**
 * Derive display initials for a roster of names, honouring the collision rule
 * and the 2-char cap documented above.
 *
 * @param names  Any list of full names; duplicates and order don't matter.
 * @returns      A Map from each DISTINCT input name to its display initials.
 *               Look up each row's name to render consistent initials.
 */
export function deriveInitials(names: string[]): Map<string, string> {
  const distinct = Array.from(new Set(names));
  const ladders = new Map(distinct.map((n) => [n, candidateLadder(n)]));
  const idx = new Map(distinct.map((n) => [n, 0]));

  const rung = (name: string, k: number): string => {
    const l = ladders.get(name)!;
    return l[Math.min(k, l.length - 1)];
  };
  const display = (name: string): string => rung(name, idx.get(name)!);

  const groupByDisplay = (): Map<string, string[]> => {
    const groups = new Map<string, string[]>();
    for (const n of distinct) {
      const d = display(n);
      const bucket = groups.get(d);
      if (bucket) bucket.push(n);
      else groups.set(d, [n]);
    }
    return groups;
  };

  // Symmetric escalation: a colliding group jumps TOGETHER to the first ladder
  // rung where its members diverge, so twins extend in lock-step (PS/PF, never
  // P/PF). Groups that never diverge are left for the cap handling below.
  for (;;) {
    let progressed = false;
    for (const members of groupByDisplay().values()) {
      if (members.length < 2) continue;

      const startK = Math.min(...members.map((n) => idx.get(n)!));
      const maxLen = Math.max(...members.map((n) => ladders.get(n)!.length));
      let targetK = -1;
      for (let k = startK; k < maxLen; k++) {
        if (new Set(members.map((n) => rung(n, k))).size > 1) {
          targetK = k;
          break;
        }
      }
      if (targetK < 0) continue; // indistinguishable within the cap

      for (const n of members) {
        const nk = Math.min(targetK, ladders.get(n)!.length - 1);
        if (nk > idx.get(n)!) {
          idx.set(n, nk);
          progressed = true;
        }
      }
    }
    if (!progressed) break;
  }

  // Assemble. Any group still sharing a display is indistinguishable within the
  // cap: give its members their LONGEST common initials (the deepest ladder rung
  // they all agree on) so the shared display is as informative as it can be.
  const result = new Map<string, string>();
  for (const members of groupByDisplay().values()) {
    if (members.length === 1) {
      result.set(members[0], display(members[0]));
      continue;
    }
    const maxLen = Math.max(...members.map((n) => ladders.get(n)!.length));
    let commonK = 0;
    for (let k = 1; k < maxLen; k++) {
      if (new Set(members.map((n) => rung(n, k))).size > 1) break;
      commonK = k;
    }
    for (const n of members) result.set(n, rung(n, commonK));
  }
  return result;
}
