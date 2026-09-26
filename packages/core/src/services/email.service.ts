import type {
  DyrectedConfig,
  CollectionConfig,
  EmailTemplateArgs,
  EmailTemplateResult,
  OutboundEmail,
} from "../types/index.js";
import {
  alertBox,
  ctaButton,
  detailBox,
  layout,
  paragraph,
  safeLinkDetailBox,
  sectionLabel,
  spacer,
} from "./email-template.js";
import { getConfigLogger, getObservabilityRuntime } from "../observability.js";

type SendFn = (args: { to: string; subject: string; html: string }) => Promise<void>;

// Lazy Ethereal singleton — created once on first send in dev
let _devSend: SendFn | null = null;
let _devSendPromise: Promise<SendFn | null> | null = null;

async function getDevSend(): Promise<SendFn | null> {
  if (_devSend) return _devSend;
  if (_devSendPromise) return _devSendPromise;

  _devSendPromise = (async () => {
    const logger = getConfigLogger(undefined, "email");
    try {
      const nodemailer = await import("nodemailer");
      const account = await nodemailer.default.createTestAccount();
      const transport = nodemailer.default.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        auth: { user: account.user, pass: account.pass },
      });

      logger.info({
        msg: "No email config; using Ethereal for development email preview",
      });
      logger.info({
        msg: "Ethereal credentials",
        loginUrl: "https://ethereal.email",
        user: account.user,
        password: account.pass,
      });

      _devSend = async ({ to, subject, html }) => {
        const info = await transport.sendMail({
          from: '"Dyrected Dev" <dev@dyrected.local>',
          to,
          subject,
          html,
        });
        logger.info({
          msg: "Email preview URL",
          previewUrl: nodemailer.default.getTestMessageUrl(info),
        });
      };
      return _devSend;
    } catch {
      logger.warn({
        msg: "nodemailer not available; development emails will not be sent",
      });
      return null;
    }
  })();

  return _devSendPromise;
}

