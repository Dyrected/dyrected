import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import type { DyrectedContext } from "../app.js";
import type { DyrectedConfig } from "../types/index.js";
import { AIAgent } from "../services/ai.service.js";
import { resolveAuthorizedSiteId, isSiteAuthorized } from "../utils/tenant.js";
import { mergeDynamicConfig } from "../utils/block-references.js";

export class AIController {
  private config: DyrectedConfig;

  constructor(config: DyrectedConfig) {
    this.config = config;
  }

  private async getAgent(c: Context<DyrectedContext>): Promise<AIAgent> {
    const user = c.get("user") as any;
    const tokenPayload = c.get("authTokenPayload") as any;
    const projectId = resolveAuthorizedSiteId(c);
    const db = c.get("config")?.db || this.config.db;

    if (!db) {
      throw new HTTPException(500, { message: "Database not initialized" });
    }

    let activeConfig = c.get("config") || this.config;
    if (activeConfig.onSchemaFetch && projectId && projectId !== "default") {
      const dynamicConfig = await activeConfig.onSchemaFetch(projectId);
      activeConfig = mergeDynamicConfig(activeConfig, dynamicConfig);
    }

    const userId = user?.id || user?.sub || user?._id || tokenPayload?.sub || tokenPayload?.id || "anonymous";

    const userName = user?.name || user?.username || user?.email?.split("@")[0] || tokenPayload?.name || "Editor";

    const userRole =
      user?.role || (Array.isArray(user?.roles) ? user.roles[0] : undefined) || tokenPayload?.role || "editor";

    return new AIAgent({
      db,
      config: activeConfig,
      projectId,
      userId,
      userName,
      userRole,
      user: user as any,
    });
  }

