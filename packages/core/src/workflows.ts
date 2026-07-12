import type {
  AuthenticatedUser,
  BaseDocument,
  CollectionConfig,
  DatabaseAdapter,
  DyrectedConfig,
  HookRequestContext,
  LifecycleEvent,
  LifecycleEventName,
  WorkflowConfig,
  WorkflowMetadata,
  WorkflowTransition,
} from "./types/index.js";

export const WORKFLOW_HISTORY_COLLECTION = "__workflow_history";
export const LIFECYCLE_EVENTS_COLLECTION = "__lifecycle_events";

export function publishingWorkflow(): WorkflowConfig {
  return {
    initialState: "draft",
    draftState: "draft",
    states: [
      { name: "draft", label: "Draft", color: "neutral" },
      { name: "in_review", label: "In review", color: "warning" },
      { name: "published", label: "Published", color: "success", published: true },
    ],
    transitions: [
      { name: "submit", label: "Submit for review", from: "draft", to: "in_review", requiredCapabilities: ["entry.submit"] },
      { name: "publish", label: "Publish", from: "in_review", to: "published", requiredCapabilities: ["entry.publish"] },
      { name: "reject", label: "Request changes", from: "in_review", to: "draft", requiredCapabilities: ["entry.publish"], requireComment: true },
      { name: "unpublish", label: "Unpublish", from: "published", to: "draft", requiredCapabilities: ["entry.unpublish"], unpublish: true },
    ],
    roles: [
      { role: "editor", capabilities: ["entry.edit", "entry.submit"] },
      { role: "publisher", capabilities: ["entry.edit", "entry.submit", "entry.publish", "entry.unpublish"] },
      { role: "admin", capabilities: ["entry.edit", "entry.submit", "entry.publish", "entry.unpublish"] },
    ],
  };
}

export function simplePublishingWorkflow(): WorkflowConfig {
  return {
    initialState: "draft",
    draftState: "draft",
    states: [
      { name: "draft", label: "Draft", color: "neutral" },
      { name: "published", label: "Published", color: "success", published: true },
    ],
    transitions: [
      { name: "publish", label: "Publish", from: "draft", to: "published" },
      { name: "unpublish", label: "Unpublish", from: "published", to: "draft", unpublish: true },
    ],
  };
}


function publicMetadata(meta: WorkflowMetadata): WorkflowMetadata {
  const { availableTransitions: _availableTransitions, ...safe } = meta;
  return safe;
}

export function workflowCapabilities(workflow: WorkflowConfig, user?: AuthenticatedUser): Set<string> {
  const capabilities = new Set<string>(Array.isArray(user?.capabilities) ? user.capabilities as string[] : []);
  const roles = Array.isArray(user?.roles) ? user.roles : [];
  for (const mapping of workflow.roles ?? []) {
    if (roles.includes(mapping.role)) mapping.capabilities.forEach((capability) => capabilities.add(capability));
  }
  return capabilities;
}

export function canViewWorkflowDraft(workflow: WorkflowConfig, user?: AuthenticatedUser): boolean {
  if (!user) return false;
  const capabilities = workflowCapabilities(workflow, user);
  if (capabilities.has("entry.edit")) return true;
  return workflow.transitions.some((transition) =>
    (transition.requiredCapabilities ?? []).some((capability) => capabilities.has(capability)),
  );
}

export function availableWorkflowTransitions(
  workflow: WorkflowConfig,
  state: string,
  user?: AuthenticatedUser,
): WorkflowTransition[] {
  const capabilities = workflowCapabilities(workflow, user);
  return workflow.transitions.filter((transition) => {
    const from = Array.isArray(transition.from) ? transition.from : [transition.from];
    return from.includes(state) && (transition.requiredCapabilities ?? []).every((item) => capabilities.has(item));
  });
}

export function initializeWorkflowDocument(data: Record<string, unknown>, workflow: WorkflowConfig) {
  return {
    ...data,
    __workflow: { state: workflow.initialState, revision: 1 } satisfies WorkflowMetadata,
  };
}

