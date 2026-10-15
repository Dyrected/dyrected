export type {
  AdminComponents,
  AdminFieldComponentContext,
  AdminFieldComponentProps,
  AdminFormComponentProps,
  AdminPageProps,
  AdminSchemas,
  AdminViewLayoutProps,
  CollectionListSlotProps,
  CollectionViewSlotProps,
  DashboardSlotProps,
  TypedAdminComponents,
} from "../types/admin-components";
export { defineAdminComponents } from "../types/admin-components";

export type {
  AdminSchemasResult,
  AdminThemeHookResult,
  DyrectedFieldHookResult,
  DyrectedFormHookResult,
  MediaLibraryHookOptions,
  MediaLibraryHookResult,
  MediaUploadHookOptions,
  MediaUploadHookResult,
  MediaURLHookOptions,
  MediaURLHookResult,
} from "./contracts";
export {
  createDyrectedFieldController,
} from "../controllers/field";
export {
  createDyrectedFormController,
  getFieldPathSegments,
  getParentFieldPath,
  getValueAtPath,
  joinFieldPath,
  normalizeFieldPath,
  setValueAtPath,
} from "../controllers/form";
export {
  createAdminThemeController,
} from "../controllers/theme";
export {
  createMediaLibraryController,
  createMediaUploadController,
  createMediaURLController,
} from "../controllers/media";
export {
  createTrashController,
} from "../controllers/trash";
export type {
  TrashController,
  TrashControllerOptions,
  TrashControllerState,
} from "../controllers/trash";
export type {
  DyrectedFieldController,
} from "../controllers/field";
export type {
  DyrectedFieldState,
  DyrectedFormController,
  DyrectedFormControllerAdapters,
  DyrectedFormControllerOptions,
  DyrectedFieldPathPart,
  DyrectedFormState,
  DyrectedFormValues,
  DyrectedSetValueOptions,
} from "../controllers/form";
export type {
  AdminThemeController,
  AdminThemeControllerOptions,
  AdminThemeControllerState,
} from "../controllers/theme";
export type {
  MediaControllerSchemas,
  MediaLibraryController,
  MediaLibraryControllerOptions,
  MediaLibraryControllerState,
  MediaRecord,
  MediaUploadController,
  MediaUploadControllerOptions,
  MediaUploadControllerState,
  MediaUploadQueueItem,
  MediaURLClassification,
  MediaURLController,
  MediaURLControllerOptions,
  MediaURLControllerState,
} from "../controllers/media";
export { compressImage } from "../lib/compress-image";
export {
  buildExternalMediaPayload,
  filenameFromUrl,
  isDirectImageUrl,
  isEmbeddableVideoUrl,
} from "../lib/external-media";
export {
  formatMediaErrorMessage,
  getMediaSourceInfo,
  isExternalMedia,
  resolveActiveMediaCollection,
} from "../lib/media-utils";
export {
  buildDefaultValues,
  buildSchemaShape,
  formatPath,
  getFlatErrors,
  resolveContainerPath,
} from "../components/forms/utils";
export {
  DyrectedFieldPathProvider,
  DyrectedFormProvider,
  useDyrectedFieldPathContext,
  useDyrectedFormControllerContext,
  useOptionalDyrectedFormControllerContext,
} from "../providers/dyrected-form-context";
export type {
  DyrectedFieldPathProviderProps,
  DyrectedFormProviderProps,
} from "../providers/dyrected-form-context";
export {
  useDyrected,
  useOptionalDyrected,
} from "../providers/dyrected-context";
export type {
  DyrectedContextType,
} from "../providers/dyrected-context";

export {
  AdminThemeProvider,
  AdminThemedRoot,
} from "../hooks/admin-theme-provider";
export {
  adminThemeClassName,
  getSystemAdminTheme,
  resolveAdminTheme,
} from "../hooks/admin-theme";
export type {
  AdminThemePreference,
  ResolvedAdminTheme,
} from "../hooks/admin-theme";
export { useAdminTheme } from "../hooks/use-admin-theme";
export { useDyrectedForm } from "../hooks/use-dyrected-form";
export { useField } from "../hooks/use-field";
export { useMediaLibrary } from "../hooks/use-media-library";
export { useMediaUpload } from "../hooks/use-media-upload";
export { useMediaURL } from "../hooks/use-media-url";
export { useAddMediaFromUrl } from "../hooks/use-add-media-from-url";
export { useTrash } from "../hooks/use-trash";
export type {
  UseTrashOptions,
  UseTrashPagination,
  UseTrashResult,
} from "../hooks/use-trash";
export {
  resolveBadgePresentation,
  BADGE_COLOR_PALETTES,
} from "../lib/badge-colors";
export type {
  BadgePresentation,
  ResolveBadgePresentationOptions,
} from "../lib/badge-colors";

// Cross-cutting admin component hooks (Phase 1)
export { useAdminNavigate } from "../hooks/use-admin-navigate";
export type { AdminNavigateResult } from "../hooks/use-admin-navigate";
export { useAdminNotify } from "../hooks/use-admin-notify";
export type { AdminNotifyHelpers, AdminNotifyOptions } from "../hooks/use-admin-notify";
export { useAccess } from "../hooks/use-access";
export type { AdminAccessHelpers, UseAccessResult } from "../hooks/use-access";

// Admin bridge context and providers
export {
  AdminBridgeContext,
  useAdminBridgeContext,
  toUrlHelpers,
  resolveAdminNavigateUrl,
} from "../providers/admin-bridge-context";
export {
  AdminBridgeProvider,
} from "../providers/admin-bridge-provider";
export type {
  AdminBridgeBundle,
  AdminNavigateHelpers,
  AdminNavigateTarget,
} from "../providers/admin-bridge-context";

// Slot error boundary and placeholders
export {
  AdminComponentSlot,
  AdminComponentErrorBoundary,
  AdminMissingComponentPlaceholder,
  warnMissingComponent,
} from "../components/admin-component-slot";
export type {
  AdminComponentErrorBoundaryProps,
  AdminComponentErrorBoundaryState,
} from "../components/admin-component-slot";

