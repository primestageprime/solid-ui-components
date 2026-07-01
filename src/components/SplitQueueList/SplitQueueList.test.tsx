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
    // Resolve an arbitrary key (random access — e.g. a middle to-categorize card,
    // exactly what renderRow's onClick does).
    resolve: (key: string) => resolveKey(key),
    // Unresolve: move a done card back to to-categorize. The consumer reorders it
    // to the done TAIL (it already is, being appended) then swaps: remove from
    // resolved, prepend to unresolved (lands at the to-categorize HEAD).
    unresolve: (key: string) => {
      const item = resolved().find((i) => i.id === key);
      if (!item) return;
      setResolved((r) => r.filter((i) => i.id !== key));
      setUnresolved((u) => [item, ...u]);
    },
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

  it("starts COLLAPSED at 0 resolved (header only) and GROWS on the first resolve", async () => {
    const c = mountConsumer(6, 400, false); // 6 unresolved, 0 resolved
    const topUl = c.container.querySelector(".sui-sql__list--top") as HTMLElement;

    // Floor 0: empty "done" panel is its header only — NOT a 1-row band. (jsdom
    // can't lay out, so the reactive height binding reflects the layout calc:
    // header 28 + 0 rows = 28.)
    expect(parseFloat(topUl.style.height)).toBeCloseTo(28, 0);

    await tick(); // let the initial rAF rect-capture run so the flight doesn't bail
    c.resolveFocused(); // k1: 0→1 now HAS a delta (28 → 28+120), so it animates
    await tick(60);
    const topMid = parseFloat(topUl.style.height || "0");
    // Mid-tween the top is growing from the collapsed header toward header+row.
    expect(topMid).toBeGreaterThan(28);
    expect(topMid).toBeLessThan(148);

    await tick(500); // settle
    expect(parseFloat(topUl.style.height)).toBeCloseTo(148, 0); // header + 1 row
    expect(c.resolved().map((i) => i.id)).toEqual(["k1"]);
  });

  it("keeps the resolved row at full rowHeight while the panes tween in lockstep", async () => {
    const c = mountConsumer(6, 400, false); // 6 unresolved, two-panel mode
    const topUl = c.container.querySelector(".sui-sql__list--top") as HTMLElement;
    const bottomUl = c.container.querySelector(
      ".sui-sql__list--bottom",
    ) as HTMLElement;

    // Resolve once (0→1, header→1 row) then again (1→2) — both grow now. We
    // sample the 1→2 grow here for the full-size-card + sum-to-total invariants.
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

describe("SplitQueueList — topOnly at cap: panel holds, list scrolls up", () => {
  // Past topCapRows (default 3) the panel STOPS growing and the list scrolls up
  // smoothly so older rows glide instead of popping. The panel height is fixed
  // at header + topCapRows*rowHeight; the enter animates scrollTop, not height.
  it("caps the panel height at header + topCapRows*rowHeight (never taller)", async () => {
    const c = mountConsumer(8, 0, true); // 8 items, instant anim, topOnly
    const topUl = c.container.querySelector(".sui-sql__list--top") as HTMLElement;
    // Resolve 5 items (well past the 3-row cap).
    for (let i = 0; i < 5; i++) {
      c.resolveFocused();
      await tick(10);
    }
    // header 28 + 3 rows * 120 = 388 — the cap. The panel must not exceed it.
    const h = parseFloat(topUl.style.height || "0");
    expect(h).toBeCloseTo(28 + 3 * 120, 0);
    expect(c.resolved().length).toBe(5); // grew past the cap in data...
    // ...but the panel height stayed at the cap (it didn't track 5 rows).
  });

  it("at cap, the enter animates scrollTop (monotonic) rather than height", async () => {
    const c = mountConsumer(8, 400, true);
    const topUl = c.container.querySelector(".sui-sql__list--top") as HTMLElement;
    // Fill to the cap first (3 resolved) so the next resolve is AT cap.
    for (let i = 0; i < 3; i++) {
      c.resolveFocused();
      await tick(500);
    }
    // jsdom has no layout, so stub scroll metrics to make a scroll range exist.
    Object.defineProperty(topUl, "clientHeight", { configurable: true, value: 388 });
    Object.defineProperty(topUl, "scrollHeight", { configurable: true, value: 508 }); // +1 row
    topUl.scrollTop = 0;
    const heightBefore = topUl.style.height;

    c.resolveFocused(); // 4th resolve — AT cap, should scroll not grow
    const samples: number[] = [];
    for (let i = 0; i < 8; i++) {
      await tick(40);
      samples.push(topUl.scrollTop);
    }
    // scrollTop advanced monotonically from 0 upward (toward scrollHeight -
    // clientHeight = 120). Mid-tween it's between 0 and 120, strictly increasing.
    expect(samples[0]).toBeGreaterThan(0);
    expect(samples[samples.length - 1]).toBeGreaterThan(samples[0]);
    expect(samples[samples.length - 1]).toBeLessThanOrEqual(120 + 0.5);
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i]).toBeGreaterThanOrEqual(samples[i - 1]);
    }
    // The panel height was NOT tweened during the scroll (no inline height churn
    // beyond the capped value): it stays at the cap.
    expect(parseFloat(topUl.style.height || heightBefore)).toBeCloseTo(388, 0);

    await tick(500); // settle
    expect(topUl.scrollTop).toBeCloseTo(120, 0); // landed flush at the bottom
    expect(c.focused()).toBe("k5"); // focus still advanced at settle
  });

  it("animates scrollTop on EVERY cap resolve, not just the first (pin race)", async () => {
    // Regression: the scroll-pin effect snapped scrollTop = scrollHeight on every
    // resolve, racing playFlight's scroll tween — so after the first cap-cross the
    // pin pre-snapped to the bottom and the tween saw fromScroll == toScroll and
    // bailed ("card just appears"). The fix guards the pin while a tween owns
    // scrollTop. This asserts resolves #4, #5, #6 each ANIMATE (not pre-snapped).
    const c = mountConsumer(10, 400, true);
    const topUl = c.container.querySelector(".sui-sql__list--top") as HTMLElement;

    // clientHeight = cap; scrollHeight grows one row per resolved card, so once
    // past the cap there's always exactly one row of scroll range to animate.
    Object.defineProperty(topUl, "clientHeight", { configurable: true, value: 388 });
    Object.defineProperty(topUl, "scrollHeight", {
      configurable: true,
      get: () => 28 + c.resolved().length * 120,
    });

    // Fill to the cap (3 resolved).
    for (let i = 0; i < 3; i++) {
      c.resolveFocused();
      await tick(500);
    }

    // Now do three MORE resolves, each at cap. Each must animate scrollTop: it
    // should NOT already be at the bottom one frame in (that's the pin pre-snap),
    // and it should climb to the new bottom by settle.
    for (let n = 4; n <= 6; n++) {
      c.resolveFocused();
      await tick(40); // one frame into the tween
      const early = topUl.scrollTop;
      const bottomNow = topUl.scrollHeight - 388; // current target
      // If the pin had pre-snapped, early would already equal bottomNow. The
      // tween means it's still climbing — strictly below the target this early.
      expect(early).toBeLessThan(bottomNow - 1);
      expect(early).toBeGreaterThan(0); // and it HAS started moving (not stuck)

      await tick(500); // settle
      expect(topUl.scrollTop).toBeCloseTo(bottomNow, 0); // landed at the new bottom
    }
  });

  it("full two-panel column also animates scrollTop on every cap resolve (pin race)", async () => {
    // Same pin-race guard must hold for the full column's capped scroll-reveal.
    const c = mountConsumer(10, 400, false); // two-panel mode
    const topUl = c.container.querySelector(".sui-sql__list--top") as HTMLElement;
    Object.defineProperty(topUl, "clientHeight", { configurable: true, value: 388 });
    Object.defineProperty(topUl, "scrollHeight", {
      configurable: true,
      get: () => 28 + c.resolved().length * 120,
    });

    await tick(); // initial rAF capture so the flight doesn't bail
    // Fill past the cap (4 resolved: floor 0 → cap 3, the 4th is the first capped).
    for (let i = 0; i < 4; i++) {
      c.resolveFocused();
      await tick(500);
    }

    // Resolves #5–#7 are all at cap and must each ANIMATE (not pre-snap).
    for (let n = 5; n <= 7; n++) {
      c.resolveFocused();
      await tick(40);
      const early = topUl.scrollTop;
      const bottomNow = topUl.scrollHeight - 388;
      expect(early).toBeLessThan(bottomNow - 1);
      expect(early).toBeGreaterThan(0);
      await tick(500);
      expect(topUl.scrollTop).toBeCloseTo(bottomNow, 0);
    }
  });
});

