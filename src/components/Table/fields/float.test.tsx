import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { floatCol, geo } from "./float";

afterEach(cleanup);

// Guards the float field factory: geometry contract, column shape, and that
// the accessor renders a FloatCell honoring the requested precision.

interface Row {
  ratio: number;
}

describe("float field", () => {
  it("geo is a content-fit column capped at 16ch", () => {
    expect(geo).toEqual({ minCh: 10, maxCh: 16, css: "16ch" });
  });

  it("floatCol builds a right-aligned, sortable, geometry-carrying column", () => {
    const col = floatCol<Row>("ratio");
    expect(col.id).toBe("ratio");
    expect(col.align).toBe("right");
    expect(col.width).toBe("16ch");
    expect(col.sortable).toBe(true);
    expect(col.geo).toBe(geo);
  });

  it("humanizes and centers the header label", () => {
    const col = floatCol<Row>("ratio");
    const { container } = render(() => <>{col.header}</>);
    const th = container.querySelector(".sui-field-th-center");
    expect(th?.textContent).toBe("Ratio");
  });

  it("accessor renders a FloatCell at the default precision of 2", () => {
    const col = floatCol<Row>("ratio");
    const { container } = render(() => <>{col.accessor?.({ ratio: Math.PI })}</>);
    expect(container.querySelector(".cell-float")?.textContent).toBe("3.14");
  });

  it("accessor honors an explicit precision", () => {
    const col = floatCol<Row>("ratio", 4);
    const { container } = render(() => <>{col.accessor?.({ ratio: Math.PI })}</>);
    expect(container.querySelector(".cell-float")?.textContent).toBe("3.1416");
  });
});
