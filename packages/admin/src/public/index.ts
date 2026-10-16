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
export { useAdminClient } from "../hooks/use-admin-client";
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

// Custom Admin Pages (Spec 4)
export { usePageMeta } from "../hooks/use-page-meta";
export type { UsePageMetaResult } from "../hooks/use-page-meta";
export { usePageRoute } from "../hooks/use-page-route";
export type { PageRoute } from "../hooks/use-page-route";
export {
  PageMetaContext,
  PageRouteContext,
  DYRECTED_PAGE_KEY,
  DYRECTED_PAGE_ROUTE_KEY,
} from "../providers/page-context";
export type {
  PageMeta,
  PageMetaContextValue,
  PageRouteContextValue,
} from "../providers/page-context";
export { CustomPageRoute } from "../pages/custom/custom-page-route";
export { definePage } from "@dyrected/core";
export type { PageAction, PageBreadcrumbItem, PageConfig, DefinePageInput } from "@dyrected/core";

// Custom View Layouts (Spec 3)
export {
  useCollectionView,
  useViewActions,
  useGroupedDocuments,
  buildCollectionViewApi,
} from "../hooks/use-collection-view";
export type {
  CollectionViewApi,
  ViewActionsApi,
  ResolvedViewAction,
} from "../hooks/use-collection-view";
export { ViewControllerContext, DYRECTED_VIEW_KEY, createViewController } from "../providers/view-controller";
export type {
  CollectionViewState,
  ViewController,
  ViewControllerHandlers,
  ViewDocument,
  ViewOpenMode,
  ViewLayoutConfig,
} from "../providers/view-controller";
export { groupDocuments } from "../lib/group-documents";
export type { DocumentGroup, GroupedDocuments } from "../lib/group-documents";
export { defineCustomView } from "@dyrected/core";
export type { CustomViewConfig, CustomViewDataConfig } from "@dyrected/core";

// Custom Document Forms (Spec 2)
export { useDocumentForm, buildDocumentFormApi } from "../hooks/use-document-form";
export type {
  DocumentFormApi,
  SubmitOptions,
  SubmitResult,
  SubmitRedirect,
} from "../hooks/use-document-form";
export { DocumentContext, DYRECTED_DOCUMENT_KEY } from "../providers/document-context";
export type { DocumentContextValue, FormDocument } from "../providers/document-context";
export { DyrectedField, DyrectedFields, DyrectedDefaultForm } from "../components/forms/embedded-fields";
export type {
  DyrectedFieldProps,
  DyrectedFieldsProps,
  DyrectedDefaultFormProps,
} from "../components/forms/embedded-fields";
export type { FormShell } from "@dyrected/core";
