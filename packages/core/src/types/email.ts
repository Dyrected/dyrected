/**
 * Email template return value.
 *
 * Supports either direct HTML content or external provider template IDs with variables
 * (e.g. Seamailer, Postmark, SendGrid, Mailgun).
 */
export type EmailTemplateResult =
  | {
      subject?: string;
      html: string;
      text?: string;
    }
  | {
      /**
       * External provider template identifier:
       * - Seamailer: numeric template ID (e.g. 821354)
       * - Postmark: template alias (e.g. 'welcome-user') or numeric ID
       * - SendGrid: template ID (e.g. 'd-1234567890abcdef')
       */
      template: string | number;
      variables: Record<string, unknown>;
      subject?: string;
    };

/**
 * Contextual arguments passed into email template builders.
 */
export type EmailTemplateArgs<T = Record<string, unknown>> = T & {
  collection?: string;
  collectionLabel?: { singular: string; plural: string };
  siteName?: string;
  user?: Record<string, unknown>;
};

/**
 * The typed email payload passed to `config.email.send`.
 *
 * Supports both traditional HTML payloads and external provider template payloads.
 */
export type OutboundEmail = {
  to: string;
  from?: string;
  collection?: string;
  purpose?: "invite" | "resetPassword" | "welcome" | "passwordChanged" | string;
  user?: Record<string, unknown>;
} & (
  | {
      type?: "html";
      subject: string;
      html: string;
      text?: string;
    }
  | {
      type: "template";
      template: string | number;
      variables: Record<string, unknown>;
      subject?: string;
    }
);

/**
 * Collection-level email configuration.
 */
export interface CollectionEmailConfig {
  /** Optional custom `from` address for emails sent by this collection. */
  from?: string;

  /** Collection-specific email templates. */
  templates?: {
    welcome?: (args: EmailTemplateArgs<{ email: string }>) => EmailTemplateResult;
    invite?: (
      args: EmailTemplateArgs<{
        token: string;
        url?: string;
        invitedByEmail?: string;
        data?: Record<string, unknown>;
      }>,
    ) => EmailTemplateResult;
    resetPassword?: (
      args: EmailTemplateArgs<{ token: string; url?: string }>,
    ) => EmailTemplateResult;
    passwordChanged?: (
      args: EmailTemplateArgs<{ email: string }>,
    ) => EmailTemplateResult;
  };
}
