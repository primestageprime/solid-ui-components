// ============================================
// FileDropZone — Composite (Depth 2)
// Composes Icon + Text + Layout variants.
// Exception: owns a minimal structural CSS file (the dashed outline, its
// drag-over/disabled states, and the density padding) — a dashed drop target
// is not expressible as a Surface variant, and the drag-over highlight is a
// state of THIS component, not of the surface scale. Same deliberate exception
// Fab documents.
//
// A file drop target that is also a click-to-browse picker. Pure input
// surface: everything past "is this an accepted file type" — upload, parsing,
// progress, results — belongs to the caller.
//
// Intentionally minimal: one prompt line, one icon, two densities. Add
// variants only when a real caller needs them (STYLE_GUIDE.md "Variant
// surface: keep it minimal").
// ============================================
import {
  type Component,
  type JSX,
  Show,
  createSignal,
  mergeProps,
  onCleanup,
  splitProps,
} from "solid-js";
import { Icon } from "../Icon/Icon";
import { MutedBody, DangerSublabel } from "../Text/variants";
import { TightStack, ClusterRow } from "../Layout/variants";
import { pipe, map, filter, join, length } from "../../fn";
import "./FileDropZone.css";

export interface FileDropZoneProps
  extends Omit<JSX.HTMLAttributes<HTMLDivElement>, "onDrop"> {
  /** Accepted extensions, lowercase and dotted — e.g. `[".pdf"]`. Drives both
   *  the browse dialog's filter and the rejection notice. */
  accept: string[];
  /** Called with the dropped/picked file once it passes the extension check. */
  onFile: (file: File) => void;
  /** The one-line prompt — say what to drop, in the caller's domain words. */
  label: string;
  /** Inert and dimmed: no pointer, no keyboard, no drop. */
  disabled?: boolean;
  /** Tighter padding for inline placement (e.g. inside a banner row). */
  density?: "comfortable" | "compact";
}

/** How long a rejection notice stays up before clearing itself. */
const NOTICE_MS = 3000;

/** ".pdf" → "PDF"; the notice speaks formats, not file extensions. */
const formatName = (ext: string): string =>
  ext.replace(/^\./, "").toUpperCase();

export const FileDropZone: Component<FileDropZoneProps> = (rawProps) => {
  const props = mergeProps({ density: "comfortable" as const }, rawProps);
  const [local, others] = splitProps(props, [
    "accept",
    "onFile",
    "label",
    "disabled",
    "density",
    "class",
    "children",
  ]);

  const [dragOver, setDragOver] = createSignal(false);
  const [notice, setNotice] = createSignal<string | null>(null);
  let inputRef: HTMLInputElement | undefined;
  let noticeTimer: ReturnType<typeof setTimeout> | undefined;

  onCleanup(() => clearTimeout(noticeTimer));

  const rejectNotice = (): string => {
    const names = pipe(local.accept, map(formatName), join(" / "));
    return `${names} only — drop a ${join(" or ", local.accept)} file`;
  };

  const accepted = (file: File): boolean => {
    const name = file.name.toLowerCase();
    const matches = (ext: string): boolean => name.endsWith(ext);
    return length(filter(matches, local.accept)) > 0;
  };

  const take = (file: File | undefined | null) => {
    if (local.disabled || !file) return;
    if (!accepted(file)) {
      setNotice(rejectNotice());
      clearTimeout(noticeTimer);
      noticeTimer = setTimeout(() => setNotice(null), NOTICE_MS);
      return;
    }
    local.onFile(file);
  };

  const browse = () => {
    if (!local.disabled) inputRef?.click();
  };

  const classes = () => {
    const list = ["sui-file-drop", `sui-file-drop--${local.density}`];
    if (dragOver()) list.push("sui-file-drop--over");
    if (local.disabled) list.push("sui-file-drop--disabled");
    if (local.class) list.push(local.class);
    return join(" ", list);
  };

  return (
    // Stays a <div role="button"> rather than a real <button>: this element is
    // the drop TARGET, and it wraps the hidden <input type="file"> that the
    // click delegates to. A <button> wrapping a form control is invalid, and
    // dragging a file onto a native button is not a reliable drop surface
    // across browsers. Focusability and Enter/Space activation are wired
    // explicitly below, so the keyboard route is equivalent to a button's.
    // biome-ignore lint/a11y/useSemanticElements: see above — the drop-target + wrapped file input rules out a native <button>.
    <div
      class={classes()}
      role="button"
      aria-disabled={local.disabled}
      tabIndex={local.disabled ? -1 : 0}
      onClick={browse}
      onKeyDown={(e) => {
        // Space would otherwise scroll the page under the zone.
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          browse();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!local.disabled) setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        take(e.dataTransfer?.files?.[0]);
      }}
      {...others}
    >
      <input
        class="sui-file-drop__input"
        ref={inputRef}
        type="file"
        accept={join(",", local.accept)}
        onChange={(e) => {
          take(e.currentTarget.files?.[0]);
          // Reset so picking the same file twice still fires onChange.
          e.currentTarget.value = "";
        }}
      />
      <TightStack>
        <ClusterRow>
          <Icon name="download" size="sm" />
          <MutedBody>{local.label}</MutedBody>
        </ClusterRow>
        <Show when={notice()}>
          {(text) => <DangerSublabel>{text()}</DangerSublabel>}
        </Show>
      </TightStack>
    </div>
  );
};

/** Props that are visual/static overrides — locked at variant-definition time. */
export type FileDropZoneOverrides = Pick<FileDropZoneProps, "density">;

/** Props that remain available to consumers of a curried variant. */
export type FileDropZoneDataProps = Omit<
  FileDropZoneProps,
  keyof FileDropZoneOverrides
>;

export function createFileDropZone(
  defaults: Partial<Omit<FileDropZoneProps, "children">>,
): Component<FileDropZoneDataProps> {
  return (props) => (
    <FileDropZone {...(mergeProps(defaults, props) as FileDropZoneProps)} />
  );
}
