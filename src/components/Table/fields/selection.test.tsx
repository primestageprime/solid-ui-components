import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, fireEvent } from "@solidjs/testing-library";
import { createRoot } from "solid-js";
import { createFieldSelection, selectionCol, geo } from "./selection";
import { FieldTable } from "./FieldTable";

afterEach(cleanup);

interface Row {
  name: string;
}
const ROWS: Row[] = [
  { name: "a" },
  { name: "b" },
  { name: "c" },
  { name: "d" },
  { name: "e" },
];

const makeSelection = () =>
  createFieldSelection<Row>({ rows: () => ROWS, key: (r) => r.name });

describe("createFieldSelection", () => {
  it("toggles single rows and tracks allState", () =>
    createRoot((dispose) => {
      const sel = makeSelection();
      expect(sel.allState()).toBe("none");
      sel.toggle(ROWS[1]);
      expect(sel.isSelected(ROWS[1])).toBe(true);
      expect(sel.allState()).toBe("some");
      sel.toggle(ROWS[1]);
      expect(sel.allState()).toBe("none");
      dispose();
    }));

  it("shift-range selects every row between the two clicks in sort order", () =>
    createRoot((dispose) => {
      const sel = makeSelection();
      sel.toggle(ROWS[1]); // click b
      sel.toggle(ROWS[3], { range: true }); // shift-click d
      expect([...sel.selected()].sort()).toEqual(["b", "c", "d"]);
      dispose();
    }));

  it("shift-range applies the endpoint's new state (deselect sweeps too)", () =>
    createRoot((dispose) => {
      const sel = makeSelection();
      sel.toggleAll(); // all selected
      sel.toggle(ROWS[4]); // deselect e (anchor = e)
      sel.toggle(ROWS[2], { range: true }); // shift-click c → deselect c..e
      expect([...sel.selected()].sort()).toEqual(["a", "b"]);
      dispose();
    }));

  it("range works upward (later anchor, earlier endpoint)", () =>
    createRoot((dispose) => {
      const sel = makeSelection();
      sel.toggle(ROWS[3]); // d
      sel.toggle(ROWS[0], { range: true }); // shift-click a
      expect([...sel.selected()].sort()).toEqual(["a", "b", "c", "d"]);
      dispose();
    }));

  it("toggleAll cycles all → none and resets the anchor", () =>
    createRoot((dispose) => {
      const sel = makeSelection();
      sel.toggleAll();
      expect(sel.allState()).toBe("all");
      sel.toggleAll();
      expect(sel.allState()).toBe("none");
      dispose();
    }));
});

describe("selection field", () => {
  it("factory returns the fixed geometry and a select-all header", () =>
    createRoot((dispose) => {
      const col = selectionCol<Row>(makeSelection());
      expect(col.geo).toBe(geo);
      expect(geo).toEqual({ minCh: 4.75, maxCh: 4.75, css: "2.125rem" });
      expect(col.id).toBe("selected");
      dispose();
    }));

  it("header checkbox is indeterminate over a partial selection and selects all on click", () => {
    const sel = makeSelection();
    const { container } = render(() => (
      <FieldTable data={ROWS} fields={[selectionCol(sel)]} registry={{}} />
    ));
    sel.toggle(ROWS[0]);
    const header = container.querySelector<HTMLInputElement>(
      'thead input[type="checkbox"]',
    );
    expect(header).toBeTruthy();
    expect(header!.indeterminate).toBe(true);
    fireEvent.click(header!);
    expect(sel.allState()).toBe("all");
    expect(header!.indeterminate).toBe(false);
    expect(header!.checked).toBe(true);
  });

  it("shift-clicking a body checkbox range-selects through the table", () => {
    const sel = makeSelection();
    const { container } = render(() => (
      <FieldTable data={ROWS} fields={[selectionCol(sel)]} registry={{}} />
    ));
    const boxes = container.querySelectorAll<HTMLInputElement>(
      'tbody input[type="checkbox"]',
    );
    expect(boxes.length).toBe(5);
    fireEvent.click(boxes[1]);
    fireEvent.click(boxes[3], { shiftKey: true });
    expect([...sel.selected()].sort()).toEqual(["b", "c", "d"]);
    expect(boxes[2].checked).toBe(true);
  });
});
