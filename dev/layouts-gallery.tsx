// /layouts — a gallery of saved default layouts. Left panel shows each layout
// as a live, scaled-down thumbnail; clicking one opens it in the main stage.
// Reached via hash route #/layouts (and #/layouts/{id}).
import { Component, For, createSignal, onMount, onCleanup } from "solid-js";
import { Dynamic } from "solid-js/web";
import { layouts } from "./layouts/registry";
import "./layouts-gallery.css";

const layoutIdFromHash = (): string => {
  const m = location.hash.match(/^#\/layouts\/?([^?]*)/);
  const id = m?.[1] ?? "";
  return layouts.some((l) => l.id === id) ? id : layouts[0].id;
};

// Sidebar collapse preference is persisted across reloads — this is a dev tool
// and the choice to maximize the preview area should stick. Storage access is
// wrapped so private-mode / disabled-storage failures degrade to "expanded".
const SIDEBAR_COLLAPSED_KEY = "layouts-sidebar-collapsed";

const readSidebarCollapsed = (): boolean => {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
  } catch {
    return false;
  }
};

const writeSidebarCollapsed = (collapsed: boolean): void => {
  try {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
  } catch {
    // Storage unavailable (private mode, quota) — preference simply won't persist.
  }
};

export const LayoutsGallery: Component = () => {
  const [activeId, setActiveId] = createSignal(layoutIdFromHash());
  const [collapsed, setCollapsed] = createSignal(readSidebarCollapsed());

  const toggleCollapsed = () => {
    const next = !collapsed();
    setCollapsed(next);
    writeSidebarCollapsed(next);
  };

  onMount(() => {
    const sync = () => setActiveId(layoutIdFromHash());
    window.addEventListener("hashchange", sync);
    onCleanup(() => window.removeEventListener("hashchange", sync));
  });

  const active = () => layouts.find((l) => l.id === activeId()) ?? layouts[0];
  const select = (id: string) => {
    location.hash = `#/layouts/${id}`;
  };

  return (
    <div
      class={`layouts-gallery ${collapsed() ? "layouts-gallery--collapsed" : ""}`}
    >
      <nav class="layouts-gallery__sidebar">
        <div class="layouts-gallery__sidebar-header">
          <a class="layouts-gallery__back" href="#/">← Components</a>
          <button
            type="button"
            class="layouts-gallery__toggle"
            aria-expanded={!collapsed()}
            aria-label="Collapse sidebar"
            onClick={toggleCollapsed}
          >
            ‹
          </button>
        </div>
        <h2 class="layouts-gallery__title">Layouts</h2>
        <For each={layouts}>
          {(l) => (
            <button
              type="button"
              class={`layout-card ${activeId() === l.id ? "layout-card--active" : ""}`}
              onClick={() => select(l.id)}
              title={l.description}
            >
              <div class="layout-card__thumb">
                <div class="layout-card__scale">
                  <Dynamic component={l.component} />
                </div>
              </div>
              <div class="layout-card__label">{l.label}</div>
            </button>
          )}
        </For>
      </nav>

      <main class="layouts-gallery__stage">
        <button
          type="button"
          class="layouts-gallery__expand"
          aria-expanded={!collapsed()}
          aria-label="Expand sidebar"
          onClick={toggleCollapsed}
        >
          ›
        </button>
        <Dynamic component={active().component} />
      </main>
    </div>
  );
};
