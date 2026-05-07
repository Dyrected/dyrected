import { describe, it, expect } from 'vitest';
import { createDyrectedApp } from '../app.js';
import { defineConfig } from '../index.js';
import { MockDatabaseAdapter } from './mocks.js';

describe('App Shell', () => {
  const config = defineConfig({
    collections: [],
    globals: [],
    db: new MockDatabaseAdapter(),
  });

  it('should respond to health check', async () => {
    const app = createDyrectedApp(config);
    const res = await app.request('/health');
    
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok', version: '0.0.1' });
  });

  it('should set configuration in context', async () => {
    const app = createDyrectedApp(config);
    
    app.get('/test-ctx', (c) => {
      const cfg = c.get('config');
      return c.json({ hasConfig: !!cfg });
    });

    const res = await app.request('/test-ctx');
    expect(await res.json()).toEqual({ hasConfig: true });
  });
});
