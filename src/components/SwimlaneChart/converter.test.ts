import { describe, it, expect } from "vitest";
import {
  convertSwimlaneDagInput,
  type SwimlaneDagInput,
  type SwimlaneStateMachine,
} from "./converter";

const TODO_DOING_DONE: SwimlaneStateMachine = {
  order: ["TODO", "DOING", "DONE"],
  doing: "DOING",
};

describe("convertSwimlaneDagInput — bucketing", () => {
  it("maps DONE/DOING/TODO to the right buckets and cols", () => {
    // NB: with order=["TODO", "DOING", "DONE"], TODO sits LEFT of DOING and DONE
    // sits RIGHT — opposite of how the labels read, but consistent with the
    // user's rule that "left of doing → DONE bucket, right → TODO bucket".
    // We exercise both directions explicitly in this test.
    const input: SwimlaneDagInput = {
      nodes: [
        { id: "a", title: "A", status: "TODO" },
        { id: "b", title: "B", status: "DOING" },
        { id: "c", title: "C", status: "DONE" },
      ],
      edges: [],
    };
    const out = convertSwimlaneDagInput(input, TODO_DOING_DONE);
    const byId = new Map(out.nodes.map((n) => [n.id, n.data]));
    expect(byId.get("a")?.bucket).toBe("DONE"); // left of doing
    expect(byId.get("b")?.bucket).toBe("DOING");
    expect(byId.get("c")?.bucket).toBe("TODO"); // right of doing
  });

  it("places DOING at col 0 and unranks at depth 0 to ±1", () => {
    const input: SwimlaneDagInput = {
      nodes: [
        { id: "a", title: "A", status: "TODO" }, // → DONE bucket (left)
        { id: "b", title: "B", status: "DOING" },
        { id: "c", title: "C", status: "DONE" }, // → TODO bucket (right)
      ],
      edges: [],
    };
    const out = convertSwimlaneDagInput(input, TODO_DOING_DONE);
    const byId = new Map(out.nodes.map((n) => [n.id, n.data]));
    expect(byId.get("a")?.col).toBe(-1);
    expect(byId.get("b")?.col).toBe(0);
    expect(byId.get("c")?.col).toBe(1);
  });

  it("throws when stateMachine.doing is not in order", () => {
    expect(() =>
      convertSwimlaneDagInput(
        { nodes: [], edges: [] },
        { order: ["TODO", "DONE"], doing: "DOING" },
      ),
    ).toThrow(/doing/i);
  });

  it("falls back to TODO bucket for unknown statuses", () => {
    const input: SwimlaneDagInput = {
      nodes: [
        { id: "a", title: "A", status: "MYSTERY" },
        { id: "b", title: "B", status: "DOING" },
      ],
      edges: [],
    };
    const out = convertSwimlaneDagInput(input, TODO_DOING_DONE);
    const byId = new Map(out.nodes.map((n) => [n.id, n.data]));
    expect(byId.get("a")?.bucket).toBe("TODO");
    expect(byId.get("a")?.col).toBe(1);
  });
});

