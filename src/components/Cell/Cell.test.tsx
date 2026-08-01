import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { Cell, CellRow, CellTable, createCell } from "./Cell";

describe("Cell", () => {
  it("renders a td with align/weight modifier classes", () => {
    const { container } = render(() => (
      <table>
        <tbody>
          <tr>
            <Cell align="right" weight="semibold">
              9
            </Cell>
          </tr>
        </tbody>
      </table>
    ));
    const cell = container.querySelector(".cell")!;
    expect(cell.tagName).toBe("TD");
    expect(cell.classList.contains("cell--align-right")).toBe(true);
    expect(cell.classList.contains("cell--weight-semibold")).toBe(true);
    expect(cell.textContent).toBe("9");
  });

  it("renders as a th when as=th and applies inline color", () => {
    const { container } = render(() => (
      <table>
        <tbody>
          <tr>
            <Cell as="th" color="rgb(1, 2, 3)">
              Head
            </Cell>
          </tr>
        </tbody>
      </table>
    ));
    const cell = container.querySelector(".cell")! as HTMLElement;
    expect(cell.tagName).toBe("TH");
    expect(cell.style.color).toBe("rgb(1, 2, 3)");
  });

  it("createCell bakes defaults, call-site class still appended", () => {
    const Baked = createCell({ align: "center", weight: "medium" });
    const { container } = render(() => (
      <table>
        <tbody>
          <tr>
            <Baked class="mine">x</Baked>
          </tr>
        </tbody>
      </table>
    ));
    const cell = container.querySelector(".cell")!;
    expect(cell.classList.contains("cell--align-center")).toBe(true);
    expect(cell.classList.contains("cell--weight-medium")).toBe(true);
    expect(cell.classList.contains("mine")).toBe(true);
  });
});

describe("CellRow", () => {
  it("flips border and highlight modifiers", () => {
    const { container } = render(() => (
      <table>
        <tbody>
          <CellRow border highlight>
            <td>a</td>
          </CellRow>
        </tbody>
      </table>
    ));
    const row = container.querySelector(".cell-row")!;
    expect(row.tagName).toBe("TR");
    expect(row.classList.contains("cell-row--border")).toBe(true);
    expect(row.classList.contains("cell-row--highlight")).toBe(true);
  });
});

describe("CellTable", () => {
  it("renders a thead only when a header is supplied", () => {
    const { container } = render(() => (
      <CellTable header={<tr><th>H</th></tr>}>
        <CellRow>
          <td>body</td>
        </CellRow>
      </CellTable>
    ));
    const table = container.querySelector(".cell-table")!;
    expect(table.tagName).toBe("TABLE");
    expect(table.querySelector("thead")).toBeTruthy();
    expect(table.querySelector("tbody")!.textContent).toBe("body");
  });

  it("omits thead when no header", () => {
    const { container } = render(() => (
      <CellTable>
        <CellRow>
          <td>only</td>
        </CellRow>
      </CellTable>
    ));
    expect(container.querySelector("thead")).toBeNull();
  });
});
