import { type Component, createSignal, Show } from "solid-js";
import {
  FileDropTarget,
  CompactFileDropTarget,
} from "../../src/components/FileDropZone";
import { Stack } from "../../src/components/Layout/Stack";
import { TextBody, MutedBody, AccentBody } from "../../src/components/Text";

export const FileDropZoneShowcase: Component = () => {
  const [picked, setPicked] = createSignal<string | null>(null);

  return (
    <div class="component-section">
      <h2>FileDropZone — Depth 2 (minimal structural CSS)</h2>
      <p class="text-meta">
        Composes Icon + Text + Layout. A drop target that is also a
        click-to-browse picker: it validates the extension and hands the file
        over. Upload, parsing, and results belong to the caller. Drag a file
        over a zone to see it light up; drop a non-PDF to see the rejection
        notice.
      </p>

      <Stack gap="sm">
        <Stack gap="sm">
          <h3>FileDropTarget — a file tool's empty state</h3>
          <FileDropTarget
            accept={[".pdf"]}
            label="Drop power-log PDF here, or click to browse"
            onFile={(f) => setPicked(f.name)}
          />
          <Show when={picked()} fallback={<MutedBody>No file taken yet.</MutedBody>}>
            {(name) => (
              <TextBody>
                Caller received: <AccentBody>{name()}</AccentBody>
              </TextBody>
            )}
          </Show>
        </Stack>

        <Stack gap="sm">
          <h3>CompactFileDropTarget — tucked into an existing row</h3>
          <CompactFileDropTarget
            accept={[".pdf"]}
            label="Drop power-log PDF here, or click to browse"
            onFile={(f) => setPicked(f.name)}
          />
        </Stack>

        <Stack gap="sm">
          <h3>Disabled — inert while the tool is busy</h3>
          <FileDropTarget
            accept={[".pdf"]}
            label="Reading the last file…"
            disabled
            onFile={() => undefined}
          />
        </Stack>

        <Stack gap="sm">
          <h3>Multiple accepted formats</h3>
          <FileDropTarget
            accept={[".png", ".jpg"]}
            label="Drop a photo of the log sheet"
            onFile={(f) => setPicked(f.name)}
          />
        </Stack>
      </Stack>
    </div>
  );
};
