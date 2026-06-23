import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { SplitQueueList } from "./SplitQueueList";

afterEach(cleanup);

interface Item {
  id: string;
}

const seed = (n: number): Item[] =>
  Array.from({ length: n }, (_, i) => ({ id: `k${i + 1}` }));

/**
 * Wire the component the way a real consumer does: two signals for the two
 * arrays, a `focused` signal updated only via `onFocusChange`, and a
 * `resolveFocused()` that resolves whatever the component currently reports as
 * focused. This reproduces the gallery's "Resolve next" loop.
 *
 * The bug under test: after the first resolve, `focused` did not advance to the
 * next unresolved head, so `resolveFocused()` targeted the already-resolved
 * item and no-op'd — the queue stuck at one resolved item.
 */
function mountConsumer(count: number) {
  const [resolved, setResolved] = createSignal<Item[]>([]);
  const [unresolved, setUnresolved] = createSignal<Item[]>(seed(count));
  const [focused, setFocused] = createSignal<string | null>(seed(count)[0].id);
  const focusEvents: (string | null)[] = [];

  const resolveKey = (key: string) => {
    const item = unresolved().find((i) => i.id === key);
    if (!item) return; // no-op if focus points at an already-resolved item
    setUnresolved((u) => u.filter((i) => i.id !== key));
    setResolved((r) => [...r, item]);
  };

  render(() => (
    <SplitQueueList<Item>
      resolved={resolved()}
      unresolved={unresolved()}
      keyOf={(i) => i.id}
      focusedKey={focused() ?? undefined}
      onFocusChange={(k) => {
        focusEvents.push(k);
        setFocused(k);
      }}
      onResolve={resolveKey}
      renderItem={(i) => <span>{i.id}</span>}
      animationMs={0}
    />
  ));

  return {
    resolved,
    unresolved,
    focused,
    focusEvents,
    resolveFocused: () => {
      const f = focused();
      if (f) resolveKey(f);
    },
  };
}

describe("SplitQueueList — repeated resolve advances focus", () => {
  it("advances focus to the next unresolved head on every resolve", () => {
    const c = mountConsumer(4);
    expect(c.focused()).toBe("k1");

    c.resolveFocused();
    expect(c.resolved().map((i) => i.id)).toEqual(["k1"]);
    // The crux: focus must move to k2 (not stay on the resolved k1).
    expect(c.focused()).toBe("k2");

    c.resolveFocused();
    expect(c.resolved().map((i) => i.id)).toEqual(["k1", "k2"]);
    expect(c.focused()).toBe("k3");

    c.resolveFocused();
    expect(c.resolved().map((i) => i.id)).toEqual(["k1", "k2", "k3"]);
    expect(c.focused()).toBe("k4");
  });

  it("drains the entire queue, not just the first item", () => {
    const c = mountConsumer(6);
    for (let i = 0; i < 6; i++) c.resolveFocused();
    expect(c.unresolved().length).toBe(0);
    expect(c.resolved().map((i) => i.id)).toEqual([
      "k1",
      "k2",
      "k3",
      "k4",
      "k5",
      "k6",
    ]);
  });

  it("fires onFocusChange with the correct next head each resolve, null at the end", () => {
    const c = mountConsumer(3);
    c.resolveFocused(); // k1 -> focus k2
    c.resolveFocused(); // k2 -> focus k3
    c.resolveFocused(); // k3 -> focus null (queue empty)
    expect(c.focusEvents).toEqual(["k2", "k3", null]);
  });
});
