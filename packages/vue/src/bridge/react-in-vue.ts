import { h, render, defineComponent, onErrorCaptured, provide, shallowRef, type AppContext, type Component } from 'vue';
import * as ReactModule from 'react';
import { createPortal } from 'react-dom';
import {
  useOptionalDyrectedFormControllerContext,
  useDyrectedFieldPathContext,
  useOptionalDyrected,
  useAdminBridgeContext,
  useAdminTheme,
  PageMetaContext,
  PageRouteContext,
  ViewControllerContext,
  DocumentContext,
  DyrectedField as ReactDyrectedField,
  DyrectedFields as ReactDyrectedFields,
  DyrectedDefaultForm as ReactDyrectedDefaultForm,
} from '@dyrected/admin/public';
import { DYRECTED_FORM_CONTROLLER_KEY, DYRECTED_FIELD_PATH_KEY } from '../composables/useDyrectedForm';
import { DYRECTED_CLIENT_KEY } from '../composables/useDyrected';
import { ADMIN_THEME_CONTROLLER_KEY } from '../composables/useAdminTheme';
import { DYRECTED_ADMIN_KEY } from '../composables/useAdminBridge';
import { DYRECTED_PAGE_KEY } from '../composables/usePageMeta';
import { DYRECTED_PAGE_ROUTE_KEY } from '../composables/usePageRoute';
import { DYRECTED_VIEW_KEY } from '../composables/useCollectionView';
import { DYRECTED_DOCUMENT_KEY } from '../composables/useDocumentForm';
import { DYRECTED_REACT_SLOTS_KEY, type ReactSlotKind, type ReactSlotRegistry } from './react-slots';

function arePropsShallowEqual(prev: Record<string, any> | null, next: Record<string, any> | null): boolean {
  if (prev === next) return true;
  if (!prev || !next) return false;
  const prevKeys = Object.keys(prev);
  const nextKeys = Object.keys(next);
  if (prevKeys.length !== nextKeys.length) return false;
  for (const key of prevKeys) {
    if (prev[key] !== next[key]) return false;
  }
  return true;
}

const REACT_SLOT_COMPONENTS: Record<ReactSlotKind, ReactModule.ComponentType<any>> = {
  field: ReactDyrectedField,
  fields: ReactDyrectedFields,
  defaultForm: ReactDyrectedDefaultForm,
};

interface ReactSlotEntry {
  id: number;
  el: HTMLElement;
  kind: ReactSlotKind;
  props: Record<string, unknown>;
}

/**
 * wrapVueComponent — Higher-order component that wraps a Vue 3 component
 * so it can be rendered within a React component tree.
 *
 * Rather than spinning up a full `createApp()` per rendered instance, each
 * island is mounted with Vue's low-level `render()` and shares a single
 * `appContext` — normally the host app's, captured by `<DyrectedAdmin>`.
 *
 * An ambient ContextProvider automatically passes down React controllers and
 * providers (form controller, field path, client, theme, and admin bridge) into
 * Vue's `provide()`/`inject()` system so composables like `useDyrectedForm()`,
 * `useField()`, `useAdminNavigate()`, `useAdminNotify()`, and `useAccess()` work
 * out of the box with zero manual provider ceremony.
 */
