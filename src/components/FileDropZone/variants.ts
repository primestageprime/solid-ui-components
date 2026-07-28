// ============================================
// FileDropZone Curried Variants — Depth 2 (zero extra CSS)
// Pre-configured FileDropZone via createFileDropZone().
// ============================================
import type { Component } from "solid-js";
import { createFileDropZone } from "./FileDropZone";
import type { FileDropZoneDataProps } from "./FileDropZone";

/** FileDropTarget — the standing drop target of a file tool's empty state.
 *   <FileDropTarget accept={[".pdf"]} label="Drop the power log here…" onFile={read} /> */
export const FileDropTarget: Component<FileDropZoneDataProps> =
  createFileDropZone({ density: "comfortable" });

/** CompactFileDropTarget — the same target tucked into a row of existing
 *  content (a summary banner, a toolbar), where a full-height zone would
 *  dominate. */
export const CompactFileDropTarget: Component<FileDropZoneDataProps> =
  createFileDropZone({ density: "compact" });
