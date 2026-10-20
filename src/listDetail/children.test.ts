import { describe, expect, it } from "vitest";
import { weekStart } from "../fn/weekStart";
import { bucketOf, defineChildren, pickBucket, type Bucket } from "./children";

// A project with ordered phases: the module names neither.
type Phase = {
  id: string;
  label: string;
  status: "idle" | "live" | "over";
  startedAt?: string | null;
  completedAt?: string | null;
  log: { id: string; at: string; text: string }[];
};
type Project = {
  id: string;
  createdAt: string;
  phases: Phase[];
  focusPhase?: string;
};

const phases = defineChildren({
  key: "phases",
  focus: "focusPhase",
  status: { pending: "idle", current: "live", complete: "over" },
  lines: { started: "Began", completed: "Ended", reopened: "Again" },
});

const phase = (
  id: string,
  status: Phase["status"],
  extra: Partial<Phase> = {},
): Phase => ({
  ...phases.child(id, { label: id }),
  status,
  ...extra,
});
const project = (...ps: Phase[]): Project => ({
  id: "p",
  createdAt: "2026-01-01T00:00:00.000Z",
  phases: ps,
});
const T1 = "2026-10-21T10:00:00.000Z";
const T2 = "2026-10-21T11:00:00.000Z";

describe("defineChildren", () => {
  it("child() makes a pending child with an empty log and the app's fields", () => {
    expect(phases.child("x", { label: "X" })).toEqual({
      id: "x",
      label: "X",
      status: "idle",
      log: [],
    });
  });

  it("kindOf and progress read the statuses", () => {
    expect(phases.kindOf(project(phase("a", "idle"), phase("b", "idle")))).toBe(
      "pending",
    );
    expect(phases.kindOf(project(phase("a", "over"), phase("b", "idle")))).toBe(
      "current",
    );
    expect(phases.kindOf(project(phase("a", "over"), phase("b", "over")))).toBe(
      "complete",
    );
    expect(
      phases.progress(project(phase("a", "over"), phase("b", "idle"))),
    ).toEqual({ done: 1, active: 0, total: 2 });
    expect(
      phases.progress(project(phase("a", "over"), phase("b", "live"), phase("c", "idle"))),
    ).toEqual({ done: 1, active: 1, total: 3 });
  });

  it("bucketOf returns the first matching bucket's id from app-supplied buckets, else undefined", () => {
    const now = new Date("2026-10-21T12:00:00");
    const lastDone = (p: Project) =>
      new Date(
        p.phases.reduce(
          (m, c) => (c.completedAt && c.completedAt > m ? c.completedAt : m),
          "",
        ),
      ).getTime();
    const buckets: Bucket<Project, "queue" | "now" | "week" | "old">[] = [
      { id: "queue", when: (p) => phases.kindOf(p) === "pending" },
      { id: "now", when: (p) => phases.kindOf(p) === "current" },
      { id: "week", when: (p, n) => lastDone(p) >= weekStart(n).getTime() },
      { id: "old", when: () => true },
    ];
    expect(bucketOf(project(phase("a", "idle")), buckets, now)).toBe("queue");
    expect(bucketOf(project(phase("a", "live")), buckets, now)).toBe("now");
    expect(
      bucketOf(
        project(phase("a", "over", { completedAt: "2026-10-20T10:00:00" })),
        buckets,
        now,
      ),
    ).toBe("week");
    expect(
      bucketOf(
        project(phase("a", "over", { completedAt: "2026-10-18T23:00:00" })),
        buckets,
        now,
      ),
    ).toBe("old");
    expect(
      bucketOf(project(), [{ id: "x", when: () => false }], now),
    ).toBeUndefined();
  });

  it("activityAt is the latest stamp, else the creation time", () => {
    expect(phases.activityAt(project(phase("a", "idle")))).toBe(
      "2026-01-01T00:00:00.000Z",
    );
    expect(
      phases.activityAt(
        project(phase("a", "over", { startedAt: T1, completedAt: T2 })),
      ),
    ).toBe(T2);
  });

  it("pick: the chosen child, else the live one, else the first idle, else the last", () => {
    const base = project(
      phase("a", "over"),
      phase("b", "live"),
      phase("c", "idle"),
    );
    expect(phases.pick(base)?.id).toBe("b");
    expect(phases.pick({ ...base, focusPhase: "c" })?.id).toBe("c");
    expect(
      phases.pick(project(phase("a", "over"), phase("c", "idle")))?.id,
    ).toBe("c");
    expect(
      phases.pick(project(phase("a", "over"), phase("b", "over")))?.id,
    ).toBe("b");
    expect(phases.pick(undefined)).toBeUndefined();
  });

  it("advance completes the focused child (logging its start too), activates the next, and carries on", () => {
    const p0 = project(phase("a", "idle"), phase("b", "idle"));
    const first = phases.advance(p0, T1);
    expect(first.phases[0]).toMatchObject({
      status: "over",
      startedAt: T1,
      completedAt: T1,
    });
    expect(first.phases[0].log.map((l) => l.text)).toEqual(["Began", "Ended"]);
    expect(first.phases[1]).toMatchObject({ status: "live", startedAt: T1 });
    expect(first.focusPhase).toBe("b");
    const second = phases.advance({ ...p0, ...first }, T2);
    expect(second.phases[1]).toMatchObject({
      status: "over",
      startedAt: T1,
      completedAt: T2,
    });
    expect(second.phases[1].log.map((l) => l.text)).toEqual(["Began", "Ended"]);
    expect(second.focusPhase).toBe("b");
  });

  const finished = () =>
    project(
      phase("a", "over", { startedAt: T1, completedAt: T1 }),
      phase("b", "over", { startedAt: T1, completedAt: T2 }),
    );

  it("advance on a finished item stays by default (nothing changes)", () => {
    const out = phases.advance(finished(), T2);
    expect(out.phases.map((c) => c.status)).toEqual(["over", "over"]);
    expect(out.phases[1].log).toEqual([]);
  });

  it("onComplete: reopen-last makes the last child current again and logs it", () => {
    const reopening = defineChildren({
      key: "phases",
      focus: "focusPhase",
      status: { pending: "idle", current: "live", complete: "over" },
      lines: { started: "Began", completed: "Ended", reopened: "Again" },
      onComplete: "reopen-last",
    });
    const out = reopening.advance(finished(), T2);
    expect(out.phases[0].status).toBe("over");
    expect(out.phases[1]).toMatchObject({
      status: "live",
      completedAt: undefined,
    });
    expect(out.phases[1].log.at(-1)?.text).toBe("Again");
  });

  it("advance leaves an item without children alone", () => {
    expect(phases.advance(project(), T1)).toEqual({
      phases: [],
      focusPhase: undefined,
    });
  });

  it("select and cycle patch the focus, wrapping", () => {
    const p = {
      ...project(phase("a", "live"), phase("b", "idle"), phase("c", "idle")),
      focusPhase: "c",
    };
    expect(phases.select("b")).toEqual({ focusPhase: "b" });
    expect(phases.cycle(p, 1)).toEqual({ focusPhase: "a" });
    expect(phases.cycle(p, -1)).toEqual({ focusPhase: "b" });
    expect(phases.cycle(project(phase("a", "idle")), 1)).toBeUndefined();
  });
});

