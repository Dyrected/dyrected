import { computed, inject, type ComputedRef, type InjectionKey, type ShallowRef } from 'vue';
import type {
  DocumentContextValue,
  DocumentFormApi,
  SubmitOptions,
  SubmitResult,
} from '@dyrected/admin/public';
import { useDyrectedForm } from './useDyrectedForm';
import type { VueStateify } from './useAdminSchemas';

export type { DocumentFormApi, SubmitOptions, SubmitResult };

/**
 * Ambient key the bridge provides inside custom create and edit forms. The value
 * is a ref the bridge keeps current, so the document and permissions stay reactive.
 */
export const DYRECTED_DOCUMENT_KEY: InjectionKey<ShallowRef<DocumentContextValue>> = Symbol.for('dyrected.document');

/** Same shape as `DocumentFormApi`, with the state fields as refs. */
export interface VueDocumentFormApi {
  mode: ComputedRef<DocumentFormApi['mode']>;
  collection: ComputedRef<DocumentFormApi['collection']>;
  document: ComputedRef<DocumentFormApi['document']>;
  isLoadingDocument: ComputedRef<boolean>;
  presentation: ComputedRef<DocumentFormApi['presentation']>;
  permissions: ComputedRef<DocumentFormApi['permissions']>;
  urls: ComputedRef<DocumentFormApi['urls']>;
  /** Same as `useDyrectedForm()`: values, errors, `setValue` and the rest, as refs. */
  form: VueStateify<DocumentFormApi['form']>;
  submit: (options?: SubmitOptions) => Promise<SubmitResult>;
  cancel: () => void;
}

/**
 * Vue composable for custom create and edit forms. Mirrors `useDocumentForm()` in
 * `@dyrected/react`; read state through `.value`.
 *
 * @experimental
 */
export function useDocumentForm(): VueDocumentFormApi {
  const context = inject(DYRECTED_DOCUMENT_KEY, null);
  if (!context) {
    throw new Error(
      'useDocumentForm() can only be used inside a custom create or edit form registered under `components.forms`.',
    );
  }
  const form = useDyrectedForm();

  return {
    mode: computed(() => context.value.mode),
    collection: computed(() => context.value.collection),
    document: computed(() => context.value.document),
    isLoadingDocument: computed(() => context.value.isLoadingDocument),
    presentation: computed(() => context.value.presentation),
    permissions: computed(() => context.value.permissions),
    urls: computed(() => context.value.urls),
    form,
    // Read through the ref at call time so a long-lived callback never serves a stale save.
    submit: (options) => context.value.submit(options),
    cancel: () => context.value.cancel(),
  };
}
