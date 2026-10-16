// Components
export { default as DyrectedAdmin } from './components/DyrectedAdmin.vue';
export { default as DyrectedImage } from './components/DyrectedImage.vue';
export { default as DyrectedMedia } from './components/DyrectedMedia.vue';
export { default as DyrectedIcon } from './components/DyrectedIcon.vue';
export { default as DyrectedRichText } from './components/DyrectedRichText.vue';
export { Blocks, type BlocksItem } from './components/Blocks';
export { DyPathScope } from './components/DyPathScope';

// Composables
export * from './composables/useDyrected';
export * from './composables/useLivePreview';
export * from './composables/useDyrectedAuth';
export * from './composables/useDyPath';
export * from './composables/useAdminSchemas';
export * from './composables/useMediaUpload';
export * from './composables/useMediaLibrary';
export * from './composables/useMediaURL';
export * from './composables/useAddMediaFromUrl';
export * from './composables/useDyrectedForm';
export * from './composables/useField';
export * from './composables/useAdminTheme';
export * from './composables/useTrash';
export * from './composables/useAdminBridge';
export * from './composables/useAdminNavigate';
export * from './composables/useAdminNotify';
export * from './composables/useAccess';
export * from './composables/useCollectionView';
export { defineCustomView } from '@dyrected/admin/public';
export type { CustomViewConfig, CustomViewDataConfig } from '@dyrected/admin/public';

// Admin component registration helpers
export { defineAdminComponents } from '@dyrected/admin/public';
export type {
  AdminComponents,
  AdminFieldComponentProps,
  AdminFormComponentProps,
  AdminViewLayoutProps,
  AdminPageProps,
  TypedAdminComponents,
} from '@dyrected/admin/public';

// Bridge
export * from './bridge/react-in-vue';

// Live-preview token helpers (re-exported from the SDK for frontend consumption)
export { getPreviewToken, PREVIEW_TOKEN_PARAM } from '@dyrected/sdk';

// Schema and component typing seams (re-exported from the SDK).
export type { Register, RegisteredSchema, BaseSchema, InferSchema, RegisteredComponentKeys } from '@dyrected/sdk';

