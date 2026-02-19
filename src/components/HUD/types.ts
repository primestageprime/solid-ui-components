import { JSX } from "solid-js";

export type HUDVariant = "default" | "primary" | "danger" | "warning" | "success";
export type CornerStyle = "clip" | "bracket" | "notch" | "round" | "none";

export interface HUDPageProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /** Optional scan lines overlay effect */
  scanLines?: boolean;
  /** Optional grid background pattern */
  gridPattern?: boolean;
}

export interface HUDSectionProps extends JSX.HTMLAttributes<HTMLElement> {
  title?: string;
  subtitle?: string;
  /** Corner decoration style */
  corners?: CornerStyle;
  /** Accent color variant */
  variant?: HUDVariant;
  /** Show header bar */
  showHeader?: boolean;
  /** Header action element */
  headerAction?: JSX.Element;
  /** Collapse/expand support */
  collapsible?: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export interface HUDPanelProps extends JSX.HTMLAttributes<HTMLDivElement> {
  title?: string;
  /** Corner decoration style */
  corners?: CornerStyle;
  /** Accent color variant */
  variant?: HUDVariant;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Glow intensity */
  glow?: "none" | "subtle" | "medium" | "strong";
  /** Show edge accents */
  edgeAccents?: boolean;
}

export interface HUDModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  /** Corner decoration style */
  corners?: CornerStyle;
  /** Accent color variant */
  variant?: HUDVariant;
  /** Modal size */
  size?: "sm" | "md" | "lg" | "xl";
  /** Show close button */
  showClose?: boolean;
  children?: JSX.Element;
  /** Footer content */
  footer?: JSX.Element;
}

export type TabStatus = "warning" | "error";

export interface HUDTab {
  id: string;
  label: string;
  icon?: JSX.Element;
  /** Status indicator for data issues */
  status?: TabStatus;
}

export interface HUDTabsProps {
  tabs: HUDTab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  /** Tab style variant */
  variant?: "default" | "underline" | "boxed" | "pill";
  /** Accent color */
  color?: HUDVariant;
}

export interface HUDButtonGroupProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /** Orientation of buttons */
  orientation?: "horizontal" | "vertical";
  /** Gap between buttons */
  gap?: "none" | "sm" | "md" | "lg";
  /** Border around group */
  bordered?: boolean;
}

export interface HUDToggleProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  labelPosition?: "left" | "right";
  /** Toggle style variant */
  variant?: "default" | "power" | "circuit" | "minimal";
  /** Size */
  size?: "sm" | "md" | "lg";
  /** Accent color */
  color?: HUDVariant;
}

export interface HUDListProps extends JSX.HTMLAttributes<HTMLUListElement> {
  /** List style */
  variant?: "default" | "numbered" | "status" | "menu";
  /** Show dividers between items */
  dividers?: boolean;
  /** Compact spacing */
  compact?: boolean;
}

export interface HUDListItemProps extends JSX.HTMLAttributes<HTMLLIElement> {
  /** Status indicator */
  status?: "active" | "inactive" | "warning" | "error" | "success";
  /** Icon element */
  icon?: JSX.Element;
  /** Secondary text */
  secondary?: string;
  /** Make item clickable */
  interactive?: boolean;
  /** Selected state */
  selected?: boolean;
}
