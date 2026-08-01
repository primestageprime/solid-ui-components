import type { Component } from "solid-js";
import { ThreePanelLayout } from "../../src/components/ThreePanelLayout";
import { NarrowStack } from "../../src/components/Layout";
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

export const ThreePanelLayoutShowcase: Component = () => {
  return (
    <div class="component-section">
      <h2>ThreePanelLayout — Primitive (Depth 0)</h2>
      <p class="text-meta">
        Owns CSS (ThreePanelLayout.css), no component imports. Top-bar +
        three-column (left / center / right) page scaffold. Zero-config:
        required slot is <code>centerPanel</code>; all other slots render
        conditionally and the grid collapses automatically when a side panel is
        omitted.
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

      <div class="example-group">
        <h3>fullHeight alias (height = "100%")</h3>
        <Frame label="<ThreePanelLayout fullHeight />">
          <ThreePanelLayout
            fullHeight
            topBar={<DemoTopBar />}
            leftPanel={<DemoList title="Assets" items={["Vessel A"]} />}
            centerPanel={<DemoCenter />}
            rightPanel={<DemoList title="Context" items={["Engine #3"]} />}
          />
        </Frame>
      </div>

      <div class="example-group">
        <h3>Custom panel widths</h3>
        <Frame label='leftPanelWidth="160px" rightPanelWidth="320px"'>
          <ThreePanelLayout
            topBar={<DemoTopBar />}
            leftPanel={<DemoList title="Narrow" items={["Item 1", "Item 2"]} />}
            centerPanel={<DemoCenter />}
            rightPanel={
              <DemoList
                title="Wide Context"
                items={["Details row 1", "Details row 2", "Details row 3"]}
              />
            }
            leftPanelWidth="160px"
            rightPanelWidth="320px"
          />
        </Frame>
      </div>

      <div class="example-group">
        <h3>Explicit viewport height (caller-controlled)</h3>
        <NarrowStack>
          <Frame label='height="100%"  — wrap in a container to get "viewport minus header"'>
            <ThreePanelLayout
              height="100%"
              topBar={<DemoTopBar />}
              leftPanel={<DemoList title="Assets" items={["Vessel A"]} />}
              centerPanel={<DemoCenter />}
              rightPanel={<DemoList title="Context" items={["Engine #3"]} />}
            />
          </Frame>
          <p class="text-meta">
            For "viewport minus app header" pass{" "}
            <code>height="calc(100vh - var(--app-header-height, 64px))"</code>.
          </p>
        </NarrowStack>
      </div>
    </div>
  );
};
