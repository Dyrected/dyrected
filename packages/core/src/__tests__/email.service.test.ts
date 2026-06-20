import { describe, expect, it, vi } from 'vitest';
import type { DyrectedConfig } from '../types/index.js';
import {
  buildInviteEmail,
  buildPasswordChangedEmail,
  buildResetPasswordEmail,
  buildWelcomeEmail,
} from '../services/email.service.js';

const config = {} as DyrectedConfig;

describe('default email templates', () => {
  it('uses one branded, table-based, inline-styled shell', () => {
    const messages = [
      buildWelcomeEmail(config, { email: 'person@example.com' }),
      buildInviteEmail(config, { token: 'invite-token' }),
      buildResetPasswordEmail(config, { token: 'reset-token', url: 'https://example.com/reset' }),
      buildPasswordChangedEmail(config, { email: 'person@example.com' }),
    ];

    for (const { html } of messages) {
      expect(html).toContain('<!doctype html>');
      expect(html).toContain('role="presentation"');
      expect(html).toContain('max-width:600px');
      expect(html).toContain('Dyrected');
      expect(html).toContain('Privacy:');
      expect(html).not.toContain('<style');
    }
  });

  it('escapes all values supplied to default templates', () => {
    const attack = '<img src=x onerror="alert(1)">&\'';
    expect(buildWelcomeEmail(config, { email: attack }).html).not.toContain(attack);
    expect(buildInviteEmail(config, { token: attack, invitedByEmail: attack }).html).not.toContain(attack);
    expect(buildResetPasswordEmail(config, { token: attack }).html).not.toContain(attack);
    expect(buildPasswordChangedEmail(config, { email: attack }).html).not.toContain(attack);
  });

  it('only renders CTA links with an HTTP(S) URL', () => {
    expect(buildResetPasswordEmail(config, { token: 'safe', url: 'https://example.com/reset?a=1&b=2' }).html)
      .toContain('href="https://example.com/reset?a=1&amp;b=2"');
    expect(buildResetPasswordEmail(config, { token: 'safe', url: 'javascript:alert(1)' }).html)
      .not.toContain('href=');
  });

  it('continues to honor trusted custom templates', () => {
    const customConfig = {
      email: {
        from: 'test@example.com',
        send: vi.fn(),
        templates: { welcome: () => ({ subject: 'Custom', html: '<p>Custom</p>' }) },
      },
    } as DyrectedConfig;

    expect(buildWelcomeEmail(customConfig, { email: 'person@example.com' }))
      .toEqual({ subject: 'Custom', html: '<p>Custom</p>' });
  });
});
