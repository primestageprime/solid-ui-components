import { describe, it, expect } from "vitest";
import { createRoot } from "solid-js";
import { createSubmitAction } from "./createSubmitAction";

const deferred = () => {
  let resolve!: (v: unknown) => void;
  const promise = new Promise((r) => (resolve = r));
  return { promise, resolve };
};

const inRoot = <T>(fn: () => T): T => createRoot(() => fn());

describe("createSubmitAction", () => {
  it("is pending while the work runs and ignores a second run", async () => {
    let calls = 0;
    const d = deferred();
    const a = inRoot(() =>
      createSubmitAction(() => {
        calls += 1;
        return d.promise;
      }),
    );
    const first = a.run();
    const second = a.run();
    expect(a.pending()).toBe(true);
    await second;
    d.resolve(undefined);
    await first;
    expect(calls).toBe(1);
    expect(a.pending()).toBe(false);
  });

  it("shows the pending state before synchronous work starts", async () => {
    let pendingWhenRun = false;
    const a = inRoot(() =>
      createSubmitAction(() => {
        pendingWhenRun = a.pending();
      }),
    );
    await a.run();
    expect(pendingWhenRun).toBe(true);
  });

  it("with once, is spent after a sent run and rearms", async () => {
    let calls = 0;
    const a = inRoot(() =>
      createSubmitAction(() => {
        calls += 1;
      }, { once: true }),
    );
    await a.run();
    await a.run();
    expect(calls).toBe(1);
    expect(a.spent()).toBe(true);
    a.rearm();
    await a.run();
    expect(calls).toBe(2);
  });

  it("with once, stays armed when the work refuses or throws", async () => {
    let answer: unknown = false;
    const a = inRoot(() => createSubmitAction(() => answer, { once: true }));
    await a.run();
    expect(a.spent()).toBe(false);
    const b = inRoot(() =>
      createSubmitAction(() => {
        throw new Error("no");
      }, { once: true }),
    );
    await expect(b.run()).rejects.toThrow("no");
    expect(b.spent()).toBe(false);
    expect(b.pending()).toBe(false);
    answer = true;
    await a.run();
    expect(a.spent()).toBe(true);
  });

  it("without once, is never spent", async () => {
    const a = inRoot(() => createSubmitAction(() => true));
    await a.run();
    expect(a.spent()).toBe(false);
  });
});
