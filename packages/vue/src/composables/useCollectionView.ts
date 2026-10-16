import { computed, inject, onScopeDispose, shallowRef, type ComputedRef, type InjectionKey } from 'vue';
import {
  buildCollectionViewApi,
  groupDocuments,
  type CollectionViewApi,
  type DocumentGroup,
  type ResolvedViewAction,
  type ViewController,
  type ViewDocument,
} from '@dyrected/admin/public';

export type { CollectionViewApi, ResolvedViewAction, ViewDocument, DocumentGroup };

/** Ambient key the bridge provides inside custom view layouts. */
export const DYRECTED_VIEW_KEY: InjectionKey<ViewController> = Symbol.for('dyrected.view');

function useViewController(hookName: string): ViewController {
  const controller = inject(DYRECTED_VIEW_KEY, null);
  if (!controller) {
    throw new Error(`${hookName}() must be used inside a custom view layout (layout: "custom").`);
  }
  return controller;
}

/** Mirrors the controller's immutable snapshot into a `shallowRef`. */
function useViewState(controller: ViewController) {
  const state = shallowRef(controller.getState());
  const unsubscribe = controller.subscribe(() => {
    state.value = controller.getState();
  });
  onScopeDispose(unsubscribe);
  return state;
}

/** Same shape as `CollectionViewApi`, with the state fields as refs. */
export type VueCollectionViewApi = {
  [K in keyof CollectionViewApi]: CollectionViewApi[K] extends (...args: any[]) => any
    ? CollectionViewApi[K]
    : ComputedRef<CollectionViewApi[K]>;
};

/**
 * Vue composable for custom view layouts. Mirrors `useCollectionView()` in
 * `@dyrected/react`; read state through `.value`.
 *
 * @experimental
 */
export function useCollectionView(): VueCollectionViewApi {
  const controller = useViewController('useCollectionView');
  const state = useViewState(controller);
  const api = computed(() => buildCollectionViewApi(state.value, controller.handlers));

  return {
    collection: computed(() => api.value.collection),
    viewSlug: computed(() => api.value.viewSlug),
    config: computed(() => api.value.config),
    documents: computed(() => api.value.documents),
    total: computed(() => api.value.total),
    isLoading: computed(() => api.value.isLoading),
    isFetching: computed(() => api.value.isFetching),
    error: computed(() => api.value.error),
    isTruncated: computed(() => api.value.isTruncated),
    refetch: controller.handlers.refetch,
    pagination: computed(() => api.value.pagination),
    sort: computed(() => api.value.sort),
    search: computed(() => api.value.search),
    filters: computed(() => api.value.filters),
    selection: computed(() => api.value.selection),
    updateDocument: controller.handlers.updateDocument,
    open: controller.handlers.open,
    permissions: computed(() => api.value.permissions),
    urls: computed(() => api.value.urls),
  } as VueCollectionViewApi;
}

export interface VueViewActionsApi {
  actions: ComputedRef<ResolvedViewAction[]>;
  run: (name: string, docs?: ViewDocument[], input?: Record<string, unknown>) => Promise<boolean>;
  isRunning: (name: string, docs?: ViewDocument[]) => boolean;
}

/**
 * Vue composable for running the view's actions from a custom layout. The host
 * shows its own confirm dialog and input form.
 *
 * @experimental
 */
export function useViewActions(): VueViewActionsApi {
  const controller = useViewController('useViewActions');
  const state = useViewState(controller);

  return {
    actions: computed(() => state.value.actions),
    run: controller.handlers.runAction,
    isRunning: (name, docs) => {
      const current = state.value;
      const ids = (docs ?? current.documents.filter((d) => current.selectedIds.includes(String(d.id)))).map((d) =>
        String(d.id),
      );
      return current.runningActions.includes(`${name}::${[...ids].sort().join(',')}`);
    },
  };
}

/**
 * Groups the view's documents by a field, resolving select labels and
 * populated relationship names.
 *
 * @experimental
 */
export function useGroupedDocuments(groupBy: string | (() => string)) {
  const controller = useViewController('useGroupedDocuments');
  const state = useViewState(controller);
  return computed(() =>
    groupDocuments(
      state.value.documents,
      typeof groupBy === 'function' ? groupBy() : groupBy,
      state.value.collection as { fields?: any[] },
    ),
  );
}
