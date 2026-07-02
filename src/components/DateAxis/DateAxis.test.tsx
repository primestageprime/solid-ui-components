import { describe, it, expect, vi } from "vitest";
import { createSignal } from "solid-js";
import { render, fireEvent } from "@solidjs/testing-library";
import { DateAxis } from "./DateAxis";
import { dailyCells, type Cell } from "./cells";

const d = (iso: string): Date => new Date(`${iso}T00:00:00.000Z`);

const noopRender = (cell: Cell) => <span>{cell.start.getUTCDate()}</span>;

describe("DateAxis rendering", () => {
  it("renders one cell per item in `cells`", () => {
    const cells = dailyCells(d("2026-05-01"), d("2026-05-07"));
    const { container } = render(() => (
      <DateAxis cells={cells} today={d("2026-05-03")} renderCell={noopRender} />
    ));
    expect(container.querySelectorAll(".sui-date-axis__cell")).toHaveLength(7);
  });

  it("marks the cell whose [start, end) contains `today`", () => {
    const cells = dailyCells(d("2026-05-01"), d("2026-05-05"));
    const { container } = render(() => (
      <DateAxis cells={cells} today={d("2026-05-03")} renderCell={noopRender} />
    ));
    const todayCells = container.querySelectorAll(
      ".sui-date-axis__cell--today",
    );
    expect(todayCells).toHaveLength(1);
    expect(todayCells[0].getAttribute("aria-current")).toBe("date");
  });

  it("provides the right cell context to renderCell", () => {
    const seen: { index: number; isToday: boolean; isSelected: boolean }[] = [];
    const cells = dailyCells(d("2026-05-01"), d("2026-05-03"));
    render(() => (
      <DateAxis
        cells={cells}
        today={d("2026-05-02")}
        selected={2}
        renderCell={(_cell, ctx) => {
          seen.push({
            index: ctx.index,
            isToday: ctx.isToday,
            isSelected: ctx.isSelected,
          });
          return <span />;
        }}
      />
    ));
    expect(seen).toEqual([
      { index: 0, isToday: false, isSelected: false },
      { index: 1, isToday: true, isSelected: false },
      { index: 2, isToday: false, isSelected: true },
    ]);
  });
});

describe("DateAxis interactivity", () => {
  it("is passive (columnheader, not focusable) when onCellClick is omitted", () => {
    const cells = dailyCells(d("2026-05-01"), d("2026-05-03"));
    const { container } = render(() => (
      <DateAxis cells={cells} renderCell={noopRender} />
    ));
    const cell = container.querySelector(".sui-date-axis__cell")!;
    expect(cell.getAttribute("role")).toBe("columnheader");
    expect(cell.getAttribute("tabindex")).toBeNull();
  });

  it("fires onCellClick with index and cell on click and on Enter / Space", () => {
    const onCellClick = vi.fn();
    const cells = dailyCells(d("2026-05-01"), d("2026-05-03"));
    const { container } = render(() => (
      <DateAxis
        cells={cells}
        renderCell={noopRender}
        onCellClick={onCellClick}
      />
    ));
    const firstCell = container.querySelector(".sui-date-axis__cell")!;
    fireEvent.click(firstCell);
    fireEvent.keyDown(firstCell, { key: "Enter" });
    fireEvent.keyDown(firstCell, { key: " " });
    expect(onCellClick).toHaveBeenCalledTimes(3);
    expect(onCellClick.mock.calls[0][0]).toBe(0);
    expect(onCellClick.mock.calls[0][1]).toBe(cells[0]);
  });

  it("marks the selected cell with the --selected modifier", () => {
    const cells = dailyCells(d("2026-05-01"), d("2026-05-05"));
    const { container } = render(() => (
      <DateAxis cells={cells} selected={3} renderCell={noopRender} />
    ));
    const selected = container.querySelectorAll(
      ".sui-date-axis__cell--selected",
    );
    expect(selected).toHaveLength(1);
    expect(
      Array.from(container.querySelectorAll(".sui-date-axis__cell")).indexOf(
        selected[0],
      ),
    ).toBe(3);
  });
});

