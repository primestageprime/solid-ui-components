/**
 * Builder Board bench — the four-panel frame at three viewport sizes.
 *
 * This bench builds NOTHING but the frame. Each panel holds a title and a
 * centred placeholder, so what is on show is the GEOMETRY: A over B in the top
 * half, C beside the fixed-width rail D in the bottom half, at a laptop, a
 * desktop and a wide viewport — and the same picture at each, with only the
 * pane C growing.
 *
 * Two tables sit under the frame. The MODEL is `builderBoardTable`, the
 * headless observation `geometry.ts` prints for the picked viewport; the
 * MEASURED table is `getBoundingClientRect` on the four rendered panels,
 * relative to the frame. They should agree to the pixel; if they ever do not,
 * either the model or the frame has changed and the other has not followed.
 *
 * The three sizes are bench CSS classes in dev/main.css (a bench may state a
 * viewport; a component may not), wrapped in a `ScrollXBox` because two of
 * them are wider than the gallery.
 */
import { type Component, createSignal, onCleanup, onMount } from "solid-js";
import { join, map } from "../../../src/fn";
import { BuilderBoard } from "../../../src/components/BuilderBoard";
import {
  builderBoardTable,
  type PanelId,
  type Viewport,
} from "../../../src/components/BuilderBoard/geometry";
import { CodeBlock } from "../../../src/components/CodeBlock";
import {
  GrowCenterColumn,
  NarrowStack,
  ScrollXBox,
  SpreadRow,
} from "../../../src/components/Layout";
import { createSegmentedControl } from "../../../src/components/SegmentedControl";
import { NoteText, SectionTitle, TextTitle } from "../../../src/components/Text";

export const meta = { label: "Builder Board" };

type SizeId = "laptop" | "desktop" | "wide";

/** The three viewports, as the bench classes in dev/main.css state them. */
const SIZES: Readonly<Record<SizeId, Viewport>> = {
  laptop: { width: 1000, height: 600 },
  desktop: { width: 1280, height: 720 },
  wide: { width: 1600, height: 900 },
};

const SizePicker = createSegmentedControl({
  options: map(
    (id: SizeId) => ({
      value: id,
      label: `${id} ${SIZES[id].width}×${SIZES[id].height}`,
    }),
    ["laptop", "desktop", "wide"] as const,
  ),
});

const PANELS: readonly PanelId[] = ["a", "b", "c", "d"];

const PANEL_NAMES: Readonly<Record<PanelId, string>> = {
  a: "A cashflow",
  b: "B series",
  c: "C changes",
  d: "D rail",
};

const cell = (value: number | string, width: number): string =>
  String(value).padStart(width);

/** The four panels as the browser laid them out, in the model's own table
 *  shape so the two read side by side. */
const measuredTable = (frame: HTMLElement): string => {
  const origin = frame.getBoundingClientRect();
  const header = `${"panel".padEnd(12)}${cell("x", 6)}${cell("y", 6)}${cell("width", 7)}${cell("height", 8)}`;
  const rows = map((id: PanelId) => {
    const el = frame.querySelector<HTMLElement>(`[data-builder-board-panel="${id}"]`);
    if (el === null) return `${PANEL_NAMES[id].padEnd(12)}  (not rendered)`;
    const r = el.getBoundingClientRect();
    return `${PANEL_NAMES[id].padEnd(12)}${cell(Math.round(r.left - origin.left), 6)}${cell(Math.round(r.top - origin.top), 6)}${cell(Math.round(r.width), 7)}${cell(Math.round(r.height), 8)}`;
  }, PANELS);
  return join("\n", [header, ...rows]);
};

/** A panel's stand-in: its name over a centred note. */
const Placeholder: Component<{ title: string; note: string }> = (props) => (
  <>
    <TextTitle>{props.title}</TextTitle>
    <GrowCenterColumn>
      <NoteText>{props.note}</NoteText>
    </GrowCenterColumn>
  </>
);

const BuilderBoardBench: Component = () => {
  const [size, setSize] = createSignal<SizeId>("laptop");
  const [measured, setMeasured] = createSignal("(measuring…)");
  let frame: HTMLDivElement | undefined;

  onMount(() => {
    if (frame === undefined) return;
    const target = frame;
    const observer = new ResizeObserver(() => setMeasured(measuredTable(target)));
    observer.observe(target);
    onCleanup(() => observer.disconnect());
  });

  return (
    <div class="component-section component-section--full">
      <NarrowStack>
        <SpreadRow>
          <SectionTitle>Builder Board</SectionTitle>
          <SizePicker
            value={size()}
            onValueChange={(id) => setSize(id as SizeId)}
            aria-label="Viewport"
          />
        </SpreadRow>
        <NoteText>
          One frame, four slots. The rail is held to the gauge's natural width
          at every size; only the pane beside it moves.
        </NoteText>

        <ScrollXBox>
          <div
            ref={frame}
            class={`builder-board-bench__viewport builder-board-bench__viewport--${size()}`}
          >
            <BuilderBoard
              panelA={<Placeholder title="Cash Flow" note="panel A — the cashflow chart, full width, a quarter of the height" />}
              panelB={<Placeholder title="Series" note="panel B — the series being changed; clicking it inserts a time segment" />}
              panelC={<Placeholder title="Changes" note="panel C — the controls; fills what the rail leaves and scrolls inside its card" />}
              panelD={<Placeholder title="Cash, on average" note="panel D — the gauge, a stated width" />}
            />
          </div>
        </ScrollXBox>

        <TextTitle>Model — builderBoardTable({SIZES[size()].width}, {SIZES[size()].height})</TextTitle>
        <CodeBlock size="sm">{builderBoardTable(SIZES[size()])}</CodeBlock>
        <TextTitle>Measured — getBoundingClientRect on the rendered panels</TextTitle>
        <CodeBlock size="sm">{measured()}</CodeBlock>
      </NarrowStack>
    </div>
  );
};

export default BuilderBoardBench;
