# Lessons learned — StatusFlowChart + responsive layout pipe

Built over a single session iterating from `SwimlaneChart`'s compress
animation through `StatusFlowChart`'s status-based API, multi-shape
datasets (linear chain, broom, chores), and a self-documenting Frame
Explorer in the workshop. The notes below are the things we'd want to
remember the next time we touch a layout-and-collapse engine.

## API design

### Status-based API beat the col-based one
We started with `SwimlaneChart` (col-based: caller hands the chart a
signed integer per node). It works, but every consumer ended up writing
the same `status → col` logic by hand. Moving to `StatusFlowChart`
(nodes carry a `status` and a `columns: { label, statuses[] }[]` config
drives placement) cut the per-app boilerplate down to "describe your
tasks; we'll figure out where they go." The status is **data**;
position is **derived**. Don't ship position fields if the consumer's
real data is a status.

### Parent grouping ≠ parent dependency
`parentId` on a node means "this is a visual child of that parent"; it
**does not** create an edge. Edges live in `dependsOn`. Keeping them
separate let us auto-flip a parent's effective status when its children
all reach terminal — a behavior orthogonal to graph layout that would
have been awkward if `parentId` had been overloaded as a dep edge.

### Curried variants beat runtime config (ADR-0001 vindicated)
`LinearFlowSwimlaneChart = createSwimlaneChart({…})` froze the demo's
visual props at definition time, so every consumer of the variant gets
the same look. We hit zero "this consumer's chart looks subtly
different" bugs because there are no consumer-side override props.

## Reactive composition

### The whole layout is a pipe off one signal
For both `StatusFlowChart` and the workshop demos, every layout-derived
value flowed from a single `width` signal updated by a `ResizeObserver`:

```
width                       ← ResizeObserver (the only side-effect)
  └─▶ visibleCols           = pickVisibleCols(width, breakpoints)
      └─▶ maxDepth          = (visibleCols − 1) / 2
          ├─▶ slots         = [−maxDepth … +maxDepth]
          ├─▶ cols          = nodes.map(computeColFor)         ← width-independent
          ├─▶ visibility    = cols.map(c => |c| ≤ maxDepth)
          ├─▶ byCol         = group(visibleLeaves)
          │   └─▶ maxStack  = max(byCol.values)
          │       └─▶ chartContent = (maxStack − 1)·rowGap + nodeHeight
          └─▶ total         = chartContent + padding + parent + gap + border
```

Every transformation is **pure** — only `width` is reactive. We can
run the entire pipe in `workshop-layout.test.ts` outside Solid because
each step is a normal function. Reactivity only adds "when width
changes, invalidate downstream memos." Don't entangle the pure part of
the pipe with the reactive shell.

### Test the pipe at its joints, not just its leaves
`workshop-layout.test.ts` doesn't render anything — it just calls
`computeColFor`, `computeChartHeight`, `topoSortAlpha`, and
`pickVisibleCols` against hand-built fixtures (linear chain, broom,
chores) and checks the numbers. When the layout rule kept changing,
having every shape pinned to a specific number meant we knew within
seconds whether a refactor regressed `b7 → -1` or `b6 → -2`.

## Layout rules — the rule that finally stuck

After several iterations we settled on a **single uniform rule** for
every dataset shape:

- **Parent** → status-based effective col (DONE → −1, DOING → 0,
  TODO → +1), effective status auto-derives from children.
- **Leaf with DOING** → col **0** (stacks at center).
- **Leaf with DONE** → ranked by topo depth, sorted **descending**,
  mapped to cols **−1, −2, −3…**.
- **Leaf with TODO** → ranked by topo depth, sorted **ascending**,
  mapped to cols **+1, +2, +3…**.

Same `(depth, status)` → same col → siblings **stack**. A node and
its dependent always have different depths → never share a col → "deps
are never siblings" is automatically true.

This collapses elegantly:
- **Linear chain** → one node per depth → each child at its own col,
  no stacking.
- **Broom** → multiple nodes per depth → stacking at depths 0 (b1, b2,
  b3) and 4 (b7, b8); single nodes elsewhere.
- **Chores** → no deps → everyone at depth 0 → all DONE chores stack
  at col −1, all DOING at 0, etc. — without a special-case.

