// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// Icon — Atomic (Depth 1)
// Owns CSS (Icon.css), no component imports.
// SVG icon set with outline/solid variants, 5 sizes.
// ============================================
import { type Component, type JSX, mergeProps, splitProps } from "solid-js";
import "./Icon.css";

// Icon groups for organization and documentation
export const ICON_GROUPS = {
  status: ["check", "error", "warning", "info", "stethoscope"] as const,
  navigation: [
    "chevron-down",
    "chevron-up",
    "chevron-left",
    "chevron-right",
    "arrow-right",
  ] as const,
  data: [
    "data",
    "table",
    "chart-bar",
    "chart-line",
    "chart-area",
    "dependency",
  ] as const,
  time: ["clock", "hourglass"] as const,
  actions: [
    "plus",
    "minus",
    "close",
    "search",
    "filter",
    "refresh",
    "download",
    "pause",
    "edit",
    "trash",
  ] as const,
  ui: ["spinner", "menu", "settings", "external-link", "bell"] as const,
  auth: ["log-out", "log-in", "user", "agent"] as const,
  cache: [
    "cache-minutes",
    "cache-hours",
    "cache-stats",
    "cache-coverage",
    "cache-calc",
  ] as const,
} as const;

export type IconName =
  // Status
  | "check"
  | "error"
  | "warning"
  | "info"
  | "stethoscope"
  // Navigation
  | "chevron-down"
  | "chevron-up"
  | "chevron-left"
  | "chevron-right"
  | "arrow-right"
  // Data
  | "data"
  | "table"
  | "chart-bar"
  | "chart-line"
  | "chart-area"
  | "dependency"
  // Time
  | "clock"
  | "hourglass"
  // Actions
  | "plus"
  | "minus"
  | "close"
  | "search"
  | "filter"
  | "refresh"
  | "download"
  | "pause"
  | "edit"
  | "trash"
  // UI
  | "spinner"
  | "menu"
  | "settings"
  | "external-link"
  | "bell"
  // Auth
  | "log-out"
  | "log-in"
  | "user"
  | "agent"
  // Cache
  | "cache-minutes"
  | "cache-hours"
  | "cache-stats"
  | "cache-coverage"
  | "cache-calc";

export type IconVariant = "outline" | "solid";
export type IconSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface IconProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  name: IconName;
  variant?: IconVariant;
  size?: IconSize;
}