describe("convertSwimlaneDagInput — depth ranking", () => {
  it("ranks DONE-side cols by topo depth (deeper = closer to center)", () => {
    // Two chains converging on a DOING node. With order=[TODO, DOING, DONE],
    // TODO is the DONE bucket (left). a1 → a2 → c (deeper TODO is closer to
    // center). Likewise b1 → c.
    const input: SwimlaneDagInput = {
      nodes: [
        { id: "a1", title: "A1", status: "TODO" }, // depth 0, DONE bucket
        { id: "a2", title: "A2", status: "TODO" }, // depth 1, DONE bucket
        { id: "b1", title: "B1", status: "TODO" }, // depth 0, DONE bucket
        { id: "c", title: "C", status: "DOING" },
      ],
      edges: [
        { from: "a1", to: "a2", kind: "dependency" },
        { from: "a2", to: "c", kind: "dependency" },
        { from: "b1", to: "c", kind: "dependency" },
      ],
    };
    const out = convertSwimlaneDagInput(input, TODO_DOING_DONE);
    const byId = new Map(out.nodes.map((n) => [n.id, n.data]));
    // Deeper (a2 at depth 1) → -1; shallower (a1, b1 at depth 0) → -2.
    expect(byId.get("a2")?.col).toBe(-1);
    expect(byId.get("a1")?.col).toBe(-2);
    expect(byId.get("b1")?.col).toBe(-2);
    expect(byId.get("c")?.col).toBe(0);
  });

  it("ranks TODO-side cols by topo depth (shallower = closer to center)", () => {
    const input: SwimlaneDagInput = {
      nodes: [
        { id: "c", title: "C", status: "DOING" },
        { id: "t1", title: "T1", status: "DONE" }, // depth 0, TODO bucket
        { id: "t2", title: "T2", status: "DONE" }, // depth 1, TODO bucket
        { id: "t3", title: "T3", status: "DONE" }, // depth 2, TODO bucket
      ],
      edges: [
        { from: "t1", to: "t2" },
        { from: "t2", to: "t3" },
      ],
    };
    const out = convertSwimlaneDagInput(input, TODO_DOING_DONE);
    const byId = new Map(out.nodes.map((n) => [n.id, n.data]));
    expect(byId.get("t1")?.col).toBe(1);
    expect(byId.get("t2")?.col).toBe(2);
    expect(byId.get("t3")?.col).toBe(3);
  });

  it("stacks siblings at the same (depth, bucket) on the same col", () => {
    const input: SwimlaneDagInput = {
      nodes: [
        { id: "doing", title: "Doing", status: "DOING" },
        { id: "x1", title: "X1", status: "DONE" }, // depth 0, TODO bucket
        { id: "x2", title: "X2", status: "DONE" }, // depth 0, TODO bucket
        { id: "x3", title: "X3", status: "DONE" }, // depth 0, TODO bucket
      ],
      edges: [],
    };
    const out = convertSwimlaneDagInput(input, TODO_DOING_DONE);
    const cols = out.nodes
      .filter((n) => n.id.startsWith("x"))
      .map((n) => n.data.col);
    expect(cols).toEqual([1, 1, 1]);
  });
});

describe("convertSwimlaneDagInput — edges", () => {
  it("forwards dependency edges and drops containment edges", () => {
    const input: SwimlaneDagInput = {
      nodes: [
        { id: "p", title: "Parent", status: "DOING" },
        { id: "c", title: "Child", status: "DOING" },
      ],
      edges: [
        { from: "p", to: "c", kind: "containment" },
        { from: "p", to: "c", kind: "dependency" },
      ],
    };
    const out = convertSwimlaneDagInput(input, TODO_DOING_DONE);
    expect(out.edges).toEqual([{ source: "p", target: "c" }]);
  });

  it("treats edges with no `kind` as dependency", () => {
    const input: SwimlaneDagInput = {
      nodes: [
        { id: "a", title: "A", status: "TODO" }, // DONE bucket
        { id: "b", title: "B", status: "DOING" },
      ],
      edges: [{ from: "a", to: "b" }],
    };
    const out = convertSwimlaneDagInput(input, TODO_DOING_DONE);
    expect(out.edges).toEqual([{ source: "a", target: "b" }]);
  });

  it("containment edges do NOT contribute to topo depth ranking", () => {
    // p contains a chain a→b→c via containment edges only. The depths
    // should ignore those edges — every node sits at depth 0 within the
    // DONE bucket → all at col -1.
    const input: SwimlaneDagInput = {
      nodes: [
        { id: "doing", title: "Doing", status: "DOING" },
        { id: "p", title: "P", status: "TODO" }, // DONE bucket
        { id: "a", title: "A", status: "TODO" }, // DONE bucket
        { id: "b", title: "B", status: "TODO" }, // DONE bucket
      ],
      edges: [
        { from: "p", to: "a", kind: "containment" },
        { from: "a", to: "b", kind: "containment" },
      ],
    };
    const out = convertSwimlaneDagInput(input, TODO_DOING_DONE);
    const byId = new Map(out.nodes.map((n) => [n.id, n.data]));
    expect(byId.get("p")?.col).toBe(-1);
    expect(byId.get("a")?.col).toBe(-1);
    expect(byId.get("b")?.col).toBe(-1);
  });
});

