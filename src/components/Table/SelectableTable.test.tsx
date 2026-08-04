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
    />
  ));

  const bodyRows = () =>
    Array.from(container.querySelectorAll("tbody .hud-table__row"));
  /** The label, not the input — see the header. */
  const rowToggle = (index: number) =>
    bodyRows()[index].querySelector(".hud-table__checkbox") as HTMLElement;
  const headerBox = () =>
    container.querySelector("thead input[type=checkbox]") as HTMLInputElement;

  return {
    container,
    selected,
    ids: () => [...selected()].sort(),
    bodyRows,
    rowToggle,
    headerBox,
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

  it("stays unchecked on an empty table rather than claiming all-of-nothing", () => {
    const box = mount({ data: [] }).headerBox();
    expect(box.checked).toBe(false);
    expect(box.indeterminate).toBe(false);
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
