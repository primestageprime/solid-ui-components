// Types
export type { ColorVariant, CornerStyle } from "./types";

// Components
export * from "./components/Layout";
export * from "./components/Text";
export * from "./components/Surface";
export * from "./components/Badge";
export * from "./components/Cell";
export * from "./components/Button";
export * from "./components/Card";
export * from "./components/DataDisplay";
export * from "./components/Feedback";
export * from "./components/Icon";
export * from "./components/Inputs";
export * from "./components/Navigation";
export * from "./components/Toggle";
export * from "./components/Progress";
export * from "./components/ProgressCard";
export * from "./components/Heatmap";
export * from "./components/HeatStream";
export * from "./components/HeatStreamGrid";
export * from "./components/Table";
export * from "./components/Section";
export * from "./components/Panel";
export * from "./components/Divider";
export * from "./components/Page";
export * from "./components/Modal";
export * from "./components/Tabs";
export * from "./components/ButtonGroup";
export * from "./components/List";
export * from "./components/Selector";
export * from "./components/Dropdown";
export * from "./components/VesselCallHeader";
export * from "./components/DataList";
export * from "./components/MathFormula";
export * from "./components/ProgressCheck";
export * from "./components/BurndownChart";
export * from "./components/SprintSelector";
export * from "./components/DagChart";

// Styles - import this in your app: import "solid-ui-components/styles.css"

// Backward compatibility — will be removed in a future version
export { Page as HUDPage } from "./components/Page";
export { Section as HUDSection } from "./components/Section";
export { Panel as HUDPanel } from "./components/Panel";
export { Modal as HUDModal } from "./components/Modal";
export { ConfirmationModal as HUDConfirmationModal } from "./components/Modal";
export { Tabs as HUDTabs } from "./components/Tabs";
export { ButtonGroup as HUDButtonGroup } from "./components/ButtonGroup";
export { List as HUDList, ListItem as HUDListItem } from "./components/List";
export { createPanel as createHUDPanel } from "./components/Panel";
