// Engine-behavior tests. jsdom has no `element.animate`, so effects
// resolve immediately — which is exactly what lets us test SEQUENCING
// (order, commits, skips, fast-forward) without faking a timeline.
import { describe, expect, it } from "vitest";
import {
  choreograph,
  collapse,
  commit,
  expand,
  step,
  weightedStep,
  type EffectInstance,
} from "./choreography";

const probe = (handle: string, log: string[], tag: string): EffectInstance => ({
  handle,
  run: (el) => {
    log.push(`${tag}:${el.dataset.anim}`);
    return null;
  },
});

const mount = (html: string) => {
  document.body.innerHTML = html;
};

describe("choreograph", () => {
  it("runs steps in order and commits between them", async () => {
    mount(`<div data-anim="a"></div><div data-anim="b"></div>`);
    const log: string[] = [];
    await choreograph([
      step(probe("a", log, "s1")),
      commit(() => log.push("commit")),
      step(probe("b", log, "s2")),
    ]);
    expect(log).toEqual(["s1:a", "commit", "s2:b"]);
  });

  it("skips effects whose handle does not resolve", async () => {
    mount(`<div data-anim="present"></div>`);
    const log: string[] = [];
    await choreograph([
      step(probe("missing", log, "x"), probe("present", log, "ok")),
      step(probe("", log, "empty")),
    ]);
    expect(log).toEqual(["ok:present"]);
  });

  it("resolves inner selectors within the handle element", async () => {
    mount(`<div data-anim="card"><span class="surface"></span></div>`);
    const seen: string[] = [];
    await choreograph([
      step({
        handle: "card",
        inner: ".surface",
        run: (el) => {
          seen.push(el.tagName);
          return null;
        },
      }),
    ]);
    expect(seen).toEqual(["SPAN"]);
  });

  it("fast-forwards a superseded sequence: remaining commits still run", async () => {
    mount(`<div data-anim="a"></div>`);
    const log: string[] = [];
    // First sequence parks on a commit-after-effects shape; because jsdom
    // effects resolve instantly the way to observe fast-forward is to
    // start the second sequence BEFORE awaiting the first.
    const first = choreograph([
      step(probe("a", log, "first")),
      commit(() => log.push("first-commit")),
    ]);
    const second = choreograph([commit(() => log.push("second-commit"))]);
    await Promise.all([first, second]);
    expect(log).toContain("first-commit");
    expect(log).toContain("second-commit");
    // State is never lost: every commit ran exactly once.
    expect(log.filter((l) => l === "first-commit")).toHaveLength(1);
  });

  it("weights shape per-step durations from one budget", async () => {
    mount(`<div data-anim="a"></div><div data-anim="b"></div>`);
    const durations: number[] = [];
    const timed = (handle: string): EffectInstance => ({
      handle,
      run: (_el, ms) => {
        durations.push(ms);
        return null;
      },
    });
    await choreograph(
      [weightedStep(3, timed("a")), weightedStep(1, timed("b"))],
      { totalMs: 400 },
    );
    expect(durations).toEqual([300, 100]);
  });

  it("completes even when requestAnimationFrame never fires (hidden tab)", async () => {
    mount(`<div data-anim="a"></div>`);
    const realRaf = globalThis.requestAnimationFrame;
    // Simulate an occluded tab: rAF callbacks are swallowed forever.
    globalThis.requestAnimationFrame = (() => 0) as typeof requestAnimationFrame;
    try {
      const log: string[] = [];
      await choreograph([
        commit(() => log.push("commit")),
        step(probe("a", log, "after")),
      ]);
      expect(log).toEqual(["commit", "after:a"]);
    } finally {
      globalThis.requestAnimationFrame = realRaf;
    }
  });

  it("verbs return null (skip) when element.animate is unavailable", () => {
    mount(`<div data-anim="a"></div>`);
    const el = document.querySelector<HTMLElement>('[data-anim="a"]')!;
    expect(collapse("a").run(el, 100)).toBeNull();
    expect(expand("a").run(el, 100)).toBeNull();
  });
});
