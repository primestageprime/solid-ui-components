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
function mountConsumer(count: number, animationMs = 0, topOnly = false) {
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

  const { container } = render(() => (
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
      rowHeight={120}
      topOnly={topOnly}
    />
  ));

  return {
    container,
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

describe("SplitQueueList — full-component enter: TOP grows, panes sum to total", () => {
  // The full two-panel enter mirrors the topOnly panel-grow: the resolved card
  // is full-size and stationary; the TOP <ul> grows old→new while the BOTTOM
  // <ul> is DRIVEN as the remainder so the panes never gap (seam descends).
  it("keeps the resolved row at full rowHeight while the panes tween in lockstep", async () => {
    const c = mountConsumer(6, 400, false); // 6 unresolved, two-panel mode
    const topUl = c.container.querySelector(".sui-sql__list--top") as HTMLElement;
    const bottomUl = c.container.querySelector(
      ".sui-sql__list--bottom",
    ) as HTMLElement;

    // First resolve (0→1) is the floor case (top already 1 row, no growth).
    // Resolve again (1→2) so the TOP actually GROWS a row — the case we verify.
    c.resolveFocused();
    await tick(500);
    c.resolveFocused(); // k2: top grows 1 row to reveal the new full card

    await tick(60); // sample mid-tween
    const topMid = parseFloat(topUl.style.height || "0");
    const bottomMid = parseFloat(bottomUl.style.height || "0");

    // The resolved card is rendered at full fixed height in the top list — its
    // inline min-height is the full rowHeight and is NEVER shrunk to fit.
    const row = c.container.querySelector(
      '.sui-sql__list--top [data-sql-key="k2"]',
    ) as HTMLElement;
    expect(row).toBeTruthy();
    expect(row.style.minHeight).toBe("120px");

    // Mid-tween BOTH panes carry an inline (driven) height — the bottom is not
    // left snapped; it's driven down in lockstep with the top growing.
    expect(topMid).toBeGreaterThan(0);
    expect(bottomMid).toBeGreaterThan(0);

    // The top is GROWING: mid-tween it is taller than its 1-row start (148) but
    // not yet at its 2-row end (268) — a real tween, not a snap.
    expect(topMid).toBeGreaterThan(148);
    expect(topMid).toBeLessThan(268);

    // Panes + seam sum to the total height at the sampled frame (no gap). The
    // default height is 420 and SEAM_HEIGHT is 2.
    expect(topMid + bottomMid + 2).toBeCloseTo(420, 0);

    await tick(500); // let the tween settle and release inline overrides
    expect(c.resolved().map((i) => i.id)).toEqual(["k1", "k2"]);
    expect(c.focused()).toBe("k3"); // focus advanced at the end of the collapse
  });
});

describe("SplitQueueList — topOnly enter: PANEL grows to reveal a FIXED card", () => {
  // The corrected model: the card is ALWAYS its full, fixed rowHeight (120px)
  // from frame 0 — it never resizes. The PANEL (top <ul>) height is what
  // animates, growing old→new; overflow:hidden clips the stationary full-size
  // card so the panel's S edge reveals it N-edge-first.
  it("keeps the resolved row at full rowHeight while the panel height tweens", async () => {
    const c = mountConsumer(2, 400, true);
    const topUl = c.container.querySelector(
      ".sui-sql__list--top",
    ) as HTMLElement;

    c.resolveFocused(); // resolve k1 → top panel must grow by one 120px row

    // Mid-tween: sample the inline panel height while the ticker is running.
    await tick(60);
    const midH = parseFloat(topUl.style.height || "0");

    // The resolved card itself is rendered at full fixed height — its inline
    // min-height is the full rowHeight and is NEVER shrunk to fit the panel.
    const row = c.container.querySelector(
      '.sui-sql__list--top [data-sql-key="k1"]',
    ) as HTMLElement;
    expect(row).toBeTruthy();
    expect(row.style.minHeight).toBe("120px");

    // The panel is mid-grow (clipping the full card), not snapped to full height.
    // It is taller than just the header but has not yet reached the final height.
    await tick(500); // let the tween settle
    const finalH = parseFloat(topUl.style.height || "0");
    expect(finalH).toBeGreaterThan(midH); // panel grew over time, not instantly
    // Final reveals the whole card: header + one full 120px row.
    expect(finalH).toBeGreaterThanOrEqual(120);
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
