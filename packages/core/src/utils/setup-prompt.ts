export interface SetupPromptConfig {
  siteName?: string;
  siteId?: string;
  apiKey?: string;
  baseUrl?: string;
  isSelfHosted?: boolean;
}

function buildHeader(config: SetupPromptConfig, frameworkLabel: string): string {
  const isCloud = config.apiKey && config.siteId;
  return `You are a Senior Content Architect. Your mission is to integrate Dyrected CMS into a ${config.siteName || "new"} project using ${frameworkLabel}.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. PROJECT CONFIGURATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Framework : ${frameworkLabel}
- Host Type : ${isCloud ? "Managed (Dyrected Cloud)" : "Self-Hosted (Local/Private Server)"}
- API Base  : ${config.baseUrl || "http://localhost:3000"}
${isCloud ? `- API Key   : ${config.apiKey} (CRITICAL)\n- Site ID   : ${config.siteId}` : ""}
`;
}

function buildDiscovery(): string {
  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2. PHASE 0 — DISCOVERY (REQUIRED)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Ask these questions ONE AT A TIME. Wait for the user to answer before asking the next.

Q1 (Tech Level): "How do you work? (A: Write code myself, B: Use AI tools like Lovable/Bolt, C: Non-technical)"
Q2 (Status): "Is this a new project or an existing one you're already building?"
Q3 (Goal): "What kind of content needs managing? (e.g. Blog, Team, Services, Hero sections)"

Once answered, summarize the Content Model (Collections & Globals) in plain English.
`;
}

function buildImplementation(activeTab: string | undefined): string {
  const framework = activeTab || "next";
  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3. IMPLEMENTATION — ${framework.toUpperCase()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- SDK Setup: Use \`createClient\` from \`@dyrected/sdk\`.
- Admin UI: Mount \`DyrectedAdmin\` at \`/cms\`.
- Data Fetching: Use \`client.collection(slug).findOne()\` for pages.
- Content Strategy: Use a 'pages' collection with a catch-all route for marketing freedom.
- Field Types: text, textarea, richText, select, relationship (relationTo), blocks.
`;
}

function buildRules(): string {
  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4. ARCHITECTURAL RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- DATA PRESERVATION: Never delete existing code.
- JARGON-FREE: Explain technical steps simply for AI-tool users.
- CLOUD SYNC: For Managed sites, remind them to run: \`npx @dyrected/cli sync:schema\`
- RESILIENCE: Always provide \`initialData\` for fetches.
`;
}

export function generateAIPrompt(activeTab: "next" | "nuxt" | "react" | "vue" | undefined, config: SetupPromptConfig): string {
  const frameworkLabel = activeTab
    ? activeTab === "next" ? "Next.js" : activeTab === "nuxt" ? "Nuxt.js" : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)
    : "the project's detected framework";

  return [
    buildHeader(config, frameworkLabel),
    buildDiscovery(),
    buildImplementation(activeTab),
    buildRules(),
    "\nAPI Reference: https://docs.dyrected.com"
  ].join("\n");
}

export function generateFreshSetupPrompt(activeTab: "next" | "nuxt" | "react" | "vue" | undefined, config: SetupPromptConfig): string {
  return `You are helping a user set up Dyrected CMS for the first time.\n\n${generateAIPrompt(activeTab, config)}`;
}
