// @vitest-environment node
//
// Pure-function suite — no DOM needed. The default jsdom environment is
// currently broken in this repo (html-encoding-sniffer 6.0.0 + ESM-only
// @exodus/bytes 1.15.0 → ERR_REQUIRE_ESM at worker start). Pinning this
// file to node sidesteps the infra issue and matches the unit-only scope.
import { describe, it, expect } from "vitest";
import { computeBackspaceAction, type BackspaceState } from "./backspace";
import type { ComboboxOption } from "./Combobox";

// ============================================
// Multi-mode backspace highlight-then-delete (pure transition)
// ============================================
//
// We test the pure transition function — not the Solid component — so the
// suite stays insulated from jsdom/Kobalte portal quirks and the
// `html-encoding-sniffer` ESM-require issue currently affecting the
// integration-test infrastructure.
//
// Behavior under test (matches Gmail's to: field, GitHub's label picker):
//   1. Backspace on non-empty input            → passthrough (browser deletes a char)
//   2. Backspace on empty input, no chips      → passthrough (no-op)
//   3. Backspace on empty input, no highlight  → arm the LAST chip
//   4. Backspace on empty input, chip armed    → delete the armed chip
//
// Note: Escape and printable-key handling live in the live keydown
// handler (it just calls `setHighlightedChipValue(null)`). They are
// trivial direct mutations and don't go through `computeBackspaceAction`
// because they're not Backspace events. Covered by code review, not unit
// test, since there's no logic to exercise.

const A: ComboboxOption = { value: "a", label: "Apple" };
const B: ComboboxOption = { value: "b", label: "Banana" };
const C: ComboboxOption = { value: "c", label: "Cherry" };

const state = (overrides: Partial<BackspaceState>): BackspaceState => ({
  inputValue: "",
  selected: [],
  armedValue: null,
  ...overrides,
});

describe("computeBackspaceAction", () => {
  describe("non-empty input (rule 1)", () => {
    it("returns passthrough so the browser deletes a character", () => {
      const action = computeBackspaceAction(
        state({ inputValue: "abc", selected: [A, B], armedValue: null }),
      );
      expect(action).toEqual({ kind: "passthrough" });
    });

    it("returns passthrough even when a chip is armed (defensive)", () => {
      // If the input somehow has text while a chip is armed (unusual but
      // possible during fast typing), text-deletion still wins. The
      // armed flag is then cleared by the caller.
      const action = computeBackspaceAction(
        state({ inputValue: "x", selected: [A, B], armedValue: "b" }),
      );
      expect(action).toEqual({ kind: "passthrough" });
    });
  });

  describe("empty input, no chips (rule 2)", () => {
    it("returns passthrough", () => {
      const action = computeBackspaceAction(
        state({ inputValue: "", selected: [], armedValue: null }),
      );
      expect(action).toEqual({ kind: "passthrough" });
    });
  });

  describe("empty input, no chip armed (rule 3 — first backspace)", () => {
    it("arms the LAST chip", () => {
      const action = computeBackspaceAction(
        state({ inputValue: "", selected: [A, B], armedValue: null }),
      );
      expect(action).toEqual({ kind: "arm", value: "b" });
    });

    it("arms the only chip when there's just one", () => {
      const action = computeBackspaceAction(
        state({ inputValue: "", selected: [A], armedValue: null }),
      );
      expect(action).toEqual({ kind: "arm", value: "a" });
    });
  });

  describe("empty input, chip armed (rule 4 — second backspace deletes)", () => {
    it("deletes the armed chip and returns the next selection", () => {
      const action = computeBackspaceAction(
        state({ inputValue: "", selected: [A, B, C], armedValue: "c" }),
      );
      expect(action).toEqual({
        kind: "delete",
        value: "c",
        next: [A, B],
      });
    });

    it("deletes a non-tail armed chip too (e.g. armed=middle, edge case)", () => {
      // Defensive: if the user clicks-then-backspaces, or external code
      // arms a non-tail chip, the function still does the right thing.
      const action = computeBackspaceAction(
        state({ inputValue: "", selected: [A, B, C], armedValue: "b" }),
      );
      expect(action).toEqual({
        kind: "delete",
        value: "b",
        next: [A, C],
      });
    });

    it("yields an empty selection when removing the last chip", () => {
      const action = computeBackspaceAction(
        state({ inputValue: "", selected: [A], armedValue: "a" }),
      );
      expect(action).toEqual({ kind: "delete", value: "a", next: [] });
    });

    it("does NOT mutate the input array", () => {
      // Pure transition — input must be untouched.
      const selected = [A, B, C];
      computeBackspaceAction(
        state({ inputValue: "", selected, armedValue: "b" }),
      );
      expect(selected).toEqual([A, B, C]);
    });
  });

  describe("end-to-end sequence (arm → delete → re-arm)", () => {
    it("models the canonical user flow on a 3-chip selection", () => {
      // Step 1: empty input, nothing armed → arms last chip.
      const armC = computeBackspaceAction(
        state({ inputValue: "", selected: [A, B, C], armedValue: null }),
      );
      expect(armC).toEqual({ kind: "arm", value: "c" });

      // Step 2: empty input, "c" armed → deletes "c".
      const deleteC = computeBackspaceAction(
        state({ inputValue: "", selected: [A, B, C], armedValue: "c" }),
      );
      expect(deleteC).toEqual({ kind: "delete", value: "c", next: [A, B] });

      // Step 3: post-delete, no armed chip → arms the new last chip.
      const armB = computeBackspaceAction(
        state({ inputValue: "", selected: [A, B], armedValue: null }),
      );
      expect(armB).toEqual({ kind: "arm", value: "b" });
    });
  });
});
