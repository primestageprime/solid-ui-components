// ============================================
// AlertBox — Depth 2 (zero CSS)
// Composes Surface (curried) + Layout (curried) +
// Text (curried). Status-colored alert with action.
// ============================================
import { Component, JSX, splitProps } from "solid-js";
import { Dynamic } from "solid-js/web";
import { InfoSurface, WarningSurface, SuccessSurface, DangerSurface } from "../Surface";
import { SpreadRow, ContentStack, ActionSlot } from "../Layout";
import { InfoTitle, WarningTitle, SuccessTitle, DangerTitle, TextBody } from "../Text";

export type AlertBoxVariant = "info" | "warning" | "success" | "danger";

export interface AlertBoxProps extends JSX.HTMLAttributes<HTMLDivElement> {
  variant?: AlertBoxVariant;
  title?: string;
  description?: string;
  action?: JSX.Element;
}

const surfaces = { info: InfoSurface, warning: WarningSurface, success: SuccessSurface, danger: DangerSurface };
const titles = { info: InfoTitle, warning: WarningTitle, success: SuccessTitle, danger: DangerTitle };

export const AlertBox: Component<AlertBoxProps> = (props) => {
  const [local, others] = splitProps(props, [
    "variant",
    "title",
    "description",
    "action",
    "children",
  ]);

  const v = () => local.variant || "info";

  return (
    <Dynamic component={surfaces[v()]} {...others}>
      <SpreadRow>
        <ContentStack>
          {local.title && <Dynamic component={titles[v()]}>{local.title}</Dynamic>}
          {local.description && <TextBody>{local.description}</TextBody>}
          {local.children}
        </ContentStack>
        {local.action && <ActionSlot>{local.action}</ActionSlot>}
      </SpreadRow>
    </Dynamic>
  );
};
