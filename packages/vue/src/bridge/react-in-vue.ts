import { h, render, type AppContext, type Component } from 'vue';
import * as ReactModule from 'react';

/**
 * wrapVueComponent — Higher-order component that wraps a Vue 3 component
 * so it can be rendered within a React component tree.
 *
 * Rather than spinning up a full `createApp()` per rendered instance, each
 * island is mounted with Vue's low-level `render()` and shares a single
 * `appContext` — normally the host app's, captured by `<DyrectedAdmin>`. That
 * keeps the cost of many custom fields/slots low and lets host-app plugins,
 * `provide`/`inject`, Pinia, and i18n flow into custom components.
 *
 * React is imported from the host dependency graph. The Nuxt adapter dedupes
 * React resolution so custom Vue field components share the admin's React copy.
 */
export function wrapVueComponent(VueComp: Component, appContext?: AppContext | null) {
  const ReactWrapper = (props: any) => {
    const containerRef = ReactModule.useRef<HTMLDivElement>(null);

    // (Re)render the Vue island whenever React props change. `render()` patches
    // the existing vnode in place, so component state is preserved across
    // prop updates rather than remounting.
    ReactModule.useEffect(() => {
      const container = containerRef.current;
      if (!container) return;
      const vnode = h(VueComp, props);
      if (appContext) {
        vnode.appContext = appContext;
      }
      render(vnode, container);
    }, [props]);

    // Unmount the Vue island only when the React component unmounts. Kept in a
    // separate effect so prop changes above don't tear it down and rebuild it.
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
