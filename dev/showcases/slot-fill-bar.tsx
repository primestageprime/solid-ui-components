import { Component, createSignal, onCleanup, onMount, Show } from "solid-js";
import { SlotFillBar } from "../../src/components/SlotFillBar";
import { NarrowStack, TightStack, ClusterRow } from "../../src/components/Layout";
import { TextLabel, TextSublabel, MutedBody } from "../../src/components/Text";

const QUEUE_LENGTH = 10;
const QUEUE_TICK_MS = 1000;

// Drives a single fake task through the 20 phase-transitions of a 10-slot
// queue so both transition modes are visible:
//   odd  step → slot enters `doing` (slide)
//   even step → slot fades to `done` and the static fill grows by one slot
const AnimatedExample: Component = () => {
  const [done, setDone] = createSignal(0);
  const [activeIdx, setActiveIdx] = createSignal<number | null>(null);
  const [activePhase, setActivePhase] = createSignal<"doing" | "done" | "idle">("idle");
  const [finished, setFinished] = createSignal(false);
  let timer: number | undefined;
  let step = 0;

  const start = () => {
    if (timer !== undefined) window.clearTimeout(timer);
    step = 0;
    setDone(0);
    setActiveIdx(null);
    setActivePhase("idle");
    setFinished(false);

    const tick = () => {
      step += 1;
      if (step > QUEUE_LENGTH * 2) {
        timer = undefined;
        setActivePhase("idle");
        setFinished(true);
        return;
      }
      const idx = Math.floor((step - 1) / 2);
      const isOdd = step % 2 === 1;
      setActiveIdx(idx);
      setActivePhase(isOdd ? "doing" : "done");
      if (!isOdd) setDone((d) => d + 1);
      timer = window.setTimeout(tick, QUEUE_TICK_MS);
    };
    timer = window.setTimeout(tick, QUEUE_TICK_MS);
  };

  onMount(start);
  onCleanup(() => {
    if (timer !== undefined) window.clearTimeout(timer);
  });

  return (
    <TightStack>
      <ClusterRow style={{ "justify-content": "space-between" }}>
        <TextLabel>
          {done()}/{QUEUE_LENGTH} done
          {activePhase() === "doing" ? " · 1 in flight" : finished() ? " · ✓" : ""}
        </TextLabel>
        <Show when={finished()}>
          <button
            onClick={start}
            style={{
              padding: "2px 10px",
              "border-radius": "999px",
              border: "1px solid var(--sui-border)",
              background: "transparent",
              color: "var(--sui-text-muted, #888)",
              cursor: "pointer",
              "font-size": "11px",
            }}
          >
            ↻ replay
          </button>
        </Show>
      </ClusterRow>
      <SlotFillBar
        slots={QUEUE_LENGTH}
        done={done()}
        active={
          activePhase() === "idle" || activeIdx() === null
            ? null
            : { index: activeIdx()!, phase: activePhase() as "doing" | "done" }
        }
      />
    </TightStack>
  );
};

export const SlotFillBarShowcase: Component = () => (
  <div class="component-section">
    <h2>SlotFillBar — Atomic (Depth 1)</h2>
    <p class="text-meta">
      Fill-from-left progress bar for an ordered queue of equal-sized work
      slots that move through <code>todo → doing → done</code>. Two distinct
      transitions: <strong>todo → doing</strong> SLIDES the active overlay
      (clip-path), <strong>doing → done</strong> FADES the overlay's
      background colour in place while the static fill grows by one slot to
      absorb it.
    </p>

    <div class="example-group">
      <h3>Static — 3 of 10 done, no in-flight slot</h3>
      <TightStack>
        <TextSublabel>
          <code>slots={10}</code>, <code>done={3}</code>, <code>active=null</code>
        </TextSublabel>
        <SlotFillBar slots={10} done={3} active={null} />
        <MutedBody>30% of the bar is filled with the done colour from the left.</MutedBody>
      </TightStack>
    </div>

    <div class="example-group">
      <h3>Doing — slot 3 in flight, signalling “doing”</h3>
      <TightStack>
        <TextSublabel>
          <code>active={"{"} index: 3, phase: "doing" {"}"}</code>
        </TextSublabel>
        <SlotFillBar slots={10} done={3} active={{ index: 3, phase: "doing" }} />
        <MutedBody>
          Overlay clipped to the 4th slot, painted in the info accent. Colour
          snaps when the index changes so the slide reads as one solid wave
          rather than a rainbow.
        </MutedBody>
      </TightStack>
    </div>

    <div class="example-group">
      <h3>Animated — single task moving through 20 phase transitions</h3>
      <NarrowStack>
        <TextSublabel>
          1s per step. Watch the overlay slide on doing-entry and fade in
          place on doing→done while the static fill grows underneath.
        </TextSublabel>
        <AnimatedExample />
      </NarrowStack>
    </div>
  </div>
);