describe("SplitQueueList — selection API (selectedKey / onSelect)", () => {
  function mountSelectable(selected?: string) {
    const onSelect: string[] = [];
    const { container } = render(() => (
      <SplitQueueList<Item>
        resolved={seed(2)} // r-k1, r-k2
        unresolved={[{ id: "u1" }, { id: "u2" }]}
        keyOf={(i) => i.id}
        selectedKey={selected}
        onSelect={(k) => onSelect.push(k)}
        renderItem={(i) => <span>{i.id}</span>}
        animationMs={0}
        rowHeight={120}
      />
    ));
    return { container, onSelect };
  }

  it("marks the selected row (in EITHER panel) with --selected", () => {
    const top = mountSelectable("k1"); // a resolved key
    const rTop = top.container.querySelector('[data-sql-key="k1"]')!;
    expect(rTop.classList.contains("sui-sql__row--selected")).toBe(true);

    cleanup();
    const bottom = mountSelectable("u2"); // an unresolved key
    const rBot = bottom.container.querySelector('[data-sql-key="u2"]')!;
    expect(rBot.classList.contains("sui-sql__row--selected")).toBe(true);
  });

  it("no row is --selected when selectedKey is omitted", () => {
    const { container } = mountSelectable(undefined);
    expect(
      container.querySelectorAll(".sui-sql__row--selected").length,
    ).toBe(0);
  });

  it("clicking a resolved row fires onSelect with its key", () => {
    const { container, onSelect } = mountSelectable();
    (container.querySelector('[data-sql-key="k2"]') as HTMLElement).click();
    expect(onSelect).toEqual(["k2"]);
  });

  it("clicking an unresolved row fires onSelect (and NO longer auto-resolves)", () => {
    const resolveCalls: string[] = [];
    const selectCalls: string[] = [];
    const { container } = render(() => (
      <SplitQueueList<Item>
        resolved={[]}
        unresolved={seed(3)}
        keyOf={(i) => i.id}
        onSelect={(k) => selectCalls.push(k)}
        onResolve={(k) => resolveCalls.push(k)}
        renderItem={(i) => <span>{i.id}</span>}
        animationMs={0}
        rowHeight={120}
      />
    ));
    (container.querySelector('[data-sql-key="k2"]') as HTMLElement).click();
    expect(selectCalls).toEqual(["k2"]); // onSelect fires
    expect(resolveCalls).toEqual([]); // onResolve does NOT (click no longer resolves)
  });
});

