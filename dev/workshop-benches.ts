import type { Component } from "solid-js";

export type BenchMeta = { label?: string; order?: number };
export type BenchModule = { default: Component; meta?: BenchMeta };

/** A nav item for a discovered workshop bench. Structurally matches main.tsx's `Item`. */
export type WorkshopBenchItem = {
  id: string;
  label: string;
  component: Component;
  tags: string[];
};

/** "scrub-chart" -> "Scrub Chart" */
export const slugToTitle = (slug: string): string =>
  slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

const slugFromPath = (path: string): string =>
  path.match(/\/([^/]+)\.tsx$/)![1];

/** Map `import.meta.glob` results to sorted, workshop-tagged nav items. */
export const buildWorkshopItems = (
  modules: Record<string, BenchModule>,
): WorkshopBenchItem[] =>
  Object.entries(modules)
    .map(([path, mod]) => {
      const slug = slugFromPath(path);
      return {
        item: {
          id: `workshop:${slug}`,
          label: mod.meta?.label ?? slugToTitle(slug),
          component: mod.default,
          tags: ["workshop"],
        },
        order: mod.meta?.order ?? 0,
      };
    })
    .sort(
      (a, b) => a.order - b.order || a.item.label.localeCompare(b.item.label),
    )
    .map((e) => e.item);
