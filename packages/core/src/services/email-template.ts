export const emailTokens = {
  colors: {
    canvas: "#f6f7f2",
    surface: "#ffffff",
    text: "#171717",
    muted: "#62665b",
    subtle: "#8a8f82",
    border: "#dde0d7",
    accent: "#b6ff2e",
    code: "#f1f3ec",
    codeBorder: "#e2e5dc",
    dangerSurface: "#fff2f0",
    dangerBorder: "#ffc9c2",
    dangerText: "#9f251b",
  },
  font: "Arial, 'Helvetica Neue', Helvetica, sans-serif",
  mono: "'Courier New', Courier, monospace",
  radius: { card: "12px", control: "6px" },
  width: "600px",
} as const;

export function escapeHtml(value: string): string {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[character] as string,
  );
}

function safeHttpUrl(value: string): string | undefined {
  if (value.startsWith("{{") && value.endsWith("}}")) {
    return value;
  }
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? escapeHtml(url.toString()) : undefined;
  } catch {
    return undefined;
  }
}

export function heading(content: string): string {
  return `<h1 style="margin:0;font-family:${emailTokens.font};font-size:24px;line-height:1.25;font-weight:700;color:${emailTokens.colors.text}">${escapeHtml(content)}</h1>`;
}

export function paragraph(content: string, margin = "0 0 16px", size = "15px"): string {
  return `<p style="margin:${margin};font-family:${emailTokens.font};font-size:${size};line-height:1.6;color:${emailTokens.colors.muted}">${escapeHtml(content)}</p>`;
}

export function sectionLabel(content: string): string {
  return `<p style="margin:0 0 8px;font-family:${emailTokens.font};font-size:11px;line-height:1.4;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${emailTokens.colors.subtle}">${escapeHtml(content)}</p>`;
}

export function divider(): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="height:1px;background:${emailTokens.colors.border};font-size:0;line-height:0">&nbsp;</td></tr></table>`;
}

export function spacer(height = 16): string {
  return table(row("&nbsp;", `height:${height}px;font-size:0;line-height:0`));
}

export function row(content: string, cellStyle = ""): string {
  return `<tr><td style="${cellStyle}">${content}</td></tr>`;
}

export function table(content: string, style = "width:100%"): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="${style}">${content}</table>`;
}

export function detailBox(content: string, monospace = false): string {
  const font = monospace ? emailTokens.mono : emailTokens.font;
  return table(
    row(
      escapeHtml(content),
      `padding:14px 16px;font-family:${font};font-size:13px;line-height:1.5;font-weight:${monospace ? "400" : "700"};color:${emailTokens.colors.text};word-break:break-all`,
    ),
    `width:100%;background:${emailTokens.colors.code};border:1px solid ${emailTokens.colors.codeBorder};border-radius:${emailTokens.radius.control}`,
  );
}

export function eventList(events: ReadonlyArray<{ label: string; value: string }>): string {
  return table(
    events
      .map(({ label, value }) =>
        row(
          `${sectionLabel(label)}${paragraph(value, "0")}`,
          `padding:12px 0;border-bottom:1px solid ${emailTokens.colors.border}`,
        ),
      )
      .join(""),
  );
}

export function ctaButton(label: string, href: string): string {
  const safeHref = safeHttpUrl(href);
  if (!safeHref) return "";
  return table(
    row(
      `<a href="${safeHref}" style="display:inline-block;padding:13px 22px;border-radius:${emailTokens.radius.control};background:${emailTokens.colors.accent};font-family:${emailTokens.font};font-size:14px;line-height:1.2;font-weight:700;color:${emailTokens.colors.text};text-decoration:none">${escapeHtml(label)}</a>`,
      "padding:8px 0 24px",
    ),
    "width:auto",
  );
}

export function safeLinkDetailBox(href: string): string {
  const safeHref = safeHttpUrl(href);
  if (!safeHref) return "";
  return detailBox(safeHref, true);
}

export function alertBox(content: string): string {
  return table(
    row(
      escapeHtml(content),
      `padding:13px 16px;font-family:${emailTokens.font};font-size:13px;line-height:1.5;color:${emailTokens.colors.dangerText}`,
    ),
    `width:100%;background:${emailTokens.colors.dangerSurface};border:1px solid ${emailTokens.colors.dangerBorder};border-radius:${emailTokens.radius.control}`,
  );
}

export type TemplateBlock = string | false | null | undefined;

export interface LayoutOptions {
  preheader: string;
  title: string;
  content: string | (TemplateBlock | TemplateBlock[])[];
  footer: string | (TemplateBlock | TemplateBlock[])[];
  siteName?: string;
}

export function resolveBlocks(input: string | (TemplateBlock | TemplateBlock[])[]): string {
  if (Array.isArray(input)) {
    const parts: string[] = [];
    for (const item of input) {
      if (Array.isArray(item)) {
        for (const sub of item) {
          if (typeof sub === "string" && sub.length > 0) parts.push(sub);
        }
      } else if (typeof item === "string" && item.length > 0) {
        parts.push(item);
      }
    }
    return parts.join("\n");
  }
  return typeof input === "string" ? input : "";
}