describe("SplitQueueList — random-access exit: collapse lands at the resolved index", () => {
  // Clicking a MIDDLE to-categorize card resolves it; the exit collapse must
  // animate at that card's ORIGINAL position, not always at the head. In jsdom
  // the placeholder is inserted then removed across two microtasks (no WAAPI), so
  // we capture its insertion INDEX with a MutationObserver rather than polling.
  const watchCollapseIndex = (container: Element): { value: () => number } => {
    const list = container.querySelector(".sui-sql__list--bottom")!;
    let captured = -1;
    const index = (el: Element) => {
      const children = [...list.children].filter(
        (c) =>
          c.classList.contains("sui-sql__row") ||
          c.classList.contains("sui-sql__collapse"),
      );
      return children.indexOf(el);
    };
    const obs = new MutationObserver((records) => {
      for (const r of records) {
        r.addedNodes.forEach((n) => {
          if (
            n instanceof Element &&
            n.classList.contains("sui-sql__collapse")
          ) {
            captured = index(n);
          }
        });
      }
    });
    obs.observe(list, { childList: true });
    return { value: () => captured };
  };

  it("resolving a middle card collapses at that index, not the head", async () => {
    const c = mountConsumer(5, 400); // k1..k5 unresolved
    await tick(); // initial rAF capture
    const w = watchCollapseIndex(c.container);
    c.resolve("k3"); // resolve the MIDDLE card (original index 2)
    await tick(20);
    // The placeholder was inserted where k3 was (index 2), not at the head (0).
    expect(w.value()).toBe(2);
    await tick(500); // settle
    expect(c.resolved().map((i) => i.id)).toEqual(["k3"]);
    expect(c.unresolved().map((i) => i.id)).toEqual(["k1", "k2", "k4", "k5"]);
  });

  it("resolving the head card still collapses at index 0 (unchanged)", async () => {
    const c = mountConsumer(5, 400);
    await tick();
    const w = watchCollapseIndex(c.container);
    c.resolve("k1");
    await tick(20);
    expect(w.value()).toBe(0);
    await tick(500);
  });

  it("resolving the LAST card collapses at the tail without crashing", async () => {
    const c = mountConsumer(5, 400);
    await tick();
    const w = watchCollapseIndex(c.container);
    c.resolve("k5"); // last card, original index 4
    await tick(20);
    // 4 rows remain (k1..k4); the placeholder is appended after them (index 4).
    expect(w.value()).toBe(4);
    await tick(500);
    expect(c.unresolved().map((i) => i.id)).toEqual(["k1", "k2", "k3", "k4"]);
  });
});

