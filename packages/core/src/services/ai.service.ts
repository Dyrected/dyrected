import { google } from '@ai-sdk/google';
import { streamText, generateText } from 'ai';
import type { DatabaseAdapter } from '../types/adapters.js';
import type { DyrectedConfig, CollectionConfig } from '../types/index.js';
import type { DyrectedAIContext, AIThread, AIMessage } from '../types/ai.js';

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export function buildDyrectedSystemPrompt(context: DyrectedAIContext): string {
  const { project, collections, globals, user } = context;

  const collectionSummaries = collections.map((c) => {
    const fields = c.fields?.map((f) => `${f.name} (${f.type}${f.required ? ', required' : ''})`).join(', ');
    return `- Collection "${c.label || c.slug}" (slug: "${c.slug}"): [${fields || 'no fields defined'}]`;
  }).join('\n');

  const globalSummaries = globals.map((g) => {
    return `- Global "${g.label || g.slug}" (slug: "${g.slug}")`;
  }).join('\n');

  return `
You are the Dyrected AI Assistant — an elite conversion copywriter, content strategist, and technical CMS specialist embedded natively inside Dyrected Headless CMS.

### 1. CMS DOMAIN & CONTEXT
- Dyrected is a declarative, schema-driven Headless CMS.
- Structure: **Collections** (multi-entry datasets like Articles, Products, Authors) and **Globals** (singletons like Site Settings, Nav).
- Project: "${project.name}" (ID: ${project.id})
- User: ${user.name || 'Editor'} (Role: ${user.role || 'editor'})
- Available Collections:
${collectionSummaries || '  (None)'}
- Available Globals:
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

### 4. CADENCE, RHYTHM & HUMAN VOICE (Gary Provost Principle)
- **Write Music:** Alternately mix short, punchy sentences (3–7 words) for emphasis with longer, compound sentences (18–25+ words) that build depth and momentum.
- **Break Monotony:** Never write more than two consecutive sentences of similar length.

### 5. STRICT LINGUISTIC BANS (Eliminating "AI Tells")
Never use clichéd vocabulary and structural tropes that signal machine-generated text:
- **Banned Verbs:** delve, leverage, unlock, unleash, harness, utilize, empower, transform, elevate, streamline, foster, navigate.
- **Banned Adjectives:** robust, seamless, cutting-edge, game-changing, groundbreaking, innovative, vital, crucial, myriad, bespoke, vibrant.
- **Banned Transitional Filler:** "In today's fast-paced world", "In the ever-changing digital landscape", "It's important to note", "At the end of the day", "Furthermore", "Moreover", "In conclusion".
- **Banned Contrastive Tropes:** Never use "It's not just about X, it's about Y" or "It's not merely X; it's Y".
- **Em Dash Ban:** Do not overuse em dashes (—); use natural punctuation.

### 6. ANTI-HALLUCINATION GUARD
- Never fabricate company statistics, pricing, or technical claims.
- Insert bracketed placeholders like \`[Insert Metric]\`, \`[Insert Price]\`, \`[Insert Year]\` when specific facts are needed.

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
3. **Structured Tables & Code Tags:** Use Markdown tables for comparisons. Always specify language identifiers on code blocks (\`\`\`html, \`\`\`json, \`\`\`ts).
4. **Actionable Next Steps:** End with 1–2 sharp, practical editorial suggestions.
`;
}

export interface AIAgentOptions {
  db: DatabaseAdapter;
  config: DyrectedConfig;
  projectId: string;
  userId: string;
  userName?: string;
  userRole?: string;
}

export class AIAgent {
  private db: DatabaseAdapter;
  private config: DyrectedConfig;
  private projectId: string;
  private userId: string;
  private userName?: string;
  private userRole?: string;
  private contextCache: DyrectedAIContext | null = null;

  constructor(options: AIAgentOptions) {
    this.db = options.db;
    this.config = options.config;
    this.projectId = options.projectId;
    this.userId = options.userId;
    this.userName = options.userName;
    this.userRole = options.userRole;
  }

