import { describe, it, expect } from "vitest";
import { render } from "@solidjs/testing-library";
import { For, type Component } from "solid-js";
import {
  NestedList,
  NestedListItem,
  NESTED_LIST_MAX_INDENT_STEPS,
} from "./NestedList";

type Node = { label: string; children?: Node[] };

/** The whole point of the primitive: a recursive render with no `level` prop. */
const TreeNode: Component<{ node: Node }> = (p) => (
  <NestedListItem
    subtree={
      p.node.children?.length ? (
        <For each={p.node.children}>{(c) => <TreeNode node={c} />}</For>
      ) : undefined
    }
  >
    <span>{p.node.label}</span>
  </NestedListItem>
);

const levelsOf = (container: HTMLElement): string[] =>
  Array.from(container.querySelectorAll("[role='listitem']")).map(
    (el) => el.getAttribute("aria-level") ?? "",
  );

const rowOf = (item: Element): Element =>
  item.querySelector(".sui-nested-list__row") as Element;

describe("NestedList / NestedListItem — semantics", () => {
  it("emits list/listitem, not tree/treeitem (no keyboard contract is claimed)", () => {
    const { container } = render(() => (
      <NestedList>
        <NestedListItem>a</NestedListItem>
      </NestedList>
    ));
    expect(container.querySelector("[role='list']")).not.toBeNull();
    expect(container.querySelector("[role='listitem']")).not.toBeNull();
    expect(container.querySelector("[role='tree']")).toBeNull();
    expect(container.querySelector("[role='treeitem']")).toBeNull();
  });

  it("derives aria-level from context across several depths — no level prop anywhere", () => {
    const tree: Node = {
      label: "root",
      children: [
        { label: "a", children: [{ label: "a1", children: [{ label: "a1x" }] }] },
        { label: "b" },
      ],
    };
    const { container } = render(() => (
      <NestedList>
        <TreeNode node={tree} />
      </NestedList>
    ));
    // Document order: root(1), a(2), a1(3), a1x(4), b(2)
    expect(levelsOf(container)).toEqual(["1", "2", "3", "4", "2"]);
  });

  it("a nested subtree emits its own role=list group", () => {
    const { container } = render(() => (
      <NestedList>
        <NestedListItem subtree={<NestedListItem>child</NestedListItem>}>
          parent
        </NestedListItem>
      </NestedList>
    ));
    expect(container.querySelectorAll("[role='list']").length).toBe(2);
  });

  it("constructs each node exactly once — the subtree getter is read once", () => {
    // `subtree` is a JSX-valued prop, i.e. a getter. Reading it for a
    // truthiness check AND again to render it rebuilds the whole subtree,
    // which in a recursive render is 2^depth constructions. Guard the shape.
    let built = 0;
    const Chain: Component<{ d: number }> = (p) => {
      built++;
      return (
        <NestedListItem subtree={p.d > 1 ? <Chain d={p.d - 1} /> : undefined}>
          n
        </NestedListItem>
      );
    };
    render(() => (
      <NestedList>
        <Chain d={6} />
      </NestedList>
    ));
    expect(built).toBe(6);
  });

  it("a leaf emits no group (an empty role=list would announce an empty list)", () => {
    const { container } = render(() => (
      <NestedList>
        <NestedListItem>leaf</NestedListItem>
      </NestedList>
    ));
    expect(container.querySelectorAll("[role='list']").length).toBe(1);
  });

  it("derives a group id from the item id, for a toggle's aria-controls", () => {
    const { container } = render(() => (
      <NestedList>
        <NestedListItem id="w1" subtree={<NestedListItem>c</NestedListItem>}>
          parent
        </NestedListItem>
      </NestedList>
    ));
    expect(container.querySelector("#w1-group")?.getAttribute("role")).toBe(
      "list",
    );
  });

  it("emits no group id when the item has none", () => {
    const { container } = render(() => (
      <NestedList>
        <NestedListItem subtree={<NestedListItem>c</NestedListItem>}>
          parent
        </NestedListItem>
      </NestedList>
    ));
    const groups = Array.from(container.querySelectorAll("[role='list']"));
    expect(groups.some((g) => g.hasAttribute("id"))).toBe(false);
  });

  it("omits aria-setsize/aria-posinset unless supplied; emits them when it is", () => {
    const { container } = render(() => (
      <NestedList>
        <NestedListItem>bare</NestedListItem>
        <NestedListItem setSize={40} posInSet={7}>
          virtualised
        </NestedListItem>
      </NestedList>
    ));
    const items = container.querySelectorAll("[role='listitem']");
    expect(items[0].hasAttribute("aria-setsize")).toBe(false);
    expect(items[0].hasAttribute("aria-posinset")).toBe(false);
    expect(items[1].getAttribute("aria-setsize")).toBe("40");
    expect(items[1].getAttribute("aria-posinset")).toBe("7");
  });
});

