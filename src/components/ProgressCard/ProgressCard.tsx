// ============================================
// ProgressCard — Depth 2
// Owns CSS (ProgressCard.css).
// Composes Icon (Atomic/Depth 1) via ICON_PATHS
// in variants (CacheProgressCard).
// Step icons with title, subtitle, message.
// ============================================
import { Component, JSX, splitProps, For, Show, mergeProps } from "solid-js";
import "./ProgressCard.css";

export type ProgressStatus = "pending" | "active" | "completed" | "error";

export interface ProgressStep {
  id: string;
  label: string;
  status: ProgressStatus;
  /** Custom icon SVG paths - outline for pending/active, solid for completed */
  icon?: {
    outline: string;
    solid: string;
  };
}

export interface ProgressCardProps extends JSX.HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  steps?: ProgressStep[];
  message?: string;
}

// Default icons for steps without custom icons
const DEFAULT_ICONS = {
  pending: `<circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5" fill="none" opacity="0.4"/>`,
  active: `<circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5" fill="none" opacity="0.25"/>
           <path d="M8 2A6 6 0 0 1 14 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>`,
  completed: `<circle cx="8" cy="8" r="7" fill="currentColor"/>
              <path d="M5 8L7 10.5L11 5.5" stroke="var(--jtf-bg-primary, #0a0e17)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
  error: `<circle cx="8" cy="8" r="7" fill="currentColor"/>
          <path d="M5.5 5.5L10.5 10.5M10.5 5.5L5.5 10.5" stroke="var(--jtf-bg-primary, #0a0e17)" stroke-width="1.5" stroke-linecap="round" fill="none"/>`,
};

export const ProgressCard: Component<ProgressCardProps> = (props) => {
  const [local, others] = splitProps(props, [
    "title",
    "subtitle",
    "steps",
    "message",
    "class",
    "children",
  ]);

  const classes = () => {
    const classList = ["jtf-progress-card"];
    if (local.class) classList.push(local.class);
    return classList.join(" ");
  };

  const getStepIcon = (step: ProgressStep) => {
    // Use custom icon if provided
    if (step.icon) {
      if (step.status === "completed") {
        return step.icon.solid;
      }
      return step.icon.outline;
    }
    // Fall back to default icons
    return DEFAULT_ICONS[step.status];
  };

  const steps = () => local.steps || [];

  return (
    <div class={classes()} {...others}>
      <div class="jtf-progress-card__header">
        <div class="jtf-progress-card__title">{local.title}</div>
        <Show when={local.subtitle}>
          <div class="jtf-progress-card__subtitle">{local.subtitle}</div>
        </Show>
      </div>

      <Show when={steps().length > 0}>
        <div class="jtf-progress-card__steps">
          <For each={steps()}>
            {(step, index) => (
              <>
                <Show when={index() > 0}>
                  <div
                    class={`jtf-progress-card__connector ${
                      steps()[index() - 1]?.status === "completed"
                        ? "jtf-progress-card__connector--completed"
                        : ""
                    }`}
                  >
                    &rarr;
                  </div>
                </Show>
                <div
                  class={`jtf-progress-card__step jtf-progress-card__step--${step.status}`}
                  title={step.label}
                >
                  <div class="jtf-progress-card__step-circle">
                    <div class="jtf-progress-card__step-circle-bg" />
                    <Show when={step.status === "active"}>
                      <div class="jtf-progress-card__step-spinner" />
                    </Show>
                    <span
                      class="jtf-progress-card__step-icon"
                      innerHTML={`<svg viewBox="0 0 16 16" fill="none">${getStepIcon(step)}</svg>`}
                    />
                  </div>
                </div>
              </>
            )}
          </For>
        </div>
      </Show>

      <Show when={local.message}>
        <div class="jtf-progress-card__message">{local.message}</div>
      </Show>

      {local.children}
    </div>
  );
};

// ============================================
// Factories
// ============================================

/** Create a pre-configured ProgressCard with default props */
export function createProgressCard(
  defaults: Partial<Omit<ProgressCardProps, "children">>,
): Component<ProgressCardProps> {
  return (props) => <ProgressCard {...mergeProps(defaults, props)} />;
}

/** Step template for workflow progress cards */
export interface StepTemplate {
  id: string;
  label: string;
  icon?: { outline: string; solid: string };
}

export interface WorkflowProgressCardProps extends JSX.HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  currentStep: string;
  status: "fetching" | "caching" | "completed" | "error";
  message?: string;
}

/** Create a workflow progress card that derives step statuses from currentStep + status */
export function createWorkflowProgressCard(config: {
  steps: StepTemplate[];
}): Component<WorkflowProgressCardProps> {
  return (props) => {
    const [local, others] = splitProps(props, [
      "title",
      "subtitle",
      "currentStep",
      "status",
      "message",
      "children",
    ]);

    const derivedSteps = (): ProgressStep[] => {
      // When completed, all steps are completed
      if (local.status === "completed") {
        return config.steps.map((template) => ({
          id: template.id,
          label: template.label,
          status: "completed" as ProgressStatus,
          icon: template.icon,
        }));
      }

      const currentIdx = config.steps.findIndex((s) => s.id === local.currentStep);

      return config.steps.map((template, idx) => {
        let stepStatus: ProgressStatus;
        if (idx < currentIdx) {
          stepStatus = "completed";
        } else if (idx === currentIdx) {
          stepStatus = local.status === "error" ? "error" : "active";
        } else {
          stepStatus = "pending";
        }
        return {
          id: template.id,
          label: template.label,
          status: stepStatus,
          icon: template.icon,
        };
      });
    };

    return (
      <ProgressCard
        title={local.title}
        subtitle={local.subtitle}
        steps={derivedSteps()}
        message={local.message}
        {...others}
      >
        {local.children}
      </ProgressCard>
    );
  };
}
