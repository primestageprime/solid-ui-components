import { Component } from "solid-js";
import { DateTimeRange } from "../../src/components/DataDisplay";
import { Stack } from "../../src/components/Layout";
import { NowrapBody } from "../../src/components/Text";

interface Depth2Props {
  onNavigate?: (id: string) => void;
}

export const DateTimeRangeShowcase: Component<Depth2Props> = (props) => {
  return (
    <div class="component-section">
      <h2>DateTimeRange — Depth 2 (zero CSS)</h2>
      <p class="text-meta">Composes Text (curried: NowrapBody). ISO-formatted date/time range display.</p>
      <div class="depth2-layout">
        <div class="depth2-composed">
          <h3>Composed</h3>
          <Stack gap="md">
            <div>
              <div class="text-meta">Same day (date shown once)</div>
              <DateTimeRange
                start="2026-02-13T08:30:00Z"
                end="2026-02-13T14:15:00Z"
              />
            </div>
            <div>
              <div class="text-meta">Different days</div>
              <DateTimeRange
                start="2026-02-13T08:30:00Z"
                end="2026-02-14T09:00:00Z"
              />
            </div>
            <div>
              <div class="text-meta">Date-only mode</div>
              <DateTimeRange
                start="2026-02-13T00:00:00Z"
                end="2026-02-15T00:00:00Z"
                mode="date"
              />
            </div>
            <div>
              <div class="text-meta">Ongoing (no end)</div>
              <DateTimeRange start="2026-02-13T08:30:00Z" />
            </div>
          </Stack>
        </div>
        <div class="depth2-atoms">
          <h3>Curried Variants Used</h3>
          <div class="depth2-atom-group">
            <div class="depth2-atom-group__label">Text</div>
            <div class="depth2-atom depth2-atom--link" onClick={() => props.onNavigate?.("text")}>
              <div class="depth2-atom__label">NowrapBody</div>
              <NowrapBody>body + as: span + white-space: nowrap</NowrapBody>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