describe("convertSwimlaneDagInput — custom state machine", () => {
  it("supports arbitrary status names", () => {
    // Game-dev pipeline: DRAFT → DESIGN → BUILD (doing) → REVIEW → SHIPPED.
    // Everything before BUILD is the DONE bucket; everything after is TODO.
    const sm: SwimlaneStateMachine = {
      order: ["DRAFT", "DESIGN", "BUILD", "REVIEW", "SHIPPED"],
      doing: "BUILD",
    };
    const input: SwimlaneDagInput = {
      nodes: [
        { id: "n1", title: "N1", status: "DRAFT" },
        { id: "n2", title: "N2", status: "DESIGN" },
        { id: "n3", title: "N3", status: "BUILD" },
        { id: "n4", title: "N4", status: "REVIEW" },
        { id: "n5", title: "N5", status: "SHIPPED" },
      ],
      edges: [
        { from: "n1", to: "n2" },
        { from: "n2", to: "n3" },
        { from: "n3", to: "n4" },
        { from: "n4", to: "n5" },
      ],
    };
    const out = convertSwimlaneDagInput(input, sm);
    const byId = new Map(out.nodes.map((n) => [n.id, n.data]));
    expect(byId.get("n1")?.bucket).toBe("DONE");
    expect(byId.get("n2")?.bucket).toBe("DONE");
    expect(byId.get("n3")?.bucket).toBe("DOING");
    expect(byId.get("n4")?.bucket).toBe("TODO");
    expect(byId.get("n5")?.bucket).toBe("TODO");
    // DONE bucket has depths {0, 1}; DESIGN (depth 1) ranks closer to center.
    expect(byId.get("n2")?.col).toBe(-1);
    expect(byId.get("n1")?.col).toBe(-2);
    // TODO bucket has depths {3, 4}; REVIEW (depth 3) ranks closer to center.
    expect(byId.get("n4")?.col).toBe(1);
    expect(byId.get("n5")?.col).toBe(2);
  });
});

describe("convertSwimlaneDagInput — preserves passthrough fields", () => {
  it("propagates title, subtitle, status, badges, meta to converted data", () => {
    const input: SwimlaneDagInput = {
      nodes: [
        {
          id: "n",
          title: "Task",
          subtitle: "alice",
          status: "DOING",
          badges: [{ label: "urgent", tone: "danger" }],
          meta: { workId: 42, statementId: 7 },
        },
      ],
      edges: [],
    };
    const out = convertSwimlaneDagInput(input, TODO_DOING_DONE);
    const data = out.nodes[0].data;
    expect(data.title).toBe("Task");
    expect(data.subtitle).toBe("alice");
    expect(data.status).toBe("DOING");
    expect(data.badges).toEqual([{ label: "urgent", tone: "danger" }]);
    expect(data.meta).toEqual({ workId: 42, statementId: 7 });
  });

  it("returns swimlaneFor that reads the precomputed col", () => {
    const input: SwimlaneDagInput = {
      nodes: [
        { id: "a", title: "A", status: "TODO" }, // DONE bucket → col -1
        { id: "b", title: "B", status: "DOING" }, // col 0
      ],
      edges: [],
    };
    const out = convertSwimlaneDagInput(input, TODO_DOING_DONE);
    const [a, b] = out.nodes;
    expect(out.swimlaneFor(a)).toBe(-1);
    expect(out.swimlaneFor(b)).toBe(0);
  });
});
