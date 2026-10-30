// ============================================
// RedactedRow — Composite (Depth 2, owns CSS)
// Tags: shows:placeholder, shows:status, does:view, data:scalar, role:row
// Composes ClusterRow (Layout) + Icon + TextSublabel. Owns RedactedRow.css
// for the hatched well only (appearance + min-height, no flex geometry; the
// lock-and-label alignment comes from the composed ClusterRow).
//
// A row of content the viewer MAY NOT SEE YET: a discussion question hidden
// until the meeting, a note locked until you reach its chapter, a ballot
// sealed until voting closes. The row holds its place in a list so the count
// and the order stay honest, while the content itself is withheld.
//
// Not `Placeholder`: that is a build-time "content goes here" skeleton for the
// developer. This is a runtime state the END USER sees, so it reads as locked
// (hatched well + padlock) rather than as an unfinished wireframe.
// ============================================
import type { Component } from "solid-js";
import { Icon } from "../Icon";
import { ClusterRow } from "../Layout";
import { TextSublabel } from "../Text";
import "./RedactedRow.css";

export interface RedactedRowProps {
  /** Why the content is withheld, e.g. "Hidden until the meeting". */
  label: string;
}

export const RedactedRow: Component<RedactedRowProps> = (props) => (
  <ClusterRow class="sui-redacted-row" role="note">
    <Icon name="lock" size="sm" aria-hidden="true" />
    <TextSublabel>{props.label}</TextSublabel>
  </ClusterRow>
);

/** Props that are visual/static overrides — none today; the row has one look. */
export type RedactedRowOverrides = Record<string, never>;

/** Props that remain available to consumers of a curried RedactedRow variant. */
export type RedactedRowDataProps = RedactedRowProps;

export function createRedactedRow(
  _defaults: Partial<RedactedRowOverrides> = {},
): Component<RedactedRowDataProps> {
  return (props) => <RedactedRow label={props.label} />;
}
