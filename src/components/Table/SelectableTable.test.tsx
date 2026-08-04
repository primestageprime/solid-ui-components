// ============================================
// SelectableTable — the selection rules, which are the component.
//
// 295 lines, seven reactive primitives and six handlers, and no test ever
// mounted it: it was the highest-logic-density entry in the
// `componentsNeverRendered` backlog (dside sui#12541). Everything asserted here
// is a decision a consumer depends on and could not have read off the type
// signature.
//
// TWO RULES ARE DELIBERATELY NARROW, and are pinned as-is rather than as they
// "should" be, because changing either is a behaviour change to a public
// component and belongs in its own decision:
//
//   1. Shift-click only ADDS a range. It never clears one, so a shift-click
//      across selected rows is a no-op rather than a deselect. (Many pickers
//      mirror the anchor's new state instead.)
//   2. `toggleAll` and the indeterminate state consider only the CURRENTLY
//      RENDERED rows. Selecting rows, filtering them out of `data`, then
//      pressing select-all leaves the off-screen ids selected. That is the
//      right call for a filtered table — a filter must not silently drop a
//      selection — and it is why `toggleAll` deletes ids one by one instead of
//      assigning a fresh Set.
//
// Selection is driven through the LABEL's mousedown, not the checkbox's
// change: the component calls `preventDefault()` there so it can read
// `shiftKey` and own the toggle itself, leaving `onChange` an empty function.
// A test that fired `change` on the input would assert nothing and pass.
// ============================================
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, fireEvent } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { SelectableTable } from "./SelectableTable";
import type { SelectionAction, TableColumn } from "./types";

afterEach(cleanup);

interface Row {
  id: string;
  name: string;
}

const ROWS: Row[] = [
  { id: "a", name: "Alpha" },
  { id: "b", name: "Bravo" },
  { id: "c", name: "Charlie" },
  { id: "d", name: "Delta" },
];

const COLUMNS: TableColumn<Row>[] = [
  { id: "name", header: "Name", accessor: "name" },
];

interface MountOptions {
  data?: Row[];
  initial?: string[];
  selectionActions?: SelectionAction<Row>[];
  onRowClick?: (row: Row, index: number) => void;
  resultCount?: { shown: number; total: number };
  maxHeight?: string;
  emptyMessage?: string;
  stickyHeader?: boolean;
  striped?: boolean;
  hoverable?: boolean;
  compact?: boolean;
}

const mount = (options: MountOptions = {}) => {
  const [selected, setSelected] = createSignal(new Set(options.initial ?? []));
  const { container } = render(() => (
    <SelectableTable
      data={options.data ?? ROWS}
      columns={COLUMNS}
      getRowId={(row) => row.id}
      selectionStore={{ selected, setSelected }}
      selectionActions={options.selectionActions}
      onRowClick={options.onRowClick}
      resultCount={options.resultCount}
      maxHeight={options.maxHeight}
      emptyMessage={options.emptyMessage}
      stickyHeader={options.stickyHeader}
      striped={options.striped}
      hoverable={options.hoverable}
      compact={options.compact}
    />
  ));

  const bodyRows = () =>
    Array.from(container.querySelectorAll("tbody .hud-table__row"));
  /** The label, not the input — see the header. */
  const rowToggle = (index: number) =>
    bodyRows()[index].querySelector(".hud-table__checkbox") as HTMLElement;
  const headerBox = () =>
    container.querySelector("thead input[type=checkbox]") as HTMLInputElement;
  /** The frame that carries every `hud-table--*` modifier. */
  const frame = () => container.querySelector(".hud-table") as HTMLElement;

  return {
    container,
    selected,
    ids: () => [...selected()].sort(),
    bodyRows,
    rowToggle,
    headerBox,
    frame,
    modifiers: () =>
      [...frame().classList].filter((c) => c.startsWith("hud-table--")).sort(),
    /** Click row `index`'s checkbox, optionally with shift held. */
    toggle: (index: number, shiftKey = false) =>
      fireEvent.mouseDown(rowToggle(index), { shiftKey }),
  };
};

describe("SelectableTable — single toggle", () => {
  it("selects a row on mousedown of its checkbox label", () => {
    const t = mount();
    t.toggle(1);
    expect(t.ids()).toEqual(["b"]);
  });

  it("deselects a row already selected", () => {
    const t = mount({ initial: ["b"] });
    t.toggle(1);
    expect(t.ids()).toEqual([]);
  });

  it("marks the selected row so it can be styled", () => {
    const t = mount({ initial: ["c"] });
    expect(t.bodyRows()[2].className).toMatch(/hud-table__row--selected/);
    expect(t.bodyRows()[0].className).not.toMatch(/hud-table__row--selected/);
  });

  it("checks the input of a selected row", () => {
    const t = mount({ initial: ["a"] });
    const box = t.bodyRows()[0].querySelector("input") as HTMLInputElement;
    expect(box.checked).toBe(true);
  });

  it("starts from whatever the store already holds", () => {
    // The store is the consumer's — it may be persistent, so the table must
    // render an existing selection rather than assuming it starts empty.
    expect(mount({ initial: ["a", "d"] }).ids()).toEqual(["a", "d"]);
  });
});

