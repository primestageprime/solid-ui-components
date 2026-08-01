import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup, fireEvent } from "@solidjs/testing-library";
import { SplitQueueList } from "./SplitQueueList";

afterEach(cleanup);

interface Txn {
  id: string;
  label: string;
}

const renderQueue = (
  resolved: Txn[],
  unresolved: Txn[],
  extra: Record<string, unknown> = {},
) =>
  render(() => (
    <SplitQueueList<Txn>
      resolved={resolved}
      unresolved={unresolved}
      keyOf={(t) => t.id}
      renderItem={(t) => <span>{t.label}</span>}
      resolvedLabel="Categorized"
      unresolvedLabel="Suggestions"
      allClearLabel="All clear"
      {...extra}
    />
  ));

describe("SplitQueueList (deprecated shim over BucketQueue)", () => {
  it("renders both lists with their labels and counts", () => {
    const { container } = renderQueue(
      [{ id: "1", label: "done-1" }],
      [
        { id: "2", label: "todo-1" },
        { id: "3", label: "todo-2" },
      ],
    );
    expect(container.textContent).toContain("Categorized");
    expect(container.textContent).toContain("Suggestions");
    const counts = [...container.querySelectorAll(".bucket-queue__count")].map((c) => c.textContent);
    expect(counts).toEqual(["1", "2"]);
  });

  it("puts resolved items in the top section and unresolved in the bottom", () => {
    const { container } = renderQueue(
      [{ id: "1", label: "done-1" }],
      [{ id: "2", label: "todo-1" }],
    );
    const sections = container.querySelectorAll(".bucket-queue__bucket");
    expect(sections[0].textContent).toContain("done-1");
    expect(sections[1].textContent).toContain("todo-1");
  });

  it("fires onSelect from either list", () => {
    let picked: string | undefined;
    const { container } = renderQueue(
      [{ id: "1", label: "done-1" }],
      [{ id: "2", label: "todo-1" }],
      { onSelect: (k: string) => (picked = k) },
    );
    fireEvent.click(container.querySelector('[data-bq-key="1"]') as HTMLElement);
    expect(picked).toBe("1");
  });

  it("shows allClearLabel when the unresolved list is empty", () => {
    const { container } = renderQueue([{ id: "1", label: "done-1" }], []);
    expect(container.textContent).toContain("All clear");
  });

  it("toggles checks on unresolved rows in select mode", () => {
    let toggled: string | undefined;
    const { container } = renderQueue([], [{ id: "2", label: "todo-1" }], {
      selectMode: true,
      checkedKeys: new Set<string>(),
      onToggleCheck: (k: string) => (toggled = k),
    });
    fireEvent.click(container.querySelector('[data-bq-key="2"]') as HTMLElement);
    expect(toggled).toBe("2");
  });

  it("caps the resolved section at topCapRows and keeps every row mounted so the body scrolls", () => {
    const resolved = [1, 2, 3, 4, 5].map((n) => ({ id: String(n), label: `done-${n}` }));
    const { container } = renderQueue(resolved, [], { topCapRows: 2, height: 600 });
    const sections = container.querySelectorAll(".bucket-queue__bucket");
    // 34 (header fallback) + 2*54 (row fallback) + 2 (border) — capRows is a
    // ceiling on the section's natural height, not a filter on its rows.
    expect((sections[0] as HTMLElement).style.height).toBe("144px");
    expect(sections[0].querySelectorAll(".bucket-queue__row")).toHaveLength(5);
  });

  it("defaults topCapRows to 3 when omitted", () => {
    const resolved = [1, 2, 3, 4, 5].map((n) => ({ id: String(n), label: `done-${n}` }));
    const { container } = renderQueue(resolved, [], { height: 600 });
    const sections = container.querySelectorAll(".bucket-queue__bucket");
    expect((sections[0] as HTMLElement).style.height).toBe("198px"); // 34 + 3*54 + 2
    expect(sections[0].querySelectorAll(".bucket-queue__row")).toHaveLength(5);
  });

  it("selectMode={false} opts out even with a populated checkedKeys", () => {
    let selected: string | undefined;
    let toggled: string | undefined;
    const { container } = renderQueue([], [{ id: "2", label: "todo-1" }], {
      selectMode: false,
      checkedKeys: new Set(["2"]),
      onSelect: (k: string) => (selected = k),
      onToggleCheck: (k: string) => (toggled = k),
    });
    expect(container.querySelector(".bucket-queue__checkbox")).toBeNull();
    fireEvent.click(container.querySelector('[data-bq-key="2"]') as HTMLElement);
    expect(selected).toBe("2");
    expect(toggled).toBeUndefined();
  });

  it("selectMode omitted opts out even with a populated checkedKeys", () => {
    // Old behavior (fc056e8 SplitQueueList.tsx:270): `selecting` gated on
    // `!!props.selectMode` alone, so a consumer holding a checked set with no
    // selectMode prop got plain onSelect, not check affordances.
    let selected: string | undefined;
    let toggled: string | undefined;
    const { container } = renderQueue([], [{ id: "2", label: "todo-1" }], {
      checkedKeys: new Set(["2"]),
      onSelect: (k: string) => (selected = k),
      onToggleCheck: (k: string) => (toggled = k),
    });
    expect(container.querySelector(".bucket-queue__checkbox")).toBeNull();
    fireEvent.click(container.querySelector('[data-bq-key="2"]') as HTMLElement);
    expect(selected).toBe("2");
    expect(toggled).toBeUndefined();
  });

  it("selectMode={true} opts in even with checkedKeys omitted", () => {
    // Old behavior: selectMode alone turned select mode ON, with nothing
    // checked until the consumer populated checkedKeys.
    let toggled: string | undefined;
    const { container } = renderQueue([], [{ id: "2", label: "todo-1" }], {
      selectMode: true,
      onToggleCheck: (k: string) => (toggled = k),
    });
    expect(container.querySelector(".bucket-queue__checkbox")).toBeTruthy();
    fireEvent.click(container.querySelector('[data-bq-key="2"]') as HTMLElement);
    expect(toggled).toBe("2");
  });

  it("still delegates `static` mode to StaticSplitLayout", () => {
    const { container } = render(() => (
      <SplitQueueList<Txn>
        static
        topItems={[{ id: "1", label: "recent" }]}
        renderTop={(t) => <span>{t.label}</span>}
        keyOf={(t) => t.id}
        resolvedLabel="done · today"
        bottomContent={<div>bottom block</div>}
      />
    ));
    expect(container.querySelector(".sui-sql")).toBeTruthy();
    expect(container.textContent).toContain("bottom block");
  });
});
