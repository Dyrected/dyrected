import { GENERATE_CMS_PROMPT } from "@dyrected/knowledge";
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
  const { siteId, apiKey, baseUrl } = config;
  const hasCredentials = siteId && apiKey && baseUrl;

  if (!hasCredentials) return GENERATE_CMS_PROMPT;

  const placeholder = `Ask me for the following in one message:

- Site ID
- Site API key
- Base URL

Wait for my reply.`;

  const replacement = `Use the following credentials:

- Site ID: ${siteId}
- Site API key: ${apiKey}
- Base URL: ${baseUrl}`;

  return GENERATE_CMS_PROMPT.replace(placeholder, replacement);
}
