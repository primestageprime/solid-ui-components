import type { Component } from "solid-js";
import { Surface } from "../../src/components/Surface/Surface";
import {
  CardSurface,
  CompactSurface,
  InfoSurface,
  WarningSurface,
  SuccessSurface,
  DangerSurface,
  ContentSurface,
  CenteredSurface,
  NoteCard,
  WideCard,
  SquareCard,
  FormulaBlock,
} from "../../src/components/Surface";
import { NarrowStack } from "../../src/components/Layout";
import { Text } from "../../src/components/Text/Text";

export const SurfaceShowcase: Component = () => {
  return (
    <div class="component-section">
      <h2>Surface — Primitive (Depth 0)</h2>
      <p class="text-meta">
        Owns CSS (Surface.css). Themed container with padding/radius/bg/border.
        Factory: createSurface().
      </p>

      <div class="example-group">
        <h3>Base Component — Padding</h3>
        <div class="example-row example-row--top">
          {(["none", "sm", "md"] as const).map((padding) => (
            <Surface padding={padding} radius="md">
              <Text variant="body">padding="{padding}"</Text>
            </Surface>
          ))}
        </div>
      </div>

      <div class="example-group">
        <h3>Base Component — Border Radius</h3>
        <div class="example-row example-row--top">
          {(["none", "sm", "md"] as const).map((radius) => (
            <Surface padding="md" radius={radius}>
              <Text variant="body">radius="{radius}"</Text>
            </Surface>
          ))}
        </div>
      </div>

      <div class="example-group">
        <h3>Curried Variants — Shape</h3>
        <NarrowStack>
          <div>
            <CardSurface>
              <Text variant="body">CardSurface</Text>
            </CardSurface>
            <div class="text-meta">
              CardSurface — padding: "md", radius: "md"
            </div>
          </div>
          <div>
            <CompactSurface>
              <Text variant="body">CompactSurface</Text>
            </CompactSurface>
            <div class="text-meta">
              CompactSurface — padding: "sm", radius: "sm"
            </div>
          </div>
        </NarrowStack>
      </div>

      <div class="example-group">
        <h3>Curried Variants — Status Colors</h3>
        <NarrowStack>
          <div>
            <InfoSurface>
              <Text variant="body">InfoSurface</Text>
            </InfoSurface>
            <div class="text-meta">
              InfoSurface — card + rgba(0,212,255) bg/border
            </div>
          </div>
          <div>
            <WarningSurface>
              <Text variant="body">WarningSurface</Text>
            </WarningSurface>
            <div class="text-meta">
              WarningSurface — card + rgba(255,204,0) bg/border
            </div>
          </div>
          <div>
            <SuccessSurface>
              <Text variant="body">SuccessSurface</Text>
            </SuccessSurface>
            <div class="text-meta">
              SuccessSurface — card + rgba(0,255,136) bg/border
            </div>
          </div>
          <div>
            <DangerSurface>
              <Text variant="body">DangerSurface</Text>
            </DangerSurface>
            <div class="text-meta">
              DangerSurface — card + rgba(255,0,64) bg/border
            </div>
          </div>
        </NarrowStack>
      </div>

      <div class="example-group">
        <h3>Role Variants</h3>
        <div class="text-meta">
          Surfaces named for the JOB they do, not the padding they carry — the
          call site picks a role and inherits the geometry.
        </div>
        <NarrowStack>
          <ContentSurface>
            <Text variant="label">ContentSurface</Text>
            <Text variant="body">
              The everyday surface: a column with breathing room between its
              children.
            </Text>
          </ContentSurface>
          <CenteredSurface>
            <Text variant="body">CenteredSurface — single-focus content</Text>
          </CenteredSurface>
          <NoteCard>
            <Text variant="body">NoteCard — a soft aside</Text>
          </NoteCard>
          <WideCard>
            <Text variant="body">WideCard — a card that spans its row</Text>
          </WideCard>
          <SquareCard>
            <Text variant="body">SquareCard</Text>
          </SquareCard>
          <FormulaBlock>
            <Text variant="body">FormulaBlock — NOx = (C × Q) / P</Text>
          </FormulaBlock>
        </NarrowStack>
      </div>
    </div>
  );
};