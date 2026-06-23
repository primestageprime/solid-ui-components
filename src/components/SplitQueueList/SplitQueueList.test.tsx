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

const tick = (ms = 150) => new Promise((r) => setTimeout(r, ms));

/**
 * Wire the component the way the gallery does: two arrays, a `focused` signal
 * updated only via `onFocusChange`, and a `resolveFocused()` that resolves the
 * current head — preferring `focused` but falling back to the unresolved head
 * (exactly like the showcase's "Resolve next"). The fallback matters because
 * focus is now advanced asynchronously, at the END of the resolve animation
 * (the exit collapse and the enter slide run simultaneously over the full
 * duration): while the card is collapsing the component reports focus as null so
 * no real row lights up, then fires onFocusChange with the new head once it's
 * gone.
 *
 * Regression guards: focus still advances on EVERY resolve, and the queue
 * always drains (the original "stuck after one item" bug must stay fixed).
 */
function mountConsumer(count: number, animationMs = 0) {
  const [resolved, setResolved] = createSignal<Item[]>([]);
  const [unresolved, setUnresolved] = createSignal<Item[]>(seed(count));
  const [focused, setFocused] = createSignal<string | null>(seed(count)[0].id);
  const focusEvents: (string | null)[] = [];

  const resolveKey = (key: string) => {
    const item = unresolved().find((i) => i.id === key);
    if (!item) return;
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
      animationMs={animationMs}
    />
  ));

  return {
    resolved,
    unresolved,
    focused,
    focusEvents,
    // Prefer focus, fall back to the unresolved head (as the showcase does), so
    // a queue still drains while focus is briefly suppressed during a collapse.
    resolveFocused: () => {
      const list = unresolved();
      const f = focused();
      const next = (f && list.some((i) => i.id === f) ? f : list[0]?.id) ?? null;
      if (next) resolveKey(next);
    },
  };
}

describe("SplitQueueList — repeated resolve advances focus (deferred to exit end)", () => {
  it("advances focus to the next unresolved head after each resolve's collapse", async () => {
    const c = mountConsumer(4);
    expect(c.focused()).toBe("k1");

    c.resolveFocused();
    expect(c.resolved().map((i) => i.id)).toEqual(["k1"]);
    await tick(); // focus advances at the end of the exit collapse
    expect(c.focused()).toBe("k2");

    c.resolveFocused();
    await tick();
    expect(c.resolved().map((i) => i.id)).toEqual(["k1", "k2"]);
    expect(c.focused()).toBe("k3");

    c.resolveFocused();
    await tick();
    expect(c.resolved().map((i) => i.id)).toEqual(["k1", "k2", "k3"]);
    expect(c.focused()).toBe("k4");
  });

  it("drains the entire queue with the head-fallback (Auto-play style)", async () => {
    const c = mountConsumer(6);
    for (let i = 0; i < 6; i++) {
      c.resolveFocused();
      await tick(30);
    }
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

  it("fires onFocusChange with the correct next head each resolve, null at the end", async () => {
    const c = mountConsumer(3);
    c.resolveFocused();
    await tick();
    c.resolveFocused();
    await tick();
    c.resolveFocused();
    await tick();
    expect(c.focusEvents).toEqual(["k2", "k3", null]);
  });
});

describe("SplitQueueList — reduced-motion advances focus synchronously", () => {
  it("with prefers-reduced-motion, focus advances immediately (no phases)", () => {
    // Force reduced-motion so the component takes the no-animation path.
    const orig = window.matchMedia;
    window.matchMedia = ((q: string) =>
      ({
        matches: /reduce/.test(q),
        media: q,
        addEventListener() {},
        removeEventListener() {},
        addListener() {},
        removeListener() {},
        onchange: null,
        dispatchEvent() {
          return false;
        },
      }) as unknown as MediaQueryList) as typeof window.matchMedia;
    try {
      const c = mountConsumer(3);
      c.resolveFocused();
      // No collapse phase — focus is advanced in the same tick.
      expect(c.focused()).toBe("k2");
      c.resolveFocused();
      expect(c.focused()).toBe("k3");
    } finally {
      window.matchMedia = orig;
    }
  });
});
