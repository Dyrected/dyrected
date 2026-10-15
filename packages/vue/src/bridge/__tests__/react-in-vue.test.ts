import { describe, it, expect, vi } from 'vitest';
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { h, defineComponent } from 'vue';
import { wrapComponents, wrapVueComponent } from '../react-in-vue.js';
import { useDyrectedForm } from '../../composables/useDyrectedForm.js';
import { useAdminNavigate } from '../../composables/useAdminNavigate.js';
import { useAdminNotify } from '../../composables/useAdminNotify.js';
import { useAccess } from '../../composables/useAccess.js';
import {
  createDyrectedFormController,
  DyrectedFormProvider,
  AdminBridgeContext,
  type AdminBridgeBundle,
} from '@dyrected/admin/public';

describe('wrapComponents', () => {
  it('returns undefined or null as is', () => {
    expect(wrapComponents(undefined)).toBeUndefined();
    expect(wrapComponents(null)).toBeNull();
  });

  it('wraps a single Vue component correctly', () => {
    const MockVueComp = { name: 'MockVue', setup: () => {} } as any;
    const wrapped = wrapVueComponent(MockVueComp);
    
    expect(typeof wrapped).toBe('function');
    expect((wrapped as any).displayName).toBe('VueWrapper(MockVue)');
  });

  it('recursively wraps deeply nested component registries', () => {
    const MockField1 = { name: 'Field1', setup: () => {} } as any;
    const MockDashboard1 = { name: 'Dash1', setup: () => {} } as any;
    const MockList1 = { name: 'List1', setup: () => {} } as any;

    const components = {
      fields: {
        'field-1': MockField1,
      },
      dashboard: {
        'dash-1': MockDashboard1,
      },
      collectionList: {
        'list-1': MockList1,
      }
    };

    const wrapped = wrapComponents(components);

    expect(wrapped).toBeDefined();
    expect(typeof wrapped.fields['field-1']).toBe('function');
    expect(typeof wrapped.dashboard['dash-1']).toBe('function');
    expect(typeof wrapped.collectionList['list-1']).toBe('function');

    expect(wrapped.dashboard['dash-1'].displayName).toBe('VueWrapper(Dash1)');
    expect(wrapped.collectionList['list-1'].displayName).toBe('VueWrapper(List1)');
  });
});

