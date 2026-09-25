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
  DIRTY_COMBO_NONE_ID,
  type DirtyComboStore,
  dirtyComboCreate,
  dirtyComboModel,
  dirtyComboRename,
  dirtyComboUniqueLabel,
  dirtyComboEqual,
  dirtyComboRemove,
  dirtyComboReset,
  dirtyComboSave,
  dirtyComboSelect,
  dirtyComboViewOf,
  dirtyComboWidthCh,
} from "./dirtyComboModel";
import { LONG_NAME, PAYROLL_STORE } from "./dirtyComboFixtures";
import { join, map } from "../../fn";

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

// ── new / rename / none / disabled — printed as one table per click path ──

type Cfg = { x: number };

const PARITY_STORE: DirtyComboStore<Cfg> = {
  items: [
    { id: "a", label: "Alpha", saved: { x: 1 } },
    { id: "b", label: "Bravo", saved: { x: 2 } },
    {
      id: "c",
      label: "Charlie",
      saved: { x: 3 },
      disabled: true,
      reason: "Built on another baseline",
    },
  ],
  selectedId: "a",
  draft: { x: 1 },
};

const pad = (text: string, width: number): string => text.padEnd(width);

/** One row per step: what the control would draw after it. */
const printPath = (
  steps: ReadonlyArray<readonly [string, DirtyComboStore<Cfg>]>,
): string => {
  const row = ([step, store]: readonly [string, DirtyComboStore<Cfg>]) => {
    const view = dirtyComboViewOf(store);
    return join("  ", [
      pad(step, 16),
      pad(store.selectedId === DIRTY_COMBO_NONE_ID ? "NONE" : store.selectedId, 5),
      pad(view.selectedLabel || "-", 13),
      pad(String(store.draft.x), 5),
      pad(view.dirty ? "dirty" : "clean", 5),
      pad(view.canRename ? "yes" : "no", 6),
      join(" ", map((item) => `${item.label}=${item.saved.x}`, store.items)),
    ]);
  };
  const header = join("  ", [
    pad("step", 16),
    pad("sel", 5),
    pad("label", 13),
    pad("draft", 5),
    pad("state", 5),
    pad("rename", 6),
    "items (label=saved)",
  ]);
  return join("\n", [header, ...map(row, steps)]);
};

const edit = (store: DirtyComboStore<Cfg>, x: number): DirtyComboStore<Cfg> => ({
  ...store,
  draft: { x },
});

describe("new / rename / none / disabled", () => {
  it("[+] while pristine, then name it", () => {
    const s0 = PARITY_STORE;
    const s1 = dirtyComboCreate(s0, {
      id: "n1",
      label: dirtyComboUniqueLabel(s0.items, "New scenario"),
    });
    const s2 = dirtyComboRename(s1, "  Lean 2027  ");
    expect(printPath([
      ["start", s0],
      ["+ (create)", s1],
      ["Enter 'Lean…'", s2],
    ])).toMatchInlineSnapshot(`
      "step              sel    label          draft  state  rename  items (label=saved)
      start             a      Alpha          1      clean  yes     Alpha=1 Bravo=2 Charlie=3
      + (create)        n1     New scenario   1      clean  yes     Alpha=1 Bravo=2 Charlie=3 New scenario=1
      Enter 'Lean…'     n1     Lean 2027      1      clean  yes     Alpha=1 Bravo=2 Charlie=3 Lean 2027=1"
    `);
  });

  it("[+] while dirty keeps the edit and leaves the old row saved", () => {
    const s1 = edit(PARITY_STORE, 9);
    const s2 = dirtyComboCreate(s1, { id: "n1", label: "Fork" });
    expect(printPath([
      ["edit x=9", s1],
      ["+ (create)", s2],
    ])).toMatchInlineSnapshot(`
      "step              sel    label          draft  state  rename  items (label=saved)
      edit x=9          a      Alpha          9      dirty  yes     Alpha=1 Bravo=2 Charlie=3
      + (create)        n1     Fork           9      clean  yes     Alpha=1 Bravo=2 Charlie=3 Fork=9"
    `);
  });

  it("[+] can start from a caller's config instead of the draft", () => {
    const s = dirtyComboCreate(edit(PARITY_STORE, 9), {
      id: "n1",
      label: "From baseline",
      config: { x: 0 },
    });
    expect(s.draft).toEqual({ x: 0 });
    expect(dirtyComboViewOf(s).dirty).toBe(false);
  });

  it("refuses a duplicate id, an empty name, and a rename under None", () => {
    expect(dirtyComboCreate(PARITY_STORE, { id: "b", label: "B2" })).toBe(
      PARITY_STORE,
    );
    expect(dirtyComboRename(PARITY_STORE, "   ")).toBe(PARITY_STORE);
    const none = dirtyComboSelect(PARITY_STORE, DIRTY_COMBO_NONE_ID);
    expect(dirtyComboRename(none, "X")).toBe(none);
  });

  it("renaming never dirties", () => {
    const s = dirtyComboRename(PARITY_STORE, "Alpha prime");
    expect(dirtyComboViewOf(s).dirty).toBe(false);
    expect(dirtyComboViewOf(s).selectedLabel).toBe("Alpha prime");
  });

  it("None compares nothing: never dirty, nothing to rename, all rows deletable", () => {
    const s1 = edit(PARITY_STORE, 9);
    const s2 = dirtyComboSelect(s1, DIRTY_COMBO_NONE_ID);
    const s3 = dirtyComboSelect(s2, "b");
    expect(printPath([
      ["edit x=9", s1],
      ["pick None", s2],
      ["pick Bravo", s3],
    ])).toMatchInlineSnapshot(`
      "step              sel    label          draft  state  rename  items (label=saved)
      edit x=9          a      Alpha          9      dirty  yes     Alpha=1 Bravo=2 Charlie=3
      pick None         NONE   -              9      clean  no      Alpha=1 Bravo=2 Charlie=3
      pick Bravo        b      Bravo          2      clean  yes     Alpha=1 Bravo=2 Charlie=3"
    `);
    const view = dirtyComboViewOf(s2);
    expect(view.none).toBe(true);
    expect(view.canSave || view.canReset).toBe(false);
    expect(view.deletableIds).toEqual(["a", "b", "c"]);
  });

  it("a disabled row cannot be selected, but can be deleted", () => {
    expect(dirtyComboSelect(PARITY_STORE, "c")).toBe(PARITY_STORE);
    expect(dirtyComboViewOf(PARITY_STORE).deletableIds).toContain("c");
    expect(dirtyComboRemove(PARITY_STORE, "c").items).toHaveLength(2);
  });

  it("the unique label counts past every taken name", () => {
    const taken = [
      { id: "1", label: "New scenario" },
      { id: "2", label: "New scenario 2" },
    ];
    expect(dirtyComboUniqueLabel([], "New scenario")).toBe("New scenario");
    expect(dirtyComboUniqueLabel(taken, "New scenario")).toBe("New scenario 3");
  });
});
