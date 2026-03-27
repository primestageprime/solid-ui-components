// ============================================
// SprintSelector — Atomic (Depth 1)
// Owns CSS (SprintSelector.css), no component imports.
// Horizontal row of mini stacked bars for week selection.
// ============================================
import { Component, splitProps, For, createMemo } from "solid-js";
import "./SprintSelector.css";

export interface SprintSummary {
  label: string;
  planned_complete: number;
  planned_incomplete: number;
  unplanned_complete: number;
  unplanned_incomplete: number;
}

export interface SprintSelectorProps {
  sprints: SprintSummary[];
  selectedIndex?: number;
  onSelect?: (index: number) => void;
}

export const SprintSelector: Component<SprintSelectorProps> = (props) => {
  const [local] = splitProps(props, ["sprints", "selectedIndex", "onSelect"]);

  const maxTotal = createMemo(() =>
    Math.max(1, ...local.sprints.map((s) =>
      s.planned_complete + s.planned_incomplete + s.unplanned_complete + s.unplanned_incomplete
    ))
  );

  return (
    <div class="sui-sprint-selector">
      <For each={local.sprints}>
        {(sprint, i) => {
          const total = () =>
            sprint.planned_complete + sprint.planned_incomplete +
            sprint.unplanned_complete + sprint.unplanned_incomplete;

          const scale = () => total() / maxTotal();
          const pcFrac = () => total() > 0 ? sprint.planned_complete / total() : 0;
          const piFrac = () => total() > 0 ? sprint.planned_incomplete / total() : 0;
          const ucFrac = () => total() > 0 ? sprint.unplanned_complete / total() : 0;
          const uiFrac = () => total() > 0 ? sprint.unplanned_incomplete / total() : 0;

          const barH = () => scale() * 100;
          const barY = () => 100 - barH();
          const pcH = () => pcFrac() * barH();
          const piH = () => piFrac() * barH();
          const ucH = () => ucFrac() * barH();
          const uiH = () => uiFrac() * barH();

          const pcY = () => barY();
          const piY = () => pcY() + pcH();
          const ucY = () => piY() + piH();
          const uiY = () => ucY() + ucH();

          return (
            <div
              class={`sui-sprint-selector__bar-group${local.selectedIndex === i() ? " sui-sprint-selector__bar-group--selected" : ""}`}
              onClick={() => local.onSelect?.(i())}
            >
              <div class="sui-sprint-selector__bar-container">
                <svg viewBox="0 0 20 100" preserveAspectRatio="none">
                  {sprint.planned_complete > 0 && (
                    <rect x="0" y={pcY()} width="20" height={pcH()}
                      class="sui-burndown__seg--pc" />
                  )}
                  {sprint.planned_incomplete > 0 && (
                    <rect x="0" y={piY()} width="20" height={piH()}
                      class="sui-burndown__seg--pi" />
                  )}
                  {sprint.unplanned_complete > 0 && (
                    <rect x="0" y={ucY()} width="20" height={ucH()}
                      class="sui-burndown__seg--uc" />
                  )}
                  {sprint.unplanned_incomplete > 0 && (
                    <rect x="0" y={uiY()} width="20" height={uiH()}
                      class="sui-burndown__seg--ui" />
                  )}
                </svg>
              </div>
              <span class="sui-sprint-selector__label">{sprint.label}</span>
            </div>
          );
        }}
      </For>
    </div>
  );
};
