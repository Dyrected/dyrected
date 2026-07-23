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
      expect(html).toContain('<meta http-equiv="Content-Type" content="text/html; charset=utf-8">');
      expect(html).toContain('<meta name="x-apple-disable-message-reformatting">');
      expect(html).toContain('<title>');
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
    const inviteWithUrl = buildInviteEmail(config, { token: 'invite-token-secret', url: 'https://example.com/invite?a=1&b=2' }).html;
    expect(inviteWithUrl).toContain('href="https://example.com/invite?a=1&amp;b=2"');
    expect(inviteWithUrl).toContain('Invitation link');
    expect(inviteWithUrl).toContain('https://example.com/invite?a=1&amp;b=2');
    expect(inviteWithUrl).not.toContain('Invitation token');
    expect(inviteWithUrl).not.toContain('invite-token-secret');

    expect(buildInviteEmail(config, { token: 'safe', url: 'javascript:alert(1)' }).html)
      .not.toContain('href=');
    const resetWithUrl = buildResetPasswordEmail(config, { token: 'reset-token-secret', url: 'https://example.com/reset?a=1&b=2' }).html;
    expect(resetWithUrl).toContain('href="https://example.com/reset?a=1&amp;b=2"');
    expect(resetWithUrl).toContain('Reset link');
    expect(resetWithUrl).toContain('https://example.com/reset?a=1&amp;b=2');
    expect(resetWithUrl).not.toContain('Reset token');
    expect(resetWithUrl).not.toContain('Or use this token');
    expect(resetWithUrl).not.toContain('reset-token-secret');
    const resetWithoutUrl = buildResetPasswordEmail(config, { token: 'reset-token-secret' }).html;
    expect(resetWithoutUrl).toContain('Reset token');
    expect(resetWithoutUrl).toContain('reset-token-secret');
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
