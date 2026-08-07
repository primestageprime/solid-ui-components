import { type Component, createSignal } from "solid-js";
import { MediaCard } from "../../src/components/MediaCard";
import { SmallSquareThumbnail } from "../../src/components/FramedImage";
import { Stack } from "../../src/components/Layout/Stack";
import { TextSublabel } from "../../src/components/Text";

// Inline SVG data URIs, same reasoning as the FramedImage showcase: no network
// dependency, no binary assets, and the card is what's being demonstrated.
const swatch = (fill: string, label: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><rect width="160" height="160" fill="${fill}"/><text x="80" y="88" font-family="sans-serif" font-size="20" fill="white" text-anchor="middle">${label}</text></svg>`,
  )}`;

const PHOTOS = [
  { id: "a", name: "Harbour at dusk", file: "IMG_0417.jpg", swatch: swatch("#4a7fb5", "1"), when: "2 hours ago" },
  { id: "b", name: "IMG_0418.jpg", file: undefined, swatch: swatch("#b5734a", "2"), when: "2 hours ago" },
  { id: "c", name: "Crane, north berth", file: "IMG_0419.jpg", swatch: swatch("#4ab58a", "3"), when: "yesterday" },
];

/**
 * MediaCard showcase — the Card-family sibling of EntityCard for a
 * thumbnail-led row: a fixed image slot on the left, name/tags/timestamp on
 * the right, with the same selection affordance and hover-revealed remove.
 */
export const MediaCardShowcase: Component = () => {
  const [selected, setSelected] = createSignal("a");
  const [removed, setRemoved] = createSignal<string[]>([]);
  const [lastTag, setLastTag] = createSignal<string | null>(null);
  const visible = () => PHOTOS.filter((p) => !removed().includes(p.id));

  return (
    <div class="component-section">
      <h2>MediaCard — Composite (Depth 2)</h2>
      <p class="text-meta">
        A list/sidebar card keyed by a thumbnail plus tags. The thumbnail is a
        slot (pass a FramedImage variant), the tags are real TagPills rather
        than a generic slot, and the rows collapse when their content is
        absent — the second card below has no tags.
      </p>

      <div class="example-group">
        <h3>Selectable list with tags and remove</h3>
        <Stack gap="xs">
          {visible().map((photo) => (
            <MediaCard
              thumbnail={<SmallSquareThumbnail src={photo.swatch} alt={photo.name} />}
              identifier={photo.name}
              filename={photo.file}
              tags={
                photo.id === "b"
                  ? undefined
                  : [{ label: "HARBOUR", active: true }, { label: "KEEP" }]
              }
              timing={photo.when}
              selected={selected() === photo.id}
              onClick={() => setSelected(photo.id)}
              // TagPillData is a union — a free label or an explicit
              // key/value lozenge — so a demo readout has to narrow it
              // rather than assume `.label` exists.
              onTagClick={(tag) => setLastTag("label" in tag ? tag.label : `${tag.key}:${tag.value}`)}
              onRemove={() => setRemoved((ids) => [...ids, photo.id])}
            />
          ))}
        </Stack>
        <TextSublabel>
          selected = {selected()} · last tag clicked = {lastTag() ?? "none"} ·
          removed = {removed().length}
        </TextSublabel>
      </div>
    </div>
  );
};
