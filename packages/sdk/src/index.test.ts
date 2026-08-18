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

  it('applies configured defaultDepth when a read omits depth', async () => {
    const customClient = new DyrectedClient({
      baseUrl: 'http://api.test',
      fetch: mockFetch as any,
      defaultDepth: 2,
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ docs: [], total: 0 }),
    });

    await customClient.find('posts');

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('depth=2');
  });

  it('defaults depth to 1 when neither a call nor config sets it', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ docs: [], total: 0 }),
    });

    await client.find('posts');

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('depth=1');
  });

  it('lets a per-call depth of 0 override defaultDepth', async () => {
    const customClient = new DyrectedClient({
      baseUrl: 'http://api.test',
      fetch: mockFetch as any,
      defaultDepth: 2,
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ docs: [], total: 0 }),
    });

    await customClient.find('posts', { depth: 0 });

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain('depth=0');
    expect(url).not.toContain('depth=2');
  });

  it('sends POST /api/collections/:slug/aggregate with serialized aggregate input', async () => {
    const expectedResponse = {
      total: 42,
      totalScore: 150.5,
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(expectedResponse),
    });

    const result = await client.collection('posts').aggregate({
      total: { count: '*' },
      totalScore: { sum: 'score', cast: 'number', where: { published: { equals: true } } },
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe('http://api.test/api/collections/posts/aggregate');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({
      total: { count: '*' },
      totalScore: { sum: 'score', cast: 'number', where: { published: { equals: true } } },
    });
    expect(result).toEqual(expectedResponse);
  });
});
