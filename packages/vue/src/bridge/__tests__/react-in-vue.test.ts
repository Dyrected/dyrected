import { describe, it, expect } from 'vitest';
import { wrapComponents, wrapVueComponent } from '../react-in-vue';

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