/** The state a legacy document is treated as: the published one, else the last. */
function publishedStateName(workflow: WorkflowConfig): string {
  return (
    workflow.states.find((state) => state.published)?.name ??
    workflow.states[workflow.states.length - 1]?.name ??
    workflow.initialState
  );
}

export function materializeWorkflowDocument(
  doc: BaseDocument,
  workflow: WorkflowConfig,
  user?: AuthenticatedUser,
): BaseDocument | null {
  const meta = doc.__workflow as WorkflowMetadata | undefined;

  // Legacy content: a document that predates the workflow (no `__workflow`).
  // Treat it as already-published live content — its own fields are the
  // published snapshot — so it stays visible to everyone and surfaces the
  // workflow panel in the Admin. Without this, enabling `drafts`/workflow on an
  // existing collection would leave old documents with no workflow metadata.
  if (!meta) {
    const { __published: _legacyPublished, __workflow: _legacyWorkflow, ...working } = doc;
    const state = publishedStateName(workflow);
    return {
      ...working,
      _workflow: {
        state,
        revision: 1,
        availableTransitions: availableWorkflowTransitions(workflow, state, user).map((item) => item.name),
      },
    };
  }

  const { __published, __workflow, ...working } = doc;

  if (!canViewWorkflowDraft(workflow, user)) {
    if (!__published || typeof __published !== "object") return null;
    return { id: doc.id, ...(__published as Record<string, unknown>), _workflow: publicMetadata(meta) };
  }

  return {
    ...working,
    _workflow: {
      ...meta,
      availableTransitions: availableWorkflowTransitions(workflow, meta.state, user).map((item) => item.name),
    },
  };
}

