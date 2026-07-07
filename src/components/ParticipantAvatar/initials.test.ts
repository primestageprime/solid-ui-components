import { describe, it, expect } from "vitest";
import { deriveInitials } from "./initials";

/** Convenience: derive and read one name's initials out of the map. */
const of = (names: string[], name: string): string =>
  deriveInitials(names).get(name)!;

describe("deriveInitials", () => {
  it("uses just the first initial when nothing collides", () => {
    const m = deriveInitials(["Peter Stradinger", "Ada Lovelace", "Grace Hopper"]);
    expect(m.get("Peter Stradinger")).toBe("P");
    expect(m.get("Ada Lovelace")).toBe("A");
    expect(m.get("Grace Hopper")).toBe("G");
  });

  it("a lone name is just its first initial", () => {
    expect(of(["Peter Stradinger"], "Peter Stradinger")).toBe("P");
    expect(of(["Madonna"], "Madonna")).toBe("M");
  });

  it("the Peter Stradinger / Peter Falk example — extends to word initials", () => {
    const m = deriveInitials(["Peter Stradinger", "Peter Falk"]);
    expect(m.get("Peter Stradinger")).toBe("PS");
    expect(m.get("Peter Falk")).toBe("PF");
  });

  it("extends symmetrically — never P vs PF, always PS vs PF", () => {
    const m = deriveInitials(["Peter Stradinger", "Peter Falk"]);
    // Both grow together to two chars; neither stays at the bare "P".
    expect(m.get("Peter Stradinger")).toHaveLength(2);
    expect(m.get("Peter Falk")).toHaveLength(2);
  });

  it("falls through to first-word letters when word initials still collide", () => {
    // Same last-word initial (F) AND same first initial (P): word initials are
    // both "PF", so it must reach into the first word — "Pe" vs "Pa".
    const m = deriveInitials(["Peter Falk", "Paula Falk"]);
    expect(m.get("Peter Falk")).toBe("Pe");
    expect(m.get("Paula Falk")).toBe("Pa");
  });

  it("resolves a three-way collision, each to its own display", () => {
    const m = deriveInitials(["Peter Stradinger", "Peter Falk", "Paula Falk"]);
    expect(m.get("Peter Stradinger")).toBe("PS");
    expect(m.get("Peter Falk")).toBe("Pe");
    expect(m.get("Paula Falk")).toBe("Pa");
  });

  it("does not drag a distinguishable name deeper just because a neighbour must", () => {
    // The showcase roster. Peter Falk is globally unique at "PF" and must NOT be
    // pulled to "Pe" (which the Stradinger/Strong pair own) merely because Paula
    // needs to reach "Pa". Use only as many letters as NECESSARY, per name.
    const m = deriveInitials([
      "Peter Stradinger",
      "Peter Falk",
      "Paula Falk",
      "Peter Strong",
      "Ada Lovelace",
      "Deep Agent",
    ]);
    expect(m.get("Peter Stradinger")).toBe("Pe"); // shares with Peter Strong
    expect(m.get("Peter Strong")).toBe("Pe"); // indistinguishable within the cap
    expect(m.get("Peter Falk")).toBe("PF"); // word initials suffice, and stay
    expect(m.get("Paula Falk")).toBe("Pa"); // word initials taken → first-word letters
    expect(m.get("Ada Lovelace")).toBe("A"); // unique first initial
    expect(m.get("Deep Agent")).toBe("D"); // unique first initial
    // Peter Falk is not merged with the Stradinger/Strong "Pe" bucket.
    expect(m.get("Peter Falk")).not.toBe(m.get("Peter Stradinger"));
  });

  it("distinguishes single-word names by their first two letters", () => {
    const m = deriveInitials(["Madonna", "Michael"]);
    expect(m.get("Madonna")).toBe("Ma");
    expect(m.get("Michael")).toBe("Mi");
  });

  it("caps at 2 chars — indistinguishable names share their longest common initials", () => {
    // "Peter Stradinger" and "Peter Strong": same first name, same last-word
    // initial. No 2-char display can separate them, so they SHARE "Pe" and the
    // caller's title carries the full name.
    const m = deriveInitials(["Peter Stradinger", "Peter Strong"]);
    expect(m.get("Peter Stradinger")).toBe("Pe");
    expect(m.get("Peter Strong")).toBe("Pe");
    expect(m.get("Peter Stradinger")).toBe(m.get("Peter Strong"));
  });

  it("keeps distinguishable pairs apart even when other pairs share (cap)", () => {
    // Smith/Snow are indistinguishable within 2 chars, but Aaron vs Abby are
    // not — the shared last name must NOT collapse the distinguishable first.
    const m = deriveInitials([
      "Aaron Smith",
      "Aaron Snow",
      "Abby Smith",
      "Abby Snow",
    ]);
    expect(m.get("Aaron Smith")).toBe("Aa");
    expect(m.get("Aaron Snow")).toBe("Aa");
    expect(m.get("Abby Smith")).toBe("Ab");
    expect(m.get("Abby Snow")).toBe("Ab");
    expect(m.get("Aaron Smith")).not.toBe(m.get("Abby Smith"));
  });

  it("gives identical full names identical initials", () => {
    const m = deriveInitials(["Peter Falk", "Peter Falk", "Paula Falk"]);
    // Duplicate collapses to one key; it does NOT count as a collision.
    expect(m.size).toBe(2);
    expect(m.get("Peter Falk")).toBe("Pe");
    expect(m.get("Paula Falk")).toBe("Pa");
  });

  it("is order-independent — same set, same result", () => {
    const roster = ["Peter Stradinger", "Peter Falk", "Paula Falk", "Ada Lovelace"];
    const forward = deriveInitials(roster);
    const reversed = deriveInitials([...roster].reverse());
    for (const name of roster) {
      expect(reversed.get(name)).toBe(forward.get(name));
    }
  });

  it("uppercases word initials but keeps intra-word letters natural", () => {
    // Word initials are upper (PF); the fallback extra letter is lower (Pe/Pa).
    const m = deriveInitials(["Peter Falk", "Paula Falk"]);
    expect(m.get("Peter Falk")).toBe("Pe");
    const w = deriveInitials(["Peter Stradinger", "Peter Falk"]);
    expect(w.get("Peter Falk")).toBe("PF");
  });

  it("is unicode-aware — uses the first code point of a word", () => {
    const m = deriveInitials(["Ólafur Arnalds", "Ada Lovelace"]);
    expect(m.get("Ólafur Arnalds")).toBe("Ó");
    // Two Ó names collide and extend by word initial.
    const n = deriveInitials(["Ólafur Arnalds", "Ólafur Björnsson"]);
    expect(n.get("Ólafur Arnalds")).toBe("ÓA");
    expect(n.get("Ólafur Björnsson")).toBe("ÓB");
  });

  it("handles empty / whitespace names without throwing", () => {
    const m = deriveInitials(["", "   "]);
    // Both normalise to the same empty roster; one distinct "" then "   ".
    expect(m.get("")).toBe("?");
  });
});
