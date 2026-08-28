import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText, generateText, createUIMessageStreamResponse, toUIMessageStream, stepCountIs, type LanguageModel } from "ai";
import type { DatabaseAdapter } from "../types/adapters.js";
import type { DyrectedConfig, AuthenticatedUser } from "../types/index.js";
import type { DyrectedAIContext, AIThread, AIMessage } from "../types/ai.js";
import { createDyrectedAITools } from "./ai-tools.js";

export function getAIModel(config?: DyrectedConfig): LanguageModel {
  const ai = config?.ai;
  const provider = ai?.provider;

  // 1. Explicit AgentRouter or AGENTROUTER_API_KEY
  if (provider === 'agentrouter' || (!provider && process.env.AGENTROUTER_API_KEY)) {
    const apiKey = ai?.apiKey || process.env.AGENTROUTER_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('AGENTROUTER_API_KEY is not configured on the server.');
    }
    const baseURL = ai?.baseURL || process.env.AGENTROUTER_BASE_URL || 'https://agentrouter.org/v1';
    const modelName = ai?.model || 'claude-3-haiku-20240307';
    const agentRouterProvider = createOpenAI({
      apiKey,
      baseURL,
      headers: {
        'User-Agent': 'claude-cli/2.1.0 (external, cli)',
        'anthropic-version': '2023-06-01',
      },
      fetch: async (url, init) => {
        const headers = new Headers(init?.headers);
        headers.set('User-Agent', 'claude-cli/2.1.0 (external, cli)');
        headers.set('anthropic-version', '2023-06-01');

        let body = init?.body;
        if (body && typeof body === 'string') {
          try {
            const parsed = JSON.parse(body);
            if (typeof parsed.model === 'string' && parsed.model.includes('deepseek') && !parsed.thinking) {
              parsed.thinking = { type: 'disabled' };
            }
            body = JSON.stringify(parsed);
          } catch {
            // Ignore parse errors
          }
        }

        const targetUrl = String(url).replace(/\/responses$/, '/chat/completions');

        return fetch(targetUrl, {
          ...init,
          headers,
          body,
        });
      },
    });
    return agentRouterProvider.chat(modelName);
  }

  // 2. Explicit OpenRouter or OPENROUTER_API_KEY
  if (provider === 'openrouter' || (!provider && process.env.OPENROUTER_API_KEY)) {
    const apiKey = ai?.apiKey || process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY is not configured on the server.');
    }
    const baseURL = ai?.baseURL || 'https://openrouter.ai/api/v1';
    const modelName = ai?.model || 'anthropic/claude-3-haiku';
    const openRouterProvider = createOpenAI({ apiKey, baseURL });
    return openRouterProvider(modelName);
  }

  // 3. Explicit OpenAI or OPENAI_API_KEY
  if (provider === 'openai' || (!provider && process.env.OPENAI_API_KEY && !process.env.GEMINI_API_KEY)) {
    const apiKey = ai?.apiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not configured on the server.');
    }
    const baseURL = ai?.baseURL;
    const modelName = ai?.model || 'gpt-4o-mini';
    const openaiProvider = createOpenAI({ apiKey, baseURL });
    return openaiProvider(modelName);
  }

  // 4. Default: Google Generative AI (Gemini)
  const apiKey = ai?.apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error('No AI API key found. Please set AGENTROUTER_API_KEY, OPENROUTER_API_KEY, or GEMINI_API_KEY in your .env.local file.');
  }
  const googleProvider = createGoogleGenerativeAI({ apiKey });
  return googleProvider(ai?.model || 'gemini-2.0-flash');
}

