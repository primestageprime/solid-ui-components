/**
 * The data-only demo. Pass `nodes`, get the animation. Play walks the
 * state machine; Next/Reset step through manually.
 *
 * Notice what this showcase does NOT do: it never imports
 * LaneLayoutConfig, LaneTimingConfig, SwimlaneAnimatedLaneSpec, or any
 * internal type. The library's defaults cover everything.
 */
import { createSignal, onCleanup, type Component } from "solid-js";
import { createAnimatedSwimlaneChart } from "../../src/components/AnimatedSwimlaneChart";
import { advanceChildren, isAllDone } from "./workshop-layout";
import type { StatusFlowNode } from "../../src/components/StatusFlowChart";

const ProjectFlow = createAnimatedSwimlaneChart({});

// Multi-lane fixture exercising the full visual vocabulary:
//   Lane A (deck build)   — long linear chain; dependency arrows that
//                           ease and dash-fade as upstream tasks finish.
//   Lane B (roof repair)  — fan-in: parallel prep steps converge into
//                           a single task, and a later step has two
//                           independent dependencies (mirrors the
//                           workshop's MS_PARENT_B_CHILDREN pattern
//                           where b4 depends on [b1, b2] and b6 on
//                           [b3, b5]).
//   Lane C (garden)       — long chain; nodes spill into the lozenges
//                           on narrow viewports so you can see the
//                           count badges roll up/down.
//   Lane D (admin)        — flat list of independent tasks, no edges.
//                           Shows parallel slurp morphs without arrow
//                           noise.
// Every node carries the full card payload — claimedBy (top-left) /
// status (top-right), title, subtitle, and estimate (bottom-left) /
// actual (bottom-right) — so the chart exercises the complete node layout.
const INITIAL: StatusFlowNode[] = [
  // Lane A — deck build
  {
    id: "deckP",
    title: "Build the deck",
    subtitle: "back yard, pressure-treated",
    status: "TODO",
    claimedBy: "Dana",
    estimate: "5d",
    actual: "6d",
  },
  {
    id: "deckSaw",
    title: "Saw planks to length",
    subtitle: "32 boards",
    status: "TODO",
    parentId: "deckP",
    claimedBy: "Miguel",
    estimate: "4h",
    actual: "5h",
  },
  {
    id: "deckDrill",
    title: "Drill pilot holes",
    subtitle: "avoid splitting",
    status: "TODO",
    parentId: "deckP",
    dependsOn: ["deckSaw"],
    claimedBy: "Priya",
    estimate: "2h",
    actual: "2h",
  },
  {
    id: "deckScrew",
    title: "Screw planks down",
    subtitle: "stainless deck screws",
    status: "TODO",
    parentId: "deckP",
    dependsOn: ["deckDrill"],
    claimedBy: "Sam",
    estimate: "6h",
    actual: "7h",
  },
  {
    id: "deckSand",
    title: "Sand the surface",
    subtitle: "80 then 120 grit",
    status: "TODO",
    parentId: "deckP",
    dependsOn: ["deckScrew"],
    claimedBy: "Lee",
    estimate: "3h",
    actual: "3h",
  },
  {
    id: "deckStain",
    title: "Stain the deck",
    subtitle: "semi-transparent cedar",
    status: "TODO",
    parentId: "deckP",
    dependsOn: ["deckSand"],
    claimedBy: "Ada",
    estimate: "1d",
    actual: "1d",
  },

  // Lane B — roof repair (fan-in: roofNail depends on [roofTarp, roofCut];
  // roofSeal depends on [roofNail, roofInspect])
  {
    id: "roofP",
    title: "Patch the roof",
    subtitle: "NW corner leak",
    status: "TODO",
    claimedBy: "Jo",
    estimate: "3d",
    actual: "4d",
  },
  {
    id: "roofClear",
    title: "Clear the gutters",
    subtitle: "two stories",
    status: "TODO",
    parentId: "roofP",
    claimedBy: "Kai",
    estimate: "2h",
    actual: "3h",
  },
  {
    id: "roofTarp",
    title: "Lay down the tarp",
    subtitle: "weather hold",
    status: "TODO",
    parentId: "roofP",
    claimedBy: "Noor",
    estimate: "1h",
    actual: "1h",
  },
  {
    id: "roofCut",
    title: "Cut replacement shingles",
    subtitle: "match existing",
    status: "TODO",
    parentId: "roofP",
    claimedBy: "Raj",
    estimate: "3h",
    actual: "4h",
  },
  {
    id: "roofNail",
    title: "Nail down shingles",
    subtitle: "6-nail pattern",
    status: "TODO",
    parentId: "roofP",
    dependsOn: ["roofTarp", "roofCut"],
    claimedBy: "Tess",
    estimate: "5h",
    actual: "6h",
  },
  {
    id: "roofInspect",
    title: "Inspector signs off",
    subtitle: "blocked on permit #4471",
    status: "TODO",
    parentId: "roofP",
    dependsOn: ["roofNail"],
    claimedBy: "Uma",
    estimate: "1d",
    actual: "2d",
  },
  {
    id: "roofSeal",
    title: "Seal the seams",
    subtitle: "polyurethane",
    status: "TODO",
    parentId: "roofP",
    dependsOn: ["roofNail", "roofInspect"],
    claimedBy: "Vik",
    estimate: "2h",
    actual: "2h",
  },

  // Lane C — garden (long, spills into lozenges)
  {
    id: "gardenP",
    title: "Plant the garden",
    subtitle: "raised beds",
    status: "TODO",
    claimedBy: "Wen",
    estimate: "2d",
    actual: "3d",
  },
  {
    id: "gardenWeed",
    title: "Pull the weeds",
    subtitle: "by hand",
    status: "TODO",
    parentId: "gardenP",
    claimedBy: "Xan",
    estimate: "3h",
    actual: "4h",
  },
  {
    id: "gardenTill",
    title: "Till the soil",
    subtitle: "8in depth",
    status: "TODO",
    parentId: "gardenP",
    dependsOn: ["gardenWeed"],
    claimedBy: "Yuki",
    estimate: "2h",
    actual: "2h",
  },
  {
    id: "gardenAmend",
    title: "Amend with compost",
    subtitle: "3 cu yd",
    status: "TODO",
    parentId: "gardenP",
    dependsOn: ["gardenTill"],
    claimedBy: "Zoe",
    estimate: "2h",
    actual: "3h",
  },
  {
    id: "gardenSeed",
    title: "Sow the seeds",
    subtitle: "succession plan",
    status: "TODO",
    parentId: "gardenP",
    dependsOn: ["gardenAmend"],
    claimedBy: "Dana",
    estimate: "1h",
    actual: "1h",
  },
  {
    id: "gardenWater",
    title: "Water everything in",
    subtitle: "deep soak",
    status: "TODO",
    parentId: "gardenP",
    dependsOn: ["gardenSeed"],
    claimedBy: "Miguel",
    estimate: "1h",
    actual: "1h",
  },

  // Lane D — admin (no edges, parallel slurps)
  {
    id: "adminP",
    title: "Admin chores",
    subtitle: "end of month",
    status: "TODO",
    claimedBy: "Priya",
    estimate: "1d",
    actual: "1d",
  },
  {
    id: "adminMail",
    title: "Open the mail",
    subtitle: "two weeks' backlog",
    status: "TODO",
    parentId: "adminP",
    claimedBy: "Sam",
    estimate: "30m",
    actual: "45m",
  },
  {
    id: "adminPay",
    title: "Pay the bills",
    subtitle: "utilities + card",
    status: "TODO",
    parentId: "adminP",
    claimedBy: "Lee",
    estimate: "1h",
    actual: "1h",
  },
  {
    id: "adminFile",
    title: "File receipts",
    subtitle: "Q2 tax folder",
    status: "TODO",
    parentId: "adminP",
    claimedBy: "Ada",
    estimate: "2h",
    actual: "3h",
  },
  {
    id: "adminCall",
    title: "Return the calls",
    subtitle: "contractor + bank",
    status: "TODO",
    parentId: "adminP",
    claimedBy: "Jo",
    estimate: "1h",
    actual: "1h",
  },
];

