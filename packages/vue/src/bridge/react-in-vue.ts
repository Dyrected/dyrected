import { h, render, defineComponent, provide, shallowRef, type AppContext, type Component } from 'vue';
import * as ReactModule from 'react';
import {
  useOptionalDyrectedFormControllerContext,
  useDyrectedFieldPathContext,
  useOptionalDyrected,
  useAdminBridgeContext,
  useAdminTheme,
} from '@dyrected/admin/public';
import { DYRECTED_FORM_CONTROLLER_KEY, DYRECTED_FIELD_PATH_KEY } from '../composables/useDyrectedForm';
import { DYRECTED_CLIENT_KEY } from '../composables/useDyrected';
import { ADMIN_THEME_CONTROLLER_KEY } from '../composables/useAdminTheme';
import { DYRECTED_ADMIN_KEY } from '../composables/useAdminBridge';

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

function areMapsEqual(prev: Map<any, any> | null, next: Map<any, any> | null): boolean {
  if (prev === next) return true;
  if (!prev || !next) return false;
  if (prev.size !== next.size) return false;
  for (const [key, val] of prev.entries()) {
    if (next.get(key) !== val) return false;
  }
  return true;
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
    const lastProvidesRef = ReactModule.useRef<Map<any, any> | null>(null);

    // Read ambient controllers and context from React tree
    const formController = useOptionalDyrectedFormControllerContext();
    const fieldPath = useDyrectedFieldPathContext();
    const dyrected = useOptionalDyrected();
    const adminBridge = useAdminBridgeContext();
    const themeResult = useAdminTheme();

    // Construct the provides map for ambient context keys
    const providesMap = ReactModule.useMemo(() => {
      const map = new Map<any, any>();
      if (formController) {
        map.set(DYRECTED_FORM_CONTROLLER_KEY, formController);
      }
      if (fieldPath) {
        map.set(DYRECTED_FIELD_PATH_KEY, fieldPath);
      }
      if (dyrected?.client) {
        map.set(DYRECTED_CLIENT_KEY, dyrected.client);
      }
      if (themeResult?.controller) {
        map.set(ADMIN_THEME_CONTROLLER_KEY, themeResult.controller);
      }
      if (adminBridge) {
        map.set(DYRECTED_ADMIN_KEY, adminBridge);
      }
      return map;
    }, [formController, fieldPath, dyrected?.client, themeResult?.controller, adminBridge]);

    // Setup ref map for provide keys
    const providesRefsRef = ReactModule.useRef<Map<any, any>>(new Map());

    // (Re)render the Vue island whenever React props or ambient context change.
    // Skip render only when both props and provided values are unchanged.
    ReactModule.useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const propsEqual = lastPropsRef.current !== null && arePropsShallowEqual(lastPropsRef.current, props);
      const providesEqual = lastProvidesRef.current !== null && areMapsEqual(lastProvidesRef.current, providesMap);

      if (propsEqual && providesEqual) {
        return;
      }

      lastPropsRef.current = props;
      lastProvidesRef.current = providesMap;

      // Update values in providesRefsRef
      for (const [key, val] of providesMap.entries()) {
        const existingRef = providesRefsRef.current.get(key);
        if (existingRef) {
          existingRef.value = val;
        } else {
          providesRefsRef.current.set(key, shallowRef(val));
        }
      }

      const BridgeContextProvider = defineComponent({
        name: `DyrectedBridgeContextProvider(${(VueComp as any).name || 'Component'})`,
        props: {
          innerProps: {
            type: Object,
            required: true,
          },
        },
        setup(bridgeProps) {
          for (const [key, valRef] of providesRefsRef.current.entries()) {
            provide(key, valRef.value);
          }
          return () => h(VueComp, bridgeProps.innerProps);
        },
      });

      const vnode = h(BridgeContextProvider, {
        innerProps: props,
      });

      if (appContext) {
        vnode.appContext = appContext;
      }

      render(vnode, container);
    }, [props, providesMap]);

    // Unmount the Vue island only when the React component unmounts.
    ReactModule.useEffect(() => {
      const container = containerRef.current;
      return () => {
        if (container) render(null, container);
      };
    }, []);

    return ReactModule.createElement('div', {
      ref: containerRef,
      className: 'dyrected-vue-bridge-container',
      style: { display: 'contents' },
    });
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