  async getContext(): Promise<DyrectedAIContext> {
    if (this.contextCache) return this.contextCache;

    const collections = this.config.collections
      .filter((c) => !c.slug.startsWith('_dyrected_'))
      .map((c) => ({
        slug: c.slug,
        label: c.labels?.plural || c.slug,
        fields: c.fields?.map((f) => ({
          name: f.name,
          type: f.type,
          required: f.required,
        })) as Array<{ name: string; type: string; required?: boolean }>,
      })) as Array<{ slug: string; label?: string; fields?: Array<{ name: string; type: string; required?: boolean }> }>;

    const globals = this.config.globals
      .filter((g) => !g.slug.startsWith('_dyrected_'))
      .map((g) => ({
        slug: g.slug,
        label: g.label || g.slug,
      }));

    const project = {
      name: this.config.admin?.meta?.titleSuffix?.replace(/^- /, '') || 'Dyrected Project',
      id: this.projectId,
    };

    this.contextCache = { project, collections, globals, user: { name: this.userName, role: this.userRole } };
    return this.contextCache;
  }

  async getThread(threadId: string): Promise<AIThread | null> {
    const thread = await this.db.findOne({ collection: '_dyrected_ai_threads', id: threadId });
    return thread as AIThread | null;
  }

  async updateThreadTitle(threadId: string, title: string): Promise<void> {
    await this.db.update({
      collection: '_dyrected_ai_threads',
      id: threadId,
      data: { title, updatedAt: new Date() },
    });
  }

  async createThread(title?: string): Promise<AIThread> {
    const thread: AIThread = {
      id: generateId(),
      projectId: this.projectId,
      userId: this.userId,
      title: title || 'New Conversation',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await this.db.create({ collection: '_dyrected_ai_threads', data: thread });
    return thread;
  }

  async listThreads(limit = 20): Promise<AIThread[]> {
    const result = await this.db.find({
      collection: '_dyrected_ai_threads',
      where: { projectId: this.projectId, userId: this.userId },
      sort: '-updatedAt',
      limit,
    });
    return result.docs as AIThread[];
  }

  async getMessages(threadId: string): Promise<AIMessage[]> {
    const result = await this.db.find({
      collection: '_dyrected_ai_messages',
      where: { threadId },
      sort: 'createdAt',
      limit: 100,
    });
    return result.docs as AIMessage[];
  }

  async persistUserMessage(threadId: string, content: string): Promise<AIMessage> {
    const message: AIMessage = {
      id: generateId(),
      threadId,
      role: 'user',
      content,
      createdAt: new Date(),
    };
    await this.db.create({ collection: '_dyrected_ai_messages', data: message });
    await this.db.update({
      collection: '_dyrected_ai_threads',
      id: threadId,
      data: { updatedAt: new Date() },
    });
    return message;
  }

  async persistAssistantMessage(
    threadId: string,
    content: string,
    metadata?: Record<string, unknown>
  ): Promise<AIMessage> {
    const message: AIMessage = {
      id: generateId(),
      threadId,
      role: 'assistant',
      content,
      createdAt: new Date(),
      metadata,
    };
    await this.db.create({ collection: '_dyrected_ai_messages', data: message });
    await this.db.update({
      collection: '_dyrected_ai_threads',
      id: threadId,
      data: { updatedAt: new Date() },
    });
    return message;
  }

  async generateTitle(userMessage: string): Promise<string> {
    const { text } = await generateText({
      model: google('gemini-2.5-flash'),
      prompt: `Summarize this user request in 3-5 words for a chat thread title: "${userMessage}"`,
      temperature: 0.3,
      maxOutputTokens: 20,
    });
    return text.trim().slice(0, 50);
  }

  async *streamReply(
    threadId: string,
    userMessage: string
  ): AsyncGenerator<string, { text: string; usage?: any; finishReason: string }, void> {
    const context = await this.getContext();
    const systemPrompt = buildDyrectedSystemPrompt(context);
    const history = await this.getMessages(threadId);

    const messages = [
      ...history.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user' as const, content: userMessage },
    ];

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured on the server.');
    }

    const result = streamText({
      model: google('gemini-2.5-flash'),
      system: systemPrompt,
      messages,
      temperature: 0.7,
      maxOutputTokens: 4096,
    });

    let fullText = '';
    let usage: any;
    let finishReason: string = 'stop';

    for await (const chunk of result.textStream) {
      fullText += chunk;
      yield chunk;
    }

    const finishResult = await result;
    usage = finishResult.usage;
    finishReason = await finishResult.finishReason;

    await this.persistAssistantMessage(threadId, fullText, {
      tokens: usage?.totalTokens,
      finishReason,
    });

    return { text: fullText, usage, finishReason };
  }
}