# Using the SwimlaneChart

A guide for embedding `SwimlaneChart` in a Solid app. You describe your work in your own state-machine vocabulary; the chart figures out where each card goes.

## Mental model

A `SwimlaneChart` lays out a dependency graph horizontally around a focus column ("DOING"). Anything earlier in your workflow lives to the left of DOING; anything later lives to the right. The chart handles arrow routing, overflow badges, and responsive collapse — you don't configure any of that.

You give it three things:

1. **Nodes** — one per unit of work, with a `status` string from your own state machine.
2. **Edges** — directed dependencies (`from` → `to`).
3. **A state machine** — an ordered list of every status you use, plus which one is the DOING focus.

The chart maps each status into one of three buckets internally:

| Bucket | Position | Default color |
|--------|----------|---------------|
| DONE   | Left of DOING (earlier in your state machine) | Green |
| DOING  | Center column                                 | Cyan |
| TODO   | Right of DOING (later in your state machine)  | Grey |

## Step-by-step

### 1. Install

```ts
import {
  SwimlaneChart,
  convertSwimlaneDagInput,
  type SwimlaneDagInput,
  type SwimlaneStateMachine,
} from "@primestageprime/solid-ui-components";
```

### 2. Describe your state machine

List your statuses in order from earliest to latest. Pick the one that means "in progress."

```ts
const stateMachine: SwimlaneStateMachine = {
  order: ["DRAFT", "DESIGN", "BUILD", "REVIEW", "SHIPPED"],
  doing: "BUILD",
};
```

In this example, `DRAFT` and `DESIGN` will appear on the left (DONE bucket), `BUILD` in the center, and `REVIEW` and `SHIPPED` on the right (TODO bucket).

You can use any strings you want — `TODO`/`DOING`/`DONE` is just one valid choice:

```ts
const stateMachine: SwimlaneStateMachine = {
  order: ["TODO", "DOING", "DONE"],
  doing: "DOING",
};
```

### 3. Provide your nodes and edges

Use any opaque string for `id`. Edges reference those ids.

```ts
const input: SwimlaneDagInput = {
  nodes: [
    { id: "n1", title: "Spec the feature", status: "DESIGN", subtitle: "alice" },
    { id: "n2", title: "Build the API",    status: "BUILD",   subtitle: "bob" },
    { id: "n3", title: "Write tests",      status: "BUILD",   subtitle: "alice" },
    { id: "n4", title: "Code review",      status: "REVIEW",  subtitle: "carol" },
    { id: "n5", title: "Ship to prod",     status: "SHIPPED" },
  ],
  edges: [
    { from: "n1", to: "n2" },
    { from: "n2", to: "n3" },
    { from: "n3", to: "n4" },
    { from: "n4", to: "n5" },
  ],
};
```

### 4. Convert and render

`convertSwimlaneDagInput` returns the three values `SwimlaneChart` needs.

```tsx
const { nodes, edges, swimlaneFor } = convertSwimlaneDagInput(input, stateMachine);

<SwimlaneChart
  nodes={nodes}
  edges={edges}
  swimlaneFor={swimlaneFor}
  renderNode={(node) => (
    <div class="my-card">
      <div class="status">{node.data.status}</div>
      <div class="title">{node.data.title}</div>
      {node.data.subtitle && <div class="subtitle">{node.data.subtitle}</div>}
    </div>
  )}
/>
```

That's the entire integration. Resize the container and the chart will collapse outer columns into summary badges automatically; you don't need to do anything.

## Node fields

```ts
interface SwimlaneDagNode {
  id: string;            // any unique string
  title: string;         // primary text on the card
  subtitle?: string;     // optional secondary text (e.g. assignee name)
  status: string;        // must appear in stateMachine.order
  badges?: Array<{       // optional extra labels
    label: string;
    tone?: "default" | "success" | "warning" | "danger";
  }>;
  meta?: Record<string, string | number | boolean>; // free-form passthrough
}
```

`meta` is never inspected by the chart — it round-trips to your `renderNode` callback so you can wire things like `onClick` to your own routing.

## Edge fields