describe("SplitQueueList — reverse (unresolve) animation mirrors resolve", () => {
  // Build a consumer that STARTS with some resolved items so we can unresolve.
  function mountWithResolved(resolvedCount: number, unresolvedCount: number, ms = 400) {
    const [resolved, setResolved] = createSignal<Item[]>(
      Array.from({ length: resolvedCount }, (_, i) => ({ id: `r${i + 1}` })),
    );
    const [unresolved, setUnresolved] = createSignal<Item[]>(
      Array.from({ length: unresolvedCount }, (_, i) => ({ id: `u${i + 1}` })),
    );
    const focusEvents: (string | null)[] = [];
    const { container } = render(() => (
      <SplitQueueList<Item>
        resolved={resolved()}
        unresolved={unresolved()}
        keyOf={(i) => i.id}
        onFocusChange={(k) => focusEvents.push(k)}
        renderItem={(i) => <span>{i.id}</span>}
        animationMs={ms}
        rowHeight={120}
      />
    ));
    return {
      container,
      resolved,
      unresolved,
      focusEvents,
      unresolve: (key: string) => {
        const item = resolved().find((i) => i.id === key);
        if (!item) return;
        setResolved((r) => r.filter((i) => i.id !== key));
        setUnresolved((u) => [item, ...u]);
      },
    };
  }

  it("unresolving the done tail animates: top shrinks, bottom grows, panes sum to total", async () => {
    const c = mountWithResolved(2, 2); // r1,r2 done · u1,u2 to-categorize
    const topUl = c.container.querySelector(".sui-sql__list--top") as HTMLElement;
    const bottomUl = c.container.querySelector(
      ".sui-sql__list--bottom",
    ) as HTMLElement;
    await tick(); // rAF capture of resolved rects

    c.unresolve("r2"); // the done TAIL → back to to-categorize head
    await tick(60); // mid-tween
    const topMid = parseFloat(topUl.style.height || "0");
    const bottomMid = parseFloat(bottomUl.style.height || "0");
    expect(topMid).toBeGreaterThan(0);
    expect(bottomMid).toBeGreaterThan(0);
    // Top shrinks from 2 rows (268) toward 1 row (148); strictly between.
    expect(topMid).toBeLessThan(268);
    expect(topMid).toBeGreaterThan(148);
    // Panes + seam sum to total each frame (no gap; seam ascends). height 420, seam 2.
    expect(topMid + bottomMid + 2).toBeCloseTo(420, 0);

    await tick(600); // settle
    expect(c.resolved().map((i) => i.id)).toEqual(["r1"]);
    expect(c.unresolved().map((i) => i.id)).toEqual(["r2", "u1", "u2"]);
  });

  it("collapses a placeholder at the DONE TAIL (top list), not the bottom head", async () => {
    const c = mountWithResolved(3, 1);
    const topList = c.container.querySelector(".sui-sql__list--top")!;
    let collapseInTop = false;
    const obs = new MutationObserver((records) => {
      for (const r of records)
        r.addedNodes.forEach((n) => {
          if (n instanceof Element && n.classList.contains("sui-sql__collapse"))
            collapseInTop = true;
        });
    });
    obs.observe(topList, { childList: true });
    await tick();
    c.unresolve("r3"); // tail of done
    await tick(40);
    expect(collapseInTop).toBe(true); // the exit collapse is in the DONE list
    obs.disconnect();
    await tick(600);
  });

  it("the arriving to-categorize card gets the bg fade-in class", async () => {
    const c = mountWithResolved(2, 1);
    const bottomList = c.container.querySelector(".sui-sql__list--bottom")!;
    let sawArriving = false;
    const obs = new MutationObserver((records) => {
      for (const r of records) {
        const el = r.target as HTMLElement;
        if (
          el.matches?.('[data-sql-key="r2"]') &&
          el.classList.contains("sui-sql__row--arriving")
        )
          sawArriving = true;
      }
    });
    obs.observe(bottomList, {
      attributes: true,
      attributeFilter: ["class"],
      subtree: true,
    });
    await tick();
    c.unresolve("r2");
    await tick(600); // settle
    expect(sawArriving).toBe(true);
    obs.disconnect();
  });

  it("reduced-motion unresolve settles instantly (no animation, arrays correct)", () => {
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
      const c = mountWithResolved(2, 1);
      c.unresolve("r2");
      expect(c.resolved().map((i) => i.id)).toEqual(["r1"]);
      expect(c.unresolved().map((i) => i.id)).toEqual(["r2", "u1"]);
      // No stranded inline overrides / no arriving class fade under reduced-motion.
      const row = c.container.querySelector(
        '.sui-sql__list--bottom [data-sql-key="r2"]',
      ) as HTMLElement;
      expect(row?.classList.contains("sui-sql__row--arriving")).toBe(false);
    } finally {
      window.matchMedia = orig;
    }
  });
});

