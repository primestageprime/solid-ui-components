import { describe, it, expect, vi } from "vitest";
import { createSignal } from "solid-js";
import { fireEvent, render } from "@solidjs/testing-library";
import { TieableRankList, createTieableRankList } from ".";

const Harness = (p: { onChange?: (o: string[], t: boolean[]) => void }) => {
  const [order, setOrder] = createSignal(["a", "b", "c"]);
  const [ties, setTies] = createSignal([true, false]);
  return (
    <TieableRankList
      items={order()}
      getId={(id) => id}
      ties={ties()}
      itemLabel={(id) => id.toUpperCase()}
      onChange={(o, t) => {
        setOrder(o);
        setTies(t);
        p.onChange?.(o, t);
      }}
      renderItem={(id) => <span data-testid="row">{id}</span>}
      renderAction={(id) => (
        <button type="button" aria-label={`Veto ${id}`}>
          ⊘
        </button>
      )}
    />
  );
};

describe("TieableRankList", () => {
  it("joins a tie tier into one card with one rank, a ≠ divider inside, = in the gap", () => {
    const { getByLabelText, getAllByRole, container } = render(() => (
      <Harness />
    ));
    expect(getByLabelText(/^Rank 1: A = B/).textContent).toBe("1");
    expect(getByLabelText(/^Rank 2: C/).textContent).toBe("2");
    const rows = container.querySelectorAll('[role="listitem"]');
    expect(rows).toHaveLength(2);
    expect(rows[0].querySelectorAll('[data-testid="row"]')).toHaveLength(2);
    const toggles = getAllByRole("button").filter((b) =>
      b.hasAttribute("aria-pressed"),
    );
    expect(toggles.map((t) => t.getAttribute("aria-label"))).toEqual([
      "Untie A from B",
      "Tie B with C",
    ]);
    expect(getByLabelText("Veto c")).toBeTruthy();
  });

  it("= joins two cards; ≠ splits a tier", () => {
    const onChange = vi.fn();
    const { getByLabelText } = render(() => <Harness onChange={onChange} />);
    fireEvent.click(getByLabelText("Tie B with C"));
    expect(onChange).toHaveBeenLastCalledWith(["a", "b", "c"], [true, true]);
    fireEvent.click(getByLabelText("Untie A from B"));
    expect(onChange).toHaveBeenLastCalledWith(["a", "b", "c"], [false, true]);
  });

  it("Alt+ArrowDown on a tier's rank moves the whole tier, still tied", () => {
    const onChange = vi.fn();
    const { getByLabelText, getAllByTestId } = render(() => (
      <Harness onChange={onChange} />
    ));
    fireEvent.keyDown(getByLabelText(/^Rank 1: A = B/), {
      key: "ArrowDown",
      altKey: true,
    });
    expect(onChange).toHaveBeenLastCalledWith(["c", "a", "b"], [false, true]);
    expect(getAllByTestId("row").map((r) => r.textContent)).toEqual([
      "c",
      "a",
      "b",
    ]);
    fireEvent.keyDown(getByLabelText(/^Rank 1: C/), { key: "ArrowDown" });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("createTieableRankList yields a generic data-only variant", () => {
    const List = createTieableRankList();
    const { getAllByTestId } = render(() => (
      <List
        items={[{ k: "x" }]}
        getId={(i) => i.k}
        ties={[]}
        onChange={() => {}}
        renderItem={(i) => <span data-testid="r">{i.k}</span>}
      />
    ));
    expect(getAllByTestId("r")).toHaveLength(1);
  });
  it("renders the tie toggles as quiet buttons and centres the rank against the content", () => {
    const { getByLabelText } = render(() => <Harness />);
    expect(getByLabelText("Tie B with C").className).toContain(
      "sui-btn--quiet",
    );
    expect(getByLabelText("Untie A from B").className).toContain(
      "sui-btn--quiet",
    );
    const rankRow = getByLabelText(/^Rank 1: A = B/)
      .parentElement as HTMLElement;
    expect(rankRow.className).toContain("row--align-center");
  });
});
