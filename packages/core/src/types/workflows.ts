import type { DatabaseAdapter } from "./adapters.js";
import type { AuthenticatedUser, HookRequestContext } from "./request.js";

export const LIFECYCLE_EVENT_NAMES = [
  "revision.created",
  "workflow.transitioned",
  "entry.published",
  "entry.unpublished",
] as const;

export type LifecycleEventName = (typeof LIFECYCLE_EVENT_NAMES)[number];

export interface WorkflowState {
  /** Stable machine-readable state key. */
  name: string;
  /** Label rendered in the Admin UI. */
  label: string;
  /** Marks the state whose revision is visible to public readers. */
  published?: boolean;
  /** Optional visual tone used by the Admin UI. */
  color?: "neutral" | "warning" | "success" | "danger" | "info";
}

export interface WorkflowTransition {
  /** Stable transition key used by the REST and SDK APIs. */
  name: string;
  label: string;
  from: string | string[];
  to: string;
  /** Every listed capability is required. */
  requiredCapabilities?: string[];
  /** Require a non-empty comment when performing the transition. */
  requireComment?: boolean;
  /** Remove the public snapshot after this transition commits. */
  unpublish?: boolean;
}

export interface WorkflowRole {
  /** Existing user role value, for example `editor` or `publisher`. */
  role: string;
  capabilities: string[];
}

/**
 * Configuration for a collection's editorial workflow: the states a document
 * can be in, the transitions between them, and the roles allowed to perform
 * each. Attach it to a collection's `workflow`, or build one with
 * `definePublishingWorkflow`.
 */
export interface WorkflowConfig<TDoc extends object = Record<string, unknown>> {
  /** The state every new document starts in, e.g. `"draft"`. */
  initialState: string;
  /** State used for a new working revision created from published content. */
  draftState?: string;
  /** All states a document can occupy. Exactly one should be marked `published`. */
  states: WorkflowState[];
  /** The allowed moves between states, each with its own capability and comment rules. */
  transitions: WorkflowTransition[];
  /** Maps values in `user.roles` to workflow capabilities. */
  roles?: WorkflowRole[];
  /** Server-side hooks that run around every transition. */
  hooks?: {
    /** Runs before a transition commits — throw to validate or block the move. */
    beforeTransition?: CollectionBeforeTransitionHook<TDoc>[];
    /** Runs after a transition commits — trigger notifications or downstream work. */
    afterTransition?: CollectionAfterTransitionHook<TDoc>[];
  };
}

export interface WorkflowMetadata {
  /** The document's current workflow state, e.g. `"draft"` or `"published"`. */
  state: string;
  /** Revision counter, incremented on every committed transition. */
  revision: number;
  /** Revision number currently exposed as the public snapshot, once published. */
  publishedRevision?: number;
  /** ISO timestamp of the most recent publish. */
  publishedAt?: string;
  /** Id of the user who last published this document. */
  publishedBy?: string;
  /** Transitions currently allowed for the requesting user. Response-only. */
  availableTransitions?: string[];
}

export interface WorkflowTransitionContext<
  TDoc extends object = Record<string, unknown>,
> {
  /** The transition being performed. */
  transition: WorkflowTransition;
  /** State the document is moving out of. */
  from: string;
  /** State the document is moving into. */
  to: string;
  /** The document as it stands before the transition commits. */
  doc: TDoc;
  /** The user performing the transition, when the request is authenticated. */
  user?: AuthenticatedUser;
  /** Comment supplied with the transition; required when `requireComment` is set. */
  comment?: string;
  /** Request context for the transition. */
  req: HookRequestContext;
  /** Transaction-scoped database adapter for reads and writes inside the hook. */
  db: DatabaseAdapter;
}

export type CollectionBeforeTransitionHook<
  TDoc extends object = Record<string, unknown>,
> = (args: WorkflowTransitionContext<TDoc>) => void | Promise<void>;

export type CollectionAfterTransitionHook<
  TDoc extends object = Record<string, unknown>,
> = (
  args: WorkflowTransitionContext<TDoc> & { event: LifecycleEvent },
) => void | Promise<void>;

export interface LifecycleEvent<TPayload = Record<string, unknown>> {
  /** Unique id for this event. */
  id: string;
  /** The lifecycle event name, e.g. `"workflow.transitioned"` or `"entry.published"`. */
  name: LifecycleEventName;
  /** Slug of the collection the event is about. */
  collection: string;
  /** Id of the document the event is about. */
  documentId: string;
  /** ISO timestamp of when the event occurred. */
  occurredAt: string;
  /** Id of the user who triggered the event, when known. */
  actorId?: string;
  /** Event-specific data, such as the transition name and affected revision. */
  payload: TPayload;
  /** Number of delivery attempts made so far. */
  attempts: number;
  /** Current delivery status as the dispatcher works through the queue. */
  status: "pending" | "processing" | "delivered" | "failed";
  /** ISO timestamp of the next delivery retry, while pending. */
  nextAttemptAt?: string;
  /** ISO timestamp of successful delivery. */
  deliveredAt?: string;
  /** Message from the most recent failed delivery attempt. */
  lastError?: string;
}

export type LifecycleEventHandler = (
  event: LifecycleEvent,
) => void | Promise<void>;