export function formatAIErrorMessage(error: any): string {
  if (!error) return "An unexpected AI error occurred.";
  const msg = typeof error === "string" ? error : error.message || error.toString();

  // Quota & Rate Limit (429 / RESOURCE_EXHAUSTED)
  if (
    msg.includes("429") ||
    msg.includes("quota") ||
    msg.includes("RESOURCE_EXHAUSTED") ||
    msg.includes("rate-limits") ||
    msg.includes("Rate limit") ||
    msg.includes("free_tier_requests") ||
    msg.includes("insufficient_quota")
  ) {
    const retryMatch = msg.match(/retry in ([0-9.]+[a-z]?)/i);
    const retryText = retryMatch ? ` Please retry in ${retryMatch[1]}.` : " Please wait a few moments before retrying.";
    return `AI API quota reached (429 Rate Limit).${retryText} Check your provider account balance or rate limits.`;
  }

  // AgentRouter / OneAPI IP Whitelist Error
  if (msg.includes("不在令牌允许访问的列表") || (msg.includes("IP") && msg.includes("allowed"))) {
    return "AgentRouter IP Restriction: Your IP is not in the allowed IP whitelist for this token. Please clear or update the IP Whitelist field in your AgentRouter token console (https://agentrouter.org/console/token).";
  }

  // Missing or Invalid API Key
  if (
    msg.includes("API_KEY") ||
    msg.includes("API key") ||
    msg.includes("401") ||
    msg.includes("403") ||
    msg.includes("unauthenticated") ||
    msg.includes("PERMISSION_DENIED") ||
    msg.includes("Incorrect API key")
  ) {
    return "Invalid or missing AI API Key. Please check your AGENTROUTER_API_KEY or GEMINI_API_KEY in .env.local.";
  }

  // Overloaded (503)
  if (msg.includes("503") || msg.includes("overloaded") || msg.includes("UNAVAILABLE")) {
    return "AI service is temporarily overloaded. Please try again shortly.";
  }

  return msg;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export function buildDyrectedSystemPrompt(context: DyrectedAIContext): string {
  const { project, collections, globals, user, globalPrompt } = context;

  const collectionSummaries = collections.map((c) => {
    const fields = c.fields?.map((f) => `${f.name} (${f.type}${f.required ? ', required' : ''})`).join(', ');
    let summary = `- Section "${c.label || c.slug}" (slug: "${c.slug}"): [${fields || 'no fields defined'}]`;
    if (c.prompt) {
      summary += `\n  * Section Editorial Instructions: ${c.prompt}`;
    }
    return summary;
  }).join('\n');

  const globalSummaries = globals.map((g) => {
    let summary = `- Global "${g.label || g.slug}" (slug: "${g.slug}")`;
    if (g.prompt) {
      summary += `\n  * Global Editorial Instructions: ${g.prompt}`;
    }
    return summary;
  }).join('\n');

  return `
You are the Dyrected AI Assistant — an elite conversion copywriter, content strategist, and technical CMS specialist embedded natively inside Dyrected Headless CMS.

### 1. CMS DOMAIN & CONTEXT
- Dyrected is a declarative, schema-driven Headless CMS.
- Structure: **Collections** (multi-entry datasets like Articles, Products, Authors) and **Globals** (singletons like Site Settings, Nav).
- Project: "${project.name}" (ID: ${project.id})
- User: ${user.name || 'Editor'} (Role: ${user.role || 'editor'})
${globalPrompt ? `\n### BRAND VOICE & PROJECT DIRECTIVES\n${globalPrompt}\n` : ''}
- Available Content Sections:
${collectionSummaries || '  (None)'}
- Available Site Globals:
${globalSummaries || '  (None)'}

### 2. EVIDENCE-BASED INDUSTRY & AWARENESS CALIBRATION
Calibrate content using empirical copywriting and UX research frameworks:

* **E-Commerce & D2C (Baymard Institute & FAB Model):**
  - Translate raw specs into tangible customer benefits (Feature → Advantage → Benefit).
  - Use sensory, descriptive copy with explicit dimensions, materials, and sizing to eliminate buyer hesitation (Baymard product page UX benchmark).
* **B2B SaaS & Tech (CXL & PAS Model):**
  - Target risk-averse stakeholders with clear business outcomes, operational efficiency, and developer velocity using Problem → Agitate → Solution (PAS).
  - Front-load quantifiable value propositions and integration clarity over abstract claims.
* **Editorial & Publishing (NN/g Inverted Pyramid):**
  - Front-load critical takeaways in the first two sentences; structure supporting depth in descending order of importance.
  - Employ magnetic hooks and skimmable H2/H3 subheadings that answer reader search intent.
* **Professional Services & Healthcare / Legal / Finance (Cialdini Authority & Trust):**
  - Project authority, empathy, and credibility through transparent methodology, qualifications, and compliance-safe vocabulary.
* **Non-Profit & Philanthropy (Emotional Resonance & Transparency):**
  - Concrete outcome metrics ("What $50 provides") paired with mission-driven storytelling and friction-free donation CTAs.
* **Education & EdTech (Skill Transformation):**
  - Frame copy around student transformation (Before → After) with clear, modular syllabus breakdowns.
* **Events, Podcasts & Media:**
  - High-energy anticipation, speaker credentials, and structured show notes with timestamps and key takeaways.
* **Hospitality, Travel & Real Estate:**
  - Evocative scene-setting paired with structured, scannable amenity checklists.
* **Food & Beverage:**
  - Appetizing flavor profiles, culinary origin, and transparent dietary/allergen clarity.
* **Public Sector & Community (Plain Language / WCAG):**
  - Maximum clarity, active voice, Grade 6–8 readability, and step-by-step citizen instructions.

### 3. SCANNABILITY & READING PATTERNS (NN/g F-Shaped & Layer-Cake Rules)
Web readers scan rather than read linearly. You must format accordingly:
- **Front-Load Value:** Place primary benefits and keywords in the first 3–5 words of headings, bullet points, and paragraph openers.
- **Short Paragraphs:** Restrict paragraphs to 1–3 sentences (max 50 words) to eliminate walls of text.
- **Visual Anchors:** Use bold lead-ins for list items and clean Markdown tables for comparisons.

- **Active Project Name:** ${project.name} (ID: ${project.id})
- **Active User:** ${user.name || 'Editor'} (Role: ${user.role || 'editor'})
- **Registered Collections:**
${collectionSummaries || 'None'}
- **Registered Globals:**
${globalSummaries || 'None'}

### 2. REAL-TIME INSPECTION & QUERY TOOLS
You have direct access to project tools:
- \`listCollections\`: Discover all collections in this project.
- \`getCollectionSchema\`: Inspect fields, relations, and data types for a collection.
- \`listGlobals\`: Discover singleton configuration globals.
- \`getGlobalSchema\`: Inspect schema and fetch stored data for a global.
- \`queryCollection\`: Query actual saved documents from database collections (filter, sort, page).
- \`getDocument\`: Fetch a specific document by its primary key ID.
- \`aggregateCollection\`: Compute statistical metrics (count, sum, average, min, max, distinct values, and groupBy) on collection fields.
- \`searchContent\`: Semantically search unstructured content (articles, documentation, FAQs, guides, policies, materials, pages) for topics, meaning, and relevant answers.

**Token & Performance Optimization:**
- You already have the project structure and field definitions pre-seeded in section 1 above. Use this pre-seeded context directly to answer questions about available sections and field types in a single step without making redundant tool calls.
- Only invoke inspection/query tools when you need to inspect live database documents, execute specific filters, compute aggregates, or fetch singleton global values.

### 3. USER-CENTRIC LANGUAGE & EDITORIAL VOCABULARY
When speaking with end users (writers, editors, marketers, and content creators):
- **Avoid Technical CMS Jargon:** Do NOT use developer or database terminology such as "collections", "fields", "globals", "schemas", "slugs", or "database records" UNLESS the user explicitly uses those terms in their message.
- **Use Plain, Natural Terms:**
  - Instead of *"the 'services' collection"*, say *"your Services"* or *"the Services section"*.
  - Instead of *"the 'title' field"*, say *"the title"* or *"the headline"*.
  - Instead of *"the 'site-settings' global"*, say *"your Site Settings"*.
  - Instead of *"documents in the database"*, say *"items"*, *"entries"*, *"articles"*, or *"pages"*.
  - Instead of *"foreign key relation"*, say *"connected category"* or *"linked author"*.
- **Mirror the User's Tone:** If a developer explicitly asks for schema or collection details (e.g. *"What collections exist?"*), respond with precise technical terminology. In all other cases, speak like a supportive, capable editorial partner.

### 4. ROLE & PURPOSE
You help CMS users brainstorm, write, edit, optimize, and translate high-converting digital content. You also assist with inspecting and understanding CMS content sections, site settings, and entries.

### 4. RESEARCH-BACKED COPYWRITING FRAMEWORKS
1. **PAS (Problem-Agitate-Solution):** For pain-driven B2B SaaS, enterprise tooling, and problem-aware landing pages.
2. **AIDA (Attention-Interest-Desire-Action):** For high-growth DTC ecommerce, newsletters, and consumer apps.
3. **StoryBrand (SB7):** Make the user/customer the hero, position the client as the trusted guide.
4. **Before-After-Bridge (BAB):** For quick case studies, testimonials, and feature announcements.
5. **Feature-Advantage-Benefit (FAB):** For technical documentation and product specs.

### 5. STYLE & TONE DIRECTIVES
- **High Information Density:** Every sentence must earn its place. Cut fluff and throat-clearing.
- **Banned Adjectives:** robust, seamless, cutting-edge, game-changing, groundbreaking, innovative, vital, crucial, myriad, bespoke, vibrant.
- **Banned Transitional Filler:** "In today's fast-paced world", "In the ever-changing digital landscape", "It's important to note", "At the end of the day", "Furthermore", "Moreover", "In conclusion".
- **Banned Contrastive Tropes:** Never use "It's not just about X, it's about Y" or "It's not merely X; it's Y".
- **Em Dash Ban:** Do not overuse em dashes (—); use natural punctuation.

### 6. ANTI-HALLUCINATION GUARD
- Never fabricate company statistics, pricing, or technical claims.
- Use query tools to retrieve real facts from the CMS database whenever asked.
- Insert bracketed placeholders like [Insert Metric], [Insert Price], [Insert Year] only when specific facts are unavailable in the CMS.

### 7. OUTPUT STRUCTURE & FIELD FORMATTING
1. **Zero Fluff Openers:** Start immediately with the content. Never open with pleasantries ("Sure!", "Here is the copy you asked for:").
2. **Field-by-Field Draft Labeling:**
   **Title:** [High-CTR Title]
   **Slug:** [clean-lowercase-hyphenated-slug]
   **Excerpt:** [1–2 sentence hook / summary]
   **SEO Meta Title:** [Under 60 chars with primary keyword early]
   **SEO Meta Description:** [140–160 chars with clear CTA]
   **Content:**
   [Structured rich-text body formatted with proper Markdown H2/H3 headings]
3. **Structured Tables & Code Tags:** Use Markdown tables for comparisons. Always specify language identifiers on code blocks (e.g. html, json, ts).
4. **Actionable Next Steps:** End with 1–2 sharp, practical editorial suggestions.

### 8. SEMANTIC SEARCH & GROUNDED CITATIONS
When answering questions about policies, product details, material specifications, articles, or documentation:
1. **Search First:** Use the \`searchContent\` tool to locate verified project material before answering.
2. **Grounding:** Base your answers strictly on the retrieved source snippets. Do not extrapolate or invent facts not present in the sources.
3. **Citing Sources:** Every factual claim derived from \`searchContent\` must cite its source. At the end of your response, output a clean Sources section in this format:

### Sources:
- **[Document Title]** (/admin/collections/{collection}/{documentId})

4. **Missing Information:** If the retrieved search content does not contain the answer, explicitly state: *"I searched our project content for '{query}', but could not find information regarding that topic."*
`;
}

export interface AIAgentOptions {
  db: DatabaseAdapter;
  config: DyrectedConfig;
  projectId: string;
  userId: string;
  userName?: string;
  userRole?: string;
  user?: AuthenticatedUser;
}

export class AIAgent {
  private db: DatabaseAdapter;
  private config: DyrectedConfig;
  private projectId: string;
  private userId: string;
  private userName?: string;
  private userRole?: string;
  private user?: AuthenticatedUser;
  private contextCache: DyrectedAIContext | null = null;

  constructor(options: AIAgentOptions) {
    this.db = options.db;
    this.config = options.config;
    this.projectId = options.projectId;
    this.userId = options.userId;
    this.userName = options.userName;
    this.userRole = options.userRole;
    this.user = options.user;
  }

  async getContext(): Promise<DyrectedAIContext> {
    const collections = (this.config.collections || [])
      .filter((c) => !c.slug.startsWith('_dyrected_'))
      .map((c) => ({
        slug: c.slug,
        label: c.labels?.singular || c.labels?.plural || c.slug,
        prompt: c.ai?.prompt,
        fields: c.fields?.map((f) => ({
          name: f.name,
          type: f.type,
          required: f.required,
        })) as Array<{ name: string; type: string; required?: boolean }>,
      }));

    const globals = (this.config.globals || [])
      .filter((g) => !g.slug.startsWith('_dyrected_'))
      .map((g) => ({
        slug: g.slug,
        label: g.label || g.slug,
        prompt: g.ai?.prompt,
      }));

    const project = {
      name: this.config.admin?.meta?.titleSuffix?.replace(/^- /, '') || 'Dyrected Project',
      id: this.projectId,
    };

    this.contextCache = {
      project,
      globalPrompt: this.config.ai?.systemPrompt,
      collections,
      globals,
      user: { name: this.userName, role: this.userRole },
    };
    return this.contextCache;
  }

  async getThread(threadId: string): Promise<AIThread | null> {
    const thread = await this.db.findOne({ collection: "_dyrected_ai_threads", id: threadId });
    return thread as AIThread | null;
  }

  async updateThreadTitle(threadId: string, title: string): Promise<void> {
    await this.db.update({
      collection: "_dyrected_ai_threads",
      id: threadId,
      data: { title, updatedAt: new Date() },
    });
  }

  async createThread(title?: string): Promise<AIThread> {
    const thread: AIThread = {
      id: generateId(),
      projectId: this.projectId,
      userId: this.userId,
      title: title || "New Conversation",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await this.db.create({ collection: "_dyrected_ai_threads", data: thread });
    return thread;
  }

  async listThreads(limit = 20): Promise<AIThread[]> {
    const result = await this.db.find({
      collection: "_dyrected_ai_threads",
      where: { projectId: this.projectId, userId: this.userId },
      sort: "-updatedAt",
      limit,
    });
    return result.docs as AIThread[];
  }

  async deleteThread(threadId: string): Promise<boolean> {
    const messages = await this.getMessages(threadId);
    for (const msg of messages) {
      await this.db.delete({ collection: "_dyrected_ai_messages", id: msg.id });
    }
    await this.db.delete({ collection: "_dyrected_ai_threads", id: threadId });
    return true;
  }

  async clearAllThreads(): Promise<number> {
    const threads = await this.listThreads(1000);
    for (const thread of threads) {
      await this.deleteThread(thread.id);
    }
    return threads.length;
  }

  async getMessages(threadId: string): Promise<AIMessage[]> {
    const result = await this.db.find({
      collection: "_dyrected_ai_messages",
      where: { threadId },
      sort: "createdAt",
      limit: 100,
    });
    return result.docs as AIMessage[];
  }

  async persistUserMessage(threadId: string, content: string): Promise<AIMessage> {
    const message: AIMessage = {
      id: generateId(),
      threadId,
      role: "user",
      content,
      createdAt: new Date(),
    };
    await this.db.create({ collection: "_dyrected_ai_messages", data: message });
    await this.db.update({
      collection: "_dyrected_ai_threads",
      id: threadId,
      data: { updatedAt: new Date() },
    });
    return message;
  }

  async persistAssistantMessage(
    threadId: string,
    content: string,
    metadata?: Record<string, unknown>,
  ): Promise<AIMessage> {
    const message: AIMessage = {
      id: generateId(),
      threadId,
      role: "assistant",
      content,
      createdAt: new Date(),
      metadata,
    };
    await this.db.create({ collection: "_dyrected_ai_messages", data: message });
    await this.db.update({
      collection: "_dyrected_ai_threads",
      id: threadId,
      data: { updatedAt: new Date() },
    });
    return message;
  }

  async generateTitle(userMessage: string): Promise<string> {
    const { text } = await generateText({
      model: getAIModel(this.config),
      prompt: `Summarize this user request in 3-5 words for a chat thread title: "${userMessage}"`,
      temperature: 0.3,
      maxOutputTokens: 20,
    });
    return text.trim().slice(0, 50);
  }

  async *streamReply(
    threadId: string,
    userMessage: string,
  ): AsyncGenerator<string, { text: string; usage?: any; finishReason: string }, void> {
    const context = await this.getContext();
    const systemPrompt = buildDyrectedSystemPrompt(context);
    const history = await this.getMessages(threadId);

    const messages = [
      ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user" as const, content: userMessage },
    ];

    const model = getAIModel(this.config);
    const tools = createDyrectedAITools({
      db: this.db,
      config: this.config,
      user: this.user,
      projectId: this.projectId,
    });
    const maxSteps = this.config.ai?.maxSteps ?? 5;
    const maxRetries = this.config.ai?.maxRetries ?? 3;

    const result = streamText({
      model,
      system: systemPrompt,
      messages,
      tools,
      stopWhen: stepCountIs(maxSteps),
      maxRetries,
      temperature: 0.7,
      maxOutputTokens: 4096,
    });

    let fullText = "";

    for await (const chunk of result.textStream) {
      fullText += chunk;
      yield chunk;
    }

    const usage = await result.usage;
    const finishReason = (await result.finishReason) || "stop";

    await this.persistAssistantMessage(threadId, fullText, {
      tokens: usage?.totalTokens,
      finishReason,
    });

    return { text: fullText, usage, finishReason };
  }

  async createStreamResponse(threadId: string, userMessage: string): Promise<Response> {
    const context = await this.getContext();
    const systemPrompt = buildDyrectedSystemPrompt(context);
    const history = await this.getMessages(threadId);

    const messages = history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    if (messages.length === 0 || messages[messages.length - 1]?.content !== userMessage) {
      messages.push({ role: "user" as const, content: userMessage });
    }

    const model = getAIModel(this.config);
    const tools = createDyrectedAITools({
      db: this.db,
      config: this.config,
      user: this.user,
      projectId: this.projectId,
    });
    const maxSteps = this.config.ai?.maxSteps ?? 5;
    const maxRetries = this.config.ai?.maxRetries ?? 3;

    const result = streamText({
      model,
      system: systemPrompt,
      messages,
      tools,
      stopWhen: stepCountIs(maxSteps),
      maxRetries,
      temperature: 0.7,
      maxOutputTokens: 4096,
      onFinish: async (event) => {
        try {
          await this.persistAssistantMessage(threadId, event.text, {
            tokens: event.usage?.totalTokens,
            finishReason: event.finishReason,
          });
        } catch (err) {
          console.error("[dyrected/ai] Failed to persist assistant message:", err);
        }
      },
    });

    return createUIMessageStreamResponse({
      stream: toUIMessageStream({
        stream: result.stream,
        onError: (error) => formatAIErrorMessage(error),
      }),
    });
  }
}
