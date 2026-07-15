import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { DTable, DRow, DT, DD, DH, Units, Val, SigFig } from "./DataList";

describe("DataList table primitives", () => {
  it("DTable renders a cell-table with rows/terms/values", () => {
    const { container, getByText } = render(() => (
      <DTable>
        <DRow>
          <DT>Voltage</DT>
          <DD>230</DD>
        </DRow>
      </DTable>
    ));
    expect(container.querySelector(".cell-table")).toBeTruthy();
    expect(container.querySelector(".cell-row")).toBeTruthy();
    expect(getByText("Voltage")).toBeTruthy();
    expect(getByText("230")).toBeTruthy();
  });

  it("DD picks the highlight value variant (warning color)", () => {
    const { container } = render(() => (
      <DTable>
        <DRow>
          <DD highlight>hot</DD>
        </DRow>
      </DTable>
    ));
    const cell = container.querySelector(".cell")! as HTMLElement;
    expect(cell.style.color).toBe("var(--sui-warning)");
  });

  it("DT muted renders the muted term color", () => {
    const { container } = render(() => (
      <DTable>
        <DRow>
          <DT muted>label</DT>
        </DRow>
      </DTable>
    ));
    const cell = container.querySelector(".cell")! as HTMLElement;
    expect(cell.style.color).toBe("var(--sui-text-muted)");
  });

  it("DH center renders a th with center alignment", () => {
    const { container } = render(() => (
      <table>
        <tbody>
          <tr>
            <DH align="center">H</DH>
          </tr>
        </tbody>
      </table>
    ));
    const cell = container.querySelector(".cell")!;
    expect(cell.tagName).toBe("TH");
    expect(cell.classList.contains("cell--align-center")).toBe(true);
  });

  it("Units renders inline units text", () => {
    const { getByText } = render(() => <Units>kWh</Units>);
    expect(getByText("kWh")).toBeTruthy();
  });
});

describe("DataList value helpers", () => {
  it("Val formats with default precision 2 and null fallback", () => {
    const { container } = render(() => (
      <>
        <span data-t="num"><Val value={3.14159} /></span>
        <span data-t="null"><Val value={null} /></span>
        <span data-t="fb"><Val value={undefined} fallback="n/a" /></span>
      </>
    ));
    expect(container.querySelector('[data-t="num"]')!.textContent).toBe("3.14");
    expect(container.querySelector('[data-t="null"]')!.textContent).toBe("—");
    expect(container.querySelector('[data-t="fb"]')!.textContent).toBe("n/a");
  });

  it("SigFig respects the figures option", () => {
    const { container } = render(() => (
      <span><SigFig value={123.456} figures={2} /></span>
    ));
    expect(container.querySelector("span")!.textContent).toBe("1.2e+2");
  });
});
