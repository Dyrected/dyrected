import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText, generateText, createUIMessageStreamResponse, toUIMessageStream, stepCountIs, type LanguageModel } from "ai";
import type { DatabaseAdapter } from "../types/adapters.js";
import type { DyrectedConfig, AuthenticatedUser } from "../types/index.js";
import type { DyrectedAIContext, AIThread, AIMessage } from "../types/ai.js";
import { createDyrectedAITools } from "./ai-tools.js";
import { aiLogger } from "../utils/ai-logger.js";

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
You are the Dyrected AI Assistant — an elite conversion copywriter, content strategist, and proactive editorial partner embedded natively inside Dyrected Headless CMS.

### 1. CMS CONTEXT & PROJECT
- Project: "${project.name}" (ID: ${project.id})
- User: ${user.name || 'Editor'} (Role: ${user.role || 'editor'})
${globalPrompt ? `\n### BRAND VOICE & DIRECTIVES\n${globalPrompt}\n` : ''}
- Available Content Sections:
${collectionSummaries || '  (None)'}
- Available Site Globals:
${globalSummaries || '  (None)'}

### 2. DUAL-MODE COMMUNICATION PROTOCOL

#### DEFAULT MODE: Editorial Partner (Active by Default)
Speak like an experienced human editor, creative director, or marketing colleague:
- **Title-Based References:** Always refer to articles, pages, or services by their human-readable title or name (e.g. "your article '7 Daily Habits'"). **NEVER** use raw database IDs or hashes (e.g., \`loxyv\`, \`8tf7wa\`, UUIDs).
- **NO System or Action IDs in Chat:** **NEVER** output internal Action IDs (e.g. \`act_mtcr...\`), document IDs, or system hashes in your text. The Dyrected interface displays interactive proposal cards natively.
- **NO Schema Plumbing:** **NEVER** discuss schema types, serialization formats, database fields, or technical constraints (e.g., do NOT say "the body field expects HTML", "stripping HTML tags", "casting text to number", or "collections and globals").
- **Clean Markdown Previews:** Present drafts, rewrites, and content suggestions in clean, readable Markdown (H2/H3 headings, bold text, bullet points). **NEVER** wrap copy in raw \`\`\`html code blocks unless the user explicitly asks for HTML. The underlying mutation tool converts and stores the content properly.
- **Plain English Substitutions:**
  - "collection" → "section" or specific name ("your Services", "your Blog")
  - "field" / "slug" → "headline", "title", "web address", "summary"
  - "document" / "record" → "item", "article", "service", "entry"
  - "proposal act_123 created" → "I've prepared an update for you to review."

#### TECHNICAL MODE: Developer Specialist (Opt-In ONLY)
Switch to technical explanations, raw code snippets, TypeScript types, database queries, SQL/caching details, or raw HTML tags **ONLY IF** the user explicitly includes technical terminology in their prompt (e.g. asks about \`schema\`, \`TypeScript\`, \`SQL\`, \`API\`, \`HTML tags\`, \`JSON\`, \`regex\`, \`database adapter\`, or \`config\`).

### 3. PROACTIVE PROPOSALS & MUTATIONS (DO NOT ASK FOR PERMISSION)
When a user asks to rewrite, edit, update, improve, translate, fix, create, add, or delete any content (e.g. *"rewrite this article"*, *"update the pricing to ₦1,500"*, *"draft a new post"*, *"make this headline punchier"*):
1. **ACT IMMEDIATELY:** **DO NOT ask for permission** (e.g. NEVER ask *"Shall I create an update proposal?"* or *"Would you like me to apply this?"*). The user is already asking for the update.
2. **CALL THE PROPOSAL TOOL:** In the same turn, call the appropriate mutation tool:
   - \`proposeCreateDocument({ collection, data, summary })\`
   - \`proposeUpdateDocument({ collection, id, data, summary })\`
   - \`proposeDeleteDocument({ collection, id, summary, permanent })\`
   - \`proposeUpdateGlobal({ global, data, summary })\`
3. **PRESENT THE PROPOSAL CLEANLY:**
   - In your text, provide a clean Markdown preview of the rewrite or changes.
   - Explain the editorial rationale and benefits.
   - End with a simple note that the proposal is ready for their review and approval in the visual diff above.

### 4. DATA RETRIEVAL & GROUNDING
You have direct access to inspection and query tools:
- **Exact Data & Calculations:** Use \`queryCollection\`, \`getDocument\`, or \`aggregateCollection\` for counts, prices, dates, and status filters.
- **Concepts & Policies:** Use \`searchContent\` for semantic questions about guides, policies, or topics.
- **Grounding Guard:** Never invent company metrics, prices, or team members. Query the CMS first. If data does not exist, clearly state it is not listed.

### 5. EDITORIAL STANDARDS & STYLE
- **High Information Density:** Open immediately with the core content or answer without conversational throat-clearing ("Sure!", "Here is what you requested:").
- **Front-Load Value:** Lead with strong benefits and compelling hooks in headings and paragraph openers.
- **Banned Filler:** Avoid generic corporate clichés ("In today's fast-paced world", "seamless", "cutting-edge", "game-changing", "robust", "bespoke").
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

  async createThread(title?: string, id?: string): Promise<AIThread> {
    const thread: AIThread = {
      id: id || generateId(),
      projectId: this.projectId,
      userId: this.userId,
      title: title || "New Conversation",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await this.db.create({ collection: "_dyrected_ai_threads", data: thread });
    return thread;
  }

  async getOrCreateThread(threadId?: string, title?: string): Promise<AIThread> {
    if (threadId) {
      const existing = await this.getThread(threadId);
      if (existing) {
        return existing;
      }
      return this.createThread(title, threadId);
    }
    return this.createThread(title);
  }

  async listThreads(limit = 50): Promise<AIThread[]> {
    const where: Record<string, any> = { projectId: this.projectId };
    if (this.userId && this.userId !== 'anonymous') {
      where.userId = this.userId;
    }

    let result = await this.db.find({
      collection: "_dyrected_ai_threads",
      where,
      sort: "-updatedAt",
      limit,
    });

    // If user-specific lookup returned 0 results, fallback to all threads for this project so historical conversations aren't lost
    if ((!result?.docs || result.docs.length === 0) && this.userId && this.userId !== 'anonymous') {
      result = await this.db.find({
        collection: "_dyrected_ai_threads",
        where: { projectId: this.projectId },
        sort: "-updatedAt",
        limit,
      });
    }

    return (result?.docs || []) as AIThread[];
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
    parts?: any[],
  ): Promise<AIMessage> {
    const message: AIMessage = {
      id: generateId(),
      threadId,
      role: "assistant",
      content,
      parts,
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
    let history = await this.getMessages(threadId);

    const lastMsg = history[history.length - 1];
    if (!lastMsg || lastMsg.role !== "user" || lastMsg.content !== userMessage) {
      await this.persistUserMessage(threadId, userMessage);
      history = await this.getMessages(threadId);
    }

    const messages = history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

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

  async createStreamResponse(
    threadId: string,
    userMessage: string,
    clientMessages?: any[],
    abortSignal?: AbortSignal,
    requestId?: string
  ): Promise<Response> {
    const startTime = Date.now();
    const context = await this.getContext();
    const systemPrompt = buildDyrectedSystemPrompt(context);
    let history = await this.getMessages(threadId);

    const lastMsg = history[history.length - 1];
    if (!lastMsg || lastMsg.role !== "user" || lastMsg.content !== userMessage) {
      await this.persistUserMessage(threadId, userMessage);
      history = await this.getMessages(threadId);
    }

    const messages: Array<{ role: 'user' | 'assistant'; content: string }> =
      Array.isArray(clientMessages) && clientMessages.length > 1
        ? clientMessages
            .map((m: any) => {
              let text = '';
              if (typeof m.content === 'string') {
                text = m.content;
              } else if (Array.isArray(m.parts)) {
                text = m.parts.map((p: any) => (p.type === 'text' ? p.text : '')).join('');
              }
              return {
                role: m.role as 'user' | 'assistant',
                content: text,
              };
            })
            .filter((m) => Boolean(m.content && m.content.trim()))
        : history.map((m) => ({
            role: m.role as 'user' | 'assistant',
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
      abortSignal,
      stopWhen: stepCountIs(maxSteps),
      maxRetries,
      temperature: 0.7,
      maxOutputTokens: 4096,
      onFinish: async (event) => {
        const latencyMs = Date.now() - startTime;
        try {
          const parts: any[] = [];
          if (event.steps && Array.isArray(event.steps)) {
            for (const step of event.steps) {
              if (step.toolCalls && Array.isArray(step.toolCalls)) {
                for (const tc of step.toolCalls) {
                  const matchingResult = step.toolResults?.find(
                    (tr: any) => tr.toolCallId === tc.toolCallId || tr.toolName === tc.toolName
                  ) as any;
                  const tcAny = tc as any;
                  parts.push({
                    type: 'tool-invocation',
                    toolInvocation: {
                      state: 'result',
                      toolCallId: tcAny.toolCallId,
                      toolName: tcAny.toolName,
                      args: tcAny.args ?? tcAny.input ?? {},
                      result: matchingResult ? (matchingResult.result ?? matchingResult.output) : undefined,
                    },
                  });
                }
              }
            }
          }
          if (event.text) {
            parts.push({
              type: 'text',
              text: event.text,
            });
          }

          await this.persistAssistantMessage(
            threadId,
            event.text,
            {
              tokens: event.usage?.totalTokens,
              finishReason: event.finishReason,
              latencyMs,
            },
            parts.length > 0 ? parts : undefined
          );

          aiLogger.info(
            {
              requestId,
              projectId: this.projectId,
              userId: this.userId,
              threadId,
              latencyMs,
              usage: event.usage,
              finishReason: event.finishReason,
            },
            'AI chat stream completed'
          );
        } catch (err) {
          aiLogger.error(
            {
              requestId,
              projectId: this.projectId,
              userId: this.userId,
              threadId,
              err,
            },
            'Failed to persist assistant message'
          );
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
