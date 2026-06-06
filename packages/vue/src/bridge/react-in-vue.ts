import { h, createApp, ref, type Component, type App } from 'vue';
import * as ReactModule from 'react';

/**
 * wrapVueComponent — Higher-order component that wraps a Vue 3 component 
 * so it can be rendered within a React component tree.
 *
 * React is resolved lazily inside the wrapper (not at module init time) so that
 * `window.React` — set by the Admin UI before any render occurs — is always used.
 * This prevents the "Invalid hook call / useRef null" error that arises when the
 * Vue package and the Admin package each resolve to a different React instance.
 */
export function wrapVueComponent(VueComp: Component) {
  const ReactWrapper = (props: any) => {
    // Lazy lookup: by render time window.React is guaranteed to be set by the Admin bundle.
    const R: typeof ReactModule = (typeof window !== 'undefined' && (window as any).React) || ReactModule;

    const containerRef = R.useRef<HTMLDivElement>(null);
    const appRef = R.useRef<App | null>(null);
    const propsRef = R.useRef(ref(props));

    // Update the reactive propsRef when React props change
    R.useEffect(() => {
      propsRef.current.value = props;
    }, [props]);

    R.useEffect(() => {
      if (containerRef.current) {
        const app = createApp({
          setup() {
            // Render the Vue component with reactive props
            return () => h(VueComp, propsRef.current.value);
          }
        });
        app.mount(containerRef.current);
        appRef.current = app;
      }
      
      return () => {
        if (appRef.current) {
          appRef.current.unmount();
        }
      };
    }, []);

    return R.createElement('div', { 
      ref: containerRef,
      className: 'dyrected-vue-bridge-container',
      style: { display: 'contents' }
    });
  };

  // Set display name for better debugging
  ReactWrapper.displayName = `VueWrapper(${(VueComp as any).name || 'Component'})`;
  
  return ReactWrapper;
}

/**
 * wrapComponents — Recursively wraps all components in a nested object.
 * Useful for the `components` prop in DyrectedAdmin.
 */
export function wrapComponents(components: any): any {
  if (!components) return components;
  
  const wrapped: any = {};
  
  for (const [key, value] of Object.entries(components)) {
    if (typeof value === 'object' && value !== null && !('render' in value) && !('setup' in value)) {
      // It's a nested group (e.g., { fields: { ... } })
      wrapped[key] = wrapComponents(value);
    } else if (typeof value === 'function' || (typeof value === 'object' && value !== null)) {
      // It's likely a Vue component
      wrapped[key] = wrapVueComponent(value as Component);
    } else {
      wrapped[key] = value;
    }
  }
  
  return wrapped;
}
