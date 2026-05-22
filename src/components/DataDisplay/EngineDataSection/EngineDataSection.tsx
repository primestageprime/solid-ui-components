// ============================================
// EngineDataSection — Composite (Depth 3, zero CSS).
// Composes AlertBox (Depth 2) + NumberWithUnits (Atomic
// Primitive, Depth 1) + Layout/Text curried variants.
// Heading + warning box + table slot.
//
// NOTE: name encodes a domain concept ("Engine"); flagged
// for rename in the next library-wide naming pass.
// ============================================
import { JSX, splitProps, Show } from "solid-js";
import { NumberWithUnits } from "../NumberWithUnits";
import { AlertBox } from "../../Feedback/AlertBox";
import { TextTitle, TextBody } from "../../Text/variants";
import { NarrowStack } from "../../Layout/variants";

export interface EngineDataSectionProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /** Heading text (default: "Engine Power Compensation") */
  heading?: string;
  /** Whether to show the "Add Power Log" warning box */
  showWarning?: boolean;
  /** Default engine power in kW (shown in warning message) */
  defaultKw?: number;
  /** Href for the "Add Power Log" button */
  auxEngineHref?: string;
  /** Table or other content */
  children?: JSX.Element;
}

export function EngineDataSection(props: EngineDataSectionProps) {
  const [local, others] = splitProps(props, [
    "heading",
    "showWarning",
    "defaultKw",
    "auxEngineHref",
    "children",
    "class",
  ]);

  return (
    <NarrowStack class={local.class} {...others}>
      <TextTitle>{local.heading ?? "Engine Power Compensation"}</TextTitle>

      {local.children}

      <Show when={local.showWarning}>
        <AlertBox
          variant="warning"
          title="Power Log Required"
          action={
            <a href={local.auxEngineHref}>Add Power Log</a>
          }
        >
          <TextBody>
            Using default (<NumberWithUnits value={local.defaultKw} units="kW" precision={0} />). Add aux engine data to improve accuracy.
          </TextBody>
        </AlertBox>
      </Show>
    </NarrowStack>
  );
}