describe("SelectableTable — shift-click range", () => {
  it("selects everything between the anchor and the shift-clicked row", () => {
    const t = mount();
    t.toggle(0);
    t.toggle(2, true);
    expect(t.ids()).toEqual(["a", "b", "c"]);
  });

  it("works upwards as well as downwards", () => {
    const t = mount();
    t.toggle(3);
    t.toggle(1, true);
    expect(t.ids()).toEqual(["b", "c", "d"]);
  });

  it("only ADDS — a shift range across selected rows never clears them", () => {
    // Pinned as the current contract, not endorsed as the only sane one. A
    // picker that mirrored the anchor would deselect here instead.
    const t = mount({ initial: ["a", "b", "c"] });
    t.toggle(0); // anchor at 0, and this deselects "a"
    t.toggle(2, true);
    expect(t.ids()).toEqual(["a", "b", "c"]);
  });

  it("re-anchors on every plain click, so the next range starts from there", () => {
    // Needs a fifth row: with four, the two candidate ranges below cover the
    // same rows and the assertion would hold either way.
    //
    // (The anchor moving on a SHIFT-click is not observable at all — after a
    // range A..B every row between them is selected, so a following range from
    // B and one from A differ only in rows that are already in. Nothing here
    // pins it, deliberately: a test that cannot fail is worse than none.)
    const data = [...ROWS, { id: "e", name: "Echo" }];
    const t = mount({ data });
    t.toggle(0);
    t.toggle(1, true); // {a, b}
    t.toggle(4); // plain click — anchor moves to 4
    t.toggle(3, true); // range 3..4, NOT 1..4
    expect(t.ids()).toEqual(["a", "b", "d", "e"]); // "c" is the difference
  });

  it("falls back to a plain toggle when shift is held with no anchor yet", () => {
    const t = mount();
    t.toggle(2, true);
    expect(t.ids()).toEqual(["c"]);
  });

  it("falls back to a plain toggle when shift-clicking the anchor itself", () => {
    const t = mount();
    t.toggle(1);
    t.toggle(1, true);
    expect(t.ids()).toEqual([]);
  });
});

describe("SelectableTable — select-all header", () => {
  it("is unchecked and not indeterminate with nothing selected", () => {
    const box = mount().headerBox();
    expect(box.checked).toBe(false);
    expect(box.indeterminate).toBe(false);
  });

  it("is indeterminate with a partial selection", () => {
    const box = mount({ initial: ["a", "b"] }).headerBox();
    expect(box.checked).toBe(false);
    expect(box.indeterminate).toBe(true);
  });

  it("is checked and NOT indeterminate once every row is selected", () => {
    const box = mount({ initial: ["a", "b", "c", "d"] }).headerBox();
    expect(box.checked).toBe(true);
    expect(box.indeterminate).toBe(false);
  });

  it("is absent on an empty table — there is nothing to select", () => {
    // Before 2026-08-04 this rendered a live, unchecked select-all over zero
    // rows. The empty state now replaces the whole table, header included,
    // which is what BaseTable has always done.
    expect(mount({ data: [] }).headerBox()).toBeNull();
  });

  it("selects every rendered row", () => {
    const t = mount();
    fireEvent.change(t.headerBox());
    expect(t.ids()).toEqual(["a", "b", "c", "d"]);
  });

  it("deselects every rendered row when all are already selected", () => {
    const t = mount({ initial: ["a", "b", "c", "d"] });
    fireEvent.change(t.headerBox());
    expect(t.ids()).toEqual([]);
  });

  it("completes a partial selection rather than clearing it", () => {
    const t = mount({ initial: ["b"] });
    fireEvent.change(t.headerBox());
    expect(t.ids()).toEqual(["a", "b", "c", "d"]);
  });

  it("PRESERVES ids that are not on screen", () => {
    // The store may hold a selection made before a filter narrowed `data`.
    // Select-all must not adopt them and deselect-all must not drop them —
    // this is why toggleAll deletes ids one by one instead of assigning a Set.
    const t = mount({ data: ROWS.slice(0, 2), initial: ["zz"] });
    fireEvent.change(t.headerBox());
    expect(t.ids()).toEqual(["a", "b", "zz"]);
    fireEvent.change(t.headerBox());
    expect(t.ids()).toEqual(["zz"]);
  });

  it("ignores off-screen ids when deciding indeterminate", () => {
    const t = mount({ data: ROWS.slice(0, 2), initial: ["zz"] });
    expect(t.headerBox().indeterminate).toBe(false);
    expect(t.headerBox().checked).toBe(false);
  });
});

