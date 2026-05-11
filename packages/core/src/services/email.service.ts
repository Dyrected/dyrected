import type { DyrectedConfig } from '../types/index.js';

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
    html: custom?.html ?? `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2>Welcome!</h2>
        <p>Your account has been created. You can now log in with:</p>
        <p><strong>${args.email}</strong></p>
      </div>`,
  };
}

export function buildInviteEmail(
  config: DyrectedConfig,
  args: { token: string; invitedByEmail?: string },
): { subject: string; html: string } {
  const custom = config.email?.templates?.invite?.(args);
  return {
    subject: custom?.subject ?? "You've been invited",
    html: custom?.html ?? `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2>You've been invited</h2>
        ${args.invitedByEmail ? `<p>Invited by <strong>${args.invitedByEmail}</strong>.</p>` : ''}
        <p>Use the token below to accept your invitation. It expires in 7 days.</p>
        <pre style="background:#f4f4f4;padding:12px;border-radius:4px;word-break:break-all">${args.token}</pre>
      </div>`,
  };
}

export function buildResetPasswordEmail(
  config: DyrectedConfig,
  args: { token: string },
): { subject: string; html: string } {
  const custom = config.email?.templates?.resetPassword?.(args);
  return {
    subject: custom?.subject ?? 'Reset your password',
    html: custom?.html ?? `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2>Reset your password</h2>
        <p>Use the token below to reset your password. It expires in 1 hour.</p>
        <pre style="background:#f4f4f4;padding:12px;border-radius:4px;word-break:break-all">${args.token}</pre>
      </div>`,
  };
}

export function buildPasswordChangedEmail(
  config: DyrectedConfig,
  args: { email: string },
): { subject: string; html: string } {
  const custom = config.email?.templates?.passwordChanged?.(args);
  return {
    subject: custom?.subject ?? 'Your password has been changed',
    html: custom?.html ?? `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2>Password changed</h2>
        <p>The password for <strong>${args.email}</strong> was just changed.</p>
        <p>If you did not make this change, please contact support immediately.</p>
      </div>`,
  };
}