// Tick interval ≥ slurp + move + arrow-settle + slurp + buffer so the
// next tick doesn't trample an in-flight one.
const TICK_INTERVAL_MS = 1800;

// Model a fixed pool of workers: at most this many tasks are DOING at once,
// so ready work only starts when an agent frees up.
const CONCURRENT_AGENTS = 5;

export const AnimatedSwimlaneChartShowcase: Component = () => {
  const [nodes, setNodes] = createSignal<StatusFlowNode[]>(INITIAL);
  const [playing, setPlaying] = createSignal(false);
  let timer: ReturnType<typeof setInterval> | undefined;

  const next = () => setNodes((cur) => advanceChildren(cur, CONCURRENT_AGENTS));
  const pause = () => {
    setPlaying(false);
    if (timer !== undefined) {
      clearInterval(timer);
      timer = undefined;
    }
  };
  const reset = () => {
    pause();
    setNodes(INITIAL);
  };
  const play = () => {
    if (playing()) return pause();
    if (isAllDone(nodes())) setNodes(INITIAL);
    setPlaying(true);
    timer = setInterval(() => {
      setNodes((cur) => {
        if (isAllDone(cur)) {
          pause();
          return cur;
        }
        return advanceChildren(cur, CONCURRENT_AGENTS);
      });
    }, TICK_INTERVAL_MS);
  };

  onCleanup(() => {
    if (timer !== undefined) clearInterval(timer);
  });

  return (
    // component-section--full opts this showcase out of the dev shell's
    // 1000px content cap so the chart reflows across the full viewport.
    <div
      class="component-section--full"
      class="animated-swimlane-demo__page"
    >
      <div class="animated-swimlane-demo__intro">
        Data-only consumer — the entire chart is{" "}
        <code class="animated-swimlane-demo__code">
          &lt;ProjectFlow nodes=&#123;tasks&#125; /&gt;
        </code>
        . Play walks every lane through its dependency graph one tick at a time,
        modeling a pool of {CONCURRENT_AGENTS} concurrent agents — at most{" "}
        {CONCURRENT_AGENTS} tasks are DOING at once, so ready work only starts
        as an agent frees up. Resize the window to watch the visible-column
        window collapse and the side-lozenges roll up the hidden node counts.
      </div>
      <div class="animated-swimlane-demo__controls">
        <button type="button" onClick={play}>
          {playing() ? "⏸ Pause" : "▶ Play"}
        </button>
        <button type="button" onClick={next} disabled={playing()}>
          Next →
        </button>
        <button type="button" onClick={reset}>
          ↺ Reset
        </button>
      </div>
      <ProjectFlow nodes={nodes()} />
    </div>
  );
};
