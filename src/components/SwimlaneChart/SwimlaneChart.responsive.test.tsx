import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@solidjs/testing-library";
import { SwimlaneChart } from "./SwimlaneChart";
import { installFakeSizer, type FakeSizer } from "../../test-utils";
import { widthForDepth } from "./helpers";

// SwimlaneChart's headline feature — collapsing outer rings into "+N" boundary
// badges as the container narrows — is driven entirely by a ResizeObserver.
// jsdom ships none, so before the shared sizer this path could not run at all:
// SwimlaneChart.test.tsx mounts every case with `responsiveCollapse={false}`
// and says so in its own header. These tests drive the real thing.
//
// The observable is the BADGE, not the node count. A collapsed node is not
// unmounted — it stays in the DOM (moved to the end of the group) and its
// absence from the visible ring is expressed by a per-side "+N" badge. So
// counting `.probe-node` shows 5 at every width; the badge text is what
// carries the collapse.
//
// Thresholds are derived from `widthForDepth` rather than guessed, so this
// test follows the formula if the visual system's constants change.

const NODE_W = 180; // DEFAULT_SIZE[0]
const FITS_TWO_RINGS = widthForDepth(2, NODE_W); // 1264 — exact fit
const FITS_ONE_RING = widthForDepth(1, NODE_W); // 804 — exact fit

let sizer: FakeSizer;

afterEach(() => {
  cleanup();
  sizer?.restore();
});

const mount = () => {
  sizer = installFakeSizer();
  // Five columns spread symmetrically about the centre, so each shrink step has
  // an outer ring to collapse on both sides.
  const ids = ["far-left", "left", "centre", "right", "far-right"];
  const nodes = ids.map((id) => ({ id, data: {} }));
  const edges = [
    { source: "far-left", target: "left" },
    { source: "left", target: "centre" },
    { source: "centre", target: "right" },
    { source: "right", target: "far-right" },
  ];
  const col: Record<string, number> = {
    "far-left": -2,
    left: -1,
    centre: 0,
    right: 1,
    "far-right": 2,
  };
  const { container } = render(() => (
    <SwimlaneChart
      nodes={nodes}
      edges={edges}
      swimlaneFor={(n) => col[n.id]}
      renderNode={(n) => <div class="probe-node">{n.id}</div>}
      interactive={false}
    />
  ));
  const box = container.querySelector(".sui-swimlane-container") as HTMLElement;
  return { container, box };
};

/** The "+N" text of each side badge, in DOM order. Empty when nothing is
 *  collapsed. */
const badges = (c: Element): string[] =>
  [...c.querySelectorAll(".sui-swimlane__boundary-badge-text")].map(
    (el) => el.textContent ?? "",
  );

describe("SwimlaneChart — responsive collapse", () => {
  it("observes its own container exactly once", () => {
    const { box } = mount();
    expect(sizer.observations.length).toBe(1);
    expect(sizer.observations[0].el).toBe(box);
  });

  it("collapses nothing while the container is unmeasured", () => {
    // `fitDepth` reads width 0 as "not measured yet", not "no space" —
    // collapsing here would flash the collapsed form on first paint.
    const { container } = mount();
    expect(badges(container)).toEqual([]);
  });

  it("collapses nothing at the exact width that fits both rings", async () => {
    const { container, box } = mount();
    await sizer.resize(box, { width: FITS_TWO_RINGS, height: 800 });
    expect(badges(container)).toEqual([]);
  });

  it("collapses the outer ring one pixel below that width", async () => {
    // The step is discrete: losing a single pixel drops maxDepth 2 → 1, which
    // hides one node per side.
    const { container, box } = mount();
    await sizer.resize(box, { width: FITS_TWO_RINGS - 1, height: 800 });
    expect(badges(container)).toEqual(["+1", "+1"]);
  });

  it("collapses both rings once not even one ring fits", async () => {
    const { container, box } = mount();
    await sizer.resize(box, { width: FITS_ONE_RING - 1, height: 800 });
    expect(badges(container)).toEqual(["+2", "+2"]);
  });

  it("keeps a single ring visible at the exact one-ring width", async () => {
    const { container, box } = mount();
    await sizer.resize(box, { width: FITS_ONE_RING, height: 800 });
    expect(badges(container)).toEqual(["+1", "+1"]);
  });

  it("restores the collapsed rings when the container grows back", async () => {
    const { container, box } = mount();
    await sizer.resize(box, { width: FITS_ONE_RING - 1, height: 800 });
    expect(badges(container)).toEqual(["+2", "+2"]);

    await sizer.resize(box, { width: FITS_TWO_RINGS - 1, height: 800 });
    expect(badges(container)).toEqual(["+1", "+1"]);

    await sizer.resize(box, { width: FITS_TWO_RINGS, height: 800 });
    expect(badges(container)).toEqual([]);
  });

  it("keeps every node mounted through a full collapse cycle", async () => {
    // Collapse is a visibility concern, not an unmount — a consumer's
    // renderNode state must survive it. Asserted on DISTINCT ids because a
    // node re-entering while its outgoing copy is still animating is rendered
    // twice on purpose (see the leave-transient test below).
    const { container, box } = mount();
    const distinct = () =>
      new Set(
        [...container.querySelectorAll(".probe-node")].map(
          (el) => el.textContent,
        ),
      ).size;

    await sizer.resize(box, { width: FITS_TWO_RINGS, height: 800 });
    expect(distinct()).toBe(5);
    await sizer.resize(box, { width: FITS_ONE_RING - 1, height: 800 });
    expect(distinct()).toBe(5);
    await sizer.resize(box, { width: FITS_TWO_RINGS, height: 800 });
    expect(distinct()).toBe(5);
  });

  it("renders a re-entering node twice until its leave animation finishes", async () => {
    // Not a leak. `leavingItems` holds a departed node for NODE_LEAVE_MS (360)
    // so it can compress into its badge; if the container grows back inside
    // that window the node is live AGAIN while its outgoing copy is still
    // playing, so it appears twice. The duplicate clears when the timer fires.
    //
    // This is the first test to observe the transient at all — it needs two
    // container resizes inside 360ms, which was impossible before the sizer.
    const { container, box } = mount();
    const count = () => container.querySelectorAll(".probe-node").length;

    await sizer.resize(box, { width: FITS_ONE_RING - 1, height: 800 });
    expect(count()).toBe(5);

    await sizer.resize(box, { width: FITS_TWO_RINGS, height: 800 });
    expect(count()).toBe(9); // 5 live + 4 still leaving

    await new Promise((resolve) => setTimeout(resolve, 450));
    expect(count()).toBe(5);
  }, 2_000);
});
