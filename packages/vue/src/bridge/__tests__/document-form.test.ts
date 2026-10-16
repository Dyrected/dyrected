import { describe, it, expect, vi, afterEach } from 'vitest';
import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { h, defineComponent, ref, nextTick } from 'vue';
import { createDyrectedFormController, DyrectedFormProvider, DocumentContext, type DocumentContextValue } from '@dyrected/admin/public';

vi.mock('@dyrected/admin/public', async (importOriginal) => {
  const original = await importOriginal<typeof import('@dyrected/admin/public')>();
  return {
    ...original,
    // Stand-ins for the admin's built-in inputs, so the test checks the portal, not the form engine.
    DyrectedField: (props: { path: string }) =>
      React.createElement('span', { 'data-testid': 'react-field' }, `field:${props.path}`),
    DyrectedFields: () => React.createElement('span', { 'data-testid': 'react-fields' }),
    DyrectedDefaultForm: () => React.createElement('span', { 'data-testid': 'react-default' }),
  };
});

const { wrapVueComponent } = await import('../react-in-vue.js');
const { useDocumentForm } = await import('../../composables/useDocumentForm.js');
const { DyrectedField } = await import('../../components/DocumentFields.js');

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

function context(overrides: Partial<DocumentContextValue> = {}): DocumentContextValue {
  return {
    mode: 'create',
    collection: { slug: 'check_ins' },
    document: undefined,
    isLoadingDocument: false,
    presentation: 'page',
    permissions: { canCreate: true, canUpdate: true, canDelete: false },
    urls: { list: '/collections/check_ins' },
    submit: vi.fn().mockResolvedValue({ ok: true, doc: { id: '1' } }),
    cancel: vi.fn(),
    ...overrides,
  };
}

let root: Root | null = null;
let container: HTMLElement | null = null;

function mount(el: React.ReactElement) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(el));
  return container;
}

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  root = null;
  container = null;
});

const tick = async () => {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
    await nextTick();
  });
};

describe('useDocumentForm in a Vue island', () => {
  it('works with no manual provide and stays reactive as the document loads', async () => {
    const seen: string[] = [];
    const Form = defineComponent({
      setup() {
        const api = useDocumentForm();
        return () => {
          seen.push(`${api.mode.value}:${api.document.value?.name ?? 'none'}:${api.permissions.value.canUpdate}`);
          return h('button', { onClick: () => api.submit({ redirect: 'stay' }) }, 'save');
        };
      },
    });
    const Wrapped = wrapVueComponent(Form);
    const controller = createDyrectedFormController({ collection: 'check_ins', fields: [] } as any);
    const submit = vi.fn().mockResolvedValue({ ok: true, doc: { id: '1' } });

    const tree = (value: DocumentContextValue) =>
      React.createElement(
        DocumentContext.Provider,
        { value },
        React.createElement(DyrectedFormProvider, { controller }, React.createElement(Wrapped)),
      );

    const host = mount(tree(context({ submit })));
    await tick();
    expect(seen.at(-1)).toBe('create:none:true');

    act(() => root!.render(tree(context({ mode: 'edit', document: { name: 'Ada' }, submit, permissions: { canCreate: false, canUpdate: false, canDelete: false } }))));
    await tick();
    expect(seen.at(-1)).toBe('edit:Ada:false');

    host.querySelector('button')!.click();
    expect(submit).toHaveBeenCalledWith({ redirect: 'stay' });
  });

  it('throws a clear error outside a custom form', () => {
    const Bad = defineComponent({
      setup() {
        useDocumentForm();
        return () => null;
      },
    });
    const errors: unknown[] = [];
    const Wrapped = wrapVueComponent(Bad);
    class Boundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
      state = { error: null as Error | null };
      static getDerivedStateFromError(error: Error) { return { error }; }
      componentDidCatch(e: Error) { errors.push(e); }
      render() { return this.state.error ? React.createElement('p', null, this.state.error.message) : this.props.children; }
    }
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const host = mount(React.createElement(Boundary, null, React.createElement(Wrapped)));
    return tick().then(() => {
      expect(host.textContent).toContain('useDocumentForm() can only be used');
    });
  });
});

describe('built-in form pieces in a Vue island', () => {
  it('renders the React field inside the island and updates and unmounts with it', async () => {
    const path = ref('name');
    const show = ref(true);
    const Form = defineComponent({
      setup() {
        return () => (show.value ? h('section', null, [h(DyrectedField, { path: path.value })]) : h('section'));
      },
    });
    const Wrapped = wrapVueComponent(Form);
    const controller = createDyrectedFormController({ collection: 'check_ins', fields: [] } as any);

    const host = mount(
      React.createElement(DyrectedFormProvider, { controller }, React.createElement(Wrapped)),
    );
    await tick();
    const field = () => host.querySelector('[data-testid="react-field"]');
    expect(field()?.textContent).toBe('field:name');
    // It renders inside the Vue-owned placeholder, not beside the island.
    expect(field()?.closest('section')).not.toBeNull();

    path.value = 'rsvp';
    await tick();
    expect(field()?.textContent).toBe('field:rsvp');

    show.value = false;
    await tick();
    expect(field()).toBeNull();
  });
});