export function layout({ preheader, title, content, footer, siteName }: LayoutOptions): string {
  const resolvedContent = resolveBlocks(content);
  const resolvedFooter = resolveBlocks(footer);

  return `<!doctype html>
<html lang="en" dir="ltr" xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="x-apple-disable-message-reformatting">
    <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
    <meta name="color-scheme" content="light">
    <meta name="supported-color-schemes" content="light">
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:0;background-color:${emailTokens.colors.canvas};word-spacing:normal;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%">
    <div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;mso-hide:all;color:transparent;font-size:1px;line-height:1px">
      ${escapeHtml(preheader)}&#8203;&#847;&zwnj;&nbsp;&#8199;&#8199;&#847;&zwnj;&nbsp;
    </div>
    <center lang="en" style="width:100%;background-color:${emailTokens.colors.canvas}">
      ${table(
        row(
          table(
            row("&nbsp;", `height:5px;background:${emailTokens.colors.accent};font-size:0;line-height:0`) +
              row(`${sectionLabel(siteName ?? "Dyrected")}${heading(title)}`, "padding:30px 32px 24px") +
              row(resolvedContent, "padding:0 32px 32px") +
              row(
                `${divider()}${paragraph(resolvedFooter, "20px 0 6px")}${paragraph("Privacy: this message contains account-related information; please avoid forwarding it.", "10px 0px 0px 0px", "12px")}`,
                "padding:0 32px 28px",
              ),
            `width:100%;max-width:${emailTokens.width};background:${emailTokens.colors.surface};border:1px solid ${emailTokens.colors.border};border-radius:${emailTokens.radius.card};overflow:hidden`,
          ),
          "padding:32px 12px",
        ),
        `width:100%;background:${emailTokens.colors.canvas}`,
      )}
    </center>
  </body>
</html>`;
}

/**
 * Returns the canonical, bulletproof Dyrected HTML email template
 * for a specific auth purpose (invite, resetPassword, welcome, passwordChanged).
 * Formatted using responsive tables and inline styles tested across Gmail, Apple Mail, Outlook, and mobile clients.
 */
export function getDefaultEmailTemplate(
  purpose: "invite" | "resetPassword" | "welcome" | "passwordChanged" | string,
  options?: { siteName?: string },
): { subject: string; rawHtml: string } {
  const siteName = options?.siteName ?? "Dyrected";

  switch (purpose) {
    case "invite":
      return {
        subject: `You've been invited to ${siteName}`,
        rawHtml: layout({
          siteName,
          preheader: `You've been invited to join ${siteName}.`,
          title: "You've been invited",
          content: [
            paragraph("Use the invitation link below to create your account. The link expires in 7 days."),
            ctaButton("Accept invitation", "{{url}}"),
            sectionLabel("Invitation link"),
            safeLinkDetailBox("{{url}}"),
            paragraph("If the button does not work, copy and paste the link above into your browser.", "12px 0 0"),
          ],
          footer: "If you weren't expecting this invitation, you can safely ignore this email.",
        }),
      };
    case "resetPassword":
      return {
        subject: "Reset your password",
        rawHtml: layout({
          siteName,
          preheader: `Reset your ${siteName} password.`,
          title: "Reset your password",
          content: [
            paragraph("We received a request to reset your password. The reset link expires in 1 hour."),
            ctaButton("Reset password", "{{url}}"),
            sectionLabel("Reset link"),
            safeLinkDetailBox("{{url}}"),
            paragraph("If the button does not work, copy and paste the link above into your browser.", "12px 0 0"),
          ],
          footer: "If you didn't request a password reset, you can safely ignore this email.",
        }),
      };
    case "welcome":
      return {
        subject: `Welcome to ${siteName} — your account is ready`,
        rawHtml: layout({
          siteName,
          preheader: `Your ${siteName} account is ready.`,
          title: "Welcome — your account is ready",
          content: [paragraph("Your account has been created. You can now log in with:"), detailBox("{{email}}")],
          footer: "If you didn't create this account, you can safely ignore this email.",
        }),
      };
    case "passwordChanged":
      return {
        subject: "Your password has been changed",
        rawHtml: layout({
          siteName,
          preheader: `Your ${siteName} password was changed.`,
          title: "Password changed",
          content: [
            paragraph("The password for your account has been changed."),
            alertBox("If you did not make this change, please contact support or reset your password immediately."),
          ],
          footer: "Security notice: this confirms a recent credential change.",
        }),
      };
    default:
      return {
        subject: `Notification from ${siteName}`,
        rawHtml: layout({
          siteName,
          preheader: `Account notification from ${siteName}.`,
          title: "Account Notification",
          content: [paragraph(`This is an account notification from ${siteName}.`)],
          footer: "If you have any questions, please reach out to our team.",
        }),
      };
  }
}
