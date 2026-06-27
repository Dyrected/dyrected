import type { DatabaseAdapter } from "./index.js";
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

export interface WorkflowConfig<TDoc extends object = Record<string, unknown>> {
  initialState: string;
  /** State used for a new working revision created from published content. */
  draftState?: string;
  states: WorkflowState[];
  transitions: WorkflowTransition[];
  /** Maps values in `user.roles` to workflow capabilities. */
  roles?: WorkflowRole[];
  hooks?: {
    beforeTransition?: CollectionBeforeTransitionHook<TDoc>[];
    afterTransition?: CollectionAfterTransitionHook<TDoc>[];
  };
}

export interface WorkflowMetadata {
  state: string;
  revision: number;
  publishedRevision?: number;
  publishedAt?: string;
  publishedBy?: string;
  /** Transitions currently allowed for the requesting user. Response-only. */
  availableTransitions?: string[];
}

export interface WorkflowTransitionContext<
  TDoc extends object = Record<string, unknown>,
> {
  transition: WorkflowTransition;
  from: string;
  to: string;
  doc: TDoc;
  user?: AuthenticatedUser;
  comment?: string;
  req: HookRequestContext;
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
  id: string;
  name: LifecycleEventName;
  collection: string;
  documentId: string;
  occurredAt: string;
  actorId?: string;
  payload: TPayload;
  attempts: number;
  status: "pending" | "processing" | "delivered" | "failed";
  nextAttemptAt?: string;
  deliveredAt?: string;
  lastError?: string;
}

export type LifecycleEventHandler = (
  event: LifecycleEvent,
) => void | Promise<void>;
