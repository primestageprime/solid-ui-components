// Base (Toast) is intentionally NOT exported — consumers use the imperative
// showToast()/toaster API plus <ToastRegion>/<ToastList>. The per-toast `variant`
// is runtime data carried in ShowToastInput, not a baked visual override.
export { ToastRegion, ToastList, showToast, toaster } from "./Toast";
export type {
  ToastAction,
  ToastVariant,
  ToastRegionCurriedProps,
  ToastListCurriedProps,
  ShowToastInput,
  ToastHandle,
} from "./Toast";