function eventId() {
  return globalThis.crypto?.randomUUID?.() ?? `evt_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function createLifecycleEvent(args: {
  name: LifecycleEventName;
  collection: string;
  documentId: string;
  actorId?: string;
  payload: Record<string, unknown>;
}): LifecycleEvent {
  return {
    id: eventId(),
    name: args.name,
    collection: args.collection,
    documentId: args.documentId,
    occurredAt: new Date().toISOString(),
    actorId: args.actorId,
    payload: args.payload,
    attempts: 0,
    status: "pending",
  };
}

async function persistEvent(db: DatabaseAdapter, event: LifecycleEvent) {
  await db.create({ collection: LIFECYCLE_EVENTS_COLLECTION, data: event as any });
}

export async function dispatchLifecycleEvent(config: DyrectedConfig, event: LifecycleEvent): Promise<void> {
  const db = config.db;
  if (!db || !config.events?.handlers.length) return;
  const maxAttempts = config.events.maxAttempts ?? 8;
  const retryDelayMs = config.events.retryDelayMs ?? 1_000;
  const attempts = event.attempts + 1;

  try {
    await db.update({ collection: LIFECYCLE_EVENTS_COLLECTION, id: event.id, data: { status: "processing", attempts } });
    for (const handler of config.events.handlers) await handler({ ...event, status: "processing", attempts });
    await db.update({
      collection: LIFECYCLE_EVENTS_COLLECTION,
      id: event.id,
      data: { status: "delivered", attempts, deliveredAt: new Date().toISOString(), lastError: null },
    });
  } catch (error) {
    const exhausted = attempts >= maxAttempts;
    await db.update({
      collection: LIFECYCLE_EVENTS_COLLECTION,
      id: event.id,
      data: {
        status: "failed",
        attempts,
        lastError: error instanceof Error ? error.message : String(error),
        nextAttemptAt: exhausted ? null : new Date(Date.now() + retryDelayMs * 2 ** (attempts - 1)).toISOString(),
      },
    });
  }
}

export async function dispatchPendingLifecycleEvents(config: DyrectedConfig, limit = 50): Promise<number> {
  if (!config.db || !config.events?.handlers.length) return 0;
  const maxAttempts = config.events.maxAttempts ?? 8;
  const result = await config.db.find({
    collection: LIFECYCLE_EVENTS_COLLECTION,
    where: { status: { in: ["pending", "failed"] } },
    sort: "occurredAt",
    limit,
  });
  const now = Date.now();
  const due = result.docs.filter((doc) =>
    Number(doc.attempts ?? 0) < maxAttempts &&
    (!doc.nextAttemptAt || new Date(doc.nextAttemptAt).getTime() <= now),
  );
  for (const event of due) await dispatchLifecycleEvent(config, event as LifecycleEvent);
  return due.length;
}

export async function saveWorkflowDraft(args: {
  config: DyrectedConfig;
  collection: CollectionConfig;
  id: string;
  originalDoc: BaseDocument;
  data: Record<string, unknown>;
  user?: AuthenticatedUser;
}): Promise<{ doc: BaseDocument; event: LifecycleEvent }> {
  const { config, collection, id, originalDoc, data, user } = args;
  const db = config.db!;
  const workflow = collection.workflow!;
  if (!db.transaction) throw new Error(`The configured database adapter does not support workflow transactions.`);
  const previous = originalDoc.__workflow as WorkflowMetadata;
  const event = createLifecycleEvent({
    name: "revision.created",
    collection: collection.slug,
    documentId: id,
    actorId: user?.sub,
    payload: { revision: previous.revision + 1, previousRevision: previous.revision },
  });

  const doc = await db.transaction(async (tx) => {
    const nextMeta: WorkflowMetadata = {
      ...previous,
      state: originalDoc.__published ? workflow.draftState ?? workflow.initialState : previous.state,
      revision: previous.revision + 1,
    };
    const updated = await tx.update({ collection: collection.slug, id, data: { ...data, __workflow: nextMeta } });
    await persistEvent(tx, event);
    return updated;
  });

  void dispatchLifecycleEvent(config, event);
  return { doc, event };
}

export async function createWorkflowDocument(args: {
  config: DyrectedConfig;
  collection: CollectionConfig;
  data: Record<string, unknown>;
  user?: AuthenticatedUser;
}): Promise<{ doc: BaseDocument; event: LifecycleEvent }> {
  const { config, collection, data, user } = args;
  const db = config.db!;
  if (!db.transaction) throw new Error(`The configured database adapter does not support workflow transactions.`);
  let event!: LifecycleEvent;
  const doc = await db.transaction(async (tx) => {
    const created = await tx.create({ collection: collection.slug, data });
    event = createLifecycleEvent({
      name: "revision.created",
      collection: collection.slug,
      documentId: created.id,
      actorId: user?.sub,
      payload: { revision: 1, previousRevision: null },
    });
    await persistEvent(tx, event);
    return created;
  });
  void dispatchLifecycleEvent(config, event);
  return { doc, event };
}

export async function transitionWorkflow(args: {
  config: DyrectedConfig;
  collection: CollectionConfig;
  id: string;
  transitionName: string;
  expectedRevision?: number;
  comment?: string;
  user?: AuthenticatedUser;
  req: HookRequestContext;
}): Promise<BaseDocument> {
  const { config, collection, id, transitionName, expectedRevision, comment, user, req } = args;
  const db = config.db!;
  const workflow = collection.workflow!;
  if (!db.transaction) throw new Error(`The configured database adapter does not support workflow transactions.`);
  const original = await db.findOne({ collection: collection.slug, id });
  if (!original) throw Object.assign(new Error("Not Found"), { statusCode: 404 });
  const meta = original.__workflow as WorkflowMetadata;
  if (!meta) throw Object.assign(new Error("Entry has no workflow metadata"), { statusCode: 409 });
  if (expectedRevision !== undefined && expectedRevision !== meta.revision) {
    throw Object.assign(new Error("This entry changed since it was loaded. Refresh before transitioning it."), { statusCode: 409 });
  }
  const transition = workflow.transitions.find((item) => item.name === transitionName);
  const fromStates = transition ? (Array.isArray(transition.from) ? transition.from : [transition.from]) : [];
  if (!transition || !fromStates.includes(meta.state)) {
    throw Object.assign(new Error(`Transition "${transitionName}" is not valid from "${meta.state}".`), { statusCode: 409 });
  }
  if (!availableWorkflowTransitions(workflow, meta.state, user).some((item) => item.name === transition.name)) {
    throw Object.assign(new Error(`You do not have permission to perform "${transition.label}".`), { statusCode: 403 });
  }
  if (transition.requireComment && !comment?.trim()) {
    throw Object.assign(new Error(`A comment is required for "${transition.label}".`), { statusCode: 400 });
  }

  const hookContext = { transition, from: meta.state, to: transition.to, doc: original, user, comment, req, db };
  for (const hook of workflow.hooks?.beforeTransition ?? []) await hook(hookContext);

  const events: LifecycleEvent[] = [createLifecycleEvent({
    name: "workflow.transitioned",
    collection: collection.slug,
    documentId: id,
    actorId: user?.sub,
    payload: { transition: transition.name, from: meta.state, to: transition.to, revision: meta.revision, comment },
  })];
  const targetState = workflow.states.find((state) => state.name === transition.to)!;
  if (targetState.published) {
    events.push(createLifecycleEvent({ name: "entry.published", collection: collection.slug, documentId: id, actorId: user?.sub, payload: { revision: meta.revision } }));
  } else if (transition.unpublish) {
    events.push(createLifecycleEvent({ name: "entry.unpublished", collection: collection.slug, documentId: id, actorId: user?.sub, payload: { revision: meta.publishedRevision } }));
  }

  const updated = await db.transaction(async (tx) => {
    const locked = await tx.findOne({ collection: collection.slug, id });
    if (!locked) throw Object.assign(new Error("Not Found"), { statusCode: 404 });
    const lockedMeta = locked.__workflow as WorkflowMetadata;
    if (
      lockedMeta.revision !== meta.revision ||
      lockedMeta.state !== meta.state ||
      (expectedRevision !== undefined && lockedMeta.revision !== expectedRevision)
    ) {
      throw Object.assign(new Error("This entry changed since it was loaded. Refresh before transitioning it."), { statusCode: 409 });
    }
    const now = new Date().toISOString();
    const { __published: _published, __workflow: _workflow, id: _id, ...working } = locked;
    const nextMeta: WorkflowMetadata = {
      ...lockedMeta,
      state: transition.to,
      ...(targetState.published ? { publishedRevision: lockedMeta.revision, publishedAt: now, publishedBy: user?.sub } : {}),
      ...(transition.unpublish ? { publishedRevision: undefined, publishedAt: undefined, publishedBy: undefined } : {}),
    };
    const data: Record<string, unknown> = { __workflow: nextMeta };
    if (targetState.published) data.__published = working;
    if (transition.unpublish) data.__published = null;
    const next = await tx.update({ collection: collection.slug, id, data });
    await tx.create({
      collection: WORKFLOW_HISTORY_COLLECTION,
      data: { collection: collection.slug, documentId: id, transition: transition.name, from: lockedMeta.state, to: transition.to, revision: lockedMeta.revision, comment: comment ?? null, actorId: user?.sub ?? null, createdAt: now },
    });
    for (const event of events) await persistEvent(tx, event);
    if (collection.audit) {
      await tx.create({ collection: "__audit", data: { collection: collection.slug, documentId: id, operation: "workflow.transition", user: user?.sub ?? null, timestamp: now, changes: JSON.stringify({ transition: transition.name, from: lockedMeta.state, to: transition.to, revision: lockedMeta.revision }) } });
    }
    return next;
  });

  for (const event of events) void dispatchLifecycleEvent(config, event);
  for (const hook of workflow.hooks?.afterTransition ?? []) {
    try { await hook({ ...hookContext, doc: updated, event: events[0] }); } catch (error) { console.error("[dyrected/workflow] afterTransition hook failed:", error); }
  }
  return updated;
}
