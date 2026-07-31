import type { Component } from "solid-js";
import { Row } from "../../src/components/Layout/Row";
import { SpreadRow, ClusterRow } from "../../src/components/Layout";
import { Surface } from "../../src/components/Surface/Surface";
import { Text } from "../../src/components/Text/Text";
import { Stack } from "../../src/components/Layout/Stack";

const DemoBox: Component<{ label: string }> = (props) => (
  <Surface
    padding="sm"
    radius="sm"
    bg="rgba(0,255,136,0.1)"
    borderColor="rgba(0,255,136,0.3)"
  >
    <Text variant="body">{props.label}</Text>
  </Surface>
);

export const RowShowcase: Component = () => {
  return (
    <div class="component-section">
      <h2>Row — Primitive (Depth 0)</h2>
      <p class="text-meta">
        Owns CSS (Layout.css). Flex-row container with gap/align/justify/wrap.
        Factory: createRow().
      </p>

      <div class="example-group">
        <h3>Base Component — Gap Sizes</h3>
        <Stack gap="sm">
          {(["xs", "sm", "md", "lg"] as const).map((gap) => (
            <div>
              <Text variant="sublabel">{gap}</Text>
              <div class="demo-frame">
                <Row gap={gap}>
                  <DemoBox label="A" />
                  <DemoBox label="B" />
                  <DemoBox label="C" />
                </Row>
              </div>
            </div>
          ))}
        </Stack>
      </div>

      <div class="example-group">
        <h3>Base Component — Justify</h3>
        <Stack gap="sm">
          {(["start", "center", "end", "between"] as const).map((justify) => (
            <div>
              <Text variant="sublabel">{justify}</Text>
              <div class="demo-frame">
                <Row gap="sm" justify={justify}>
                  <DemoBox label="A" />
                  <DemoBox label="B" />
                  <DemoBox label="C" />
                </Row>
              </div>
            </div>
          ))}
        </Stack>
      </div>

      <div class="example-group">
        <h3>Curried Variants</h3>
        <Stack gap="sm">
          <div>
            <Text variant="sublabel">SpreadRow</Text>
            <div class="text-meta">
              align: "center", justify: "between", gap: "sm"
            </div>
            <div class="demo-frame">
              <SpreadRow>
                <DemoBox label="Left" />
                <DemoBox label="Right" />
              </SpreadRow>
            </div>
          </div>
          <div>
            <Text variant="sublabel">ClusterRow</Text>
            <div class="text-meta">align: "center", gap: "sm"</div>
            <div class="demo-frame">
              <ClusterRow>
                <DemoBox label="A" />
                <DemoBox label="B" />
                <DemoBox label="C" />
              </ClusterRow>
            </div>
          </div>
        </Stack>
      </div>
    </div>
  );
};
