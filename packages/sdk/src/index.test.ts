import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DyrectedClient } from './index.js';

describe('DyrectedClient', () => {
  let client: DyrectedClient;
  const mockFetch = vi.fn();

  beforeEach(() => {
    mockFetch.mockReset();
    client = new DyrectedClient({
      baseUrl: 'http://api.test',
      fetch: mockFetch as any,
    });
  });

  it('should include depth in find queries', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ docs: [], total: 0 }),
    });

    await client.find('posts', { depth: 2 });

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('depth=2');
  });

  it('should include depth in findOne queries', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: '1' }),
    });

    await client.findOne('posts', '1', { depth: 3 });

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('depth=3');
  });

  it('should include depth in getGlobal queries', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ siteName: 'Test' }),
    });

    await client.getGlobal('settings', { depth: 5 });

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('depth=5');
  });
});
