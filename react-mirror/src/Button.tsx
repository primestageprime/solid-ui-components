// SUI's Button, as React markup. Only the rendering is mirrored: the busy
// state comes from `loading`, never from a submit action (no logic here).
import type { ButtonHTMLAttributes, ReactElement, ReactNode } from "react";
import "../../src/components/Button/Button.css";
import type { Attrs } from "./internal/attrs.ts";
import { classNames } from "./internal/classes.ts";
import { domProps, mergeDefined } from "./internal/props.ts";

export interface ButtonProps extends Attrs<HTMLButtonElement> {
  readonly type?: ButtonHTMLAttributes<HTMLButtonElement>["type"];
  readonly variant?:
    | "default"
    | "primary"
    | "secondary"
    | "danger"
    | "warning"
    | "ghost"
    | "outlined"
    | "text"
    | "icon-only"
    | "pill"
    | "quiet"
    | "quiet-danger"
    | "plain-label";
  readonly size?: "sm" | "md" | "lg";
  readonly loading?: boolean;
  readonly active?: boolean;
  readonly tone?: "accent" | "outline" | "muted" | "danger";
  readonly casing?: "theme" | "normal";
  readonly disabled?: boolean;
  readonly children?: ReactNode;
}

export type ButtonDataProps = Omit<ButtonProps, "variant" | "size">;

type ClassInputs = Pick<
  ButtonProps,
  "variant" | "size" | "tone" | "loading" | "active" | "casing" | "class"
>;

export const buttonClasses = (p: ClassInputs): string =>
  classNames(
    "sui-btn",
    p.variant && `sui-btn--${p.variant}`,
    p.size && `sui-btn--${p.size}`,
    p.tone && `sui-btn--tone-${p.tone}`,
    p.loading && "sui-btn--loading",
    p.active && "sui-btn--active",
    p.casing === "normal" && "sui-btn--normal-case",
    p.class,
  );

export const Button = (props: ButtonProps): ReactElement => {
  const {
    type,
    variant,
    size,
    loading,
    active,
    tone,
    casing,
    disabled,
    children,
    class: cls,
    className,
    ...rest
  } = props;
  return (
    <button
      type={type ?? "button"}
      className={buttonClasses({
        variant,
        size,
        tone,
        loading,
        active,
        casing,
        class: classNames(cls, className),
      })}
      disabled={(disabled ?? false) || (loading ?? false)}
      aria-busy={loading || undefined}
      {...domProps(rest)}
    >
      {loading && <span className="sui-btn__spinner" />}
      <span className="sui-btn__content">{children}</span>
    </button>
  );
};

export const createButton =
  (defaults: Partial<Omit<ButtonProps, "children">>) =>
  (props: ButtonDataProps): ReactElement => (
    <Button {...mergeDefined(defaults, props)} />
  );
