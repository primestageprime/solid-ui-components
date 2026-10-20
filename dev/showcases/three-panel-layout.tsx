import type { Component } from "solid-js";
import {
  ThreePanelLayout,
  StandardThreePanel,
  ListDetailThreePanel,
  InspectorThreePanel,
  SplitThreePanel,
  FluidListDetailThreePanel,
  ListDetailLogThreePanel,
} from "../../src/components/ThreePanelLayout";
import { TextBody } from "../../src/components/Text";

// A single frame inside the showcase so each variant renders at a bounded
// height. The dev shell does not grant the component a viewport, so we set
// a fixed pixel height on each example wrapper.
const Frame: Component<{ label: string; children: any }> = (props) => (
  <div>
    <div class="text-meta">{props.label}</div>
    <div class="three-panel-demo__pane">{props.children}</div>
  </div>
);

const DemoTopBar = () => (
  <>
    <strong class="three-panel-demo__brand">Alarm Lab</strong>
    <TextBody>/ Explanation</TextBody>
  </>
);

const DemoList: Component<{ title: string; items: string[] }> = (props) => (
  <>
    <h4 class="three-panel-demo__list-title">{props.title}</h4>
    {props.items.map((item) => (
      <div class="three-panel-demo__list-item">{item}</div>
    ))}
  </>
);

const DemoCenter = () => (
  <>
    <h2 class="three-panel-demo__heading">Alarm Explanation</h2>
    <p class="three-panel-demo__prose">
      Primary work area — this is where the main content lives. Scrolls
      independently of the side panels and the top bar.
    </p>
    <p class="three-panel-demo__prose">
      Use this slot for DAG views, charts, tables, or any "main" content.
    </p>
  </>
);

const VARIANTS = [
  { name: "StandardThreePanel", widths: "260 / 240", use: "list, work area, context pane", V: StandardThreePanel },
  { name: "ListDetailThreePanel", widths: "320 / 240", use: "list-and-detail, wide left column", V: ListDetailThreePanel },
  { name: "InspectorThreePanel", widths: "220 / 320", use: "work area with a wide right inspector", V: InspectorThreePanel },
  { name: "SplitThreePanel", widths: "560 / 240", use: "split view, half-screen-class left pane", V: SplitThreePanel },
  { name: "FluidListDetailThreePanel", widths: "22vw 240..360 / 15vw 180..260", use: "fluid list-and-detail, stacked asides uncapped on phones", V: FluidListDetailThreePanel },
  { name: "ListDetailLogThreePanel", widths: "320 / 28vw 320..440 flush", use: "list-and-detail with a time + text log in the right panel", V: ListDetailLogThreePanel },
];

export const ThreePanelLayoutShowcase: Component = () => {
  return (
    <div class="component-section">
      <h2>ThreePanelLayout — named variants</h2>
      <p class="text-meta">
        The only three-panel layouts to import. Each variant bakes its aside
        widths (from <code>THREE_PANEL_ASIDE_WIDTH</code>) and full height; you
        pass only the panels. A size change is a new named variant or a global
        change to a variant, never a call-site prop.
      </p>

      {VARIANTS.map(({ name, widths, use, V }) => (
        <div class="example-group">
          <h3>{name}</h3>
          <Frame label={`left / right ${widths} — ${use}`}>
            <V
              topBar={<DemoTopBar />}
              leftPanel={<DemoList title="Left" items={["Item 1", "Item 2", "Item 3"]} />}
              centerPanel={<DemoCenter />}
              rightPanel={<DemoList title="Right" items={["Detail 1", "Detail 2"]} />}
            />
          </Frame>
        </div>
      ))}

      <h2>internal</h2>
      <p class="text-meta">
        The sized primitive (Depth 1, owns ThreePanelLayout.css). Deprecated at
        the package root: apps use a variant above or{" "}
        <code>createThreePanelLayout</code> for an app-level one. Shown here for
        the slot behavior only.
      </p>

      <div class="example-group">
        <h3>Default — all four slots</h3>
        <Frame label="topBar + leftPanel + centerPanel + rightPanel">
          <ThreePanelLayout
            topBar={<DemoTopBar />}
            leftPanel={
              <DemoList
                title="Assets"
                items={["Vessel A", "Vessel B", "Vessel C"]}
              />
            }
            centerPanel={<DemoCenter />}
            rightPanel={
              <DemoList
                title="Context"
                items={["Engine #3", "Pacific TZ", "Alarm Id 1234"]}
              />
            }
          />
        </Frame>
      </div>

      <div class="example-group">
        <h3>Center only</h3>
        <Frame label="no topBar, no side panels">
          <ThreePanelLayout centerPanel={<DemoCenter />} />
        </Frame>
      </div>

      <div class="example-group">
        <h3>Without topBar</h3>
        <Frame label="leftPanel + centerPanel + rightPanel">
          <ThreePanelLayout
            leftPanel={
              <DemoList title="Assets" items={["Vessel A", "Vessel B"]} />
            }
            centerPanel={<DemoCenter />}
            rightPanel={<DemoList title="Context" items={["Engine #3"]} />}
          />
        </Frame>
      </div>

      <div class="example-group">
        <h3>Without leftPanel</h3>
        <Frame label="topBar + centerPanel + rightPanel">
          <ThreePanelLayout
            topBar={<DemoTopBar />}
            centerPanel={<DemoCenter />}
            rightPanel={<DemoList title="Context" items={["Engine #3"]} />}
          />
        </Frame>
      </div>

      <div class="example-group">
        <h3>Without rightPanel</h3>
        <Frame label="topBar + leftPanel + centerPanel">
          <ThreePanelLayout
            topBar={<DemoTopBar />}
            leftPanel={
              <DemoList title="Assets" items={["Vessel A", "Vessel B"]} />
            }
            centerPanel={<DemoCenter />}
          />
        </Frame>
      </div>
    </div>
  );
};