// Typed by the item, not by casts: these lines are checked by `tsc --noEmit` (src/** includes tests).
describe("defineChildren typing", () => {
  type Stamped = {
    id: string;
    label: string;
    status: string;
    startedAt?: string;
    completedAt?: string;
    log: { id: string; at: string; text: string }[];
  };
  type Run = {
    id: string;
    createdAt: string;
    legs: Stamped[];
    focusLeg?: string;
  };
  const legs = defineChildren({
    key: "legs",
    focus: "focusLeg",
    status: { pending: "idle", current: "live", complete: "over" },
    lines: { started: "Began", completed: "Ended", reopened: "Again" },
  });
  const apply = (run: Run, patch: Partial<Run>): Run => ({ ...run, ...patch });

  it("child() takes the item's own child type (optional stamps without null) and its patches fit Partial<item>", () => {
    const run: Run = {
      id: "r",
      createdAt: T1,
      legs: [
        legs.child("l1", { label: "one" }),
        legs.child("l2", { label: "two" }),
      ],
    };
    const done = apply(run, legs.advance(run, T2));
    const focused = apply(done, legs.select("l1"));
    const moved = legs.cycle(focused, 1);
    expect(moved ? apply(focused, moved).focusLeg : undefined).toBe("l2");
    const first: Stamped | undefined = legs.pick(done);
    expect(first?.label).toBe("two");
    // @ts-expect-error a child missing the app's own field does not type-check
    const missing: Stamped = legs.child("x", {});
    expect(missing.id).toBe("x");
  });

  it("pickBucket is bucketOf under a name that does not clash with the root CensusView helper", () => {
    expect(pickBucket).toBe(bucketOf);
    expect(pickBucket({ n: 1 }, [{ id: "all", when: () => true }])).toBe("all");
  });
});