### Things we tried and threw out
- **Linear chain-distance (`idx − anchorIdx`)** — worked for linear
  chains, broke broom (b7 took its own col when stacking with b8 would
  match the user's mental model).
- **Static `STATUS_TO_COL` for everything** — chores looked right but
  linear chains lost their horizontal spread.
- **Topo depth as the only signal** — broom's frame 19 expectation
  (b7 → −1, b6 → −2) didn't fall out cleanly until we added the
  per-status rank.

## Horizontal budget

### Compute breakpoints from the math, never hardcode
Hardcoded breakpoints (`{ minWidth: 900, visibleCols: 5 }`) drifted
from the actual minimum widths the budget requires. The user caught
this immediately: at 926px the demo said `visibleCols=5` but the
budget for 5 cols is 1164px. Now `STATUS_BREAKPOINTS` is computed:

```ts
minWidth(d) = 2·d·columnGap + nodeWidth + 2·badgeExtent + 2·sidePadding
```

The breakpoint table and the math panel both display these numbers,
so it's visually impossible for them to diverge.

### Centerless ordinals — virtual centerCol slot
The original layout collapsed everything to ordinal 0 when no node
sat at `centerCol`. For status-based data the center is rarely
occupied (e.g. all-TODO initial state has no DOING node). Fix in
`ordinalFor`: if `centerCol` isn't in `uniqueCols`, insert a virtual
slot at the right sorted position and shift everything above it by
+1. This makes ordinals well-defined for any centerCol, and
`isVisible` no longer needed a special-case bypass.

### Per-side summary aggregation
A broom node `b3` (col −3) anchored to its dependent `b6` (col 0) via
the BFS — which spawned a separate "+3" badge near `b6` even though
`b3` was conceptually on the left side. The fix: aggregate summaries
by **side** (left vs right of `centerCol`), not by `(anchor, side)`.
Each side gets exactly one badge, anchored on its outermost-visible
node. Cross-side edges still draw, but they all terminate at the same
summary dot.

## Sizing gotchas

### `box-sizing: border-box` eats your nodeHeight
A 1px border on the lane box ate 2px (top + bottom) from the inside
height. With `chart` slot computed as `parent − padding − parentHeader
− gap`, the chart got `54px` while the node needed `56`. Node corners
clipped, visibly. Fix: add a `borderTotal` term to the height formula.
**If a container has `box-sizing: border-box` and a border, your
content has less room than its CSS height says.**

### Auto-sized container needs every term, including the 1rem gap
The "lane box → parent header → 1rem gap → chart row" structure has
five terms in its height:
```
height = padding + parentHeader + gap + chartContent + border
```
We added a `parentChartGap` field to the helper instead of folding it
into `padding` — separating "always present" from "only when both a
parent and visible children render" kept the empty-state case
(parent collapsed, children gone → just `padding + parentHeader +
border`) shrinking correctly.

### `flex: 1` + `min-height: 0` are non-negotiable for nested flex
Without `min-height: 0`, a flex item refuses to shrink below its
content's intrinsic min-size, and inner overflow gets clipped in
surprising ways. Every column-flex slot in the workshop's lane box
needs both.

## Animations

### Pause the demo by default
Three different animation loops running at 3s tick made the workshop
chaotic to debug. Once we set `playing = false` by default the user
could land on a frame, inspect it, and reason about layout without
the screen shifting under them. **Default to paused. Provide play.**

### The frame explorer is the test artifact
Once the rules got non-trivial, scrubbing through 17 frames of the
broom looking for one bad layout was painful. `generateFrames`
(walk the state machine until it cycles, render every state as its
own row with a short id) made misbehavior addressable: "B7 is wrong"
points at exactly one snapshot. Generation is deterministic and
out-of-band from the running timer, which is what makes it useful.

## Debugging tools that paid for themselves

- **Math panel next to every frame** showing `width → visibleCols →
  maxDepth → slots → per-node switch logic → byCol → maxStack →
  chartContent → total height`. The user can point at any row and
  say "this number is wrong" instead of describing the visual.
- **Symmetric `[−S, …, 0, …, +S]` label strip below each chart**
  using the *runtime* `maxDepth`, not a hardcoded constant. Showed
  immediately when `+2` was rendering but should have been `+S`.
- **Rules panel at the top of the section** — when "what's the rule
  again?" comes up mid-iteration, having seven numbered rules visible
  on the same page as the breaking frame closes the loop.
- **State inspection table** showing input status vs effective
  status with `(input: TODO)` annotation when they diverge. Parents
  auto-flipping is invisible until the effective-vs-input gap is
  shown.

## Sub-agent dispatch worked well for orthogonal CSS work

The brace-to-lane-box swap was launched as a background agent while
the main thread reworked the col formula. They touched different
files and merged cleanly. Sub-agents are most valuable when you can
hand them a self-contained UI tweak with a clear acceptance test (the
agent verified Vite booted cleanly and ran `tsc --noEmit`).

## Things to remember next time

1. **Status is data; col is derived.** Don't ship positional fields if
   the caller really has a status.
2. **One reactive input, many pure transformations.** Width → memos.
   Test the pure parts outside the framework.
3. **Display the same numbers your layout reads.** If the math panel
   says `+2` and the chart shows `+S`, you have two sources of truth.
   Wire both to one pipe.
4. **Compute breakpoints from the budget formula.** Hardcoded
   thresholds drift the day you change a constant.
5. **`box-sizing: border-box` + a border subtracts from inside
   height.** Add it back to your sizing formula.
6. **Pause by default for debugging-heavy demos.** Provide a play
   button.
7. **Build a frame-explorer as soon as the state machine has more
   than ~5 interesting frames.** It pays for itself by the third
   iteration.
8. **The "ordinal of centerCol when centerCol is absent" question
   has a real answer.** Insert a virtual slot; don't bypass.
9. **Aggregate summaries by side, not by anchor.** Hidden nodes on
   the same side belong in the same badge regardless of which visible
   node they touch via an edge.
