import { render, fireEvent } from "@solidjs/testing-library";
import { describe, expect, it, vi } from "vitest";
import { Treemap, type TreemapCellData } from "./Treemap";
import { SelectableTreemap } from "./variants";

interface Inner {
  key: string;
  weight: number;
}
type Cell = TreemapCellData<Inner>;

const CELLS: Cell[] = [
  {
    key: "col-a",
    weight: 2,
    children: [
      { key: "a1", weight: 1 },
      { key: "a2", weight: 3 },
    ],
  },
  { key: "col-b", weight: 0, children: [{ key: "b1", weight: 1 }] },
];

const base = () => ({
  cells: CELLS,
  renderOuterHeader: (c: Cell) => <span>{`H:${c.key}`}</span>,
  renderInnerContent: (_c: Cell, i: Inner) => <span>{`I:${i.key}`}</span>,
});

const outers = (root: HTMLElement) =>
  [...root.querySelectorAll<HTMLElement>(".sui-treemap__outer")];
const inners = (root: HTMLElement) =>
  [...root.querySelectorAll<HTMLElement>(".sui-treemap__inner")];

describe("Treemap", () => {
  it("renders an outer column per cell and an inner per child", () => {
    const { container } = render(() => <Treemap {...base()} />);
    expect(outers(container).length).toBe(2);
    expect(inners(container).length).toBe(3);
    expect(container.textContent).toContain("H:col-a");
    expect(container.textContent).toContain("I:a2");
  });

  it("maps weights to flex — positive grows, non-positive is fixed", () => {
    const { container } = render(() => <Treemap {...base()} />);
    expect(outers(container)[0].style.flex).toBe("2 1 0px");
    expect(outers(container)[1].style.flex).toBe("0 0 auto"); // weight 0
    expect(inners(container)[0].style.flex).toBe("1 1 15ch");
  });

  it("paints selection rings from the predicates", () => {
    const { container } = render(() => (
      <Treemap
        {...base()}
        isOuterSelected={(c) => c.key === "col-a"}
        isInnerSelected={(_c, i) => i.key === "a2"}
      />
    ));
    expect(
      outers(container)[0].classList.contains("sui-treemap__outer--selected"),
    ).toBe(true);
    expect(
      outers(container)[1].classList.contains("sui-treemap__outer--selected"),
    ).toBe(false);
    const a2 = inners(container).find((el) => el.textContent === "I:a2")!;
    expect(a2.classList.contains("sui-treemap__inner--selected")).toBe(true);
  });

  it("is non-interactive without click handlers", () => {
    const { container } = render(() => <Treemap {...base()} />);
    expect(outers(container)[0].querySelector(".sui-treemap__outer-header")
      ?.getAttribute("role")).toBeNull();
    expect(inners(container)[0].getAttribute("role")).toBeNull();
  });

  it("fires onOuterClick from header click and keyboard", () => {
    const onOuterClick = vi.fn();
    const { container } = render(() => (
      <Treemap {...base()} onOuterClick={onOuterClick} />
    ));
    const header = outers(container)[0].querySelector<HTMLElement>(
      ".sui-treemap__outer-header",
    )!;
    expect(header.getAttribute("role")).toBe("button");
    fireEvent.click(header);
    expect(onOuterClick.mock.lastCall?.[0].key).toBe("col-a");
    fireEvent.keyDown(header, { key: "Enter" });
    expect(onOuterClick).toHaveBeenCalledTimes(2);
  });

  it("fires onInnerClick without also triggering onOuterClick (stopPropagation)", () => {
    const onOuterClick = vi.fn();
    const onInnerClick = vi.fn();
    const { container } = render(() => (
      <Treemap
        {...base()}
        onOuterClick={onOuterClick}
        onInnerClick={onInnerClick}
      />
    ));
    const a1 = inners(container).find((el) => el.textContent === "I:a1")!;
    fireEvent.click(a1);
    expect(onInnerClick).toHaveBeenCalledTimes(1);
    expect(onInnerClick.mock.lastCall?.[1].key).toBe("a1");
    expect(onOuterClick).not.toHaveBeenCalled();
  });

  it("applies outer and inner hover titles", () => {
    const { container } = render(() => (
      <Treemap
        {...base()}
        outerTitle={(c) => `outer ${c.key}`}
        innerTitle={(_c, i) => `inner ${i.key}`}
      />
    ));
    expect(
      outers(container)[0]
        .querySelector(".sui-treemap__outer-header")
        ?.getAttribute("title"),
    ).toBe("outer col-a");
    expect(inners(container)[0].getAttribute("title")).toBe("inner a1");
  });

  it("renders a trailing sidebar with selection and click", () => {
    const onClick = vi.fn();
    const { container } = render(() => (
      <Treemap
        {...base()}
        sidebar={{
          weight: 1,
          selected: true,
          onClick,
          content: <span>SIDE</span>,
        }}
      />
    ));
    const sb = container.querySelector<HTMLElement>(".sui-treemap__sidebar")!;
    expect(sb.textContent).toBe("SIDE");
    expect(sb.classList.contains("sui-treemap__sidebar--selected")).toBe(true);
    fireEvent.click(sb);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("SelectableTreemap variant renders the same structure", () => {
    const { container } = render(() => <SelectableTreemap {...base()} />);
    expect(container.querySelectorAll(".sui-treemap__outer").length).toBe(2);
  });
});