export const ICON_PATHS: Record<IconName, { outline: string; solid: string }> =
  {
    // === STATUS ICONS ===
    check: {
      outline: `<path d="M3 8.5L6.5 12L13 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
      solid: `<circle cx="8" cy="8" r="7" fill="currentColor"/>
            <path d="M5 8L7 10.5L11 5.5" stroke="var(--sui-bg-primary)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
    },
    error: {
      outline: `<circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5" fill="none"/>
              <path d="M5.5 5.5L10.5 10.5M10.5 5.5L5.5 10.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,
      solid: `<circle cx="8" cy="8" r="7" fill="currentColor"/>
            <path d="M5.5 5.5L10.5 10.5M10.5 5.5L5.5 10.5" stroke="var(--sui-bg-primary)" stroke-width="1.5" stroke-linecap="round"/>`,
    },
    warning: {
      outline: `<path d="M8 2L14.5 13H1.5L8 2Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" fill="none"/>
              <path d="M8 6V9M8 11V11.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,
      solid: `<path d="M8 1L15 14H1L8 1Z" fill="currentColor"/>
            <path d="M8 6V9M8 11V11.5" stroke="var(--sui-bg-primary)" stroke-width="1.5" stroke-linecap="round"/>`,
    },
    info: {
      outline: `<circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5" fill="none"/>
              <path d="M8 7V11M8 5V5.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,
      solid: `<circle cx="8" cy="8" r="7" fill="currentColor"/>
            <path d="M8 7V11M8 5V5.5" stroke="var(--sui-bg-primary)" stroke-width="1.5" stroke-linecap="round"/>`,
    },

    // Earpiece fork descending into a tube that ends at the chest-piece
    // bell — the "health check" glyph.
    stethoscope: {
      outline: `<path d="M4 1.5v4a3 3 0 006 0v-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>
              <path d="M7 8.5v2.5a3 3 0 006 0v-1.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>
              <circle cx="13" cy="7.5" r="2" stroke="currentColor" stroke-width="1.5" fill="none"/>`,
      solid: `<path d="M4 1.5v4a3 3 0 006 0v-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>
            <path d="M7 8.5v2.5a3 3 0 006 0v-1.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>
            <circle cx="13" cy="7.5" r="2.5" fill="currentColor"/>
            <circle cx="13" cy="7.5" r="1" fill="var(--sui-bg-primary)"/>`,
    },

    // === NAVIGATION ICONS ===
    "chevron-down": {
      outline: `<path d="M3 6L8 11L13 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
      solid: `<path d="M3 6L8 11L13 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
    },
    "chevron-up": {
      outline: `<path d="M3 11L8 6L13 11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
      solid: `<path d="M3 11L8 6L13 11" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
    },
    "chevron-left": {
      outline: `<path d="M11 3L6 8L11 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
      solid: `<path d="M11 3L6 8L11 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
    },
    "chevron-right": {
      outline: `<path d="M5 3L10 8L5 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
      solid: `<path d="M5 3L10 8L5 13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
    },
    "arrow-right": {
      outline: `<path d="M3 8H13M9 4L13 8L9 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
      solid: `<path d="M3 8H13M9 4L13 8L9 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
    },

    // === DATA ICONS ===
    data: {
      outline: `<rect x="2" y="2" width="5" height="5" rx="0.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
              <rect x="9" y="2" width="5" height="5" rx="0.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
              <rect x="2" y="9" width="5" height="5" rx="0.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
              <rect x="9" y="9" width="5" height="5" rx="0.5" stroke="currentColor" stroke-width="1.5" fill="none"/>`,
      solid: `<rect x="2" y="2" width="5" height="5" rx="0.5" fill="currentColor"/>
            <rect x="9" y="2" width="5" height="5" rx="0.5" fill="currentColor"/>
            <rect x="2" y="9" width="5" height="5" rx="0.5" fill="currentColor"/>
            <rect x="9" y="9" width="5" height="5" rx="0.5" fill="currentColor"/>`,
    },
    table: {
      outline: `<path d="M4 4h8M4 8h8M4 12h8M6 2v12M10 2v12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>`,
      solid: `<path d="M5 2h2v4H3V4h2V2zm4 0h2v2h2v2H9V2zM3 7h4v2H3V7zm6 0h4v2H9V7zM3 10h4v4H5v-2H3v-2zm6 0h2v2h2v2H9v-4z" fill="currentColor"/>`,
    },
    "chart-bar": {
      outline: `<rect x="2" y="9" width="3" height="5" rx="0.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
              <rect x="6.5" y="5" width="3" height="9" rx="0.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
              <rect x="11" y="2" width="3" height="12" rx="0.5" stroke="currentColor" stroke-width="1.5" fill="none"/>`,
      solid: `<rect x="2" y="9" width="3" height="5" rx="0.5" fill="currentColor"/>
            <rect x="6.5" y="5" width="3" height="9" rx="0.5" fill="currentColor"/>
            <rect x="11" y="2" width="3" height="12" rx="0.5" fill="currentColor"/>`,
    },
    "chart-line": {
      outline: `<path d="M2 12L5.5 8L8.5 10L14 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
              <circle cx="5.5" cy="8" r="1.5" stroke="currentColor" stroke-width="1" fill="none"/>
              <circle cx="8.5" cy="10" r="1.5" stroke="currentColor" stroke-width="1" fill="none"/>
              <circle cx="14" cy="3" r="1.5" stroke="currentColor" stroke-width="1" fill="none"/>`,
      solid: `<path d="M2 12L5.5 8L8.5 10L14 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
            <circle cx="5.5" cy="8" r="2" fill="currentColor"/>
            <circle cx="8.5" cy="10" r="2" fill="currentColor"/>
            <circle cx="14" cy="3" r="2" fill="currentColor"/>`,
    },
    "chart-area": {
      outline: `<path d="M2 14L2 12L5.5 8L8.5 10L14 3V14H2Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" fill="none"/>`,
      solid: `<path d="M2 14L2 12L5.5 8L8.5 10L14 3V14H2Z" fill="currentColor" opacity="0.3"/>
            <path d="M2 12L5.5 8L8.5 10L14 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
    },

    // Dependency tree: root node branching to two children — the DAG edge
    // a "depends on" relationship draws.
    dependency: {
      outline: `<rect x="6" y="1.5" width="4" height="4" rx="0.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
              <rect x="1.5" y="10.5" width="4" height="4" rx="0.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
              <rect x="10.5" y="10.5" width="4" height="4" rx="0.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
              <path d="M8 5.5V8M8 8H3.5v2.5M8 8h4.5v2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>`,
      solid: `<rect x="6" y="1" width="4" height="4" rx="0.5" fill="currentColor"/>
            <rect x="1.5" y="10.5" width="4" height="4" rx="0.5" fill="currentColor"/>
            <rect x="10.5" y="10.5" width="4" height="4" rx="0.5" fill="currentColor"/>
            <path d="M8 5V8M8 8H3.5v2.5M8 8h4.5v2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>`,
    },

    // === TIME ICONS ===
    clock: {
      outline: `<circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5" fill="none"/>
              <path d="M8 4.5V8L10.5 10.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>`,
      solid: `<circle cx="8" cy="8" r="7" fill="currentColor"/>
            <path d="M8 4.5V8L10.5 10.5" stroke="var(--sui-bg-primary)" stroke-width="1.5" stroke-linecap="round" fill="none"/>`,
    },
    hourglass: {
      outline: `<path d="M4 2h8v3l-2 3 2 3v3H4v-3l2-3-2-3V2z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" fill="none"/>`,
      solid: `<path d="M4 1h8v4l-2.5 3L12 11v4H4v-4l2.5-3L4 5V1z" fill="currentColor"/>
            <path d="M6 3v1.5L8 7l2-2.5V3H6zm0 10h4v-1.5L8 9l-2 2.5V13z" fill="var(--sui-bg-primary)"/>`,
    },

    // === ACTION ICONS ===
    plus: {
      outline: `<path d="M8 3V13M3 8H13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>`,
      solid: `<circle cx="8" cy="8" r="7" fill="currentColor"/>
            <path d="M8 4.5V11.5M4.5 8H11.5" stroke="var(--sui-bg-primary)" stroke-width="1.5" stroke-linecap="round" fill="none"/>`,
    },
    minus: {
      outline: `<path d="M3 8H13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>`,
      solid: `<circle cx="8" cy="8" r="7" fill="currentColor"/>
            <path d="M4.5 8H11.5" stroke="var(--sui-bg-primary)" stroke-width="1.5" stroke-linecap="round" fill="none"/>`,
    },
    close: {
      outline: `<path d="M4 4L12 12M12 4L4 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>`,
      solid: `<circle cx="8" cy="8" r="7" fill="currentColor"/>
            <path d="M5.5 5.5L10.5 10.5M10.5 5.5L5.5 10.5" stroke="var(--sui-bg-primary)" stroke-width="1.5" stroke-linecap="round" fill="none"/>`,
    },
    search: {
      outline: `<circle cx="7" cy="7" r="4.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
              <path d="M10.5 10.5L14 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>`,
      solid: `<circle cx="7" cy="7" r="5" fill="currentColor"/>
            <circle cx="7" cy="7" r="3" fill="var(--sui-bg-primary)"/>
            <path d="M10.5 10.5L14 14" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>`,
    },
    filter: {
      outline: `<path d="M2 3h12L9 8.5V13l-2-1V8.5L2 3z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" fill="none"/>`,
      solid: `<path d="M2 3h12L9 8.5V13l-2-1V8.5L2 3z" fill="currentColor"/>`,
    },
    refresh: {
      outline: `<path d="M2.5 8a5.5 5.5 0 0 1 9.5-3.75V2M13.5 8a5.5 5.5 0 0 1-9.5 3.75V14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
              <path d="M12 2v2.5h-2.5M4 14v-2.5h2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
      solid: `<path d="M2.5 8a5.5 5.5 0 0 1 9.5-3.75V2M13.5 8a5.5 5.5 0 0 1-9.5 3.75V14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
            <path d="M12 2v2.5h-2.5M4 14v-2.5h2.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
    },
    // Downward arrow into a tray (outline style: shaft + arrowhead + open U-tray).
    download: {
      outline: `<path d="M8 2V10M5 7L8 10L11 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
              <path d="M3 12v1a1 1 0 001 1h8a1 1 0 001-1v-1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
      solid: `<path d="M8 2V10M5 7L8 10L11 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
            <path d="M3 12v1a1 1 0 001 1h8a1 1 0 001-1v-1" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
    },

    // Two vertical bars — the universal "paused / on hold" glyph.
    pause: {
      outline: `<rect x="4" y="3" width="2.5" height="10" rx="0.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
              <rect x="9.5" y="3" width="2.5" height="10" rx="0.5" stroke="currentColor" stroke-width="1.5" fill="none"/>`,
      solid: `<rect x="4" y="3" width="3" height="10" rx="0.5" fill="currentColor"/>
            <rect x="9" y="3" width="3" height="10" rx="0.5" fill="currentColor"/>`,
    },

    // Pencil at 45° — the standard edit affordance for table action columns.
    edit: {
      outline: `<path d="M10.5 2.5l3 3L5 14l-3.5.5L2 11l8.5-8.5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" fill="none"/>
              <path d="M9 4l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>`,
      solid: `<path d="M10.5 2l3.5 3.5L5.5 14 1.5 14.5 2 10.5 10.5 2Z" fill="currentColor"/>
            <path d="M9.5 3.5l3 3" stroke="var(--sui-bg-primary)" stroke-width="1" stroke-linecap="round"/>`,
    },
    // Lidded bin — the standard delete affordance for table action columns.
    trash: {
      outline: `<path d="M2.5 4.5h11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              <path d="M6 4.5V3a1 1 0 011-1h2a1 1 0 011 1v1.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
              <path d="M4 4.5l.6 8.5a1 1 0 001 .9h4.8a1 1 0 001-.9l.6-8.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
              <path d="M6.5 7v4M9.5 7v4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>`,
      solid: `<path d="M2.5 4.5h11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <path d="M6 4V3a1 1 0 011-1h2a1 1 0 011 1v1" stroke="currentColor" stroke-width="1.5" fill="none"/>
            <path d="M4 5h8l-.6 8.6a1 1 0 01-1 .9H5.6a1 1 0 01-1-.9L4 5Z" fill="currentColor"/>
            <path d="M6.5 7v4M9.5 7v4" stroke="var(--sui-bg-primary)" stroke-width="1.2" stroke-linecap="round"/>`,
    },

    // === UI ICONS ===
    spinner: {
      outline: `<circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5" fill="none" opacity="0.25"/>
              <path d="M8 2A6 6 0 0 1 14 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>`,
      solid: `<circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5" fill="none" opacity="0.25"/>
            <path d="M8 2A6 6 0 0 1 14 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>`,
    },
    menu: {
      outline: `<path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>`,
      solid: `<path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>`,
    },
    settings: {
      outline: `<circle cx="8" cy="8" r="2.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
              <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.5 1.5M11.5 11.5l1.5 1.5M3 13l1.5-1.5M11.5 4.5l1.5-1.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>`,
      solid: `<circle cx="8" cy="8" r="3" fill="currentColor"/>
            <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.5 1.5M11.5 11.5l1.5 1.5M3 13l1.5-1.5M11.5 4.5l1.5-1.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>`,
    },
    "external-link": {
      outline: `<path d="M10 2h4v4M14 2L7 9M6 3H3v10h10v-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
      solid: `<path d="M10 2h4v4M14 2L7 9M6 3H3v10h10v-3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
    },

    // Bell body with clapper — the notification trigger glyph.
    bell: {
      outline: `<path d="M8 2a3 3 0 0 0-3 3c0 3.5-1.5 4.5-1.5 4.5h9S11 8.5 11 5a3 3 0 0 0-3-3Z" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
              <path d="M6.8 11.5a1.3 1.3 0 0 0 2.4 0" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
      solid: `<path d="M8 2a3 3 0 0 0-3 3c0 3.5-1.5 4.5-1.5 4.5h9S11 8.5 11 5a3 3 0 0 0-3-3Z" fill="currentColor"/>
            <path d="M6.8 11.5a1.3 1.3 0 0 0 2.4 0" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" fill="none"/>`,
    },

    // === AUTH ICONS ===
    // Head + shoulders silhouette.
    user: {
      outline: `<circle cx="8" cy="6" r="3" stroke="currentColor" stroke-width="1.5" fill="none"/>
              <path d="M2 14c0-3.31 2.69-6 6-6s6 2.69 6 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>`,
      solid: `<circle cx="8" cy="6" r="3.5" fill="currentColor"/>
            <path d="M1.5 14.5c0-3.59 2.91-6.5 6.5-6.5s6.5 2.91 6.5 6.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>`,
    },
    // Door frame open on the right + arrow exiting rightward.
    "log-out": {
      outline: `<path d="M9 3H4a1 1 0 00-1 1v8a1 1 0 001 1h5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
              <path d="M7 8h7m-3-3l3 3-3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
      solid: `<path d="M9 3H4a1 1 0 00-1 1v8a1 1 0 001 1h5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
            <path d="M7 8h7m-3-3l3 3-3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
    },
    // Door frame open on the left + arrow entering rightward.
    "log-in": {
      outline: `<path d="M7 3h5a1 1 0 011 1v8a1 1 0 01-1 1H7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
              <path d="M2 8h7m-3-3l3 3-3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
      solid: `<path d="M7 3h5a1 1 0 011 1v8a1 1 0 01-1 1H7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
            <path d="M2 8h7m-3-3l3 3-3 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
    },

    // Robot head: antenna + rounded head with two eyes — the automated
    // counterpart to `user` (dside Species: Human | Agent).
    agent: {
      outline: `<rect x="3" y="6" width="10" height="7.5" rx="1.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
              <path d="M8 6V3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>
              <circle cx="8" cy="2.5" r="1" stroke="currentColor" stroke-width="1.2" fill="none"/>
              <circle cx="6" cy="9.5" r="0.5" fill="currentColor" stroke="currentColor" stroke-width="1"/>
              <circle cx="10" cy="9.5" r="0.5" fill="currentColor" stroke="currentColor" stroke-width="1"/>`,
      solid: `<rect x="3" y="6" width="10" height="7.5" rx="1.5" fill="currentColor"/>
            <path d="M8 6V3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>
            <circle cx="8" cy="2.5" r="1.2" fill="currentColor"/>
            <circle cx="6" cy="9.5" r="1" fill="var(--sui-bg-primary)"/>
            <circle cx="10" cy="9.5" r="1" fill="var(--sui-bg-primary)"/>`,
    },

    // === CACHE ICONS ===
    "cache-minutes": {
      outline: `<circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5" fill="none"/>
              <path d="M8 4v4l3 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
      solid: `<path d="M8 1a7 7 0 100 14A7 7 0 008 1zm.5 3v4.2l2.8 1.9-.5.8-3.3-2.2V4h1z" fill="currentColor"/>`,
    },
    "cache-hours": {
      outline: `<path d="M4 2h8v3l-2 3 2 3v3H4v-3l2-3-2-3V2z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" fill="none"/>`,
      solid: `<path d="M4 1h8v4l-2.5 3L12 11v4H4v-4l2.5-3L4 5V1zm2 2v1.5L8 7l2-2.5V3H6zm0 10h4v-1.5L8 9l-2 2.5V13z" fill="currentColor"/>`,
    },
    "cache-stats": {
      outline: `<path d="M2 14l4-6 3 3 5-8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
              <circle cx="6" cy="8" r="1" stroke="currentColor" stroke-width="1" fill="none"/>
              <circle cx="9" cy="11" r="1" stroke="currentColor" stroke-width="1" fill="none"/>
              <circle cx="14" cy="3" r="1" stroke="currentColor" stroke-width="1" fill="none"/>`,
      solid: `<path d="M14 2a2 2 0 00-1.9 2.6L9.2 9.2a2 2 0 00-1.4 0L6.1 7.5a2 2 0 10-3.2.9l3.5 5.2a2 2 0 001.4 0l6.3-9.5A2 2 0 1014 2z" fill="currentColor"/>`,
    },
    "cache-coverage": {
      outline: `<rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/>
              <path d="M5 8h6M5 5h6M5 11h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>`,
      solid: `<path d="M4 1a3 3 0 00-3 3v8a3 3 0 003 3h8a3 3 0 003-3V4a3 3 0 00-3-3H4zm1 3.5h6a.5.5 0 010 1H5a.5.5 0 010-1zm0 3h6a.5.5 0 010 1H5a.5.5 0 010-1zm0 3h4a.5.5 0 010 1H5a.5.5 0 010-1z" fill="currentColor"/>`,
    },
    "cache-calc": {
      outline: `<circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5" fill="none"/>
              <path d="M5 6h6M5 10h6M8 5v2M10 8v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>`,
      solid: `<path d="M8 1a7 7 0 100 14A7 7 0 008 1zM5 5.5h6a.5.5 0 010 1H5a.5.5 0 010-1zm3-.5a.5.5 0 01.5.5v2a.5.5 0 01-1 0v-2A.5.5 0 018 5zm2 3a.5.5 0 01.5.5v4a.5.5 0 01-1 0v-4a.5.5 0 01.5-.5zM5 9.5h6a.5.5 0 010 1H5a.5.5 0 010-1z" fill="currentColor"/>`,
    },
  };

