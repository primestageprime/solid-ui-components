// lastReviewedAt: 2026-05-28
// lastReviewedBy: adlai.arnold
// ============================================
// ParticipantAvatar — Atomic Primitive (Depth 1)
// Tags: shows:avatar, does:view, data:participants, role:inline
// Owns CSS (ParticipantAvatar.css). Renders a
// circular avatar — image when provided, otherwise
// initials on a tinted disc.
// Factory: createParticipantAvatar().
// ============================================
import {
  type Component,
  type JSX,
  Show,
  createEffect,
  createSignal,
  mergeProps,
  on,
  splitProps,
} from "solid-js";
import "./ParticipantAvatar.css";
import { pipe, filter, join } from "../../fn";

export type ParticipantAvatarSize = "sm" | "md" | "lg";

export interface ParticipantAvatarProps
  extends JSX.HTMLAttributes<HTMLSpanElement> {
  /** Initials to render when no image is provided. */
  initials?: string;
  /** Avatar image URL. When set, the initials fallback is hidden. */
  imageSrc?: string;
  /** Background color for the initials disc (token or CSS color). */
  color?: string;
  /** Sizing variant. Default `"md"`. */
  size?: ParticipantAvatarSize;
  /** Alt text for the image — defaults to empty (decorative). */
  alt?: string;
  /**
   * `referrerpolicy` for the image. Hosts that refuse hotlinked requests
   * carrying a Referer (Google profile photos on lh3.googleusercontent.com)
   * need `"no-referrer"`. Omit and the browser default applies, as before.
   */
  referrerPolicy?: JSX.ImgHTMLAttributes<HTMLImageElement>["referrerpolicy"];
  /**
   * Fires when the image fails to load. Either way the avatar falls back to
   * the initials disc on its own; this is for logging or swapping the URL.
   * A new `imageSrc` gets a fresh try.
   */
  onImageError?: (event: Event) => void;
}

const clsx = (...parts: (string | false | undefined)[]): string =>
  pipe(
    parts,
    filter((p): p is string => Boolean(p)),
    join(" "),
  );

export const ParticipantAvatar: Component<ParticipantAvatarProps> = (props) => {
  const [local, others] = splitProps(props, [
    "initials",
    "imageSrc",
    "color",
    "size",
    "alt",
    "referrerPolicy",
    "onImageError",
    "class",
    "style",
  ]);

  // A broken image falls back to the initials disc. The flag resets whenever
  // the URL changes, so a corrected `imageSrc` is tried again.
  const [failed, setFailed] = createSignal(false);
  createEffect(
    on(
      () => local.imageSrc,
      () => setFailed(false),
      { defer: true },
    ),
  );

  const sizeClass = () => `sui-participant-avatar--${local.size ?? "md"}`;

  const initialsClass = () =>
    clsx("sui-participant-avatar", sizeClass(), local.class);

  const imgClass = () =>
    clsx(
      "sui-participant-avatar",
      "sui-participant-avatar--img",
      sizeClass(),
      local.class,
    );

  const mergedStyle = (): JSX.CSSProperties => {
    const base =
      typeof local.style === "object" && local.style
        ? (local.style as JSX.CSSProperties)
        : {};
    const out: JSX.CSSProperties = { ...base };
    if (local.color) out["background-color"] = local.color;
    return out;
  };

  return (
    <Show
      when={local.imageSrc && !failed()}
      fallback={
        <span
          class={initialsClass()}
          style={mergedStyle()}
          aria-hidden="true"
          {...others}
        >
          {local.initials ?? "?"}
        </span>
      }
    >
      {/* Image branch — color is irrelevant; alt defaults to decorative. */}
      <img
        class={imgClass()}
        style={
          typeof local.style === "object"
            ? (local.style as JSX.CSSProperties)
            : undefined
        }
        src={local.imageSrc!}
        alt={local.alt ?? ""}
        referrerpolicy={local.referrerPolicy}
        onError={(e) => {
          setFailed(true);
          local.onImageError?.(e);
        }}
      />
    </Show>
  );
};

/** Props that are visual overrides — locked at variant-definition time. */
export type ParticipantAvatarOverrides = Pick<ParticipantAvatarProps, "size">;

/** Props that remain available to consumers of a curried variant. */
export type ParticipantAvatarDataProps = Omit<
  ParticipantAvatarProps,
  keyof ParticipantAvatarOverrides
>;

export function createParticipantAvatar(
  defaults: Partial<Omit<ParticipantAvatarProps, "children">>,
): Component<ParticipantAvatarDataProps> {
  return (props) => <ParticipantAvatar {...mergeProps(defaults, props)} />;
}
