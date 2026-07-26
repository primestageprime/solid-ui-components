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

describe("SplitQueueList (deprecated shim over ProgressionQueue)", () => {
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
    const counts = [...container.querySelectorAll(".prog-queue__count")].map((c) => c.textContent);
    expect(counts).toEqual(["1", "2"]);
  });

  it("puts resolved items in the top section and unresolved in the bottom", () => {
    const { container } = renderQueue(
      [{ id: "1", label: "done-1" }],
      [{ id: "2", label: "todo-1" }],
    );
    const sections = container.querySelectorAll(".prog-queue__section");
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
    fireEvent.click(container.querySelector('[data-pq-key="1"]') as HTMLElement);
    expect(picked).toBe("1");
  });

  it("shows allClearLabel when the unresolved list is empty", () => {
    const { container } = renderQueue([{ id: "1", label: "done-1" }], []);
    expect(container.textContent).toContain("All clear");
  });

  it("toggles checks on unresolved rows in select mode", () => {
    let toggled: string | undefined;
    const { container } = renderQueue([], [{ id: "2", label: "todo-1" }], {
      checkedKeys: new Set<string>(),
      onToggleCheck: (k: string) => (toggled = k),
    });
    fireEvent.click(container.querySelector('[data-pq-key="2"]') as HTMLElement);
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
