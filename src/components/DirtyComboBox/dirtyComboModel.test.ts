/**
 * DirtyComboBox — the model's claims, asserted without a browser.
 *
 * Pristine shows nothing, dirty shows save AND reset, the selected row is
 * never deletable, and the width is the LONGEST label (capped at 30) — not
 * the selected one, so the combo does not jump. The transitions walk Peter's
 * click path: edit → dirty → save → pristine; edit → reset → pristine;
 * switch; delete.
 */
import { describe, expect, it } from "vitest";
import {
  DIRTY_COMBO_MAX_WIDTH_CH,
  DIRTY_COMBO_MIN_WIDTH_CH,
  dirtyComboModel,
  dirtyComboEqual,
  dirtyComboRemove,
  dirtyComboReset,
  dirtyComboSave,
  dirtyComboSelect,
  dirtyComboViewOf,
  dirtyComboWidthCh,
} from "./dirtyComboModel";
import { LONG_NAME, PAYROLL_STORE } from "./dirtyComboFixtures";

const items = [
  { id: "a", label: "Alpha" },
  { id: "b", label: "Bravo Charlie" },
];

describe("dirtyComboModel", () => {
  it("is pristine when the draft equals the saved config", () => {
    const view = dirtyComboModel(items, "a", { x: 1 }, { x: 1 });
    expect(view).toMatchObject({
      dirty: false,
      canSave: false,
      canReset: false,
    });
  });

  it("is dirty — save AND reset — when any field differs", () => {
    const view = dirtyComboModel(items, "a", { x: 2 }, { x: 1 });
    expect(view).toMatchObject({ dirty: true, canSave: true, canReset: true });
  });

  it("never offers the selected row for deletion", () => {
    expect(dirtyComboModel(items, "a", 0, 0).deletableIds).toEqual(["b"]);
    expect(dirtyComboModel(items, "b", 0, 0).deletableIds).toEqual(["a"]);
  });

  it("sizes to the LONGEST label whichever row is selected", () => {
    const a = dirtyComboModel(items, "a", 0, 0);
    const b = dirtyComboModel(items, "b", 0, 0);
    expect(a.widthCh).toBe("Bravo Charlie".length);
    expect(b.widthCh).toBe(a.widthCh);
    expect(a.selectedLabel).toBe("Alpha");
  });

  it("honours a caller's equals", () => {
    const roughly = (p: number, q: number) => Math.abs(p - q) < 1;
    expect(dirtyComboModel(items, "a", 1.2, 1, roughly).dirty).toBe(false);
  });
});

describe("dirtyComboWidthCh", () => {
  it("caps at 30 and floors at the minimum", () => {
    expect(dirtyComboWidthCh([{ id: "l", label: LONG_NAME }])).toBe(
      DIRTY_COMBO_MAX_WIDTH_CH,
    );
    expect(dirtyComboWidthCh([{ id: "s", label: "A" }])).toBe(
      DIRTY_COMBO_MIN_WIDTH_CH,
    );
    expect(dirtyComboWidthCh([])).toBe(DIRTY_COMBO_MIN_WIDTH_CH);
  });
});

describe("dirtyComboEqual", () => {
  it("compares plain data structurally", () => {
    expect(dirtyComboEqual({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] })).toBe(
      true,
    );
    expect(dirtyComboEqual({ a: 1 }, { a: 1, b: undefined })).toBe(false);
    expect(dirtyComboEqual([1], { 0: 1 })).toBe(false);
    expect(dirtyComboEqual(null, {})).toBe(false);
  });
});

describe("the bench store — Peter's click path", () => {
  const edit = (engineer: number) => ({
    ...PAYROLL_STORE,
    draft: { ...PAYROLL_STORE.draft, engineer },
  });

  it("opens pristine, with the long name setting the width", () => {
    const view = dirtyComboViewOf(PAYROLL_STORE);
    expect(view.dirty).toBe(false);
    expect(view.widthCh).toBe(DIRTY_COMBO_MAX_WIDTH_CH);
    expect(view.deletableIds).not.toContain("s1");
  });

  it("edit → dirty → save → pristine, and the saved config moved", () => {
    const dirty = edit(155000);
    expect(dirtyComboViewOf(dirty).dirty).toBe(true);
    const saved = dirtyComboSave(dirty);
    expect(dirtyComboViewOf(saved).dirty).toBe(false);
    expect(saved.items[0]?.saved.engineer).toBe(155000);
    expect(saved.items[1]).toBe(PAYROLL_STORE.items[1]);
  });

  it("edit → reset → pristine, and the saved config did not move", () => {
    const reset = dirtyComboReset(edit(155000));
    expect(dirtyComboViewOf(reset).dirty).toBe(false);
    expect(reset.draft).toEqual(PAYROLL_STORE.items[0]?.saved);
  });

  it("switching loads the other item's saved config (discarding the edit)", () => {
    const switched = dirtyComboSelect(edit(155000), "s3");
    expect(switched.selectedId).toBe("s3");
    expect(switched.draft).toEqual(PAYROLL_STORE.items[2]?.saved);
    expect(dirtyComboViewOf(switched).dirty).toBe(false);
    expect(dirtyComboSelect(PAYROLL_STORE, "nope")).toBe(PAYROLL_STORE);
  });

  it("deletes a non-selected row and refuses the selected one", () => {
    expect(dirtyComboRemove(PAYROLL_STORE, "s2").items).toHaveLength(
      PAYROLL_STORE.items.length - 1,
    );
    expect(dirtyComboRemove(PAYROLL_STORE, "s1")).toBe(PAYROLL_STORE);
  });
});
