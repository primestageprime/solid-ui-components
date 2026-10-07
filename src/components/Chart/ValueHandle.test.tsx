import { afterEach, describe, expect, it } from "vitest";
import { fireEvent, render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { Chart } from "./Chart";
import { DragRangeSelect } from "./DragRangeSelect";
import { ValueHandle } from "./ValueHandle";
import { installPointerCapture, installRects, pointer, rectOf } from "../../test-utils";

interface Col {
  readonly x: number;
  readonly v: number;
}

// A 200×100 chart drawn TWICE its size on screen (a `responsive` viewBox):
// the svg's box is 200px tall from client y 50, so one data unit is 2 client
// px and y=100 sits at client 50, y=0 at client 250.
const SCREEN_TOP = 50;
const NO_MARGIN = { top: 0, right: 0, bottom: 0, left: 0 };

const mount = (cols: () => readonly Col[], log: unknown[][], onRange?: () => void) =>
  render(() => (
    <Chart width={200} height={100} xDomain={[0, 2]} yDomain={[0, 100]} margin={NO_MARGIN}>
      <DragRangeSelect onRangePreview={onRange} />
      <ValueHandle
        data={cols()}
        x={(c) => c.x}
        width={0.5}
        value={(c) => c.v}
        color={() => "red"}
        label={(c) => `column ${c.x}`}
        step={() => 10}
        onDragStart={(c) => log.push(["start", c.x])}
        onDrag={(c, _i, y) => log.push(["drag", c.x, y])}
        onDragEnd={(c, _i, y) => log.push(["end", c.x, y])}
        onDoubleClick={(c) => log.push(["dbl", c.x])}
      />
    </Chart>
  ));

describe("ValueHandle", () => {
  let restore: () => void = () => {};
  afterEach(() => {
    restore();
    document.body.innerHTML = "";
  });
  const screen = () => {
    restore = installRects((el) =>
      el.tagName.toLowerCase() === "svg"
        ? rectOf({ left: 0, top: SCREEN_TOP, width: 400, height: 200 })
        : null,
    );
  };

  it("draws one grip per datum at its value", () => {
    const { container } = mount(() => [{ x: 0.5, v: 30 }, { x: 1.5, v: 80 }], []);
    const grips = container.querySelectorAll(".sui-chart__value-handle-grip");
    expect(grips).toHaveLength(2);
    // y=30 → plot y 70; the 6px grip is centred on it.
    expect(Number(grips[0].getAttribute("y"))).toBe(67);
    expect(grips[0].getAttribute("role")).toBe("slider");
    expect(grips[0].getAttribute("aria-valuenow")).toBe("30");
  });

  it("reports the dragged y in data units through a scaled viewBox", () => {
    screen();
    const log: unknown[][] = [];
    let ranged = 0;
    const { container } = mount(() => [{ x: 0.5, v: 30 }], log, () => ranged++);
    const grip = container.querySelector(".sui-chart__value-handle-grip") as Element;
    const cap = installPointerCapture(grip);
    const p = pointer(grip);
    p.down({ clientX: 100, clientY: 190 });
    p.move({ clientX: 100, clientY: 90 }); // 40 client px under the top → y 80
    p.up({ clientX: 100, clientY: 70 }); // → y 90
    expect(log).toEqual([
      ["start", 0.5],
      ["drag", 0.5, 80],
      ["end", 0.5, 90],
    ]);
    expect(cap.setPointerCapture.calls).toHaveLength(1);
    // The grip keeps the gesture: the chart's x-range drag never starts.
    expect(ranged).toBe(0);
  });

  it("keeps the same grip element while its data is recomputed mid-drag", () => {
    screen();
    const [cols, setCols] = createSignal<readonly Col[]>([{ x: 0.5, v: 30 }]);
    const { container } = mount(cols, []);
    const before = container.querySelector(".sui-chart__value-handle-grip");
    setCols([{ x: 0.5, v: 60 }]);
    const after = container.querySelector(".sui-chart__value-handle-grip");
    expect(after).toBe(before);
    expect(after?.getAttribute("aria-valuenow")).toBe("60");
  });

  it("steps by the keyboard and opens on a double-click", () => {
    const log: unknown[][] = [];
    const { container } = mount(() => [{ x: 0.5, v: 30 }], log);
    const grip = container.querySelector(".sui-chart__value-handle-grip") as Element;
    fireEvent.keyDown(grip, { key: "ArrowUp" });
    fireEvent.keyDown(grip, { key: "ArrowDown" });
    const column = container.querySelector(".sui-chart__value-handle-column") as Element;
    fireEvent.dblClick(column);
    expect(log).toEqual([
      ["end", 0.5, 40],
      ["end", 0.5, 20],
      ["dbl", 0.5],
    ]);
  });
});