export function wrapVueComponent(VueComp: Component, appContext?: AppContext | null) {
  const ReactWrapper = (props: any) => {
    const containerRef = ReactModule.useRef<HTMLDivElement>(null);
    const lastPropsRef = ReactModule.useRef<any>(null);

    // Vue swallows render/setup errors into its own logger, so they never reach
    // React. Forward them by rethrowing during render, which lets the slot's
    // error boundary show its error card instead of a silently blank island.
    const [islandError, setIslandError] = ReactModule.useState<Error | null>(null);
    const reportErrorRef = ReactModule.useRef((err: Error) => {
      setIslandError((prev) => prev ?? err);
    });
    if (islandError) throw islandError;

    // Read ambient controllers and context from the React tree
    const formController = useOptionalDyrectedFormControllerContext();
    const fieldPath = useDyrectedFieldPathContext();
    const dyrected = useOptionalDyrected();
    const adminBridge = useAdminBridgeContext();
    const themeResult = useAdminTheme();
    const pageMetaContext = ReactModule.useContext(PageMetaContext);
    const pageRouteContext = ReactModule.useContext(PageRouteContext);
    const viewController = ReactModule.useContext(ViewControllerContext);
    const documentContext = ReactModule.useContext(DocumentContext);

    // The document, permissions and `submit` change while the form is open, so
    // the island gets a ref the bridge keeps current instead of a snapshot.
    const documentRef = ReactModule.useRef<ReturnType<typeof shallowRef<any>> | null>(null);
    if (!documentRef.current) documentRef.current = shallowRef(documentContext);
    ReactModule.useEffect(() => {
      documentRef.current!.value = documentContext;
    }, [documentContext]);

    // Built-in form pieces requested by the island (`<DyrectedField>` and
    // friends) render here, in the React tree, and portal into the island.
    const [slotEntries, setSlotEntries] = ReactModule.useState<ReactSlotEntry[]>([]);
    const slotRegistry = ReactModule.useRef<ReactSlotRegistry | null>(null);
    if (!slotRegistry.current) {
      let nextId = 0;
      slotRegistry.current = {
        mount(el, kind, slotProps) {
          const id = nextId++;
          setSlotEntries((prev) => [...prev, { id, el, kind, props: slotProps }]);
          return {
            update: (next) =>
              setSlotEntries((prev) => prev.map((entry) => (entry.id === id ? { ...entry, props: next } : entry))),
            unmount: () => setSlotEntries((prev) => prev.filter((entry) => entry.id !== id)),
          };
        },
      };
    }

    // Mutable cell holding the latest admin bridge. The Vue island receives a
    // stable facade that reads through it, so `provide()` (which runs once in
    // `setup()`) never serves a stale bundle.
    const latestBridgeRef = ReactModule.useRef(adminBridge);
    latestBridgeRef.current = adminBridge;

    const latestPageMetaRef = ReactModule.useRef(pageMetaContext);
    latestPageMetaRef.current = pageMetaContext;

    const latestPageRouteRef = ReactModule.useRef(pageRouteContext);
    latestPageRouteRef.current = pageRouteContext;

    const themeController = themeResult?.controller;
    const client = dyrected?.client;

    // Controllers are stable per surface (spec §4), so the provider component
    // is rebuilt only when one of them is replaced, which is a new surface and
    // correctly remounts the island. Ordinary prop updates keep the same
    // component type, so Vue patches in place and preserves island state.
    const Island = ReactModule.useMemo<Component>(() => {
      const provides = new Map<any, any>();
      if (formController) provides.set(DYRECTED_FORM_CONTROLLER_KEY, formController);
      if (fieldPath) provides.set(DYRECTED_FIELD_PATH_KEY, fieldPath);
      if (client) provides.set(DYRECTED_CLIENT_KEY, client);
      if (themeController) provides.set(ADMIN_THEME_CONTROLLER_KEY, themeController);
      provides.set(DYRECTED_ADMIN_KEY, {
        navigate: (...args: Parameters<typeof adminBridge.navigate>) => latestBridgeRef.current.navigate(...args),
        to: {
          collection: (...a: Parameters<typeof adminBridge.to.collection>) => latestBridgeRef.current.to.collection(...a),
          document: (...a: Parameters<typeof adminBridge.to.document>) => latestBridgeRef.current.to.document(...a),
          view: (...a: Parameters<typeof adminBridge.to.view>) => latestBridgeRef.current.to.view(...a),
          page: (...a: Parameters<typeof adminBridge.to.page>) => latestBridgeRef.current.to.page(...a),
        },
        notify: {
          success: (...a: Parameters<typeof adminBridge.notify.success>) => latestBridgeRef.current.notify.success(...a),
          error: (...a: Parameters<typeof adminBridge.notify.error>) => latestBridgeRef.current.notify.error(...a),
          info: (...a: Parameters<typeof adminBridge.notify.info>) => latestBridgeRef.current.notify.info(...a),
        },
        access: {
          can: (...a: Parameters<typeof adminBridge.access.can>) => latestBridgeRef.current.access.can(...a),
        },
      });

      // The view controller is subscribable and its identity is stable per view,
      // so it is provided directly (spec §4: controllers, never snapshots).
      if (viewController) provides.set(DYRECTED_VIEW_KEY, viewController);

      if (documentContext) provides.set(DYRECTED_DOCUMENT_KEY, documentRef.current);
      if (formController) provides.set(DYRECTED_REACT_SLOTS_KEY, slotRegistry.current);

      if (pageMetaContext) {
        provides.set(DYRECTED_PAGE_KEY, {
          get meta() {
            return latestPageMetaRef.current?.meta ?? {};
          },
          get options() {
            return latestPageMetaRef.current?.options;
          },
          get page() {
            return latestPageMetaRef.current?.page;
          },
          setMeta: (next: any) => latestPageMetaRef.current?.setMeta(next),
        });
      }

      if (pageRouteContext) {
        provides.set(DYRECTED_PAGE_ROUTE_KEY, {
          get params() {
            return latestPageRouteRef.current?.params ?? {};
          },
          get splat() {
            return latestPageRouteRef.current?.splat ?? "";
          },
          get searchParams() {
            return latestPageRouteRef.current?.searchParams ?? new URLSearchParams();
          },
          setSearchParams: (...args: any[]) => (latestPageRouteRef.current?.setSearchParams as any)(...args),
          navigate: (...args: any[]) => (latestPageRouteRef.current?.navigate as any)(...args),
        });
      }

      return defineComponent({
        name: `DyrectedBridgeContextProvider(${(VueComp as any).name || 'Component'})`,
        props: { innerProps: { type: Object, required: true } },
        setup(bridgeProps) {
          for (const [key, value] of provides) provide(key, value);
          onErrorCaptured((err) => {
            reportErrorRef.current(err instanceof Error ? err : new Error(String(err)));
            return false;
          });
          return () => h(VueComp, bridgeProps.innerProps);
        },
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formController, fieldPath, client, themeController, viewController, Boolean(documentContext), Boolean(pageMetaContext), Boolean(pageRouteContext)]);

    // A new island type starts from a clean render.
    ReactModule.useEffect(() => {
      lastPropsRef.current = null;
    }, [Island]);

    // Re-render when React props change. Same component type, so Vue patches
    // the existing island and preserves its state.
    ReactModule.useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      if (lastPropsRef.current !== null && arePropsShallowEqual(lastPropsRef.current, props)) {
        return;
      }
      lastPropsRef.current = props;

      const vnode = h(Island, { innerProps: props });
      if (appContext) {
        vnode.appContext = appContext;
      }
      render(vnode, container);
    }, [props, Island]);

    // Unmount the Vue island only when the React component unmounts.
    ReactModule.useEffect(() => {
      const container = containerRef.current;
      return () => {
        if (container) render(null, container);
      };
    }, []);

    return ReactModule.createElement(
      ReactModule.Fragment,
      null,
      ReactModule.createElement('div', {
        ref: containerRef,
        className: 'dyrected-vue-bridge-container',
        style: { display: 'contents' },
      }),
      ...slotEntries.map((entry) =>
        createPortal(ReactModule.createElement(REACT_SLOT_COMPONENTS[entry.kind], entry.props), entry.el, String(entry.id)),
      ),
    );
  };

  // Set display name for better debugging
  ReactWrapper.displayName = `VueWrapper(${(VueComp as any).name || 'Component'})`;

  return ReactWrapper;
}

/**
 * wrapComponents — Recursively wraps all components in a nested object.
 * Useful for the `components` prop in DyrectedAdmin. The optional `appContext`
 * is threaded down so every wrapped island shares the host app's context.
 */
export function wrapComponents(components: any, appContext?: AppContext | null): any {
  if (!components) return components;

  const wrapped: any = {};

  for (const [key, value] of Object.entries(components)) {
    if (typeof value === 'object' && value !== null && !('render' in value) && !('setup' in value)) {
      // It's a nested group (e.g., { fields: { ... } })
      wrapped[key] = wrapComponents(value, appContext);
    } else if (typeof value === 'function' || (typeof value === 'object' && value !== null)) {
      // It's likely a Vue component
      wrapped[key] = wrapVueComponent(value as Component, appContext);
    } else {
      wrapped[key] = value;
    }
  }

  return wrapped;
}
