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

// Bridge
export * from './bridge/react-in-vue';

// Live-preview token helpers (re-exported from the SDK for frontend consumption)
export { getPreviewToken, PREVIEW_TOKEN_PARAM } from '@dyrected/sdk';

// Schema typing seam (re-exported from the SDK). The generated types file
// augments `Register`, which types the composables against your schema.
export type { Register, RegisteredSchema, BaseSchema, InferSchema } from '@dyrected/sdk';
