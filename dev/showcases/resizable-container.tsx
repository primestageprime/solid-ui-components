import { Component, createSignal } from "solid-js";
import { ResizableContainer } from "../../src/components/ResizableContainer";
import { Surface } from "../../src/components/Surface/Surface";
import { Text } from "../../src/components/Text/Text";
import { Stack } from "../../src/components/Layout/Stack";

const DemoContent: Component<{ label: string }> = (props) => (
  <Surface
    padding="md"
    radius="sm"
    bg="rgba(59,130,246,0.08)"
    borderColor="rgba(59,130,246,0.3)"
    style={{ width: "100%", height: "100%", "box-sizing": "border-box" }}
  >
    <Text variant="body">{props.label}</Text>
  </Surface>
);

export const ResizableContainerShowcase: Component = () => {
  const [dims, setDims] = createSignal({ width: 320, height: 200 });

  return (
    <div class="component-section">
      <h2>ResizableContainer — Layout (Depth 0)</h2>
      <p class="text-meta">
        Owns CSS (ResizableContainer.css). Container with draggable edge handles for manual resize.
        Drag the edges to resize. Callback receives `{'{ width, height }'}`.
      </p>

      <div class="example-group">
        <h3>Right + Bottom (default)</h3>
        <div class="text-meta" style={{ "margin-bottom": "12px" }}>
          directions: ["right", "bottom"] — drag the right or bottom edge
        </div>
        <ResizableContainer initialWidth={320} initialHeight={200} onResize={setDims}>
          <DemoContent label={`${dims().width}px × ${dims().height}px`} />
        </ResizableContainer>
      </div>

      <div class="example-group">
        <h3>All four edges</h3>
        <div class="text-meta" style={{ "margin-bottom": "12px" }}>
          directions: ["top", "right", "bottom", "left"] with min/max bounds
        </div>
        <ResizableContainer
          directions={["top", "right", "bottom", "left"]}
          initialWidth={300}
          initialHeight={180}
          minWidth={120}
          maxWidth={600}
          minHeight={80}
          maxHeight={400}
        >
          <DemoContent label="Drag any edge" />
        </ResizableContainer>
      </div>

      <div class="example-group">
        <h3>Horizontal only (right)</h3>
        <div class="text-meta" style={{ "margin-bottom": "12px" }}>
          directions: ["right"] — width-only resize, height stays fixed
        </div>
        <ResizableContainer
          directions={["right"]}
          initialWidth={240}
          initialHeight={80}
          minWidth={120}
          maxWidth={600}
        >
          <DemoContent label="Horizontal resize" />
        </ResizableContainer>
      </div>

      <div class="example-group">
        <h3>With onResize callback</h3>
        <div class="text-meta" style={{ "margin-bottom": "12px" }}>
          Live dimensions are echoed outside the container.
        </div>
        <Stack gap="sm">
          <ResizableContainer
            initialWidth={260}
            initialHeight={140}
            onResize={setDims}
          >
            <DemoContent label="Resize me" />
          </ResizableContainer>
          <Text variant="sublabel">
            width: {dims().width}px · height: {dims().height}px
          </Text>
        </Stack>
      </div>
    </div>
  );
};