export const Icon: Component<IconProps> = (props) => {
  const [local, others] = splitProps(props, [
    "name",
    "variant",
    "size",
    "class",
  ]);

  const classes = () => {
    const classList = ["jtf-icon"];
    classList.push(`jtf-icon--${local.size || "md"}`);
    if (local.name === "spinner") classList.push("jtf-icon--spinning");
    if (local.class) classList.push(local.class);
    return classList.join(" ");
  };

  const svgContent = () => {
    const paths = ICON_PATHS[local.name];
    const variant = local.variant || "outline";
    return paths[variant];
  };

  return (
    <span
      class={classes()}
      role="img"
      aria-label={local.name}
      innerHTML={`<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">${svgContent()}</svg>`}
      {...others}
    />
  );
};

/** Presentational knobs — locked at variant-definition time. `name` stays a
 *  DATA prop (which glyph is semantic, per-call-site information). */
export type IconOverrides = Pick<IconProps, "variant" | "size">;
export type IconDataProps = Omit<IconProps, keyof IconOverrides>;

export function createIcon(
  defaults: Partial<Omit<IconProps, "children">>,
): Component<IconDataProps> {
  return (props) => <Icon {...mergeProps(defaults, props as IconProps)} />;
}

/** Inline icon beside sublabel/meta text (outline, xs) — the glyph that
 *  rides in a row like `⏱ 2d4h` or `👤 Ryan`. */
export const InlineMetaIcon = createIcon({ variant: "outline", size: "xs" });