describe("NestedList / NestedListItem — indent", () => {
  it("depth 0 (aria-level 1) renders with zero indent", () => {
    const { container } = render(() => (
      <NestedList>
        <NestedListItem>root</NestedListItem>
      </NestedList>
    ));
    const item = container.querySelector("[role='listitem']") as Element;
    expect(item.getAttribute("aria-level")).toBe("1");
    expect(
      rowOf(item).classList.contains("sui-nested-list__row--indent-0"),
    ).toBe(true);
    expect(item.hasAttribute("data-capped")).toBe(false);
  });

  it("indent step count tracks level - 1", () => {
    const { container } = render(() => (
      <NestedList>
        <For each={[1, 2, 3, 5]}>
          {(l) => <NestedListItem level={l}>row</NestedListItem>}
        </For>
      </NestedList>
    ));
    const rows = Array.from(container.querySelectorAll("[role='listitem']")).map(
      (i) => rowOf(i).className,
    );
    expect(rows[0]).toContain("--indent-0");
    expect(rows[1]).toContain("--indent-1");
    expect(rows[2]).toContain("--indent-2");
    expect(rows[3]).toContain("--indent-4");
  });
});

describe("NestedListItem — explicit level override", () => {
  it("wins over the context (the flat/virtualised case)", () => {
    const { container } = render(() => (
      <NestedList>
        <NestedListItem level={4}>row 4000</NestedListItem>
      </NestedList>
    ));
    const item = container.querySelector("[role='listitem']") as Element;
    expect(item.getAttribute("aria-level")).toBe("4");
    expect(rowOf(item).className).toContain("--indent-3");
  });

  it("re-seeds the context, so descendants continue from it", () => {
    const { container } = render(() => (
      <NestedList>
        <NestedListItem
          level={7}
          subtree={
            <NestedListItem subtree={<NestedListItem>gc</NestedListItem>}>
              child
            </NestedListItem>
          }
        >
          detached branch
        </NestedListItem>
      </NestedList>
    ));
    expect(levelsOf(container)).toEqual(["7", "8", "9"]);
  });

  it("clamps a nonsense level to 1 rather than emitting a dead modifier class", () => {
    const { container } = render(() => (
      <NestedList>
        <NestedListItem level={0}>zero</NestedListItem>
        <NestedListItem level={-3}>negative</NestedListItem>
      </NestedList>
    ));
    for (const item of Array.from(
      container.querySelectorAll("[role='listitem']"),
    )) {
      expect(item.getAttribute("aria-level")).toBe("1");
      expect(rowOf(item).className).toContain("--indent-0");
    }
  });
});

describe("NestedListItem — deep-nesting degradation", () => {
  const MAX = NESTED_LIST_MAX_INDENT_STEPS;

  it("indents up to the cap without marking the row", () => {
    const { container } = render(() => (
      <NestedList>
        <NestedListItem level={MAX + 1}>at the cap</NestedListItem>
      </NestedList>
    ));
    const item = container.querySelector("[role='listitem']") as Element;
    expect(item.getAttribute("aria-level")).toBe(String(MAX + 1));
    expect(rowOf(item).className).toContain(`--indent-${MAX}`);
    expect(rowOf(item).className).not.toContain("--capped");
    expect(item.hasAttribute("data-capped")).toBe(false);
  });

  it("stops indenting past the cap but keeps aria-level exact", () => {
    const deep = [MAX + 2, MAX + 10, 30];
    const { container } = render(() => (
      <NestedList>
        <For each={deep}>
          {(l) => <NestedListItem level={l}>deep</NestedListItem>}
        </For>
      </NestedList>
    ));
    const items = Array.from(container.querySelectorAll("[role='listitem']"));
    items.forEach((item, i) => {
      expect(item.getAttribute("aria-level")).toBe(String(deep[i]));
      expect(rowOf(item).className).toContain(`--indent-${MAX}`);
      expect(rowOf(item).className).toContain("--capped");
      expect(item.getAttribute("data-capped")).toBe("true");
    });
  });

  it("caps recursively-derived depth too", () => {
    // Build a 12-deep chain with no level props at all.
    const chain = (depth: number): Node =>
      depth === 1 ? { label: "leaf" } : { label: `n${depth}`, children: [chain(depth - 1)] };
    const { container } = render(() => (
      <NestedList>
        <TreeNode node={chain(12)} />
      </NestedList>
    ));
    const items = Array.from(container.querySelectorAll("[role='listitem']"));
    expect(items.length).toBe(12);
    expect(items[11].getAttribute("aria-level")).toBe("12");
    expect(rowOf(items[11]).className).toContain(`--indent-${MAX}`);
    expect(rowOf(items[11]).className).toContain("--capped");
  });
});

describe("NestedList — passthrough", () => {
  it("keeps caller classes and spreads native attributes", () => {
    const { container } = render(() => (
      <NestedList class="my-rail" aria-label="Work breakdown">
        <NestedListItem class="my-row">x</NestedListItem>
      </NestedList>
    ));
    const list = container.querySelector("[role='list']") as Element;
    expect(list.classList.contains("sui-nested-list")).toBe(true);
    expect(list.classList.contains("my-rail")).toBe(true);
    expect(list.getAttribute("aria-label")).toBe("Work breakdown");
    const item = container.querySelector("[role='listitem']") as Element;
    expect(item.classList.contains("sui-nested-list__item")).toBe(true);
    expect(item.classList.contains("my-row")).toBe(true);
  });
});
