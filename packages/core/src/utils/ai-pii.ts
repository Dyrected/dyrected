import type { CollectionConfig } from "../types/schema-config.js";
import type { AIConfig, AIPIIConfig } from "../types/ai.js";

export const NON_NEGOTIABLE_CREDENTIAL_FIELDS = new Set([
  "password",
  "salt",
  "hash",
  "resetPasswordToken",
  "apiKey",
  "token",
  "secret",
  "accessToken",
  "refreshToken",
]);

/**
 * Masks an email address to protect privacy (e.g. "john.doe@example.com" -> "j***@example.com").
 */
export function maskEmail(email: string, strategy: "mask" | "token" = "mask"): string {
  if (!email || typeof email !== "string") return email;
  if (strategy === "token") return "[REDACTED_EMAIL]";

  const atIdx = email.indexOf("@");
  if (atIdx <= 1) {
    return "***@" + (email.slice(atIdx + 1) || "example.com");
  }
  const prefix = email[0];
  const domain = email.slice(atIdx);
  return `${prefix}***${domain}`;
}

/**
 * Masks a phone number (e.g. "+1 555-234-5678" -> "+1 ***-***-5678").
 */
export function maskPhone(phone: string, strategy: "mask" | "token" = "mask"): string {
  if (!phone || typeof phone !== "string") return phone;
  if (strategy === "token") return "[REDACTED_PHONE]";

  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "***-***-****";
  const lastFour = digits.slice(-4);
  return `***-***-${lastFour}`;
}

/**
 * High-performance regex patterns for common PII.
 */
export const PII_REGEX_PATTERNS = {
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  phone_number: /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
  phoneNumber: /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
  phone: /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
  credit_card: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  ipv4: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
};

/**
 * Scrubs unstructured free text using configured regex patterns and custom scrubbers.
 */
export function maskTextPII(text: string, piiConfig?: AIPIIConfig): string {
  if (!text || typeof text !== "string") return text;
  if (!piiConfig || piiConfig.enabled === false) return text;

  let result = text;
  const strategy = piiConfig.strategy || "mask";
  const patterns = piiConfig.patterns || ["email", "phone", "ssn", "credit_card", "ipv4"];

  for (const patternName of patterns) {
    const regex = PII_REGEX_PATTERNS[patternName];
    if (!regex) continue;

    result = result.replace(regex, (match) => {
      switch (patternName) {
        case "email":
          return maskEmail(match, strategy);
        case "phone":
          return maskPhone(match, strategy);
        case "credit_card":
          return strategy === "token"
            ? "[REDACTED_CREDIT_CARD]"
            : "****-****-****-" + match.replace(/\D/g, "").slice(-4);
        case "ssn":
          return strategy === "token" ? "[REDACTED_SSN]" : "***-**-" + match.replace(/\D/g, "").slice(-4);
        case "ipv4":
          return "[REDACTED_IP]";
        default:
          return "[REDACTED]";
      }
    });
  }

  if (typeof piiConfig.customScrubber === "function") {
    result = piiConfig.customScrubber(result);
  }

  return result;
}

export interface SanitizeDocForAIOptions {
  doc: Record<string, unknown>;
  collectionConfig?: CollectionConfig;
  globalAIConfig?: AIConfig;
}

/**
 * Deterministically sanitizes a CMS document before sending it to an AI assistant or RAG pipeline:
 * 1. Non-negotiably strips passwords, secrets, hashes, and session tokens.
 * 2. Strips collection-level `excludeFields`.
 * 3. Applies field-level definitions:
 *    - Automatically masks `email` and `phone` by default (opt-out privacy) unless `ai: { allowRaw: true }`.
 *    - Strips fields configured with `ai: { exclude: true }`.
 *    - Masks fields configured with `ai: { redact: true }`.
 * 4. Applies collection-level `redactFields`.
 * 5. Calls custom programmatic `collectionConfig.ai.sanitizeDoc` hook if provided.
 * 6. Scrubs unstructured text across string fields if `config.ai.pii.enabled === true`.
 */
export function sanitizeDocForAI(options: SanitizeDocForAIOptions): Record<string, unknown> {
  const { doc, collectionConfig, globalAIConfig } = options;
  if (!doc || typeof doc !== "object") return doc;

  const copy: Record<string, unknown> = { ...doc };

  // 1. Strip non-negotiable credentials
  for (const cred of NON_NEGOTIABLE_CREDENTIAL_FIELDS) {
    delete copy[cred];
  }

  // 2. Collection-level excludeFields
  if (collectionConfig?.ai?.excludeFields) {
    for (const field of collectionConfig.ai.excludeFields) {
      delete copy[field];
    }
  }

  // 3. Field-level definitions and default opt-out PII masking
  const fields = collectionConfig?.fields || [];
  for (const field of fields) {
    const fieldName = field.name;
    if (!fieldName || copy[fieldName] === undefined) continue;

    // A. Explicit field exclude
    if (field.ai?.exclude === true) {
      delete copy[fieldName];
      continue;
    }

    const val = copy[fieldName];
    const isEmail = field.type === "email" || fieldName.toLowerCase() === "email";
    const isPhone = fieldName.toLowerCase() === "phone" || fieldName.toLowerCase() === "phonenumber";

    // B. Typed PII: default opt-out masking unless allowRaw === true or global pii.enabled === false
    if (isEmail) {
      if (globalAIConfig?.pii?.enabled !== false && field.ai?.allowRaw !== true && typeof val === 'string') {
        copy[fieldName] = maskEmail(val, globalAIConfig?.pii?.strategy);
      }
      continue;
    }

    if (isPhone) {
      if (globalAIConfig?.pii?.enabled !== false && field.ai?.allowRaw !== true && typeof val === 'string') {
        copy[fieldName] = maskPhone(val, globalAIConfig?.pii?.strategy);
      }
      continue;
    }

    // C. Explicit redact flag on any other field
    if (field.ai?.redact === true || field.ai?.redact === "mask") {
      if (typeof val === "string") {
        copy[fieldName] = "[REDACTED]";
      }
    }
  }

  // 4. Collection-level redactFields
  if (collectionConfig?.ai?.redactFields) {
    for (const field of collectionConfig.ai.redactFields) {
      if (copy[field] !== undefined) {
        const val = copy[field];
        if (typeof val === "string") {
          if (field.toLowerCase().includes("email")) {
            copy[field] = maskEmail(val, globalAIConfig?.pii?.strategy);
          } else if (field.toLowerCase().includes("phone")) {
            copy[field] = maskPhone(val, globalAIConfig?.pii?.strategy);
          } else {
            copy[field] = "[REDACTED]";
          }
        }
      }
    }
  }

  // 5. Collection-level custom sanitizeDoc hook
  let result = copy;
  if (typeof collectionConfig?.ai?.sanitizeDoc === "function") {
    result = collectionConfig.ai.sanitizeDoc(copy);
  }

  // 6. Global PII scrubber for unstructured text (if enabled)
  if (globalAIConfig?.pii?.enabled === true) {
    for (const [k, v] of Object.entries(result)) {
      if (typeof v === "string") {
        result[k] = maskTextPII(v, globalAIConfig.pii);
      }
    }
  }

  return result;
}