describe("SelectableTable — action bar", () => {
  const ACTIONS: SelectionAction<Row>[] = [
    { label: "Archive", onClick: () => {} },
  ];
  const bar = (c: Element) => c.querySelector(".hud-selection-action-bar");

  it("stays hidden until something is selected", () => {
    expect(bar(mount({ selectionActions: ACTIONS }).container)).toBeNull();
  });

  it("stays hidden when there is a selection but no actions to offer", () => {
    expect(bar(mount({ initial: ["a"] }).container)).toBeNull();
  });

  it("appears with a live count once a row is selected", () => {
    const t = mount({ initial: ["a"], selectionActions: ACTIONS });
    expect(
      t.container.querySelector(".hud-selection-action-bar__count")
        ?.textContent,
    ).toBe("1 selected");
    t.toggle(1);
    expect(
      t.container.querySelector(".hud-selection-action-bar__count")
        ?.textContent,
    ).toBe("2 selected");
  });

  it("hands an action both the ids and the resolved rows", () => {
    // The ids alone would force every consumer to re-look-up its own data.
    const onClick = vi.fn();
    const t = mount({
      initial: ["b", "d"],
      selectionActions: [{ label: "Archive", onClick }],
    });
    fireEvent.click(
      t.container.querySelector(
        ".hud-selection-action-bar__actions button",
      ) as HTMLElement,
    );
    const [ids, rows] = onClick.mock.calls[0];
    expect([...(ids as Set<string>)].sort()).toEqual(["b", "d"]);
    expect((rows as Row[]).map((r) => r.name)).toEqual(["Bravo", "Delta"]);
  });

  it("resolves rows in data order, not selection order", () => {
    const onClick = vi.fn();
    const t = mount({ selectionActions: [{ label: "Archive", onClick }] });
    t.toggle(3);
    t.toggle(0);
    fireEvent.click(
      t.container.querySelector(
        ".hud-selection-action-bar__actions button",
      ) as HTMLElement,
    );
    expect((onClick.mock.calls[0][1] as Row[]).map((r) => r.id)).toEqual([
      "a",
      "d",
    ]);
  });

  it("clears EVERYTHING, including ids that are not on screen", () => {
    // Deliberately unlike select-all: Clear is an explicit "drop the lot".
    const t = mount({
      data: ROWS.slice(0, 2),
      initial: ["a", "zz"],
      selectionActions: ACTIONS,
    });
    fireEvent.click(
      t.container.querySelector(
        ".hud-selection-action-bar__clear",
      ) as HTMLElement,
    );
    expect(t.ids()).toEqual([]);
  });
});

