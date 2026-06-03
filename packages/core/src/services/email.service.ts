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
      <table cellpadding="0" cellspacing="0" border="0" style="width:100%;background-color:#f9fafb;table-layout:fixed">
        <tr>
          <td align="center" style="padding:40px 16px">
            <table cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background-color:#ffffff;border-radius:12px;border:1px solid #e5e7eb;table-layout:fixed">
              <tr>
                <td style="padding:32px 32px 0">
                  <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#6b7280;font-family:sans-serif;text-transform:uppercase;letter-spacing:0.05em">Dyrected</p>
                  <h1 style="margin:0 0 24px;font-size:22px;font-weight:700;color:#111827;font-family:sans-serif">Welcome!</h1>
                </td>
              </tr>
              <tr>
                <td style="padding:0 32px">
                  <p style="margin:0 0 12px;font-size:14px;color:#4b5563;line-height:1.6;font-family:sans-serif">Your account has been created. You can now log in with:</p>
                  <table cellpadding="0" cellspacing="0" border="0" style="width:100%;background-color:#f3f4f6;border-radius:6px;table-layout:fixed">
                    <tr>
                      <td style="padding:12px 16px;font-size:14px;font-weight:600;color:#111827;font-family:sans-serif;word-break:break-all">
                        ${args.email}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:32px">
                  <p style="margin:0;font-size:12px;color:#9ca3af;font-family:sans-serif">If you didn't create this account, you can safely ignore this email.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>`,
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
      <table cellpadding="0" cellspacing="0" border="0" style="width:100%;background-color:#f9fafb;table-layout:fixed">
        <tr>
          <td align="center" style="padding:40px 16px">
            <table cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background-color:#ffffff;border-radius:12px;border:1px solid #e5e7eb;table-layout:fixed">
              <tr>
                <td style="padding:32px 32px 0">
                  <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#6b7280;font-family:sans-serif;text-transform:uppercase;letter-spacing:0.05em">Dyrected</p>
                  <h1 style="margin:0 0 24px;font-size:22px;font-weight:700;color:#111827;font-family:sans-serif">You've been invited</h1>
                </td>
              </tr>
              <tr>
                <td style="padding:0 32px">
                  ${args.invitedByEmail ? `<p style="margin:0 0 12px;font-size:14px;color:#4b5563;line-height:1.6;font-family:sans-serif">You were invited by <strong style="color:#111827">${args.invitedByEmail}</strong>.</p>` : ''}
                  <p style="margin:0 0 16px;font-size:14px;color:#4b5563;line-height:1.6;font-family:sans-serif">Use the token below to accept your invitation. It expires in 7 days.</p>
                  <table cellpadding="0" cellspacing="0" border="0" style="width:100%;background-color:#f3f4f6;border-radius:6px;table-layout:fixed">
                    <tr>
                      <td style="padding:12px 16px;font-family:monospace;font-size:12px;color:#374151;word-break:break-all;white-space:normal;line-height:1.4">
                        ${args.token}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:32px">
                  <p style="margin:0;font-size:12px;color:#9ca3af;font-family:sans-serif">If you weren't expecting this invitation, you can safely ignore this email.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>`,
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
    html: custom?.html ?? `
      <table cellpadding="0" cellspacing="0" border="0" style="width:100%;background-color:#f9fafb;table-layout:fixed">
        <tr>
          <td align="center" style="padding:40px 16px">
            <table cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background-color:#ffffff;border-radius:12px;border:1px solid #e5e7eb;table-layout:fixed">
              <tr>
                <td style="padding:32px 32px 0">
                  <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#6b7280;font-family:sans-serif;text-transform:uppercase;letter-spacing:0.05em">Dyrected</p>
                  <h1 style="margin:0 0 24px;font-size:22px;font-weight:700;color:#111827;font-family:sans-serif">Reset your password</h1>
                </td>
              </tr>
              <tr>
                <td style="padding:0 32px">
                  <p style="margin:0 0 24px;font-size:14px;color:#4b5563;line-height:1.6;font-family:sans-serif">We received a request to reset your password. Use the button below to set a new password. It will expire in 1 hour.</p>
                  ${resetLink ? `
                  <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px">
                    <tr>
                      <td style="border-radius:6px;background-color:#111827">
                        <a href="${resetLink}" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;font-family:sans-serif;border-radius:6px">
                          Reset Password
                        </a>
                      </td>
                    </tr>
                  </table>
                  ` : ''}
                  <p style="margin:0 0 8px;font-size:12px;color:#9ca3af;font-family:sans-serif">Or copy and paste this token manually in the admin dashboard:</p>
                  <table cellpadding="0" cellspacing="0" border="0" style="width:100%;background-color:#f3f4f6;border-radius:6px;table-layout:fixed">
                    <tr>
                      <td style="padding:12px 16px;font-family:monospace;font-size:12px;color:#374151;word-break:break-all;white-space:normal;line-height:1.4">
                        ${args.token}
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:32px">
                  <p style="margin:0;font-size:12px;color:#9ca3af;font-family:sans-serif">If you didn't request a password reset, you can safely ignore this email.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>`,
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
      <table cellpadding="0" cellspacing="0" border="0" style="width:100%;background-color:#f9fafb;table-layout:fixed">
        <tr>
          <td align="center" style="padding:40px 16px">
            <table cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background-color:#ffffff;border-radius:12px;border:1px solid #e5e7eb;table-layout:fixed">
              <tr>
                <td style="padding:32px 32px 0">
                  <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#6b7280;font-family:sans-serif;text-transform:uppercase;letter-spacing:0.05em">Dyrected</p>
                  <h1 style="margin:0 0 24px;font-size:22px;font-weight:700;color:#111827;font-family:sans-serif">Password changed</h1>
                </td>
              </tr>
              <tr>
                <td style="padding:0 32px">
                  <p style="margin:0 0 12px;font-size:14px;color:#4b5563;line-height:1.6;font-family:sans-serif">The password for your account was just changed:</p>
                  <table cellpadding="0" cellspacing="0" border="0" style="width:100%;background-color:#f3f4f6;border-radius:6px;table-layout:fixed">
                    <tr>
                      <td style="padding:12px 16px;font-size:14px;font-weight:600;color:#111827;font-family:sans-serif;word-break:break-all">
                        ${args.email}
                      </td>
                    </tr>
                  </table>
                  <table cellpadding="0" cellspacing="0" border="0" style="width:100%;margin-top:16px;background-color:#fef2f2;border-radius:6px;border:1px solid #fecaca;table-layout:fixed">
                    <tr>
                      <td style="padding:12px 16px;font-size:13px;color:#b91c1c;line-height:1.5;font-family:sans-serif">
                        If you did not make this change, please contact support immediately.
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:32px">
                  <p style="margin:0;font-size:12px;color:#9ca3af;font-family:sans-serif">This is an automated security notification.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>`,
  };
}
