// SvgMarks — the Depth-1 SVG marks on the BOX CONTRACT.
//
// Every mark here draws INSIDE a `{ x, y, width, height }` it is handed and
// never positions itself; colour is data. So the page plays the CALLER: it
// owns each `<svg>`, lays out the boxes, and hands them over. That is the
// whole lesson — in a real screen a chart slot (`SpanLanes`) does exactly this
// layout, and these are what it paints with.
//
// The one interactive example is the EndLabels width scrubber: shrink the box
// and watch the trail label drop out before it would collide with the lead.
import { type Component, For, createSignal } from "solid-js";
import {
  BoxRing,
  EndLabels,
  GlyphBadge,
  HatchPattern,
  SegmentBar,
} from "../../src/components/SvgMarks";
import { Slider } from "../../src/components/Slider";
import { SpacedStack, TightStack } from "../../src/components/Layout";
import {
  CaptionLabel,
  MutedBody,
  SectionTitle,
  SubsectionTitle,
} from "../../src/components/Text";

const BAR_H = 26;
const box = (x: number, y: number, width: number) => ({
  x,
  y,
  width,
  height: BAR_H,
});

/** The padlock as one stroked path in a 16-unit box — GlyphBadge's `path` glyph. */
const LOCK_PATH = "M4 7.5h8v6H4z M5.5 7.5V5a2.5 2.5 0 0 1 5 0v2.5";

/** The hatch patterns every example below fills waits with. */
const Hatches: Component = () => (
  <defs>
    <HatchPattern id="svg-marks-hatch-accent" color="var(--sui-accent)" />
    <HatchPattern id="svg-marks-hatch-warning" color="var(--sui-warning)" />
  </defs>
);

const SegmentBars: Component = () => {
  const [hovered, setHovered] = createSignal<number | null>(null);
  const bars = [
    {
      box: box(8, 8, 420),
      segments: [
        { from: 0, to: 0.35, fill: "var(--sui-accent)" },
        { from: 0.35, to: 0.55, fill: "url(#svg-marks-hatch-accent)" },
        { from: 0.55, to: 1, fill: "var(--sui-accent)" },
      ],
    },
    {
      box: box(120, 44, 300),
      segments: [
        { from: 0, to: 0.5, fill: "var(--sui-warning)" },
        { from: 0.5, to: 0.8, fill: "var(--sui-success)" },
        { from: 0.8, to: 1, fill: "url(#svg-marks-hatch-warning)" },
      ],
    },
  ];
  return (
    <svg
      class="svg-marks-demo"
      viewBox="0 0 440 80"
      role="img"
      aria-label="Two segment bars, one with a hatched wait in the middle"
    >
      <Hatches />
      <For each={bars}>
        {(b, i) => (
          <g
            onPointerEnter={() => setHovered(i())}
            onPointerLeave={() => setHovered(null)}
          >
            <SegmentBar
              box={b.box}
              segments={b.segments}
              hovered={hovered() === i()}
            />
          </g>
        )}
      </For>
    </svg>
  );
};

const Adornments: Component = () => {
  const plain = box(24, 16, 260);
  const flagged = box(24, 60, 180);
  return (
    <svg
      class="svg-marks-demo"
      viewBox="0 0 440 100"
      role="img"
      aria-label="Bars with a ring, a warning badge and a padlock badge"
    >
      <Hatches />
      <SegmentBar
        box={plain}
        segments={[{ from: 0, to: 1, fill: "var(--sui-success)" }]}
      />
      <GlyphBadge
        box={{ x: plain.x - 8, y: plain.y - 8, width: 16, height: 16 }}
        color="var(--sui-bg-deep)"
        glyph={{ path: LOCK_PATH }}
        glyphColor="var(--sui-text-primary)"
        ringColor="var(--sui-text-secondary)"
      />
      <BoxRing box={flagged} color="var(--sui-danger)" />
      <SegmentBar
        box={flagged}
        segments={[
          { from: 0, to: 0.6, fill: "var(--sui-warning)" },
          { from: 0.6, to: 1, fill: "url(#svg-marks-hatch-warning)" },
        ]}
      />
      <GlyphBadge
        box={{
          x: flagged.x + flagged.width - 7,
          y: flagged.y - 9,
          width: 18,
          height: 18,
        }}
        color="var(--sui-danger)"
        glyph={{ text: "!" }}
        glyphColor="var(--sui-text-primary)"
      />
    </svg>
  );
};

const FittedLabels: Component = () => {
  const [width, setWidth] = createSignal(260);
  return (
    <TightStack>
      <svg
        class="svg-marks-demo"
        viewBox="0 0 440 80"
        role="img"
        aria-label="Bars with lead and trail labels"
      >
        <SegmentBar
          box={box(8, 8, width())}
          segments={[{ from: 0, to: 1, fill: "var(--sui-accent)" }]}
        />
        <EndLabels
          box={box(8, 8, width())}
          lead="#3"
          trail="$33.8k"
          color="var(--sui-text-primary)"
        />
        <SegmentBar
          box={box(8, 44, 60)}
          segments={[{ from: 0, to: 1, fill: "var(--sui-success)" }]}
        />
        <EndLabels
          box={box(8, 44, 60)}
          lead="#12"
          trail="$4.1k"
          color="var(--sui-bg-deep)"
        />
      </svg>
      <Slider
        label="Top bar's width"
        value={width()}
        onChange={setWidth}
        min={30}
        max={420}
        step={2}
        format={(v) => `${v} px`}
      />
      <CaptionLabel>
        The lower bar is too narrow for both, so its trail is dropped.
      </CaptionLabel>
    </TightStack>
  );
};

export const SvgMarksShowcase: Component = () => (
  <div class="component-section component-section--full">
    <SpacedStack>
      <TightStack>
        <SectionTitle>SvgMarks</SectionTitle>
        <MutedBody>
          Primitive (Depth 1) SVG marks on a box contract: each draws inside the
          box it is handed and never positions itself, and every colour is data.
          The caller lays out the boxes; a chart slot such as SpanLanes does
          that in a real screen.
        </MutedBody>
      </TightStack>

      <div class="example-group">
        <SubsectionTitle>SegmentBar + HatchPattern</SubsectionTitle>
        <CaptionLabel>
          Fractional segments, clipped to rounded ends, with a seam where two
          touch. The waits fill with a HatchPattern url. Hover a bar.
        </CaptionLabel>
        <SegmentBars />
      </div>

      <div class="example-group">
        <SubsectionTitle>BoxRing + GlyphBadge</SubsectionTitle>
        <CaptionLabel>
          A padlock badge on the first bar's corner; a red ring and a ! on the
          second.
        </CaptionLabel>
        <Adornments />
      </div>

      <div class="example-group">
        <SubsectionTitle>EndLabels</SubsectionTitle>
        <FittedLabels />
      </div>
    </SpacedStack>
  </div>
);