describe("DateAxis with payload-carrying cells", () => {
  it("preserves consumer-attached cell properties through renderCell", () => {
    type Tagged = Cell & { tag: string };
    const cells: Tagged[] = dailyCells(d("2026-05-01"), d("2026-05-03")).map(
      (c, i) => ({
        ...c,
        tag: `t${i}`,
      }),
    );
    const tags: string[] = [];
    render(() => (
      <DateAxis<Tagged>
        cells={cells}
        renderCell={(cell) => {
          tags.push(cell.tag);
          return <span>{cell.tag}</span>;
        }}
      />
    ));
    expect(tags).toEqual(["t0", "t1", "t2"]);
  });
});

describe("DateAxis recentre takeover", () => {
  it("re-centres on a new selection while a previous smooth scroll is still in flight", async () => {
    const [sel, setSel] = createSignal(5);
    // ~90 daily cells so the viewport overflows and a target is computed.
    const cells = dailyCells(d("2026-01-01"), d("2026-03-31"));
    const { container } = render(() => (
      <DateAxis
        cells={cells}
        selected={sel()}
        cellWidth={40}
        renderCell={noopRender}
      />
    ));
    const el = container.querySelector(".sui-date-axis")! as HTMLDivElement;
    // Give the element a viewport + overflow (JSDOM reports 0 otherwise).
    Object.defineProperty(el, "clientWidth", {
      configurable: true,
      value: 200,
    });
    Object.defineProperty(el, "scrollWidth", {
      configurable: true,
      value: cells.length * 40,
    });

    // Stub the smooth scroll: record each target and emit a `scroll` event like
    // a real animation frame would — without ever reaching the target, so the
    // recentre is still "in flight".
    const targets: number[] = [];
    el.scrollTo = ((opts: ScrollToOptions) => {
      targets.push(opts.left as number);
      el.dispatchEvent(new Event("scroll"));
    }) as typeof el.scrollTo;

    setSel(20); // first recentre → scrollTo #1, emits an in-flight scroll event
    await Promise.resolve();
    setSel(60); // lands mid-flight → must issue scrollTo #2 (takeover)
    await Promise.resolve();

    expect(targets).toHaveLength(2);
    expect(targets[1]).toBeGreaterThan(targets[0]); // redirected to the later cell
  });
});

describe("DateAxis recentre uses measured cell width (regression)", () => {
  it("scrolls fully to the end for the last cell when cells render wider than cellWidth", async () => {
    const [sel, setSel] = createSignal(0);
    const cells = dailyCells(d("2026-01-01"), d("2026-03-31")); // 90 cells
    const { container } = render(() => (
      <DateAxis
        cells={cells}
        selected={sel()}
        cellWidth={40} // hint only — the real cells below render at 60px
        renderCell={noopRender}
      />
    ));
    const el = container.querySelector(".sui-date-axis")! as HTMLDivElement;
    Object.defineProperty(el, "clientWidth", { configurable: true, value: 200 });
    // Content-sized cells 60px wide — wider than the 40px cellWidth hint. The
    // old math (idx * cellWidth) targeted ~67% of maxScroll; the fix measures
    // the real per-cell width (scrollWidth / count) and reaches the end.
    Object.defineProperty(el, "scrollWidth", {
      configurable: true,
      value: cells.length * 60,
    });
    const targets: number[] = [];
    el.scrollTo = ((opts: ScrollToOptions) => {
      targets.push(opts.left as number);
    }) as typeof el.scrollTo;

    setSel(cells.length - 1); // select the last cell
    await Promise.resolve();

    const maxScroll = cells.length * 60 - 200; // real geometry
    expect(targets).toHaveLength(1);
    // Pins the last cell to the right edge (clamped to maxScroll)…
    expect(targets[0]).toBe(maxScroll);
    // …not the old cellWidth(40)-based target that stopped short of the end.
    expect(targets[0]).toBeGreaterThan(cells.length * 40);
  });
});
