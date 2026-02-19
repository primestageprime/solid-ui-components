import { Component } from "solid-js";
import { Surface } from "../../src/components/Surface";
import {
  CardSurface, CompactSurface,
  InfoSurface, WarningSurface, SuccessSurface, DangerSurface,
} from "../../src/components/Surface";
import { Stack } from "../../src/components/Layout";
import { Text } from "../../src/components/Text";

export const SurfaceShowcase: Component = () => {
  return (
    <div class="component-section">
      <h2>Surface — Primitive (Depth 0)</h2>
      <p class="text-meta">Owns CSS (Surface.css). Themed container with padding/radius/bg/border. Factory: createSurface().</p>

      <div class="example-group">
        <h3>Base Component — Padding</h3>
        <div class="example-row" style={{ "align-items": "flex-start" }}>
          {(["none", "sm", "md", "lg"] as const).map((padding) => (
            <Surface padding={padding} radius="md">
              <Text variant="body">padding="{padding}"</Text>
            </Surface>
          ))}
        </div>
      </div>

      <div class="example-group">
        <h3>Base Component — Border Radius</h3>
        <div class="example-row" style={{ "align-items": "flex-start" }}>
          {(["none", "sm", "md", "lg"] as const).map((radius) => (
            <Surface padding="md" radius={radius}>
              <Text variant="body">radius="{radius}"</Text>
            </Surface>
          ))}
        </div>
      </div>

      <div class="example-group">
        <h3>Curried Variants — Shape</h3>
        <Stack gap="md">
          <div>
            <CardSurface>
              <Text variant="body">CardSurface</Text>
            </CardSurface>
            <div class="text-meta">CardSurface — padding: "md", radius: "md"</div>
          </div>
          <div>
            <CompactSurface>
              <Text variant="body">CompactSurface</Text>
            </CompactSurface>
            <div class="text-meta">CompactSurface — padding: "sm", radius: "sm"</div>
          </div>
        </Stack>
      </div>

      <div class="example-group">
        <h3>Curried Variants — Status Colors</h3>
        <Stack gap="md">
          <div>
            <InfoSurface>
              <Text variant="body">InfoSurface</Text>
            </InfoSurface>
            <div class="text-meta">InfoSurface — card + rgba(0,212,255) bg/border</div>
          </div>
          <div>
            <WarningSurface>
              <Text variant="body">WarningSurface</Text>
            </WarningSurface>
            <div class="text-meta">WarningSurface — card + rgba(255,204,0) bg/border</div>
          </div>
          <div>
            <SuccessSurface>
              <Text variant="body">SuccessSurface</Text>
            </SuccessSurface>
            <div class="text-meta">SuccessSurface — card + rgba(0,255,136) bg/border</div>
          </div>
          <div>
            <DangerSurface>
              <Text variant="body">DangerSurface</Text>
            </DangerSurface>
            <div class="text-meta">DangerSurface — card + rgba(255,0,64) bg/border</div>
          </div>
        </Stack>
      </div>
    </div>
  );
};
