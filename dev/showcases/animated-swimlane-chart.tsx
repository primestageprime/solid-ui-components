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
//   Lane B (roof repair)  — second chain whose ticks interleave with A
//                           so multiple lanes are mid-animation at once.
//   Lane C (garden)       — long chain; nodes spill into the lozenges
//                           on narrow viewports so you can see the
//                           count badges roll up/down.
//   Lane D (admin)        — flat list of independent tasks, no edges.
//                           Shows parallel slurp morphs without arrow
//                           noise.
const INITIAL: StatusFlowNode[] = [
  // Lane A — deck build
  { id: "deckP", title: "Build the deck", status: "TODO" },
  { id: "deckSaw", title: "Saw planks to length", status: "TODO", parentId: "deckP" },
  { id: "deckDrill", title: "Drill pilot holes", status: "TODO", parentId: "deckP", dependsOn: ["deckSaw"] },
  { id: "deckScrew", title: "Screw planks down", status: "TODO", parentId: "deckP", dependsOn: ["deckDrill"] },
  { id: "deckSand", title: "Sand the surface", status: "TODO", parentId: "deckP", dependsOn: ["deckScrew"] },
  { id: "deckStain", title: "Stain the deck", status: "TODO", parentId: "deckP", dependsOn: ["deckSand"] },

  // Lane B — roof repair
  { id: "roofP", title: "Patch the roof", status: "TODO" },
  { id: "roofClear", title: "Clear the gutters", status: "TODO", parentId: "roofP" },
  { id: "roofTarp", title: "Lay down the tarp", status: "TODO", parentId: "roofP", dependsOn: ["roofClear"] },
  { id: "roofCut", title: "Cut replacement shingles", status: "TODO", parentId: "roofP", dependsOn: ["roofTarp"] },
  { id: "roofNail", title: "Nail down shingles", status: "TODO", parentId: "roofP", dependsOn: ["roofCut"] },
  { id: "roofSeal", title: "Seal the seams", status: "TODO", parentId: "roofP", dependsOn: ["roofNail"] },

  // Lane C — garden (long, spills into lozenges)
  { id: "gardenP", title: "Plant the garden", status: "TODO" },
  { id: "gardenWeed", title: "Pull the weeds", status: "TODO", parentId: "gardenP" },
  { id: "gardenTill", title: "Till the soil", status: "TODO", parentId: "gardenP", dependsOn: ["gardenWeed"] },
  { id: "gardenAmend", title: "Amend with compost", status: "TODO", parentId: "gardenP", dependsOn: ["gardenTill"] },
  { id: "gardenSeed", title: "Sow the seeds", status: "TODO", parentId: "gardenP", dependsOn: ["gardenAmend"] },
  { id: "gardenWater", title: "Water everything in", status: "TODO", parentId: "gardenP", dependsOn: ["gardenSeed"] },

  // Lane D — admin (no edges, parallel slurps)
  { id: "adminP", title: "Admin chores", status: "TODO" },
  { id: "adminMail", title: "Open the mail", status: "TODO", parentId: "adminP" },
  { id: "adminPay", title: "Pay the bills", status: "TODO", parentId: "adminP" },
  { id: "adminFile", title: "File receipts", status: "TODO", parentId: "adminP" },
  { id: "adminCall", title: "Return the calls", status: "TODO", parentId: "adminP" },
];

// Tick interval ≥ slurp + move + arrow-settle + slurp + buffer so the
// next tick doesn't trample an in-flight one.
const TICK_INTERVAL_MS = 1800;

export const AnimatedSwimlaneChartShowcase: Component = () => {
  const [nodes, setNodes] = createSignal<StatusFlowNode[]>(INITIAL);
  const [playing, setPlaying] = createSignal(false);
  let timer: ReturnType<typeof setInterval> | undefined;

  const next = () => setNodes((cur) => advanceChildren(cur));
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
        return advanceChildren(cur);
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
      style={{
        display: "flex",
        "flex-direction": "column",
        gap: "12px",
        padding: "24px",
      }}
    >
      <div style={{ "font-size": "14px", color: "rgba(255,255,255,0.7)", "max-width": "780px" }}>
        Data-only consumer — the entire chart is{" "}
        <code style={{ "font-family": "ui-monospace, SFMono-Regular, monospace" }}>
          &lt;ProjectFlow nodes=&#123;tasks&#125; /&gt;
        </code>
        . Play walks every lane through its dependency graph one tick at a time.
        Resize the window to watch the visible-column window collapse and the
        side-lozenges roll up the hidden node counts.
      </div>
      <div style={{ display: "flex", gap: "8px" }}>
        <button type="button" onClick={play}>{playing() ? "⏸ Pause" : "▶ Play"}</button>
        <button type="button" onClick={next} disabled={playing()}>Next →</button>
        <button type="button" onClick={reset}>↺ Reset</button>
      </div>
      <ProjectFlow nodes={nodes()} />
    </div>
  );
};