describe("SplitQueueList — resolved row background fades in on arrival", () => {
  it("adds the arriving class to the resolved row at settle, then clears it", async () => {
    const c = mountConsumer(3, 200);
    await tick();
    // Watch the top list for the arriving class being added to the resolved row.
    const top = c.container.querySelector(".sui-sql__list--top")!;
    let sawArriving = false;
    const obs = new MutationObserver((records) => {
      for (const r of records) {
        const el = r.target as HTMLElement;
        if (
          el.matches?.('[data-sql-key="k1"]') &&
          el.classList.contains("sui-sql__row--arriving")
        ) {
          sawArriving = true;
        }
      }
    });
    obs.observe(top, {
      attributes: true,
      attributeFilter: ["class"],
      subtree: true,
    });

    c.resolve("k1");
    await tick(300); // past the collapse → settle (advanceFocusAfterExit) has run
    expect(sawArriving).toBe(true); // the bg fade-in fired on arrival

    const row = c.container.querySelector(
      '.sui-sql__list--top [data-sql-key="k1"]',
    ) as HTMLElement;
    expect(row).toBeTruthy();
    // The class is one-shot — it clears after the fade (animationend or a fallback
    // timer in jsdom, which has no animationend event).
    await tick(600);
    expect(row.classList.contains("sui-sql__row--arriving")).toBe(false);
    obs.disconnect();
  });

  it("does NOT add the arriving class under reduced-motion", () => {
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
      const c = mountConsumer(3, 200);
      c.resolve("k1"); // reduced-motion → synchronous, no flight, no fade
      const row = c.container.querySelector(
        '.sui-sql__list--top [data-sql-key="k1"]',
      ) as HTMLElement;
      expect(row).toBeTruthy();
      expect(row.classList.contains("sui-sql__row--arriving")).toBe(false);
    } finally {
      window.matchMedia = orig;
    }
  });

  it("does NOT add the arriving class to pre-resolved rows on first mount", async () => {
    // Mount already-resolved items: the detect effect's first run must not fade.
    const [resolved] = createSignal<Item[]>(seed(2));
    const [unresolved] = createSignal<Item[]>([]);
    const { container } = render(() => (
      <SplitQueueList<Item>
        resolved={resolved()}
        unresolved={unresolved()}
        keyOf={(i) => i.id}
        renderItem={(i) => <span>{i.id}</span>}
        animationMs={200}
        rowHeight={120}
      />
    ));
    await tick(50);
    const rows = container.querySelectorAll(
      ".sui-sql__list--top .sui-sql__row--arriving",
    );
    expect(rows.length).toBe(0);
  });
});

describe("SplitQueueList — collapse clones row content (no innerHTML round-trip)", () => {
  it("forward collapse placeholder deep-clones the resolved row's content", async () => {
    const c = mountConsumer(3, 400);
    await tick(); // rAF capture so the flight doesn't bail
    const list = c.container.querySelector(".sui-sql__list--bottom")!;
    let placeholder: Element | null = null;
    const obs = new MutationObserver((records) => {
      for (const r of records)
        r.addedNodes.forEach((n) => {
          if (n instanceof Element && n.classList.contains("sui-sql__collapse"))
            placeholder = n;
        });
    });
    obs.observe(list, { childList: true });
    c.resolve("k1");
    await tick(40);
    obs.disconnect();
    expect(placeholder).toBeTruthy();
    // Content span cloned from the real row — carries the rendered id text
    // (proves the clone copied nodes, not an empty/re-parsed shell).
    expect(placeholder!.querySelector(".sui-sql__content")?.textContent).toBe("k1");
    // Marker overridden to the focused glyph on the forward collapse.
    expect(placeholder!.querySelector(".sui-sql__marker")?.textContent).toBe("▸");
    await tick(500); // settle
  });
});

