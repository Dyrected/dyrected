import {
  CMS_PROMPT_CLOUD_CREDENTIAL_REQUEST,
  GENERATE_CMS_PROMPT,
  GENERATE_CMS_PROMPT_SELF_HOSTED,
} from "@dyrected/knowledge";
import type { SetupPromptConfig } from "./setup-prompt";

const GUIDE_URL = "https://www.dyrected.com/guide";

export function normalizeTechStack(techStack?: string): string | undefined {
  if (!techStack) return undefined;
  if (techStack === "next") return "nextjs";
  if (techStack === "nuxtjs") return "nuxt";
  return techStack.toLowerCase();
}

export function buildGuideUrl(config: SetupPromptConfig): string {
  const url = new URL(GUIDE_URL);
  const stack = normalizeTechStack(config.defaultTechStack);

  url.searchParams.set("source", "admin");
  if (stack) url.searchParams.set("stack", stack);
  if (config.siteId) url.searchParams.set("siteId", config.siteId);
  if (config.baseUrl) url.searchParams.set("endpoint", config.baseUrl);

  return url.toString();
}

export function buildPrompt(config: SetupPromptConfig): string {
  const { siteId, apiKey, baseUrl, isSelfHosted } = config;
  if (isSelfHosted) return GENERATE_CMS_PROMPT_SELF_HOSTED;

  const hasCredentials = siteId && apiKey && baseUrl;

  if (!hasCredentials) return GENERATE_CMS_PROMPT;

  const replacement = `Use the following credentials:

- Site ID: ${siteId}
- Site API key: ${apiKey}
- Base URL: ${baseUrl}`;

  return GENERATE_CMS_PROMPT.replace(
    CMS_PROMPT_CLOUD_CREDENTIAL_REQUEST,
    replacement,
  );
}
