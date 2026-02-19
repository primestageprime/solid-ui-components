import { Component } from "solid-js";
import { Row } from "../../src/components/Layout";
import { SpreadRow, ClusterRow } from "../../src/components/Layout";
import { Surface } from "../../src/components/Surface";
import { Text } from "../../src/components/Text";
import { Stack } from "../../src/components/Layout";

const DemoBox: Component<{ label: string }> = (props) => (
  <Surface padding="sm" radius="sm" bg="rgba(0,255,136,0.1)" borderColor="rgba(0,255,136,0.3)">
    <Text variant="body">{props.label}</Text>
  </Surface>
);

export const RowShowcase: Component = () => {
  return (
    <div class="component-section">
      <h2>Row — Primitive (Depth 0)</h2>
      <p class="text-meta">Owns CSS (Layout.css). Flex-row container with gap/align/justify/wrap. Factory: createRow().</p>

      <div class="example-group">
        <h3>Base Component — Gap Sizes</h3>
        <Stack gap="md">
          {(["xs", "sm", "md", "lg", "xl"] as const).map((gap) => (
            <div>
              <Text variant="sublabel">{gap}</Text>
              <Row gap={gap} style={{ "margin-top": "8px" }}>
                <DemoBox label="A" />
                <DemoBox label="B" />
                <DemoBox label="C" />
              </Row>
            </div>
          ))}
        </Stack>
      </div>

      <div class="example-group">
        <h3>Base Component — Justify</h3>
        <Stack gap="md">
          {(["start", "center", "end", "between"] as const).map((justify) => (
            <div>
              <Text variant="sublabel">{justify}</Text>
              <Row gap="sm" justify={justify} style={{ "margin-top": "8px", border: "1px dashed rgba(255,255,255,0.1)", padding: "8px" }}>
                <DemoBox label="A" />
                <DemoBox label="B" />
                <DemoBox label="C" />
              </Row>
            </div>
          ))}
        </Stack>
      </div>

      <div class="example-group">
        <h3>Curried Variants</h3>
        <Stack gap="md">
          <div>
            <Text variant="sublabel">SpreadRow</Text>
            <div class="text-meta">align: "center", justify: "between", gap: "md"</div>
            <SpreadRow style={{ "margin-top": "8px", border: "1px dashed rgba(255,255,255,0.1)", padding: "8px" }}>
              <DemoBox label="Left" />
              <DemoBox label="Right" />
            </SpreadRow>
          </div>
          <div>
            <Text variant="sublabel">ClusterRow</Text>
            <div class="text-meta">align: "center", gap: "sm"</div>
            <ClusterRow style={{ "margin-top": "8px", border: "1px dashed rgba(255,255,255,0.1)", padding: "8px" }}>
              <DemoBox label="A" />
              <DemoBox label="B" />
              <DemoBox label="C" />
            </ClusterRow>
          </div>
        </Stack>
      </div>
    </div>
  );
};