describe('Vue Bridge ambient context injection & updates', () => {
  it('automatically provides form controller and bridge bundle to wrapped Vue components', async () => {
    const controller = createDyrectedFormController({
      initialValues: { title: 'Hello World' },
    });

    const mockNavigate = vi.fn();
    const mockNotify = {
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
    };
    const mockAccess = {
      can: vi.fn(() => true),
    };

    const bridgeBundle: AdminBridgeBundle = {
      navigate: mockNavigate,
      to: {
        collection: (slug: string) => `/collections/${slug}`,
        document: (slug: string, id: string | number) => `/collections/${slug}/${id}`,
        view: (slug: string, viewSlug: string) => `/collections/${slug}/views/${viewSlug}`,
        page: (slug: string) => `/pages/${slug}`,
      },
      notify: mockNotify,
      access: mockAccess,
    };

    let capturedFormTitle = '';
    let capturedNavigateResult: any = null;

    const VueChild = defineComponent({
      name: 'VueChild',
      setup() {
        const form = useDyrectedForm();
        const navigate = useAdminNavigate();
        const notify = useAdminNotify();
        const access = useAccess();

        capturedFormTitle = form.values.value?.title as string;
        capturedNavigateResult = navigate;

        notify.success('Mounted');
        access.can('read', 'posts');

        return () => h('div', { id: 'vue-child' }, form.values.value?.title as string);
      },
    });

    const Wrapped = wrapVueComponent(VueChild);

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await React.act(async () => {
      root.render(
        React.createElement(
          AdminBridgeContext.Provider,
          { value: bridgeBundle },
          React.createElement(
            DyrectedFormProvider,
            { controller },
            React.createElement(Wrapped, { propA: 'test' })
          )
        )
      );
    });

    expect(capturedFormTitle).toBe('Hello World');
    expect(capturedNavigateResult).toBeDefined();
    expect(mockNotify.success).toHaveBeenCalledWith('Mounted');
    expect(mockAccess.can).toHaveBeenCalledWith('read', 'posts');
    expect(container.querySelector('#vue-child')?.textContent).toBe('Hello World');

    // Clean up
    await React.act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('updates Vue island when ambient context changes even if props are identical', async () => {
    const controller1 = createDyrectedFormController({
      initialValues: { title: 'First Controller' },
    });
    const controller2 = createDyrectedFormController({
      initialValues: { title: 'Second Controller' },
    });

    let renderCount = 0;
    const VueChild = defineComponent({
      name: 'VueChildWatcher',
      setup() {
        const form = useDyrectedForm();
        renderCount++;
        return () => h('div', { id: 'title-node' }, form.values.value?.title as string);
      },
    });

    const Wrapped = wrapVueComponent(VueChild);

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    // Initial render with controller1
    await React.act(async () => {
      root.render(
        React.createElement(
          DyrectedFormProvider,
          { controller: controller1 },
          React.createElement(Wrapped, { staticProp: 'same' })
        )
      );
    });

    expect(container.querySelector('#title-node')?.textContent).toBe('First Controller');
    const initialRenders = renderCount;

    // Re-render with controller2, keeping identical props
    await React.act(async () => {
      root.render(
        React.createElement(
          DyrectedFormProvider,
          { controller: controller2 },
          React.createElement(Wrapped, { staticProp: 'same' })
        )
      );
    });

    expect(container.querySelector('#title-node')?.textContent).toBe('Second Controller');
    expect(renderCount).toBeGreaterThan(initialRenders);

    // Clean up
    await React.act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('skips redundant render when both props and context are unchanged', async () => {
    const controller = createDyrectedFormController({
      initialValues: { title: 'Static' },
    });

    let setupCount = 0;
    const VueChild = defineComponent({
      name: 'VueChildStatic',
      setup() {
        setupCount++;
        return () => h('div', null, 'Rendered');
      },
    });

    const Wrapped = wrapVueComponent(VueChild);

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    // Initial render
    await React.act(async () => {
      root.render(
        React.createElement(
          DyrectedFormProvider,
          { controller },
          React.createElement(Wrapped, { id: 1, name: 'same' })
        )
      );
    });

    expect(setupCount).toBe(1);

    // Re-render with shallow-identical props and same controller
    await React.act(async () => {
      root.render(
        React.createElement(
          DyrectedFormProvider,
          { controller },
          React.createElement(Wrapped, { id: 1, name: 'same' })
        )
      );
    });

    // Setup should not have run again
    expect(setupCount).toBe(1);

    // Clean up
    await React.act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('preserves island state across prop updates (patches in place, no remount)', async () => {
    const controller = createDyrectedFormController({ initialValues: { title: 'x' } });
    let mounts = 0;
    const VueChild = defineComponent({
      name: 'StatefulChild',
      props: { label: { type: String, default: '' } },
      setup(p) {
        mounts++;
        return () => h('div', { id: 'label' }, p.label);
      },
    });
    const Wrapped = wrapVueComponent(VueChild);
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    const mount = (label: string) =>
      React.act(async () => {
        root.render(
          React.createElement(
            DyrectedFormProvider,
            { controller },
            React.createElement(Wrapped, { label })
          )
        );
      });

    await mount('a');
    await mount('b');
    await mount('c');

    expect(container.querySelector('#label')?.textContent).toBe('c');
    expect(mounts).toBe(1);

    await React.act(async () => {
      root.unmount();
    });
    container.remove();
  });

  it('forwards errors thrown inside a Vue island to the React error boundary', async () => {
    const Boom = defineComponent({
      name: 'Boom',
      setup() {
        throw new Error('island exploded');
      },
    });
    const Wrapped = wrapVueComponent(Boom);

    class Boundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
      state = { error: null as Error | null };
      static getDerivedStateFromError(error: Error) {
        return { error };
      }
      render() {
        return this.state.error
          ? React.createElement('p', { id: 'caught' }, this.state.error.message)
          : this.props.children;
      }
    }

    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await React.act(async () => {
      root.render(React.createElement(Boundary, null, React.createElement(Wrapped, {})));
    });

    expect(container.querySelector('#caught')?.textContent).toBe('island exploded');

    spy.mockRestore();
    await React.act(async () => {
      root.unmount();
    });
    container.remove();
  });
});
