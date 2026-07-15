export * from './hooks/useLivePreview';
export * from './hooks/useDyrected';
export * from './hooks/useDyPath';
export * from './providers/DyrectedProvider';
export * from './providers/DyPathProvider';
export * from './components/DyrectedImage';
export * from './components/DyrectedMedia';
export * from './components/DyrectedIcon';
export * from './components/DyrectedRichText';
export * from './components/Blocks';

// Re-export core types and errors from SDK for convenience
export { DyrectedClient, DyrectedError, getPreviewToken, PREVIEW_TOKEN_PARAM } from '@dyrected/sdk';
export type { CollectionConfig, GlobalConfig } from '@dyrected/sdk';
// Schema typing seam (re-exported from the SDK). The generated types file
// augments `Register`, which types the client (and hooks that use it) against
// your schema.
export type { Register, RegisteredSchema, BaseSchema, InferSchema } from '@dyrected/sdk';
