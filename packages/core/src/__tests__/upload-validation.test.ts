import { describe, it, expect } from 'vitest';
import { isMimeAllowed, validateUpload } from '../utils/upload-validation.js';

describe('isMimeAllowed', () => {
  it('matches exact mime types (case-insensitive)', () => {
    expect(isMimeAllowed('image/png', ['image/png'])).toBe(true);
    expect(isMimeAllowed('IMAGE/PNG', ['image/png'])).toBe(true);
    expect(isMimeAllowed('image/gif', ['image/png'])).toBe(false);
  });

  it('supports type/* wildcards', () => {
    expect(isMimeAllowed('image/webp', ['image/*'])).toBe(true);
    expect(isMimeAllowed('video/mp4', ['image/*'])).toBe(false);
  });

  it('supports full wildcards', () => {
    expect(isMimeAllowed('application/zip', ['*'])).toBe(true);
    expect(isMimeAllowed('application/zip', ['*/*'])).toBe(true);
  });
});

describe('validateUpload', () => {
  it('allows anything when no config is set', () => {
    expect(validateUpload({ type: 'application/x-msdownload', size: 999 }, undefined)).toBeNull();
  });

  it('rejects disallowed mime types with 415', () => {
    const err = validateUpload({ type: 'image/svg+xml', size: 10 }, { allowedMimeTypes: ['image/png', 'image/jpeg'] });
    expect(err?.status).toBe(415);
  });

  it('allows permitted mime types', () => {
    expect(validateUpload({ type: 'image/png', size: 10 }, { allowedMimeTypes: ['image/*'] })).toBeNull();
  });

  it('rejects oversized files with 413', () => {
    const err = validateUpload({ type: 'image/png', size: 5_000 }, { maxFileSize: 1_000 });
    expect(err?.status).toBe(413);
  });

  it('allows files within the size limit', () => {
    expect(validateUpload({ type: 'image/png', size: 500 }, { maxFileSize: 1_000 })).toBeNull();
  });

  it('checks mime type before size', () => {
    const err = validateUpload({ type: 'text/plain', size: 5_000 }, { allowedMimeTypes: ['image/*'], maxFileSize: 1_000 });
    expect(err?.status).toBe(415);
  });
});
