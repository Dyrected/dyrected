import { describe, expect, it, vi } from 'vitest';
import type { DyrectedConfig } from '../types/index.js';
import {
  buildInviteEmail,
  buildPasswordChangedEmail,
  buildResetPasswordEmail,
  buildWelcomeEmail,
} from '../services/email.service.js';

const config = {} as unknown as DyrectedConfig;

function getHtml(result: unknown): string {
  if (result && typeof result === "object" && "html" in result) {
    return (result as { html: string }).html;
  }
  throw new Error("Expected template result to contain html");
}

describe('default email templates', () => {
  it('uses one branded, table-based, inline-styled shell', () => {
    const messages = [
      buildWelcomeEmail(config, { email: 'person@example.com' }),
      buildInviteEmail(config, { token: 'invite-token' }),
      buildResetPasswordEmail(config, { token: 'reset-token', url: 'https://example.com/reset' }),
      buildPasswordChangedEmail(config, { email: 'person@example.com' }),
    ];

    for (const msg of messages) {
      const html = getHtml(msg);
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
    expect(getHtml(buildWelcomeEmail(config, { email: attack }))).not.toContain(attack);
    expect(getHtml(buildInviteEmail(config, { token: attack, invitedByEmail: attack }))).not.toContain(attack);
    expect(getHtml(buildResetPasswordEmail(config, { token: attack }))).not.toContain(attack);
    expect(getHtml(buildPasswordChangedEmail(config, { email: attack }))).not.toContain(attack);
  });

  it('only renders CTA links with an HTTP(S) URL', () => {
    const inviteWithUrl = getHtml(buildInviteEmail(config, { token: 'invite-token-secret', url: 'https://example.com/invite?a=1&b=2' }));
    expect(inviteWithUrl).toContain('href="https://example.com/invite?a=1&amp;b=2"');
    expect(inviteWithUrl).toContain('Invitation link');
    expect(inviteWithUrl).toContain('https://example.com/invite?a=1&amp;b=2');
    expect(inviteWithUrl).not.toContain('Invitation token');
    expect(inviteWithUrl).not.toContain('invite-token-secret');

    expect(getHtml(buildInviteEmail(config, { token: 'safe', url: 'javascript:alert(1)' })))
      .not.toContain('href=');
    const resetWithUrl = getHtml(buildResetPasswordEmail(config, { token: 'reset-token-secret', url: 'https://example.com/reset?a=1&b=2' }));
    expect(resetWithUrl).toContain('href="https://example.com/reset?a=1&amp;b=2"');
    expect(resetWithUrl).toContain('Reset link');
    expect(resetWithUrl).toContain('https://example.com/reset?a=1&amp;b=2');
    expect(resetWithUrl).not.toContain('Reset token');
    expect(resetWithUrl).not.toContain('Or use this token');
    expect(resetWithUrl).not.toContain('reset-token-secret');
    const resetWithoutUrl = getHtml(buildResetPasswordEmail(config, { token: 'reset-token-secret' }));
    expect(resetWithoutUrl).toContain('Reset token');
    expect(resetWithoutUrl).toContain('reset-token-secret');
    expect(getHtml(buildResetPasswordEmail(config, { token: 'safe', url: 'javascript:alert(1)' })))
      .not.toContain('href=');
  });

  it('continues to honor trusted custom templates', () => {
    const customConfig = {
      email: {
        from: 'test@example.com',
        send: vi.fn(),
        templates: { welcome: () => ({ subject: 'Custom', html: '<p>Custom</p>' }) },
      },
    } as unknown as DyrectedConfig;

    expect(buildWelcomeEmail(customConfig, { email: 'person@example.com' }))
      .toEqual({ subject: 'Custom', html: '<p>Custom</p>' });
  });

  it('prioritizes collection templates over global config templates', () => {
    const globalConfig = {
      email: {
        from: 'global@example.com',
        send: vi.fn(),
        templates: {
          invite: () => ({ subject: 'Global Invite', html: '<p>Global</p>' }),
        },
      },
    } as unknown as DyrectedConfig;

    const collection = {
      slug: 'investors',
      auth: {
        email: {
          templates: {
            invite: (args: any) => ({
              subject: `Investor Invite for ${args.siteName}`,
              html: `<p>Welcome Investor, token is ${args.token}</p>`,
            }),
          },
        },
      },
    } as any;

    const result = buildInviteEmail(globalConfig, { token: 'tok_123' }, collection);
    expect(result).toEqual({
      subject: 'Investor Invite for Dyrected',
      html: '<p>Welcome Investor, token is tok_123</p>',
    });
  });

  it('prioritizes database templates over collection and global templates', async () => {
    const { InMemoryAdapter } = await import('./mocks.js');
    const { resolveEmailTemplate } = await import('../services/email.service.js');
    const db = new InMemoryAdapter();

    db.seed('__email_templates', [
      {
        id: 'tmpl_1',
        collectionSlug: 'investors',
        purpose: 'invite',
        active: true,
        subject: 'DB Override: Join {{siteName}}',
        rawHtml: '<h1>Welcome {{user.firstName}}</h1><p>Link: {{url}}</p>',
      },
    ]);

    const globalConfig = {
      email: {
        from: 'global@example.com',
        send: vi.fn(),
        templates: {
          invite: () => ({ subject: 'Global Invite', html: '<p>Global</p>' }),
        },
      },
    } as unknown as DyrectedConfig;

    const collection = {
      slug: 'investors',
      auth: {
        email: {
          templates: {
            invite: () => ({ subject: 'Collection Invite', html: '<p>Collection</p>' }),
          },
        },
      },
    } as any;

    const result = await resolveEmailTemplate({
      config: globalConfig,
      collection,
      purpose: 'invite',
      args: {
        token: 'tok_abc',
        url: 'https://invest.app/accept?token=tok_abc',
        user: { firstName: 'Jane' },
      },
      db,
    });

    expect(result).toEqual({
      subject: 'DB Override: Join Dyrected',
      html: '<h1>Welcome Jane</h1><p>Link: https://invest.app/accept?token=tok_abc</p>',
    });
  });

  it('supports external provider templates (numeric ID or string alias) with variables', async () => {
    const { sendEmail } = await import('../services/email.service.js');
    const sendSpy = vi.fn().mockResolvedValue(undefined);

    const configWithSend = {
      email: {
        from: 'notifications@myapp.com',
        send: sendSpy,
      },
    } as unknown as DyrectedConfig;

    // Numeric template ID (e.g. Seamailer 821354)
    await sendEmail(configWithSend, {
      to: 'investor@example.com',
      type: 'template',
      template: 821354,
      variables: {
        firstName: 'Jane',
        setupUrl: 'https://invest.app/setup?token=xyz',
      },
    });

    expect(sendSpy).toHaveBeenCalledWith({
      to: 'investor@example.com',
      type: 'template',
      template: 821354,
      variables: {
        firstName: 'Jane',
        setupUrl: 'https://invest.app/setup?token=xyz',
      },
    });

    // String alias template ID (e.g. Postmark "user-invitation")
    await sendEmail(configWithSend, {
      to: 'investor2@example.com',
      type: 'template',
      template: 'user-invitation',
      variables: { token: 'abc' },
      subject: 'Custom Subject Override',
    });

    expect(sendSpy).toHaveBeenCalledWith({
      to: 'investor2@example.com',
      type: 'template',
      template: 'user-invitation',
      variables: { token: 'abc' },
      subject: 'Custom Subject Override',
    });
  });
});