```ts
interface SwimlaneDagEdge {
  from: string;   // upstream node id (prerequisite)
  to: string;     // downstream node id (dependent)
  kind?: "dependency" | "containment";  // optional
}
```

- **`dependency`** (default): scheduling edge. These drive the chart's layout and arrow rendering.
- **`containment`**: decorative parent → child relationship. Currently ignored by the chart but preserved in the input shape for future use; don't rely on it rendering.

## What goes where

The converter sorts nodes within each bucket by **dependency depth**:

- **DONE side**: deeper-in-the-chain (closer to the DOING node) sits closer to center.
- **TODO side**: shallower (closer to a "root" dep of DOING) sits closer to center.

In practice this means: a long completed chain naturally fans out leftward, with the most-recently-completed item next to the DOING column.

If multiple nodes share both the same status-bucket AND the same depth, they **stack vertically** in the same column. There's no manual control here — the layout is purely a function of your state machine + your dep graph.

## Common pitfalls

- **Unknown statuses get bucketed as TODO.** If you forget to add a status to `stateMachine.order`, nodes using that status will quietly fall to the TODO side. Test with strict input.
- **Cycles in your dep graph are tolerated.** The converter uses a cycle-safe traversal: nodes inside a cycle all get depth 0. But a cyclic dep graph probably indicates a data bug worth investigating.
- **`stateMachine.doing` must appear in `order`.** Otherwise the converter throws.
- **Containment edges don't affect layout.** If you want a parent-child decomposition to influence ordering, model it as a dependency edge instead.
- **Status casing matters.** `"Doing"` ≠ `"DOING"`. Normalize before passing.

## What you don't have to think about

Things the chart handles for you, with no configuration:

- Choosing how many columns to show based on container width.
- Collapsing overflow columns into vertical-pill summary badges.
- Routing arrows around unrelated nodes so they don't draw through
  them (orthogonal right-angle routing by default — pass
  `routingStyle="bezier"` if you prefer smooth curves).
- Stacking siblings at the same column position.
- Vertical centering of summary badges against the outermost visible column.
- Animating layout changes when you mutate the input over time.

If you find yourself reaching for one of these, file an issue rather than working around it — the public surface is intentionally narrow.

## Example: the full thing

```tsx
import {
  SwimlaneChart,
  convertSwimlaneDagInput,
  type SwimlaneDagInput,
  type SwimlaneStateMachine,
} from "@primestageprime/solid-ui-components";

const stateMachine: SwimlaneStateMachine = {
  order: ["TODO", "DOING", "DONE"],
  doing: "DOING",
};

const input: SwimlaneDagInput = {
  nodes: [
    { id: "work-1", title: "Schema migration", status: "DONE",  subtitle: "jane" },
    { id: "work-2", title: "API layer",        status: "DONE",  subtitle: "jessie" },
    { id: "work-3", title: "Auth middleware",  status: "DOING", subtitle: "athena" },
    { id: "work-4", title: "UI components",    status: "DOING", subtitle: "veronica" },
    { id: "work-5", title: "Integration tests", status: "TODO", subtitle: "hannelore" },
    { id: "work-6", title: "Deploy to staging", status: "TODO" },
  ],
  edges: [
    { from: "work-1", to: "work-3" },
    { from: "work-2", to: "work-3" },
    { from: "work-2", to: "work-4" },
    { from: "work-3", to: "work-5" },
    { from: "work-4", to: "work-5" },
    { from: "work-5", to: "work-6" },
  ],
};

export function MyChart() {
  const { nodes, edges, swimlaneFor } = convertSwimlaneDagInput(input, stateMachine);
  return (
    <div style={{ width: "100%", height: "500px" }}>
      <SwimlaneChart
        nodes={nodes}
        edges={edges}
        swimlaneFor={swimlaneFor}
        renderNode={(node) => (
          <div class="card" data-bucket={node.data.bucket}>
            <div class="title">{node.data.title}</div>
            {node.data.subtitle && <div class="sub">{node.data.subtitle}</div>}
          </div>
        )}
        onNodeClick={(id) => console.log("clicked", id)}
      />
    </div>
  );
}
```