describe("SplitQueueList — keyboard & ARIA", () => {
  // Mount with resolved + unresolved so both panes render interactive rows.
  function mountA11y(selected?: string) {
    const onSelect: string[] = [];
    const { container } = render(() => (
      <SplitQueueList<Item>
        resolved={[{ id: "r1" }, { id: "r2" }]}
        unresolved={[{ id: "u1" }, { id: "u2" }]}
        keyOf={(i) => i.id}
        selectedKey={selected}
        onSelect={(k) => onSelect.push(k)}
        renderItem={(i) => <span>{i.id}</span>}
        animationMs={0}
        rowHeight={120}
      />
    ));
    return { container, onSelect };
  }

  const key = (el: Element, k: string) =>
    el.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true }));

  it("exposes each pane as a listbox and each row as an option", () => {
    const { container } = mountA11y();
    const lists = container.querySelectorAll('[role="listbox"]');
    expect(lists.length).toBe(2); // top (resolved) + bottom (unresolved)
    expect(
      (container.querySelector(".sui-sql__list--top") as HTMLElement).getAttribute(
        "aria-label",
      ),
    ).toBe("Resolved");

    const options = container.querySelectorAll('[role="option"]');
    expect(options.length).toBe(4); // r1, r2, u1, u2
    // Headers are presentational, not options.
    expect(
      container
        .querySelector(".sui-sql__header--top")!
        .getAttribute("role"),
    ).toBe("presentation");
  });

  it("reflects selectedKey via aria-selected", () => {
    const { container } = mountA11y("u1");
    const sel = container.querySelector('[data-sql-key="u1"]')!;
    const other = container.querySelector('[data-sql-key="u2"]')!;
    expect(sel.getAttribute("aria-selected")).toBe("true");
    expect(other.getAttribute("aria-selected")).toBe("false");
  });

  it("keeps exactly one row in the tab order (roving tabindex)", () => {
    const { container } = mountA11y();
    const rows = [...container.querySelectorAll<HTMLElement>("[data-sql-key]")];
    const tabbable = rows.filter((r) => r.getAttribute("tabindex") === "0");
    expect(tabbable.length).toBe(1);
    // With no selection, the focused unresolved head (u1) holds the tab stop.
    expect(tabbable[0].dataset.sqlKey).toBe("u1");
  });

  it("Enter and Space select the focused row (like a click)", () => {
    const { container, onSelect } = mountA11y();
    const row = container.querySelector('[data-sql-key="r2"]')!;
    key(row, "Enter");
    expect(onSelect).toEqual(["r2"]);
    key(row, " ");
    expect(onSelect).toEqual(["r2", "r2"]);
  });

  it("ArrowDown/ArrowUp move the tab stop across both panes", () => {
    const { container } = mountA11y();
    const at = (k: string) =>
      container.querySelector<HTMLElement>(`[data-sql-key="${k}"]`)!;

    // From the top pane's first row, ArrowDown walks r1 → r2 → (across seam) u1.
    key(at("r1"), "ArrowDown");
    expect(at("r2").getAttribute("tabindex")).toBe("0");
    key(at("r2"), "ArrowDown");
    expect(at("u1").getAttribute("tabindex")).toBe("0");
    // ArrowUp walks back into the top pane.
    key(at("u1"), "ArrowUp");
    expect(at("r2").getAttribute("tabindex")).toBe("0");

    // Home/End jump to the first/last row overall.
    key(at("r2"), "End");
    expect(at("u2").getAttribute("tabindex")).toBe("0");
    key(at("u2"), "Home");
    expect(at("r1").getAttribute("tabindex")).toBe("0");
  });

  it("renders an aria-live status region reporting the counts", () => {
    const { container } = mountA11y();
    const status = container.querySelector(".sui-sql__sr-status")!;
    expect(status.getAttribute("aria-live")).toBe("polite");
    expect(status.textContent).toBe("2 Resolved, 2 Unresolved");
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