  async chat(c: Context<DyrectedContext>) {
    const agent = await this.getAgent(c);
    const body = await c.req.json().catch(() => ({}));

    const threadId = typeof body.threadId === "string" ? body.threadId : undefined;
    let content = body.content || body.prompt;

    if (!content && Array.isArray(body.messages) && body.messages.length > 0) {
      const last = body.messages[body.messages.length - 1];
      content = last.content || (last.parts?.[0]?.text ?? "");
    }

    if (!content || typeof content !== "string" || !content.trim()) {
      throw new HTTPException(400, { message: "Message content is required" });
    }

    content = content.trim();

    const thread = await agent.getOrCreateThread(threadId);
    const targetThreadId = thread.id;
    await agent.persistUserMessage(targetThreadId, content);

    if (!thread.title || thread.title === "New Conversation" || thread.title === "Conversation") {
      agent
        .generateTitle(content)
        .then((title) => {
          agent.updateThreadTitle(targetThreadId, title).catch(console.error);
        })
        .catch(console.error);
    }

    const requestId =
      (c.get("requestId" as any) as string) ||
      c.req.header("X-Request-Id") ||
      `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;

    return agent.createStreamResponse(
      targetThreadId,
      content,
      Array.isArray(body.messages) ? body.messages : undefined,
      c.req.raw?.signal,
      requestId,
    );
  }

  async createThread(c: Context<DyrectedContext>) {
    const agent = await this.getAgent(c);
    const body = await c.req.json().catch(() => ({}));
    const thread = await agent.createThread(typeof body.title === "string" ? body.title : undefined);
    return c.json({ thread }, 201);
  }

  async listThreads(c: Context<DyrectedContext>) {
    const agent = await this.getAgent(c);
    const limit = parseInt(c.req.query("limit") || "20", 10);
    const threads = await agent.listThreads(limit);
    return c.json({ threads });
  }

  async getThread(c: Context<DyrectedContext>) {
    const agent = await this.getAgent(c);
    const threadId = c.req.param("threadId");
    if (!threadId) {
      throw new HTTPException(400, { message: "Thread ID required" });
    }

    const thread = await agent.getThread(threadId);
    if (!thread) {
      throw new HTTPException(404, { message: "Thread not found" });
    }

    const messages = await agent.getMessages(threadId);
    return c.json({ thread, messages });
  }

  async postMessage(c: Context<DyrectedContext>) {
    const agent = await this.getAgent(c);
    const threadId = c.req.param("threadId");
    if (!threadId) {
      throw new HTTPException(400, { message: "Thread ID required" });
    }

    const thread = await agent.getThread(threadId);
    if (!thread) {
      throw new HTTPException(404, { message: "Thread not found" });
    }

    const body = await c.req.json().catch(() => ({}));
    let content = body.content || body.prompt;

    if (!content && Array.isArray(body.messages) && body.messages.length > 0) {
      const last = body.messages[body.messages.length - 1];
      content = last.content || (last.parts?.[0]?.text ?? "");
    }

    if (!content || typeof content !== "string" || !content.trim()) {
      throw new HTTPException(400, { message: "Message content is required" });
    }

    content = content.trim();

    await agent.persistUserMessage(threadId, content);

    if (!thread.title || thread.title === "New Conversation") {
      agent
        .generateTitle(content)
        .then((title: string) => {
          agent.updateThreadTitle(threadId, title).catch(console.error);
        })
        .catch(console.error);
    }

    return agent.createStreamResponse(threadId, content);
  }

  async deleteThread(c: Context<DyrectedContext>) {
    const agent = await this.getAgent(c);
    const threadId = c.req.param("threadId");
    if (!threadId) {
      throw new HTTPException(400, { message: "Thread ID required" });
    }
    await agent.deleteThread(threadId);
    return c.json({ success: true });
  }

  async clearThreads(c: Context<DyrectedContext>) {
    const agent = await this.getAgent(c);
    const count = await agent.clearAllThreads();
    return c.json({ success: true, count });
  }

  async reindex(c: Context<DyrectedContext>) {
    const db = c.get("config")?.db || this.config.db;
    if (!db) {
      throw new HTTPException(500, { message: "Database not initialized" });
    }

    const projectId = resolveAuthorizedSiteId(c);
    let activeConfig = c.get("config") || this.config;
    if (activeConfig.onSchemaFetch && projectId && projectId !== "default") {
      const dynamicConfig = await activeConfig.onSchemaFetch(projectId);
      activeConfig = mergeDynamicConfig(activeConfig, dynamicConfig);
    }

    const body = await c.req.json().catch(() => ({}));
    const targetCollection = typeof body.collection === "string" ? body.collection : undefined;
    const force = !!body.force;

    const { RAGService } = await import("../services/rag/rag.service.js");

    if (targetCollection) {
      const stats = await RAGService.reindexCollection({
        db,
        config: activeConfig,
        collection: targetCollection,
        projectId,
        force,
      });
      return c.json({ success: true, collections: [stats], totalChunks: stats.indexedChunks });
    }

    const result = await RAGService.reindexAll({
      db,
      config: activeConfig,
      projectId,
      force,
    });

    return c.json({ success: true, ...result });
  }

  async searchRAG(c: Context<DyrectedContext>) {
    const db = c.get("config")?.db || this.config.db;
    if (!db) {
      throw new HTTPException(500, { message: "Database not initialized" });
    }

    const user = c.get("user");
    const projectId = resolveAuthorizedSiteId(c);
    let activeConfig = c.get("config") || this.config;
    if (activeConfig.onSchemaFetch && projectId && projectId !== "default") {
      const dynamicConfig = await activeConfig.onSchemaFetch(projectId);
      activeConfig = mergeDynamicConfig(activeConfig, dynamicConfig);
    }

    const body = await c.req.json().catch(() => ({}));
    const query = typeof body.query === "string" ? body.query : "";
    const collections = Array.isArray(body.collections) ? body.collections : undefined;
    const limit = typeof body.limit === "number" ? body.limit : undefined;
    const minScore = typeof body.minScore === "number" ? body.minScore : undefined;

    if (!query.trim()) {
      throw new HTTPException(400, { message: "Search query is required" });
    }

    const { RAGService } = await import("../services/rag/rag.service.js");
    const result = await RAGService.search({
      db,
      config: activeConfig,
      query,
      projectId,
      collections,
      limit,
      minScore,
      user: user as any,
    });

    return c.json(result);
  }

  async getAction(c: Context<DyrectedContext>) {
    const db = c.get("config")?.db || this.config.db;
    if (!db) {
      throw new HTTPException(500, { message: "Database not initialized" });
    }

    const projectId = resolveAuthorizedSiteId(c);
    const actionId = c.req.param("actionId");
    if (!actionId) {
      throw new HTTPException(400, { message: "Action ID required" });
    }

    const { AI_ACTIONS_COLLECTION } = await import("../types/ai.js");
    const action = await db.findOne({
      collection: AI_ACTIONS_COLLECTION,
      id: actionId,
    });

    if (!action || (action.projectId && projectId !== "default" && action.projectId !== projectId)) {
      throw new HTTPException(404, { message: `Action "${actionId}" not found` });
    }

    return c.json({ action });
  }

  async executeAction(c: Context<DyrectedContext>) {
    const db = c.get("config")?.db || this.config.db;
    if (!db) {
      throw new HTTPException(500, { message: "Database not initialized" });
    }

    const user = typeof c.get === "function" ? (c.get("user") as any) : undefined;
    const tokenPayload = typeof c.get === "function" ? (c.get("authTokenPayload") as any) : undefined;
    const projectId = resolveAuthorizedSiteId(c);
    const actionId = c.req.param("actionId");
    if (!actionId) {
      throw new HTTPException(400, { message: "Action ID required" });
    }

    const { AI_ACTIONS_COLLECTION, AI_AUDIT_COLLECTION } = await import("../types/ai.js");
    const action = await db.findOne({
      collection: AI_ACTIONS_COLLECTION,
      id: actionId,
    });

    if (!action) {
      throw new HTTPException(404, { message: `Action "${actionId}" not found` });
    }

    if (action.projectId && projectId !== "default" && action.projectId !== projectId) {
      throw new HTTPException(403, { message: `Forbidden: Action "${actionId}" belongs to another site` });
    }

    if (action.projectId && !isSiteAuthorized(action.projectId, user, tokenPayload)) {
      throw new HTTPException(403, { message: `Forbidden: User is not authorized to execute actions for site "${action.projectId}"` });
    }

    if (action.status === "executing") {
      throw new HTTPException(409, { message: "Action is currently being executed by another process. Please wait." });
    }

    if (action.status === "executed") {
      return c.json({ success: true, message: "Action has already been executed", action });
    }

    if (action.status === "rejected") {
      throw new HTTPException(400, { message: "Action was previously rejected and cannot be executed" });
    }

    if (action.status !== "pending") {
      throw new HTTPException(400, { message: `Action cannot be executed in status "${action.status}".` });
    }

    if (action.expiresAt && new Date(action.expiresAt) < new Date()) {
      await db.update({
        collection: AI_ACTIONS_COLLECTION,
        id: actionId,
        data: { status: "failed", errorMessage: "Action expired before approval" },
      });
      throw new HTTPException(400, {
        message: "Action has expired. Please ask the assistant to propose a new change.",
      });
    }

    // Acquire atomic execution lock immediately to close the concurrency window
    await db.update({
      collection: AI_ACTIONS_COLLECTION,
      id: actionId,
      data: { status: "executing" },
    });

    let activeConfig = c.get("config") || this.config;
    if (activeConfig.onSchemaFetch && projectId && projectId !== "default") {
      const dynamicConfig = await activeConfig.onSchemaFetch(projectId);
      activeConfig = mergeDynamicConfig(activeConfig, dynamicConfig);
    }

    // Dual-gate authorization verification
    const { isAccessAllowed } = await import("../auth/access.js");
    const { validatePayloadAgainstFields } = await import("../services/ai-tools.js");

    if (action.targetCollection) {
      const col = activeConfig.collections?.find((c) => c.slug === action.targetCollection);
      if (!col) {
        await db.update({
          collection: AI_ACTIONS_COLLECTION,
          id: actionId,
          data: { status: "failed", errorMessage: `Target collection "${action.targetCollection}" no longer exists` },
        });
        throw new HTTPException(404, { message: `Target collection "${action.targetCollection}" not found` });
      }

      let opAccess = col.access?.update;
      if (action.type === "createDocument") opAccess = col.access?.create;
      else if (action.type === "deleteDocument") opAccess = col.access?.delete;

      const allowed = await isAccessAllowed(activeConfig, opAccess, {
        req: { user, siteId: projectId } as any,
        user: user as any,
        data: action.proposedData,
        doc: action.beforeSnapshot,
      });

      if (!allowed) {
        await db.update({
          collection: AI_ACTIONS_COLLECTION,
          id: actionId,
          data: { status: "pending" },
        });
        throw new HTTPException(403, {
          message: `Access denied: you do not have permission to execute ${action.type} on "${action.targetCollection}"`,
        });
      }

      // Re-validate against current live schema to protect against schema drift
      if (action.type === "createDocument" || action.type === "updateDocument") {
        const fields = col.fields?.map((f: any) => ({ name: f.name, type: f.type, required: !!f.required })) || [];
        const validation = validatePayloadAgainstFields(fields, action.proposedData || {}, action.type === "updateDocument");
        if (!validation.valid) {
          await db.update({
            collection: AI_ACTIONS_COLLECTION,
            id: actionId,
            data: { status: "failed", errorMessage: `Schema drift: ${validation.error}` },
          });
          throw new HTTPException(400, {
            message: `Cannot execute action due to schema drift: ${validation.error}. Please ask the assistant to propose a fresh update.`,
          });
        }
      }
    }

    if (action.targetGlobal) {
      const glb = activeConfig.globals?.find((g) => g.slug === action.targetGlobal);
      if (!glb) {
        await db.update({
          collection: AI_ACTIONS_COLLECTION,
          id: actionId,
          data: { status: "failed", errorMessage: `Target global "${action.targetGlobal}" no longer exists` },
        });
        throw new HTTPException(404, { message: `Target global "${action.targetGlobal}" not found` });
      }

      const allowed = await isAccessAllowed(activeConfig, glb.access?.update, {
        req: { user, siteId: projectId } as any,
        user: user as any,
        data: action.proposedData,
        doc: action.beforeSnapshot,
      });

      if (!allowed) {
        await db.update({
          collection: AI_ACTIONS_COLLECTION,
          id: actionId,
          data: { status: "pending" },
        });
        throw new HTTPException(403, {
          message: `Access denied: you do not have permission to execute update on global "${action.targetGlobal}"`,
        });
      }
    }

    let snapshotAfter: any = null;
    let rollbackPayload: any = null;

    try {
      if (action.type === "createDocument") {
        snapshotAfter = await db.create({
          collection: action.targetCollection!,
          data: action.proposedData,
        });
        rollbackPayload = { id: snapshotAfter.id };
      } else if (action.type === "updateDocument") {
        snapshotAfter = await db.update({
          collection: action.targetCollection!,
          id: action.documentId!,
          data: action.proposedData,
        });
        rollbackPayload = action.beforeSnapshot;
      } else if (action.type === "deleteDocument") {
        await db.delete({
          collection: action.targetCollection!,
          id: action.documentId!,
        });
        snapshotAfter = null;
        rollbackPayload = action.beforeSnapshot;
      } else if (action.type === "updateGlobal") {
        snapshotAfter = await db.updateGlobal({
          slug: action.targetGlobal!,
          data: action.proposedData,
        });
        rollbackPayload = action.beforeSnapshot;
      }

      // Write immutable audit log
      const auditId = `aud_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
      await db.create({
        collection: AI_AUDIT_COLLECTION,
        data: {
          id: auditId,
          projectId,
          actionId,
          executedBy: user?.id,
          actionType: action.type,
          target: action.targetCollection
            ? `${action.targetCollection}${action.documentId ? "/" + action.documentId : ""}`
            : `globals/${action.targetGlobal}`,
          snapshotBefore: action.beforeSnapshot || null,
          snapshotAfter: snapshotAfter || null,
          rollbackPayload: rollbackPayload || null,
          createdAt: new Date(),
        },
      });

      // Update action status to executed
      const executedAction = await db.update({
        collection: AI_ACTIONS_COLLECTION,
        id: actionId,
        data: {
          status: "executed",
          executedAt: new Date(),
        },
      });

      // Auto-trigger RAG indexing in background if collection document was modified
      if (action.targetCollection && snapshotAfter && this.config.ai?.rag?.enabled !== false) {
        import("../services/rag/rag.service.js")
          .then(({ RAGService }) => {
            RAGService.indexDocument({
              db,
              config: this.config,
              collection: action.targetCollection!,
              doc: snapshotAfter as Record<string, unknown>,
              projectId,
            }).catch((e: unknown) => console.error("[dyrected/ai] RAG index after mutation failed:", e));
          })
          .catch(() => {});
      } else if (action.type === "deleteDocument" && action.targetCollection && action.documentId) {
        import("../services/rag/rag.service.js")
          .then(({ RAGService }) => {
            RAGService.deleteDocumentChunks({
              db,
              collection: action.targetCollection!,
              documentId: action.documentId!,
              projectId,
            }).catch((e: unknown) => console.error("[dyrected/ai] RAG delete after mutation failed:", e));
          })
          .catch(() => {});
      }

      return c.json({
        success: true,
        action: executedAction,
        result: snapshotAfter,
      });
    } catch (err: any) {
      await db.update({
        collection: AI_ACTIONS_COLLECTION,
        id: actionId,
        data: {
          status: "failed",
          errorMessage: err.message,
        },
      });
      throw new HTTPException(500, { message: `Mutation execution failed: ${err.message}` });
    }
  }

  async rejectAction(c: Context<DyrectedContext>) {
    const db = c.get("config")?.db || this.config.db;
    if (!db) {
      throw new HTTPException(500, { message: "Database not initialized" });
    }

    const user = typeof c.get === "function" ? (c.get("user") as any) : undefined;
    const tokenPayload = typeof c.get === "function" ? (c.get("authTokenPayload") as any) : undefined;
    const projectId = resolveAuthorizedSiteId(c);
    const actionId = c.req.param("actionId");
    if (!actionId) {
      throw new HTTPException(400, { message: "Action ID required" });
    }

    const { AI_ACTIONS_COLLECTION, AI_AUDIT_COLLECTION } = await import("../types/ai.js");
    const action = await db.findOne({
      collection: AI_ACTIONS_COLLECTION,
      id: actionId,
    });

    if (!action) {
      throw new HTTPException(404, { message: `Action "${actionId}" not found` });
    }

    if (action.projectId && projectId !== "default" && action.projectId !== projectId) {
      throw new HTTPException(403, { message: `Forbidden: Action "${actionId}" belongs to another site` });
    }

    if (action.projectId && !isSiteAuthorized(action.projectId, user, tokenPayload)) {
      throw new HTTPException(403, { message: `Forbidden: User is not authorized to reject actions for site "${action.projectId}"` });
    }

    if (action.status === "executed") {
      throw new HTTPException(400, { message: "Cannot reject an action that has already been executed" });
    }

    const rejectedAction = await db.update({
      collection: AI_ACTIONS_COLLECTION,
      id: actionId,
      data: {
        status: "rejected",
      },
    });

    const auditId = `aud_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
    await db.create({
      collection: AI_AUDIT_COLLECTION,
      data: {
        id: auditId,
        projectId,
        actionId,
        executedBy: user?.id,
        actionType: "action_rejected",
        target: action.targetCollection
          ? `${action.targetCollection}${action.documentId ? "/" + action.documentId : ""}`
          : `globals/${action.targetGlobal}`,
        snapshotBefore: action.beforeSnapshot || null,
        snapshotAfter: null,
        rollbackPayload: null,
        createdAt: new Date(),
      },
    }).catch((auditErr: any) => console.error("[dyrected/ai] Failed to record rejection audit:", auditErr));

    return c.json({ success: true, action: rejectedAction });
  }
}
