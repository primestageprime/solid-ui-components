// ============================================
// Sandbox harness — the routing/sidebar/scratch-step shell. All step
// content lives under `dev/sandbox-steps/`; the registry is
// `dev/sandbox-steps/index.ts`. This file deliberately holds zero
// step-specific data so steps can be added/removed in isolation.
// ============================================
import {
  type Component,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
} from "solid-js";
import { getPersistedTheme, loadTheme } from "./load-theme";
import { MockBaseline, SEED_STEPS, type SandboxStep } from "./sandbox-steps";

const FALLBACK_STEP: SandboxStep = {
  id: "empty",
  label: "(empty)",
  hint: "no steps registered — add one in dev/sandbox-steps/index.ts",
  render: () => (
    <MockBaseline
      sidebarEmpty="no sandbox steps yet"
      detailEmpty="add a step file to dev/sandbox-steps/ and register it in dev/sandbox-steps/index.ts"
    />
  ),
};

const stepIdFromHash = (h: string): string | null => {
  const m = h.match(/^#\/sandbox\/?([^/?#]*)/);
  if (!m) return null;
  return m[1] || null;
};

export const Sandbox: Component = () => {
  const seed = (): SandboxStep[] =>
    SEED_STEPS.length > 0 ? SEED_STEPS : [FALLBACK_STEP];
  const initial = stepIdFromHash(location.hash) ?? seed()[0].id;
  const [activeId, setActiveId] = createSignal(initial);
  const [extras, setExtras] = createSignal<SandboxStep[]>([]);

  const allSteps = () => [...seed(), ...extras()];

  const goTo = (id: string) => {
    setActiveId(id);
    const desired = `#/sandbox/${id}`;
    if (location.hash !== desired) location.hash = desired;
  };

  const addBlank = () => {
    const n = extras().length + 1;
    const step: SandboxStep = {
      id: `scratch-${Date.now().toString(36)}`,
      label: `Scratch ${n}`,
      hint: "ephemeral",
      render: () => (
        <MockBaseline
          sidebarEmpty={`Scratch ${n} sidebar`}
          detailEmpty={`Scratch ${n} detail — populate via dev/sandbox-steps/`}
        />
      ),
    };
    setExtras((prev) => [...prev, step]);
    goTo(step.id);
  };

  const removeExtra = (id: string) => {
    setExtras((prev) => prev.filter((s) => s.id !== id));
    if (activeId() === id) goTo(seed()[0].id);
  };

  onMount(() => {
    if (!document.getElementById("sui-theme")?.textContent)
      loadTheme(getPersistedTheme());

    const onHash = () => {
      const id = stepIdFromHash(location.hash);
      if (id && id !== activeId() && allSteps().some((s) => s.id === id)) {
        setActiveId(id);
      }
    };
    window.addEventListener("hashchange", onHash);
    onCleanup(() => window.removeEventListener("hashchange", onHash));

    if (stepIdFromHash(location.hash) == null) {
      location.hash = `#/sandbox/${activeId()}`;
    }
  });

  const active = () => allSteps().find((s) => s.id === activeId()) ?? seed()[0];

  return (
    <div class="sui-sandbox">
      <nav class="sui-sandbox__sidebar">
        <div class="sui-sandbox__brand">
          <h1>Sandbox</h1>
          <p>Ephemeral page mockups</p>
          <a class="sui-sandbox__exit" href="#/atomic/base-table">
            ← back to showcase
          </a>
        </div>

        <div class="sui-sandbox__steps">
          <For each={allSteps()}>
            {(step, i) => {
              const isExtra = () => i() >= seed().length;
              return (
                <div
                  class={`sui-sandbox__step${activeId() === step.id ? " sui-sandbox__step--active" : ""}`}
                >
                  <button
                    class="sui-sandbox__step-button"
                    onClick={() => goTo(step.id)}
                  >
                    <span class="sui-sandbox__step-num">{i() + 1}</span>
                    <span class="sui-sandbox__step-body">
                      <span class="sui-sandbox__step-label">{step.label}</span>
                      <Show when={step.hint}>
                        <span class="sui-sandbox__step-hint">{step.hint}</span>
                      </Show>
                    </span>
                  </button>
                  <Show when={isExtra()}>
                    <button
                      class="sui-sandbox__step-remove"
                      title="remove scratch step"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeExtra(step.id);
                      }}
                    >
                      ×
                    </button>
                  </Show>
                </div>
              );
            }}
          </For>
        </div>

        <button class="sui-sandbox__add" onClick={addBlank}>
          + add scratch step
        </button>
      </nav>

      <main class="sui-sandbox__content">{active().render({ goTo })}</main>
    </div>
  );
};