export async function sendEmail(
  config: DyrectedConfig,
  payload: OutboundEmail,
): Promise<void> {
  const logger = getConfigLogger(config, "email");
  const observability = getObservabilityRuntime(config);
  if (config.email) {
    try {
      await config.email.send(payload);
    } catch (err) {
      observability?.recordEmailSendFailure({
        to: payload.to,
      });
      logger.error({
        err,
        msg: "Email provider send failed",
        to: payload.to,
        subject: "subject" in payload ? payload.subject : undefined,
        template: "template" in payload ? payload.template : undefined,
      });
      throw err;
    }
    return;
  }
  if (process.env.NODE_ENV !== "production") {
    const devSend = await getDevSend();
    if (devSend) {
      if ("template" in payload && payload.template) {
        const devHtml = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h3 style="margin-top:0; color: #1e293b;">External Template Email (Dev Preview)</h3>
            <p><strong>To:</strong> ${payload.to}</p>
            <p><strong>Template ID:</strong> <code>${payload.template}</code></p>
            ${payload.subject ? `<p><strong>Subject:</strong> ${payload.subject}</p>` : ""}
            <p><strong>Variables:</strong></p>
            <pre style="background: #f8fafc; padding: 12px; border-radius: 6px; overflow-x: auto;">${JSON.stringify(payload.variables, null, 2)}</pre>
          </div>
        `;
        await devSend({
          to: payload.to,
          subject: payload.subject ?? `[Template: ${payload.template}] External Email`,
          html: devHtml,
        });
      } else if ("html" in payload) {
        await devSend({
          to: payload.to,
          subject: payload.subject,
          html: payload.html,
        });
      }
    }
  }
}

/**
 * Interpolate simple {{key}} or {{object.nestedKey}} placeholders inside template strings.
 */
export function interpolateVariables(
  str: string,
  args: Record<string, unknown>,
): string {
  if (!str || typeof str !== "string") return str;
  return str.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, path) => {
    const parts = path.split(".");
    let val: any = args;
    for (const part of parts) {
      if (val == null) break;
      val = val[part];
    }
    return val !== undefined && val !== null ? String(val) : "";
  });
}

function formatDbTemplateDoc(
  doc: Record<string, unknown>,
  args: Record<string, unknown>,
): EmailTemplateResult {
  if (doc.format === "external_template" || doc.externalTemplateId) {
    const rawVars =
      doc.variables && typeof doc.variables === "object"
        ? (doc.variables as Record<string, unknown>)
        : {};
    const interpolatedVars: Record<string, unknown> = { ...args };
    for (const [key, val] of Object.entries(rawVars)) {
      if (typeof val === "string") {
        interpolatedVars[key] = interpolateVariables(val, args);
      } else {
        interpolatedVars[key] = val;
      }
    }
    return {
      template: (doc.externalTemplateId as string | number) ?? "",
      variables: interpolatedVars,
      ...(doc.subject
        ? { subject: interpolateVariables(doc.subject as string, args) }
        : {}),
    };
  }

  return {
    subject: interpolateVariables((doc.subject as string) || "", args),
    html: interpolateVariables((doc.rawHtml as string) || "", args),
  };
}

export async function getDbEmailTemplateOverride(
  db: any,
  collectionSlug: string | undefined,
  purpose: string,
  args: Record<string, unknown>,
): Promise<EmailTemplateResult | null> {
  if (!db || typeof db.find !== "function") return null;

  try {
    if (collectionSlug) {
      const specific = await db.find({
        collection: "__email_templates",
        where: {
          collectionSlug,
          purpose,
          active: true,
        },
        limit: 1,
      });
      const doc = specific?.docs?.[0];
      if (doc) {
        return formatDbTemplateDoc(doc, args);
      }
    }

    const global = await db.find({
      collection: "__email_templates",
      where: {
        collectionSlug: "*",
        purpose,
        active: true,
      },
      limit: 1,
    });
    const doc = global?.docs?.[0];
    if (doc) {
      return formatDbTemplateDoc(doc, args);
    }
  } catch {
    // If collection __email_templates does not exist yet or query fails, fall back cleanly
    return null;
  }

  return null;
}

function enrichArgs<T extends Record<string, unknown>>(
  config: DyrectedConfig,
  collection: CollectionConfig | undefined,
  args: T,
): EmailTemplateArgs<T> {
  return {
    ...args,
    collection: collection?.slug,
    collectionLabel: collection?.labels,
    siteName: config.admin?.siteName ?? "Dyrected",
  };
}

// ---------------------------------------------------------------------------
// Email template builders with cascade resolution
// ---------------------------------------------------------------------------

export function buildWelcomeEmail(
  config: DyrectedConfig,
  args: EmailTemplateArgs<{ email: string }>,
  collection?: CollectionConfig,
  dbOverride?: EmailTemplateResult | null,
): EmailTemplateResult {
  if (dbOverride) return dbOverride;

  const enriched = enrichArgs(config, collection, args);

  const collectionAuth = collection?.auth;
  if (
    collectionAuth &&
    typeof collectionAuth === "object" &&
    collectionAuth.email?.templates?.welcome
  ) {
    return collectionAuth.email.templates.welcome(enriched);
  }

  const custom = config.email?.templates?.welcome?.(enriched);
  if (custom) return custom;

  return {
    subject: "Welcome — your account is ready",
    html: layout({
      preheader: "Your Dyrected account is ready.",
      title: "Welcome — your account is ready",
      content: `${paragraph("Your account has been created. You can now log in with:")}${detailBox(args.email)}`,
      footer: "If you didn't create this account, you can safely ignore this email.",
    }),
  };
}

export function buildInviteEmail(
  config: DyrectedConfig,
  args: EmailTemplateArgs<{
    token: string;
    invitedByEmail?: string;
    url?: string;
    data?: Record<string, unknown>;
  }>,
  collection?: CollectionConfig,
  dbOverride?: EmailTemplateResult | null,
): EmailTemplateResult {
  if (dbOverride) return dbOverride;

  const enriched = enrichArgs(config, collection, args);

  const collectionAuth = collection?.auth;
  if (
    collectionAuth &&
    typeof collectionAuth === "object" &&
    collectionAuth.email?.templates?.invite
  ) {
    return collectionAuth.email.templates.invite(enriched);
  }

  const custom = config.email?.templates?.invite?.(enriched);
  if (custom) return custom;

  const inviteLink = args.url;
  const inviteLinkBlock = inviteLink ? safeLinkDetailBox(inviteLink) : "";
  return {
    subject: "You've been invited",
    html: layout({
      preheader: "You've been invited to join a Dyrected admin area.",
      title: "You've been invited",
      content: inviteLink
        ? `${args.invitedByEmail ? paragraph(`You were invited by ${args.invitedByEmail}.`) : ""}${paragraph("Use the invitation link below to create your account. The link expires in 7 days.")}${ctaButton("Accept invitation", inviteLink)}${sectionLabel("Invitation link")}${inviteLinkBlock}${paragraph("If the button does not work, copy and paste the link above into your browser.", "12px 0 0")}`
        : `${args.invitedByEmail ? paragraph(`You were invited by ${args.invitedByEmail}.`) : ""}${paragraph("Use the invitation token below to accept your invitation. It expires in 7 days.")}${sectionLabel("Invitation token")}${detailBox(args.token, true)}`,
      footer: "If you weren't expecting this invitation, you can safely ignore this email.",
    }),
  };
}

export function buildResetPasswordEmail(
  config: DyrectedConfig,
  args: EmailTemplateArgs<{ token: string; url?: string }>,
  collection?: CollectionConfig,
  dbOverride?: EmailTemplateResult | null,
): EmailTemplateResult {
  if (dbOverride) return dbOverride;

  const enriched = enrichArgs(config, collection, args);

  const collectionAuth = collection?.auth;
  if (
    collectionAuth &&
    typeof collectionAuth === "object" &&
    collectionAuth.email?.templates?.resetPassword
  ) {
    return collectionAuth.email.templates.resetPassword(enriched);
  }

  const custom = config.email?.templates?.resetPassword?.(enriched);
  if (custom) return custom;

  const resetLink = args.url;
  const resetLinkBlock = resetLink ? safeLinkDetailBox(resetLink) : "";
  return {
    subject: "Reset your password",
    html: layout({
      preheader: "Reset your Dyrected password.",
      title: "Reset your password",
      content: resetLink
        ? `${paragraph("We received a request to reset your password. The reset link expires in 1 hour.")}${ctaButton("Reset password", resetLink)}${sectionLabel("Reset link")}${resetLinkBlock}${paragraph("If the button does not work, copy and paste the link above into your browser.", "12px 0 0")}`
        : `${paragraph("We received a request to reset your password. The reset token expires in 1 hour.")}${sectionLabel("Reset token")}${detailBox(args.token, true)}`,
      footer: "If you didn't request a password reset, you can safely ignore this email.",
    }),
  };
}

export function buildPasswordChangedEmail(
  config: DyrectedConfig,
  args: EmailTemplateArgs<{ email: string }>,
  collection?: CollectionConfig,
  dbOverride?: EmailTemplateResult | null,
): EmailTemplateResult {
  if (dbOverride) return dbOverride;

  const enriched = enrichArgs(config, collection, args);

  const collectionAuth = collection?.auth;
  if (
    collectionAuth &&
    typeof collectionAuth === "object" &&
    collectionAuth.email?.templates?.passwordChanged
  ) {
    return collectionAuth.email.templates.passwordChanged(enriched);
  }

  const custom = config.email?.templates?.passwordChanged?.(enriched);
  if (custom) return custom;

  return {
    subject: "Your password has been changed",
    html: layout({
      preheader: "Your Dyrected password was changed.",
      title: "Password changed",
      content: `${paragraph("The password for this account was just changed:")}${detailBox(args.email)}${spacer()}${alertBox("If you did not make this change, please contact support immediately.")}`,
      footer: "This is an automated security notification.",
    }),
  };
}

export async function resolveEmailTemplate<T extends Record<string, unknown>>(params: {
  config: DyrectedConfig;
  collection?: CollectionConfig;
  purpose: "invite" | "resetPassword" | "welcome" | "passwordChanged";
  args: EmailTemplateArgs<T>;
  db?: any;
}): Promise<EmailTemplateResult> {
  const { config, collection, purpose, args, db } = params;
  let dbOverride: EmailTemplateResult | null = null;
  if (config.email?.adminEditable !== false && db) {
    dbOverride = await getDbEmailTemplateOverride(db, collection?.slug, purpose, args);
  }

  switch (purpose) {
    case "welcome":
      return buildWelcomeEmail(config, args as any, collection, dbOverride);
    case "invite":
      return buildInviteEmail(config, args as any, collection, dbOverride);
    case "resetPassword":
      return buildResetPasswordEmail(config, args as any, collection, dbOverride);
    case "passwordChanged":
      return buildPasswordChangedEmail(config, args as any, collection, dbOverride);
    default:
      throw new Error(`Unknown email template purpose: ${purpose}`);
  }
}