describe("SelectableTable — row click", () => {
  it("reports the row and its index", () => {
    const onRowClick = vi.fn();
    const t = mount({ onRowClick });
    fireEvent.click(t.bodyRows()[2]);
    expect(onRowClick).toHaveBeenCalledWith(ROWS[2], 2);
  });

  it("does NOT fire when the click lands on the checkbox", () => {
    // Otherwise every selection would also open whatever the row click opens.
    const onRowClick = vi.fn();
    const t = mount({ onRowClick });
    fireEvent.click(t.rowToggle(1));
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it("does not fire on the checkbox INPUT either, not just the label", () => {
    const onRowClick = vi.fn();
    const t = mount({ onRowClick });
    fireEvent.click(t.bodyRows()[1].querySelector("input") as HTMLElement);
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it("shows a pointer cursor only when a row click means something", () => {
    expect(
      mount({ onRowClick: () => {} })
        .bodyRows()[0]
        .getAttribute("style"),
    ).toMatch(/pointer/);
    expect(mount().bodyRows()[0].getAttribute("style") ?? "").not.toMatch(
      /pointer/,
    );
  });
});

describe("SelectableTable — chrome", () => {
  it("renders a checkbox column plus one column per definition", () => {
    const t = mount();
    expect(t.container.querySelectorAll("thead th")).toHaveLength(2);
    expect(t.bodyRows()[0].querySelectorAll("td")).toHaveLength(2);
  });

  it("renders cell values through the accessor", () => {
    const t = mount();
    expect(t.bodyRows()[0].querySelectorAll("td")[1].textContent).toBe("Alpha");
  });

  it("shows the result count with thousands separators when given one", () => {
    const t = mount({ resultCount: { shown: 622, total: 2131 } });
    expect(
      t.container
        .querySelector(".hud-table__result-count")
        ?.textContent?.replace(/\s+/g, " "),
    ).toBe("Showing 622 of 2,131");
  });

  it("omits the result count entirely when not given one", () => {
    expect(
      mount().container.querySelector(".hud-table__result-count"),
    ).toBeNull();
  });

  it("carries the selectable modifier class", () => {
    expect(
      mount().container.querySelector(".hud-table--selectable"),
    ).not.toBeNull();
  });
});

// ============================================
// Props the interface DECLARED and the renderer DROPPED (fixed 2026-08-04).
//
// `SelectableTableProps` extended `BaseTableProps` wholesale, but `splitProps`
// listed only what the renderer read, so every unlisted prop fell into `others`
// and was spread onto the frame `div`: a clean typecheck, a real DOM attribute,
// and no behaviour. The live case was netsuite_extract_rs's dashboard passing
// `compact`, `hoverable` and an `emptyMessage` explaining its filters — over a
// component with no empty state at all, so filtering to zero rows showed a bare
// header and the sentence never rendered.
//
// The remaining six (`fill`, `fixedLayout`, `fit`, `spanRow`, `rowActions`,
// `onRowHover`) are now Omitted from the interface rather than half-wired; see
// the note on `SelectableTableOmitted` in types.ts for why each needs real work.
// There is no test for them BECAUSE there is nothing to test — the guard is the
// type, and it is checked by `npm run typecheck`.
// ============================================
describe("SelectableTable — the empty state", () => {
  it("renders the caller's message when there are no rows", () => {
    const t = mount({ data: [], emptyMessage: "No tables match the filters." });
    expect(t.container.querySelector(".hud-table__empty")?.textContent).toBe(
      "No tables match the filters.",
    );
  });

  it("falls back to BaseTable's wording, so the two tables read alike", () => {
    const t = mount({ data: [] });
    expect(t.container.querySelector(".hud-table__empty")?.textContent).toBe(
      "No data available",
    );
  });

  it("replaces the table entirely rather than rendering an empty one", () => {
    const t = mount({ data: [] });
    expect(t.container.querySelector("table")).toBeNull();
  });

  it("shows no empty state while rows exist", () => {
    expect(mount().container.querySelector(".hud-table__empty")).toBeNull();
  });

  it("keeps the result count visible alongside the empty message", () => {
    // "Showing 0 of 2,131" and the reason why are more useful together.
    const t = mount({ data: [], resultCount: { shown: 0, total: 2131 } });
    expect(t.container.querySelector(".hud-table__result-count")).not.toBeNull();
    expect(t.container.querySelector(".hud-table__empty")).not.toBeNull();
  });
});

describe("SelectableTable — appearance flags reach the frame", () => {
  // These are the exact class toggles BaseTable applies against the exact same
  // Table.css rules; the two tables share one stylesheet, so a flag meaning
  // "denser" on one has to mean it on the other. Asserting the class (not a
  // computed style) is deliberate — jsdom applies no stylesheet, and the class
  // IS the contract between component and CSS.
  it("adds no modifiers beyond the defaults when no flag is passed", () => {
    expect(mount().modifiers()).toEqual([
      "hud-table--selectable",
      "hud-table--sticky-header",
    ]);
  });

  it.each([
    ["striped", "hud-table--striped"],
    ["hoverable", "hud-table--hoverable"],
    ["compact", "hud-table--compact"],
  ] as const)("%s adds %s", (prop, className) => {
    expect(mount({ [prop]: true }).modifiers()).toContain(className);
  });

  it("carries several at once", () => {
    const t = mount({ striped: true, hoverable: true, compact: true });
    expect(t.modifiers()).toEqual([
      "hud-table--compact",
      "hud-table--hoverable",
      "hud-table--selectable",
      "hud-table--sticky-header",
      "hud-table--striped",
    ]);
  });

  it("leaves the flags off the DOM as stray attributes", () => {
    // The bug's signature: an unlisted prop lands in `others` and Solid spreads
    // it onto the element, so `compact` became a literal attribute. If one
    // reappears here, a prop has been declared and not split off again.
    const t = mount({ striped: true, hoverable: true, compact: true });
    for (const attr of ["striped", "hoverable", "compact", "emptymessage"])
      expect(t.frame().hasAttribute(attr)).toBe(false);
  });
});

describe("SelectableTable — stickyHeader matches BaseTable's default", () => {
  // Same prop name, same type, one shared doc comment — and until 2026-08-04
  // opposite defaults: truthy here (off unless asked), `!== false` in BaseTable
  // (on unless refused). BaseTable's is the documented one and wins.
  it("is sticky when the prop is omitted", () => {
    expect(mount().modifiers()).toContain("hud-table--sticky-header");
  });

  it("is sticky when passed true", () => {
    expect(mount({ stickyHeader: true }).modifiers()).toContain(
      "hud-table--sticky-header",
    );
  });

  it("opts out only on an explicit false", () => {
    expect(mount({ stickyHeader: false }).modifiers()).not.toContain(
      "hud-table--sticky-header",
    );
  });
});
