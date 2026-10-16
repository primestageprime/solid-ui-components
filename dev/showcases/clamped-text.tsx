// ClampedText — body text that holds 1 to 6 lines, then scrolls inside.
import { type Component } from "solid-js";
import { ClampedText } from "../../src/components/ClampedText";
import { SectionTitle, MutedBody, TextSublabel } from "../../src/components/Text";

const LINE = "A line of notes that is long enough to wrap in a narrow column. ";

export const ClampedTextShowcase: Component = () => (
  <div class="component-section component-section--full">
    <div class="example-group">
      <SectionTitle>ClampedText</SectionTitle>
      <MutedBody>
        Holds one line when empty or short, grows with its text to six lines, then scrolls inside instead of pushing the layout.
      </MutedBody>
      <div class="clamped-text-demo">
        <TextSublabel>Empty: one line high</TextSublabel>
        <ClampedText>{""}</ClampedText>
        <TextSublabel>Short</TextSublabel>
        <ClampedText>A short note.</ClampedText>
        <TextSublabel>Long: six lines, then it scrolls</TextSublabel>
        <ClampedText>{LINE.repeat(14)}</ClampedText>
      </div>
    </div>
  </div>
);
