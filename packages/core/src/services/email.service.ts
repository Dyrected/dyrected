import type { DyrectedConfig } from '../types/index.js';
import { alertBox, ctaButton, detailBox, layout, paragraph, sectionLabel, spacer } from './email-template.js';

type SendFn = (args: { to: string; subject: string; html: string }) => Promise<void>;

// Lazy Ethereal singleton — created once on first send in dev
let _devSend: SendFn | null = null;
let _devSendPromise: Promise<SendFn | null> | null = null;

async function getDevSend(): Promise<SendFn | null> {
  if (_devSend) return _devSend;
  if (_devSendPromise) return _devSendPromise;

  _devSendPromise = (async () => {
    try {
      const nodemailer = await import('nodemailer');
      const account = await nodemailer.default.createTestAccount();
      const transport = nodemailer.default.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        auth: { user: account.user, pass: account.pass },
      });

      console.log('[dyrected/core] No email config — using Ethereal for dev email preview.');
      console.log(`[dyrected/core] Ethereal login: https://ethereal.email  user: ${account.user}  pass: ${account.pass}`);

      _devSend = async ({ to, subject, html }) => {
        const info = await transport.sendMail({ from: '"Dyrected Dev" <dev@dyrected.local>', to, subject, html });
        console.log(`[dyrected/core] Email preview URL: ${nodemailer.default.getTestMessageUrl(info)}`);
      };
      return _devSend;
    } catch {
      console.warn('[dyrected/core] nodemailer not available — emails will not be sent in dev.');
      return null;
    }
  })();

  return _devSendPromise;
}

export async function sendEmail(
  config: DyrectedConfig,
  payload: { to: string; subject: string; html: string },
): Promise<void> {
  if (config.email) {
    await config.email.send(payload);
    return;
  }
  if (process.env.NODE_ENV !== 'production') {
    const devSend = await getDevSend();
    await devSend?.(payload);
  }
}

// ---------------------------------------------------------------------------
// Default email templates
// ---------------------------------------------------------------------------

export function buildWelcomeEmail(
  config: DyrectedConfig,
  args: { email: string },
): { subject: string; html: string } {
  const custom = config.email?.templates?.welcome?.(args);
  return {
    subject: custom?.subject ?? 'Welcome — your account is ready',
    html: custom?.html ?? layout({
      preheader: 'Your Dyrected account is ready.',
      title: 'Welcome — your account is ready',
      content: `${paragraph('Your account has been created. You can now log in with:')}${detailBox(args.email)}`,
      footer: "If you didn't create this account, you can safely ignore this email.",
    }),
  };
}

export function buildInviteEmail(
  config: DyrectedConfig,
  args: { token: string; invitedByEmail?: string },
): { subject: string; html: string } {
  const custom = config.email?.templates?.invite?.(args);
  return {
    subject: custom?.subject ?? "You've been invited",
    html: custom?.html ?? layout({
      preheader: "You've been invited to join a Dyrected account.",
      title: "You've been invited",
      content: `${args.invitedByEmail ? paragraph(`You were invited by ${args.invitedByEmail}.`) : ''}${paragraph('Use the token below to accept your invitation. It expires in 7 days.')}${sectionLabel('Invitation token')}${detailBox(args.token, true)}`,
      footer: "If you weren't expecting this invitation, you can safely ignore this email.",
    }),
  };
}

export function buildResetPasswordEmail(
  config: DyrectedConfig,
  args: { token: string; url?: string },
): { subject: string; html: string } {
  const custom = config.email?.templates?.resetPassword?.(args);
  const resetLink = args.url;
  return {
    subject: custom?.subject ?? 'Reset your password',
    html: custom?.html ?? layout({
      preheader: 'Reset your Dyrected password.',
      title: 'Reset your password',
      content: `${paragraph('We received a request to reset your password. The reset link and token expire in 1 hour.')}${resetLink ? ctaButton('Reset password', resetLink) : ''}${sectionLabel(resetLink ? 'Or use this token' : 'Reset token')}${detailBox(args.token, true)}`,
      footer: "If you didn't request a password reset, you can safely ignore this email.",
    }),
  };
}

export function buildPasswordChangedEmail(
  config: DyrectedConfig,
  args: { email: string },
): { subject: string; html: string } {
  const custom = config.email?.templates?.passwordChanged?.(args);
  return {
    subject: custom?.subject ?? 'Your password has been changed',
    html: custom?.html ?? layout({
      preheader: 'Your Dyrected password was changed.',
      title: 'Password changed',
      content: `${paragraph('The password for this account was just changed:')}${detailBox(args.email)}${spacer()}${alertBox('If you did not make this change, please contact support immediately.')}`,
      footer: 'This is an automated security notification.',
    }),
  };
}
